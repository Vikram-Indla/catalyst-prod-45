import React, { useState, useMemo } from 'react';
import { initials as getInitials, groupByDate } from './r360-helpers';

// ═══════════════════════════════════════════════════
// STATUS LOZENGE — 3-colour guardrail (immutable spec)
// ═══════════════════════════════════════════════════
function getLozengeStyle(status: string, statusCategory?: string): { bg: string; color: string; label: string } {
  // 1. Prioritise status_category from Jira (eliminates Unknown)
  const cat = (statusCategory || '').toLowerCase().replace(/[_ ]/g, '');
  if (cat === 'done' || cat === 'completed')
    return { bg: 'var(--cp-lozenge-green-bg)', color: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))', label: (status || 'DONE').toUpperCase() };
  if (cat === 'inprogress' || cat === 'indeterminate' || cat === 'started')
    return { bg: 'var(--ds-link)', color: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))', label: (status || 'IN PROGRESS').toUpperCase() };
  if (cat === 'new' || cat === 'todo')
    return { bg: 'var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral)))', color: 'var(--ds-text-subtle)', label: (status || 'TO DO').toUpperCase() };

  // 2. Fallback: string-match raw status name
  const s = (status || '').toLowerCase();
  // Green
  if (['done', 'closed', 'resolved', 'ready for production', 'beta ready', 'completed', 'production ready', 'monitor', 'released', 'verified'].some(k => s === k))
    return { bg: 'var(--cp-lozenge-green-bg)', color: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))', label: status.toUpperCase() };
  // Blue
  if (['in progress', 'in development', 'under implementation', 'in review', 'in qa', 'ready for qa', 'retest',
       'code review', 'in uat', 'uat ready', 're-open', 'in beta', 'in production', 'in design', 'in requirements',
       'ready for development', 'in entity integration', 'technical validation', 'end to end testing',
       'deferred for int', 'awaiting info', 'on hold', 'active'].some(k => s === k))
    return { bg: 'var(--ds-link)', color: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))', label: status.toUpperCase() };
  // Grey (default — never "Unknown")
  return { bg: 'var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral)))', color: 'var(--ds-text-subtle)', label: (status || 'TO DO').toUpperCase() };
}

function StatusLozenge({ status, statusCategory }: { status: string; statusCategory?: string }) {
  const s = getLozengeStyle(status, statusCategory);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 8px',
      borderRadius: 4, fontSize: 'var(--ds-font-size-100)', fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.03em', whiteSpace: 'nowrap', background: s.bg, color: s.color,
    }}>
      {s.label}
    </span>
  );
}

// Icons
const BugIcon = () => <svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="var(--ds-background-danger-bold, var(--ds-background-danger-bold))"/><circle cx="8" cy="8" r="3" fill="white"/></svg>;
const TaskIcon = () => <svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="var(--ds-background-information-bold)"/><path d="M4.5 8l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const StoryIcon = () => <svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="var(--ds-background-success-bold, var(--ds-background-success-bold))"/><path d="M9.5 2.5L5.5 9H8l-1.5 5L11 7.5H8L9.5 2.5z" fill="white"/></svg>;
const EpicIcon = () => <svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="var(--ds-background-discovery-bold, var(--ds-background-discovery-bold))"/><path d="M9.5 2.5L5.5 9H8l-1.5 5L11 7.5H8L9.5 2.5z" fill="white"/></svg>;
function JiraIcon({ type }: { type: string }) {
  const t = (type || '').toLowerCase();
  if (t.includes('bug')) return <BugIcon />;
  if (t.includes('story')) return <StoryIcon />;
  if (t.includes('epic')) return <EpicIcon />;
  return <TaskIcon />;
}

const PC: Record<string, string> = { BAU: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', SEN: 'var(--ds-text-warning, var(--cp-warning))', FAC: 'var(--ds-text-success, var(--cp-success))', OPS: 'var(--cp-teal-60)', SUP: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', LND: 'var(--cp-purple-60)' };
const pColor = (k: string, fallback?: string) => fallback || PC[k] || 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))';
const ageCol = (d: number) => d <= 7 ? 'var(--ds-text-success, var(--cp-success))' : d <= 14 ? 'var(--ds-text-warning, var(--cp-warning))' : 'var(--ds-text-danger)';

function getCatFromStatus(status: string, statusCategory?: string): 'done' | 'progress' | 'blocked' | 'todo' {
  // Prioritise status_category
  const cat = (statusCategory || '').toLowerCase().replace(/[_ ]/g, '');
  if (cat === 'done' || cat === 'completed') return 'done';
  if (cat === 'inprogress' || cat === 'indeterminate' || cat === 'started') return 'progress';
  // Fallback to string matching
  const s = (status || '').toLowerCase();
  if (['done', 'closed', 'resolved', 'ready for production', 'completed', 'beta ready', 'production ready', 'monitor'].some(k => s === k)) return 'done';
  if (['in progress', 'in development', 'in review', 'in qa', 'in uat', 'retest', 'code review', 'uat ready', 'ready for qa',
       'under implementation', 'in beta', 'in production', 'in design', 'in requirements', 'ready for development',
       'in entity integration', 'technical validation', 'end to end testing'].some(k => s === k)) return 'progress';
  if (['blocked', 'rejected'].some(k => s === k)) return 'blocked';
  return 'todo';
}


interface Props {
  items: any[];
  onItemClick: (item: any) => void;
  memberName?: string;
}

export const R360ChronologyView: React.FC<Props> = ({ items, onItemClick, memberName }) => {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const groups = groupByDate(items);

  const toggleGroup = (key: string) => {
    setCollapsed(prev => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next; });
  };

  if (items.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--fg-3)' }}>
        <div style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 600, color: 'var(--fg-2)', marginBottom: 4 }}>No work items found</div>
        <div style={{ fontSize: 'var(--ds-font-size-300)' }}>Items assigned to {memberName || 'this member'} will appear here.</div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', paddingLeft: 32 }}>
      {/* Vertical timeline line */}
      <div style={{ position: 'absolute', left: '16px', top: '24px', bottom: '16px', width: '2px', background: 'var(--divider)', borderRadius: '1px' }} />

      {Array.from(groups.entries()).map(([dateLabel, groupItems]) => {
        const isCollapsed = collapsed.has(dateLabel);
        const isToday = dateLabel.startsWith('Today');
        const isYesterday = dateLabel.startsWith('Yesterday');
        const total = groupItems.length;

        const dotStyle: React.CSSProperties = {
          width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0, zIndex: 3,
          background: isToday ? 'var(--cp-blue)' : isYesterday ? 'var(--fg-2)' : 'var(--bg-app)',
          border: isToday ? '2px solid var(--cp-blue)' : isYesterday ? '2px solid var(--fg-2)' : '2px solid var(--fg-3)',
        };

        // Mini progress bar
        const doneC = groupItems.filter((i: any) => getCatFromStatus(i.status_name || i.status || '', i.status_category) === 'done').length;
        const ipC = groupItems.filter((i: any) => getCatFromStatus(i.status_name || i.status || '', i.status_category) === 'progress').length;
        const todoC = groupItems.filter((i: any) => getCatFromStatus(i.status_name || i.status || '', i.status_category) === 'todo').length;
        const blockC = groupItems.filter((i: any) => getCatFromStatus(i.status_name || i.status || '', i.status_category) === 'blocked').length;

        return (
          <div key={dateLabel} style={{ marginBottom: 16, position: 'relative' }}>
            {/* DATE HEADER */}
            <div onClick={() => toggleGroup(dateLabel)} style={{
              display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
              marginLeft: -32, paddingLeft: 8, marginBottom: 8, userSelect: 'none',
            }}>
              <div style={dotStyle} />
              <span style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 600, color: 'var(--ds-text)' }}>{dateLabel}</span>
              <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--fg-2)', background: 'var(--bg-3)', padding: '0px 8px', borderRadius: '12px' }}>{total} items</span>
              {/* Mini bar */}
              <div style={{ display: 'flex', height: '4px', borderRadius: '4px', overflow: 'hidden', width: '80px', background: 'var(--bg-3)', flexShrink: 0 }}>
                {doneC > 0 && <div style={{ width: `${(doneC/total)*100}%`, background: 'var(--sem-success)' }} />}
                {ipC > 0 && <div style={{ width: `${(ipC/total)*100}%`, background: 'var(--cp-blue)' }} />}
                {todoC > 0 && <div style={{ width: `${(todoC/total)*100}%`, background: 'var(--sem-warning)' }} />}
                {blockC > 0 && <div style={{ width: `${(blockC/total)*100}%`, background: 'var(--sem-danger)' }} />}
              </div>
              {/* Chevron */}
              <svg style={{
                width: '16px', height: '16px', color: 'var(--fg-3)', flexShrink: 0, marginLeft: 'auto',
                transition: 'transform .2s', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
              }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>

            {/* ITEMS */}
            {!isCollapsed && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {groupItems.map((item: any) => {
                  const cat = getCatFromStatus(item.status_name || item.status || '', item.status_category);
                  const accentDot = cat === 'done' ? 'var(--ds-text-success, var(--cp-success))' : cat === 'progress' ? 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' : cat === 'blocked' ? 'var(--ds-text-danger)' : 'var(--ds-text-warning, var(--cp-warning))';
                  const projColor = pColor(item.project_key, item.project_color);
                  return (
                    <div key={item.id} onClick={() => onItemClick(item)} style={{
                      display: 'flex', alignItems: 'flex-start', gap: '8px',
                      padding: '8px 14px 10px 17px', background: 'var(--bg-app)',
                      border: '1px solid var(--divider)', borderRadius: '8px', cursor: 'pointer', position: 'relative',
                      transition: 'border-color .15s, box-shadow .15s',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--fg-4)'; e.currentTarget.style.boxShadow = '0 1px 4px var(--ds-shadow-overlay, rgba(15,23,42,.06))'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--divider)'; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                      {/* 3px ACCENT BAR */}
                      <div style={{ position: 'absolute', left: 0, top: '8px', bottom: '8px', width: '3px', borderRadius: '0 2px 2px 0', background: accentDot }} />

                      {/* Jira Icon */}
                      <div style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '0px' }}>
                        <JiraIcon type={item.item_type} />
                      </div>

                      {/* Body */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--cp-blue)', fontFamily: 'var(--cp-font-mono)' }}>{item.item_key}</span>
                          {item.project_key && (
                            <span style={{ fontSize: 'var(--ds-font-size-50)', fontWeight: 700, padding: '0px 6px', borderRadius: '4px', color: 'var(--ds-surface)', background: projColor }}>{item.project_key}</span>
                          )}
                        </div>
                        <div style={{
                          fontSize: 'var(--ds-font-size-400)', fontWeight: 500, color: 'var(--ds-text)', lineHeight: '1.4',
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        } as React.CSSProperties}>
                          {item.title}
                        </div>
                        {item.parent_key && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 'var(--ds-font-size-200)', color: 'var(--fg-2)', marginTop: '4px', fontWeight: 500 }}>
                            ↳
                            <span style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--fg-3)' }}>{item.parent_key}</span>
                            <span>{item.parent_title && item.parent_title.length > 40 ? item.parent_title.slice(0, 40) + '…' : item.parent_title}</span>
                          </div>
                        )}
                      </div>

                      {/* Right meta */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginTop: '0px' }}>
                        <div style={{
                          width: '20px', height: '20px', borderRadius: '50%', overflow: 'hidden',
                          background: 'var(--divider)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 'var(--ds-font-size-100)', fontWeight: 700, color: 'var(--fg-2)', flexShrink: 0,
                        }}>
                          {getInitials(item.assigner_name)}
                        </div>
                        <span style={{ fontSize: '12.5px', fontWeight: 500, color: 'var(--fg-2)', whiteSpace: 'nowrap', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.assigner_name ? item.assigner_name.split(' ')[0] : 'Unassigned'}
                        </span>
                        <StatusLozenge status={item.status_name || item.status || ''} statusCategory={item.status_category} />
                        <span style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: ageCol(item.age_days ?? 0), fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                          {item.age_days ?? 0}d
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
