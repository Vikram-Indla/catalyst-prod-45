import React, { useState, useRef, useEffect } from 'react';
import { slugify, initials as getInitials } from './r360-helpers';
import { useTheme } from '@/hooks/useTheme';

// ═══════════════════════════════════════════════════
// STATUS COLORS — Jira status → display colors
// ═══════════════════════════════════════════════════
const SC: Record<string, { dot: string; bg: string; tx: string; label: string; accent: string }> = {
  'To Do':                { dot: 'var(--ds-text-warning, #D97706)', bg: '#FFFBEB', tx: '#78350F', label: 'To Do',       accent: 'var(--ds-text-warning, #D97706)' },
  'Open':                 { dot: 'var(--ds-text-warning, #D97706)', bg: '#FFFBEB', tx: '#78350F', label: 'To Do',       accent: 'var(--ds-text-warning, #D97706)' },
  'Backlog':              { dot: 'var(--ds-text-warning, #D97706)', bg: '#FFFBEB', tx: '#78350F', label: 'Backlog',     accent: 'var(--ds-text-warning, #D97706)' },
  'Re-Open':              { dot: 'var(--ds-text-warning, #D97706)', bg: '#FFFBEB', tx: '#78350F', label: 'Re-Open',     accent: 'var(--ds-text-warning, #D97706)' },
  'In Requirements':      { dot: 'var(--ds-text-warning, #D97706)', bg: '#FFFBEB', tx: '#78350F', label: 'Requirements',accent: 'var(--ds-text-warning, #D97706)' },
  'Awaiting Info':        { dot: 'var(--ds-text-warning, #D97706)', bg: '#FFFBEB', tx: '#78350F', label: 'Awaiting',    accent: 'var(--ds-text-warning, #D97706)' },
  'In Progress':          { dot: 'var(--ds-text-brand, #2563EB)', bg: 'var(--ds-background-selected, #EFF6FF)', tx: '#1E3A5F', label: 'In Progress', accent: 'var(--ds-text-brand, #2563EB)' },
  'In Development':       { dot: 'var(--ds-text-brand, #2563EB)', bg: 'var(--ds-background-selected, #EFF6FF)', tx: '#1E3A5F', label: 'In Progress', accent: 'var(--ds-text-brand, #2563EB)' },
  'Under Implementation': { dot: 'var(--ds-text-brand, #2563EB)', bg: 'var(--ds-background-selected, #EFF6FF)', tx: '#1E3A5F', label: 'In Progress', accent: 'var(--ds-text-brand, #2563EB)' },
  'In Review':            { dot: '#0D9488', bg: '#F0FDFA', tx: '#134E4A', label: 'In Review',   accent: '#0D9488' },
  'In QA':                { dot: '#0D9488', bg: '#F0FDFA', tx: '#134E4A', label: 'In QA',       accent: '#0D9488' },
  'Ready for QA':         { dot: '#0D9488', bg: '#F0FDFA', tx: '#134E4A', label: 'Ready QA',    accent: '#0D9488' },
  'Retest':               { dot: '#0D9488', bg: '#F0FDFA', tx: '#134E4A', label: 'Retest',      accent: '#0D9488' },
  'Code Review':          { dot: '#0D9488', bg: '#F0FDFA', tx: '#134E4A', label: 'In Review',   accent: '#0D9488' },
  'In UAT':               { dot: '#7C3AED', bg: '#F5F3FF', tx: '#4C1D95', label: 'In UAT',     accent: '#7C3AED' },
  'UAT Ready':            { dot: '#7C3AED', bg: '#F5F3FF', tx: '#4C1D95', label: 'UAT Ready',  accent: '#7C3AED' },
  'Done':                 { dot: 'var(--ds-text-success, #16A34A)', bg: '#F0FDF4', tx: '#14532D', label: 'Done',        accent: 'var(--ds-text-success, #16A34A)' },
  'Closed':               { dot: 'var(--ds-text-success, #16A34A)', bg: '#F0FDF4', tx: '#14532D', label: 'Done',        accent: 'var(--ds-text-success, #16A34A)' },
  'Resolved':             { dot: 'var(--ds-text-success, #16A34A)', bg: '#F0FDF4', tx: '#14532D', label: 'Done',        accent: 'var(--ds-text-success, #16A34A)' },
  'Ready for Production': { dot: 'var(--ds-text-success, #16A34A)', bg: '#F0FDF4', tx: '#14532D', label: 'Done',        accent: 'var(--ds-text-success, #16A34A)' },
  'Beta Ready':           { dot: 'var(--ds-text-success, #16A34A)', bg: '#F0FDF4', tx: '#14532D', label: 'Done',        accent: 'var(--ds-text-success, #16A34A)' },
  'Blocked':              { dot: 'var(--ds-text-danger, #EF4444)', bg: 'var(--ds-background-danger, #FEF2F2)', tx: '#7F1D1D', label: 'Blocked',     accent: 'var(--ds-text-danger, #EF4444)' },
  'Rejected':             { dot: 'var(--ds-text-danger, #EF4444)', bg: 'var(--ds-background-danger, #FEF2F2)', tx: '#7F1D1D', label: 'Rejected',    accent: 'var(--ds-text-danger, #EF4444)' },
};
const SCD = { dot: 'var(--ds-text-subtlest, #64748B)', bg: 'var(--ds-surface-sunken, #F1F5F9)', tx: 'var(--ds-text-subtle, #334155)', label: 'Unknown', accent: 'var(--ds-text-subtlest, #64748B)' };

function resolveStatus(item: any) {
  if (item.status_name && SC[item.status_name]) return SC[item.status_name];
  if (item.status_dot_color && item.status_bg_color && item.status_color) {
    return { dot: item.status_dot_color, bg: item.status_bg_color, tx: item.status_color, label: item.status_name || 'Unknown', accent: item.status_dot_color };
  }
  const cat = (item.status_category || '').toLowerCase();
  if (cat === 'completed' || cat === 'done' || cat === 'complete') return SC['Done'];
  if (cat === 'started' || cat === 'in progress' || cat === 'indeterminate') return SC['In Progress'];
  return SCD;
}

// ═══ JIRA ICONS ═══
const BugIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="#E5493A"/><circle cx="8" cy="8" r="3" fill="white"/></svg>
);
const TaskIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#4BADE8"/><path d="M4.5 8l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
);
const StoryIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#63BA3C"/><path d="M9.5 2.5L5.5 9H8l-1.5 5L11 7.5H8L9.5 2.5z" fill="white"/></svg>
);
const EpicIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#904EE2"/><path d="M9.5 2.5L5.5 9H8l-1.5 5L11 7.5H8L9.5 2.5z" fill="white"/></svg>
);
function JiraIcon({ type }: { type: string }) {
  const t = (type || '').toLowerCase();
  if (t.includes('bug')) return <BugIcon />;
  if (t.includes('story')) return <StoryIcon />;
  if (t.includes('epic')) return <EpicIcon />;
  return <TaskIcon />;
}

// ═══ HELPERS ═══
const ageCol = (d: number) => d <= 7 ? 'var(--ds-text-success, #16A34A)' : d <= 14 ? 'var(--ds-text-warning, #D97706)' : 'var(--ds-text-danger, #EF4444)';
const trunc = (s: string, l: number) => s && s.length > l ? s.slice(0, l) + '…' : s || '';
const ageLabel = (d: number) => d === 0 ? 'Today' : d === 1 ? '1d ago' : `${d}d ago`;

const PC: Record<string, string> = { BAU: 'var(--ds-text-brand, #2563EB)', SEN: 'var(--ds-text-warning, #D97706)', FAC: 'var(--ds-text-success, #16A34A)', OPS: '#0D9488', SUP: 'var(--ds-text-subtlest, #64748B)', LND: '#7C3AED' };
const pColor = (k: string, fallback?: string) => fallback || PC[k] || 'var(--ds-text-subtlest, #64748B)';

const SPOTS = [
  { x: 3,  y: 3  },
  { x: 36, y: 0  },
  { x: 67, y: 5  },
  { x: 0,  y: 38 },
  { x: 70, y: 34 },
  { x: 5,  y: 68 },
  { x: 36, y: 72 },
  { x: 67, y: 66 },
];

function formatResolvedDate(dateStr?: string | null): string {
  if (!dateStr) return 'This week';
  const d = new Date(dateStr);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

interface Props {
  member: any;
  items: any[];
  doneCount: number;
  onItemClick: (item: any) => void;
}

export const R360RingView: React.FC<Props> = ({ member, items, doneCount, onItemClick }) => {
  const [showDone, setShowDone] = useState(false);
  const doneRef = useRef<HTMLDivElement>(null);
  const { isDark } = useTheme();

  const isDone = (cat: string | null | undefined) => {
    const c = (cat || '').toLowerCase();
    return c === 'completed' || c === 'done' || c === 'complete';
  };
  const activeItems = items.filter(i => !isDone(i.status_category)).slice(0, 8);
  const doneItems = items.filter(i => isDone(i.status_category));
  const memberName = member?.full_name || 'Unknown';
  const memberRole = member?.role || '';
  const avatarSlug = slugify(memberName);

  // Close on outside click
  useEffect(() => {
    if (!showDone) return;
    const handler = (e: MouseEvent) => {
      if (doneRef.current && !doneRef.current.contains(e.target as Node)) setShowDone(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showDone]);

  // Close on Escape
  useEffect(() => {
    if (!showDone) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowDone(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [showDone]);

  // Adaptive center Y based on card count
  const cardCount = activeItems.length;
  const centerTopPct = cardCount <= 4 ? 38 : cardCount <= 6 ? 40 : 49;

  if (activeItems.length === 0 && doneCount === 0) {
    return (
      <div style={{
        position: 'relative', width: '100%', height: '720px', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'radial-gradient(circle at center, var(--ds-surface, #fff) 0%, var(--bg-1) 55%, var(--bg-3) 100%)',
        borderRadius: 12, border: '1px solid var(--divider)',
      }}>
        <div style={{ textAlign: 'center', color: 'var(--fg-3)' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 4 }}>No active items</div>
          <div style={{ fontSize: 13 }}>Assigned work items will orbit here.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'relative', width: '100%', height: '720px', overflow: 'visible', boxSizing: 'border-box',
      background: isDark
        ? 'radial-gradient(circle at center, var(--ds-surface-raised, #1A1A1A) 0%, var(--ds-surface, #0A0A0A) 55%, var(--ds-surface, #0A0A0A) 100%)'
        : 'radial-gradient(circle at center, var(--ds-surface, #fff) 0%, var(--ds-surface-sunken, #F8FAFC) 55%, var(--ds-surface-sunken, #F1F5F9) 100%)',
      backgroundImage: isDark
        ? 'radial-gradient(circle at center, var(--ds-surface-raised, #1A1A1A) 0%, var(--ds-surface, #0A0A0A) 55%, var(--ds-surface, #0A0A0A) 100%), radial-gradient(circle, var(--ds-border, #292929) 1px, transparent 1px)'
        : 'radial-gradient(circle at center, var(--ds-surface, #fff) 0%, var(--ds-surface-sunken, #F8FAFC) 55%, var(--ds-surface-sunken, #F1F5F9) 100%), radial-gradient(circle, var(--ds-text-disabled, #CBD5E1) 1px, transparent 1px)',
      backgroundSize: 'cover, 24px 24px',
    }}>
      {/* SVG SPOKES */}
      <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none', overflow: 'hidden' }}>
        {activeItems.map((_, i) => {
          const cx = SPOTS[i].x + 10;
          const cy = SPOTS[i].y + 9;
          return (
            <line key={`spoke-${i}`} x1="50%" y1={`${centerTopPct}%`} x2={`${cx}%`} y2={`${cy}%`}
              stroke="var(--ds-text-subtlest, #94A3B8)" strokeWidth="2" strokeDasharray="8 5" strokeLinecap="round" />
          );
        })}
      </svg>

      {/* SPOKE MIDPOINT LABELS */}
      {activeItems.map((item, i) => {
        const cx = SPOTS[i].x + 10;
        const cy = SPOTS[i].y + 9;
        const mx = (50 + cx) / 2;
        const my = (centerTopPct + cy) / 2;
        return (
          <div key={`label-${i}`} style={{
            position: 'absolute', left: `${mx}%`, top: `${my}%`,
            transform: 'translate(-50%, -50%)', zIndex: 4, pointerEvents: 'none',
            fontSize: '11px', fontWeight: 600, color: 'var(--fg-2)', background: 'var(--bg-1)',
            padding: '2px 8px', borderRadius: '12px', border: '1px solid var(--divider)',
            whiteSpace: 'nowrap', fontFamily: 'var(--cp-font-body)',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {ageLabel(item.age_days ?? 0)}
          </div>
        );
      })}

      {/* CENTER AVATAR */}
      <div style={{ position: 'absolute', left: '50%', top: `${centerTopPct}%`, transform: 'translate(-50%, -50%)', textAlign: 'center', zIndex: 5 }}>
        <div style={{
          width: '96px', height: '96px', borderRadius: '50%', border: '3px solid var(--cp-blue)',
          overflow: 'hidden', margin: '0 auto 6px', boxShadow: '0 0 0 6px rgba(37,99,235,.12)', background: 'var(--bg-app)',
        }}>
          <img src={member?.avatar_url || `/admin/users/${avatarSlug}/avatar`} alt={memberName}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => { e.currentTarget.style.display = 'none'; const fb = e.currentTarget.nextElementSibling as HTMLElement; if (fb) fb.style.display = 'flex'; }}
          />
          <div style={{
            width: '100%', height: '100%', display: 'none', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, var(--cp-blue), var(--sem-success))', fontSize: '32px', fontWeight: 700, color: 'white',
          }}>
            {getInitials(memberName)}
          </div>
        </div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--fg-1)' }}>{memberName}</div>
        <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--fg-2)' }}>{memberRole}</div>
      </div>

      {/* ORBITAL CARDS */}
      {activeItems.map((item, i) => {
        const pos = SPOTS[i];
        const s = resolveStatus(item);
        const projColor = pColor(item.project_key, item.project_color);
        return (
          <div key={item.id || item.item_key} onClick={() => onItemClick(item)} style={{
            position: 'absolute', left: `${pos.x}%`, top: `${pos.y}%`, width: '195px',
            background: 'var(--bg-app)', border: '1px solid var(--divider)', borderRadius: '8px',
            padding: '10px 12px 10px 15px', cursor: 'pointer', zIndex: 3,
            boxShadow: '0 1px 3px rgba(15,23,42,.05)', fontFamily: 'var(--cp-font-body)',
            transition: 'border-color .15s, box-shadow .15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--fg-4)'; e.currentTarget.style.boxShadow = '0 3px 10px rgba(15,23,42,.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--divider)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(15,23,42,.05)'; }}
          >
            <div style={{ position: 'absolute', left: 0, top: '8px', bottom: '8px', width: '3px', borderRadius: '0 2px 2px 0', background: s.accent }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <JiraIcon type={item.item_type} />
                <span style={{ fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--fg-2)' }}>{item.item_type}</span>
              </div>
              <span style={{ fontSize: '10.5px', fontWeight: 500, color: 'var(--fg-3)', textTransform: 'capitalize' }}>{item.priority || '—'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--cp-blue)', fontFamily: 'var(--cp-font-mono)' }}>{item.item_key}</span>
              {item.project_key && (
                <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', color: 'var(--ds-text-inverse, #FFFFFF)', background: projColor }}>{item.project_key}</span>
              )}
              <span style={{ marginLeft: 'auto', fontSize: '11px', fontWeight: 600, color: ageCol(item.age_days ?? 0), fontVariantNumeric: 'tabular-nums' }}>{item.age_days ?? 0}d</span>
            </div>
            <div style={{
              fontSize: '12.5px', fontWeight: 500, color: 'var(--cp-text-primary, #020617)', lineHeight: '1.35', marginBottom: '5px',
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            } as React.CSSProperties}>
              {trunc(item.title, 48)}
            </div>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              padding: '3px 10px', borderRadius: '4px', fontSize: '11.5px', fontWeight: 600, lineHeight: '1',
              background: s.bg, color: s.tx,
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
              {s.label}
            </span>
          </div>
        );
      })}

      {/* ═══ COMPLETED BADGE — CLICKABLE WITH DROPDOWN ═══ */}
      {doneCount > 0 && (
        <div ref={doneRef} style={{
          position: 'absolute', right: '16px', top: `${centerTopPct}%`, transform: 'translateY(-50%)', zIndex: 10,
        }}>
          {/* Badge */}
          <div
            onClick={() => setShowDone(prev => !prev)}
            title="Click to view completed items"
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
              cursor: 'pointer', transition: 'transform .15s',
              transform: showDone ? 'scale(1.08)' : 'scale(1)',
            }}
          >
            <div style={{
              width: '48px', height: '48px', borderRadius: '50%', background: 'var(--ds-text-success, #16A34A)', color: 'var(--ds-text-inverse, #FFFFFF)',
              fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: showDone
                ? '0 0 0 3px rgba(22,163,74,.25), 0 2px 8px rgba(22,163,74,.3)'
                : '0 2px 8px rgba(22,163,74,.3)',
              transition: 'box-shadow .15s',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {doneCount}
            </div>
            <span style={{
              fontSize: '9.5px', fontWeight: 700, color: '#14532D', textTransform: 'uppercase',
              letterSpacing: '.06em', writingMode: 'vertical-rl',
            } as React.CSSProperties}>
              COMPLETED
            </span>
          </div>

          {/* ═══ POPOVER DROPDOWN ═══ */}
          {showDone && (
            <div style={{
              position: 'absolute', right: '64px', top: '50%', transform: 'translateY(-50%)',
              width: '340px', maxHeight: '420px', background: 'var(--cp-float)',
              border: '1px solid var(--divider)', borderRadius: '12px',
              boxShadow: '0 8px 30px rgba(15,23,42,.12), 0 2px 8px rgba(15,23,42,.06)',
              overflow: 'hidden', zIndex: 11,
            }}>
              {/* Header */}
              <div style={{
                padding: '14px 16px', borderBottom: '1px solid var(--bg-3)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '22px', height: '22px', borderRadius: '50%', background: 'var(--ds-text-success, #16A34A)',
                    color: 'var(--ds-surface, #FFF)', fontSize: '12px', fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>✓</div>
                  <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--cp-text-primary, #020617)' }}>
                    Completed This Week
                  </span>
                </div>
                <span style={{
                  fontSize: '11px', fontWeight: 700, color: '#14532D',
                  background: '#F0FDF4', padding: '2px 10px', borderRadius: '12px',
                }}>
                  {doneCount}
                </span>
              </div>

              {/* Scrollable list */}
              <div style={{
                maxHeight: '340px', overflowY: 'auto', scrollbarWidth: 'thin', padding: '4px 0',
              }}>
                {doneItems.map(item => (
                  <div
                    key={item.id || item.item_key}
                    onClick={(e) => { e.stopPropagation(); onItemClick(item); setShowDone(false); }}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: '10px',
                      padding: '10px 16px', cursor: 'pointer',
                      borderBottom: '1px solid var(--bg-1)', transition: 'background .1s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#F0FDF4')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Green check circle */}
                    <div style={{
                      width: '22px', height: '22px', borderRadius: '50%',
                      background: '#F0FDF4', border: '1.5px solid #16A34A',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, marginTop: '1px',
                    }}>
                      <svg width="12" height="12" viewBox="0 0 12 12">
                        <path d="M2.5 6l2.5 2.5 4.5-4.5" stroke="var(--ds-text-success, #16A34A)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                        <span style={{
                          fontSize: '11.5px', fontWeight: 600, color: 'var(--sem-success)',
                          fontFamily: 'var(--cp-font-mono)',
                        }}>
                          {item.item_key}
                        </span>
                        <span style={{
                          fontSize: '10px', fontWeight: 700, padding: '1px 5px',
                          borderRadius: '4px', color: 'var(--ds-surface, #FFF)', background: 'var(--ds-text-success, #16A34A)',
                        }}>
                          DONE
                        </span>
                      </div>
                      <div style={{
                        fontSize: '12.5px', fontWeight: 500, color: 'var(--cp-text-primary, #020617)', lineHeight: '1.3',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--fg-3)', marginTop: '2px' }}>
                        Resolved · {formatResolvedDate(item.resolved_at || item.updated_at)}
                      </div>
                    </div>

                    {/* Age */}
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--sem-success)', flexShrink: 0 }}>
                      {item.age_days ?? 0}d
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
