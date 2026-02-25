import React, { useState, useMemo } from 'react';
import { initials as getInitials, groupByDate } from './r360-helpers';

// ═══════════════════════════════════════════════════
// STATUS COLORS — 100% inline, no CSS classes
// ═══════════════════════════════════════════════════
const SC: Record<string, { dot: string; bg: string; tx: string; label: string }> = {
  'To Do':                { dot: '#D97706', bg: '#FFFBEB', tx: '#78350F', label: 'To Do' },
  'Open':                 { dot: '#D97706', bg: '#FFFBEB', tx: '#78350F', label: 'To Do' },
  'Backlog':              { dot: '#D97706', bg: '#FFFBEB', tx: '#78350F', label: 'Backlog' },
  'Re-Open':              { dot: '#D97706', bg: '#FFFBEB', tx: '#78350F', label: 'Re-Open' },
  'In Requirements':      { dot: '#D97706', bg: '#FFFBEB', tx: '#78350F', label: 'Requirements' },
  'Awaiting Info':        { dot: '#D97706', bg: '#FFFBEB', tx: '#78350F', label: 'Awaiting' },
  'In Progress':          { dot: '#2563EB', bg: '#EFF6FF', tx: '#1E3A5F', label: 'In Progress' },
  'In Development':       { dot: '#2563EB', bg: '#EFF6FF', tx: '#1E3A5F', label: 'In Progress' },
  'Under Implementation': { dot: '#2563EB', bg: '#EFF6FF', tx: '#1E3A5F', label: 'In Progress' },
  'In Review':            { dot: '#0D9488', bg: '#F0FDFA', tx: '#134E4A', label: 'In Review' },
  'In QA':                { dot: '#0D9488', bg: '#F0FDFA', tx: '#134E4A', label: 'In QA' },
  'Ready for QA':         { dot: '#0D9488', bg: '#F0FDFA', tx: '#134E4A', label: 'Ready QA' },
  'Retest':               { dot: '#0D9488', bg: '#F0FDFA', tx: '#134E4A', label: 'Retest' },
  'Code Review':          { dot: '#0D9488', bg: '#F0FDFA', tx: '#134E4A', label: 'In Review' },
  'In UAT':               { dot: '#7C3AED', bg: '#F5F3FF', tx: '#4C1D95', label: 'In UAT' },
  'UAT Ready':            { dot: '#7C3AED', bg: '#F5F3FF', tx: '#4C1D95', label: 'UAT Ready' },
  'Done':                 { dot: '#16A34A', bg: '#F0FDF4', tx: '#14532D', label: 'Done' },
  'Closed':               { dot: '#16A34A', bg: '#F0FDF4', tx: '#14532D', label: 'Done' },
  'Resolved':             { dot: '#16A34A', bg: '#F0FDF4', tx: '#14532D', label: 'Done' },
  'Ready for Production': { dot: '#16A34A', bg: '#F0FDF4', tx: '#14532D', label: 'Done' },
  'Beta Ready':           { dot: '#16A34A', bg: '#F0FDF4', tx: '#14532D', label: 'Done' },
  'Blocked':              { dot: '#EF4444', bg: '#FEF2F2', tx: '#7F1D1D', label: 'Blocked' },
  'Rejected':             { dot: '#EF4444', bg: '#FEF2F2', tx: '#7F1D1D', label: 'Rejected' },
};
const SCD = { dot: '#64748B', bg: '#F1F5F9', tx: '#334155', label: 'Unknown' };

function resolveStatus(item: any) {
  if (item.status_name && SC[item.status_name]) return SC[item.status_name];
  if (item.status_dot_color && item.status_bg_color && item.status_color) {
    return { dot: item.status_dot_color, bg: item.status_bg_color, tx: item.status_color, label: item.status_name || 'Unknown' };
  }
  const cat = (item.status_category || '').toLowerCase();
  if (cat === 'completed' || cat === 'done') return SC['Done'];
  if (cat === 'started' || cat === 'in progress' || cat === 'indeterminate') return SC['In Progress'];
  return SCD;
}

// ═══════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════
const BugIcon = () => <svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="#E5493A"/><circle cx="8" cy="8" r="3" fill="white"/></svg>;
const TaskIcon = () => <svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#4BADE8"/><path d="M4.5 8l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const StoryIcon = () => <svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#63BA3C"/><path d="M9.5 2.5L5.5 9H8l-1.5 5L11 7.5H8L9.5 2.5z" fill="white"/></svg>;
const EpicIcon = () => <svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#904EE2"/><path d="M9.5 2.5L5.5 9H8l-1.5 5L11 7.5H8L9.5 2.5z" fill="white"/></svg>;
function JiraIcon({ type }: { type: string }) {
  const t = (type || '').toLowerCase();
  if (t.includes('bug')) return <BugIcon />;
  if (t.includes('story')) return <StoryIcon />;
  if (t.includes('epic')) return <EpicIcon />;
  return <TaskIcon />;
}

const PC: Record<string, string> = { BAU: '#2563EB', SEN: '#D97706', FAC: '#16A34A', OPS: '#0D9488', SUP: '#64748B', LND: '#7C3AED' };
const pColor = (k: string, fallback?: string) => fallback || PC[k] || '#64748B';
const ageCol = (d: number) => d <= 7 ? '#16A34A' : d <= 14 ? '#D97706' : '#EF4444';

function StatusPill({ item, small }: { item: any; small?: boolean }) {
  const s = resolveStatus(item);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: small ? '3px' : '4px',
      padding: small ? '2px 6px' : '3px 10px', borderRadius: small ? '3px' : '4px',
      fontSize: small ? '10.5px' : '11.5px', fontWeight: 600, lineHeight: '1',
      background: s.bg, color: s.tx,
    }}>
      <span style={{ width: small ? '5px' : '6px', height: small ? '5px' : '6px', borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
      {s.label}
    </span>
  );
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
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748B' }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#334155', marginBottom: 4 }}>No work items found</div>
        <div style={{ fontSize: 13 }}>Items assigned to {memberName || 'this member'} will appear here.</div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', paddingLeft: 32 }}>
      {/* Vertical timeline line */}
      <div style={{ position: 'absolute', left: '15px', top: '28px', bottom: '20px', width: '2px', background: '#E2E8F0', borderRadius: '1px' }} />

      {Array.from(groups.entries()).map(([dateLabel, groupItems]) => {
        const isCollapsed = collapsed.has(dateLabel);
        const isToday = dateLabel.startsWith('Today');
        const isYesterday = dateLabel.startsWith('Yesterday');
        const total = groupItems.length;

        const dotStyle: React.CSSProperties = {
          width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0, zIndex: 3,
          background: isToday ? '#2563EB' : isYesterday ? '#334155' : '#FFFFFF',
          border: isToday ? '2px solid #2563EB' : isYesterday ? '2px solid #334155' : '2px solid #64748B',
        };

        // Mini progress bar
        const doneC = groupItems.filter((i: any) => resolveStatus(i).label === 'Done').length;
        const ipC = groupItems.filter((i: any) => ['In Progress', 'In Review', 'In QA', 'Ready QA', 'Retest', 'In UAT', 'UAT Ready'].includes(resolveStatus(i).label)).length;
        const todoC = groupItems.filter((i: any) => ['To Do', 'Backlog', 'Re-Open', 'Requirements', 'Awaiting', 'Unknown'].includes(resolveStatus(i).label)).length;
        const blockC = groupItems.filter((i: any) => ['Blocked', 'Rejected'].includes(resolveStatus(i).label)).length;

        return (
          <div key={dateLabel} style={{ marginBottom: 20, position: 'relative' }}>
            {/* DATE HEADER */}
            <div onClick={() => toggleGroup(dateLabel)} style={{
              display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer',
              marginLeft: -32, paddingLeft: 10, marginBottom: 10, userSelect: 'none',
            }}>
              <div style={dotStyle} />
              <span style={{ fontSize: 14, fontWeight: 600, color: '#020617' }}>{dateLabel}</span>
              <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#334155', background: '#F1F5F9', padding: '2px 8px', borderRadius: '10px' }}>{total} items</span>
              {/* Mini bar */}
              <div style={{ display: 'flex', height: '4px', borderRadius: '2px', overflow: 'hidden', width: '80px', background: '#F1F5F9', flexShrink: 0 }}>
                {doneC > 0 && <div style={{ width: `${(doneC/total)*100}%`, background: '#16A34A' }} />}
                {ipC > 0 && <div style={{ width: `${(ipC/total)*100}%`, background: '#2563EB' }} />}
                {todoC > 0 && <div style={{ width: `${(todoC/total)*100}%`, background: '#D97706' }} />}
                {blockC > 0 && <div style={{ width: `${(blockC/total)*100}%`, background: '#EF4444' }} />}
              </div>
              {/* Chevron */}
              <svg style={{
                width: '16px', height: '16px', color: '#64748B', flexShrink: 0, marginLeft: 'auto',
                transition: 'transform .2s', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
              }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>

            {/* ITEMS */}
            {!isCollapsed && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {groupItems.map((item: any) => {
                  const s = resolveStatus(item);
                  const projColor = pColor(item.project_key, item.project_color);
                  return (
                    <div key={item.id} onClick={() => onItemClick(item)} style={{
                      display: 'flex', alignItems: 'flex-start', gap: '10px',
                      padding: '10px 14px 10px 17px', background: '#FFFFFF',
                      border: '1px solid #E2E8F0', borderRadius: '8px', cursor: 'pointer', position: 'relative',
                      transition: 'border-color .15s, box-shadow .15s',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#94A3B8'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(15,23,42,.06)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                      {/* 3px ACCENT BAR */}
                      <div style={{ position: 'absolute', left: 0, top: '8px', bottom: '8px', width: '3px', borderRadius: '0 2px 2px 0', background: s.dot }} />

                      {/* Jira Icon */}
                      <div style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                        <JiraIcon type={item.item_type} />
                      </div>

                      {/* Body */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#2563EB', fontFamily: "'JetBrains Mono', monospace" }}>{item.item_key}</span>
                          {item.project_key && (
                            <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '3px', color: '#FFF', background: projColor }}>{item.project_key}</span>
                          )}
                        </div>
                        <div style={{
                          fontSize: '14px', fontWeight: 500, color: '#020617', lineHeight: '1.4',
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        } as React.CSSProperties}>
                          {item.title}
                        </div>
                        {item.parent_key && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#334155', marginTop: '3px', fontWeight: 500 }}>
                            ↳
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: 600, color: '#64748B' }}>{item.parent_key}</span>
                            <span>{item.parent_title && item.parent_title.length > 40 ? item.parent_title.slice(0, 40) + '…' : item.parent_title}</span>
                          </div>
                        )}
                      </div>

                      {/* Right meta */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, marginTop: '2px' }}>
                        <div style={{
                          width: '20px', height: '20px', borderRadius: '50%', overflow: 'hidden',
                          background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '8px', fontWeight: 700, color: '#334155', flexShrink: 0,
                        }}>
                          {getInitials(item.assigner_name)}
                        </div>
                        <span style={{ fontSize: '12.5px', fontWeight: 500, color: '#334155', whiteSpace: 'nowrap', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.assigner_name ? item.assigner_name.split(' ')[0] : 'Unassigned'}
                        </span>
                        <StatusPill item={item} />
                        <span style={{ fontSize: '12px', fontWeight: 600, color: ageCol(item.age_days ?? 0), fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
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
