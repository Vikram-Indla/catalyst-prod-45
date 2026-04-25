import React from 'react';
import { initials as getInitials } from './r360-helpers';

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

const PC: Record<string, string> = { BAU: '#2563EB', SEN: '#D97706', FAC: '#16A34A', OPS: '#0D9488', SUP: '#64748B', LND: '#7C3AED' };
const pColor = (k: string, fallback?: string) => fallback || PC[k] || '#64748B';
const ageCol = (d: number) => d <= 7 ? '#16A34A' : d <= 14 ? '#D97706' : '#EF4444';

const PRI_DOT: Record<string, string> = {
  critical: '#EF4444', highest: '#EF4444', high: '#D97706', medium: '#D97706', low: '#64748B', lowest: '#94A3B8',
};

const COLS = [
  { key: 'todo', label: 'TO DO', color: '#D97706', cats: ['unstarted', 'blocked'] },
  { key: 'ip', label: 'IN PROGRESS', color: '#2563EB', cats: ['started'] },
  { key: 'done', label: 'DONE', color: '#16A34A', cats: ['completed'] },
];

interface Props {
  items: any[];
  onItemClick: (item: any) => void;
  memberName?: string;
}

export const R360BoardView: React.FC<Props> = ({ items, onItemClick, memberName }) => {
  const columns = COLS.map(col => ({
    ...col,
    items: items.filter(i => col.cats.includes(i.status_category || 'unstarted')),
  }));

  if (items.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--fg-3)' }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 4 }}>No work items found</div>
        <div style={{ fontSize: 13 }}>Items assigned to {memberName || 'this member'} will appear here.</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', alignItems: 'start' }}>
      {columns.map(col => (
        <div key={col.key}>
          {/* Column Header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            paddingBottom: '10px', marginBottom: '10px', borderBottom: `2px solid ${col.color}`,
          }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: col.color }} />
            <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--fg-1)' }}>{col.label}</span>
            <div style={{
              width: '22px', height: '22px', borderRadius: '50%', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700,
              color: '#FFFFFF', background: col.color, marginLeft: 'auto',
            }}>{col.items.length}</div>
          </div>

          {/* Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {col.items.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--fg-4)', fontSize: 12, fontWeight: 500, border: '1px dashed var(--divider)', borderRadius: 8, background: 'var(--bg-1)' }}>
                No items
              </div>
            ) : col.items.map(item => {
              const s = resolveStatus(item);
              const projColor = pColor(item.project_key, item.project_color);
              const priDot = PRI_DOT[(item.priority || '').toLowerCase()] || '#64748B';
              return (
                <div key={item.id} onClick={() => onItemClick(item)} style={{
                  background: 'var(--bg-app)', border: '1px solid var(--divider)', borderRadius: '8px',
                  padding: '12px 12px 12px 15px', cursor: 'pointer', position: 'relative',
                  boxShadow: '0 1px 3px rgba(15,23,42,.05)', transition: 'border-color .15s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--fg-4)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--divider)'; }}
                >
                  {/* 3px accent bar */}
                  <div style={{ position: 'absolute', left: 0, top: '8px', bottom: '8px', width: '3px', borderRadius: '0 2px 2px 0', background: s.dot }} />

                  {/* Top: Key + Project + Age */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--cp-blue)', fontFamily: 'var(--ds-font-family-monospaced)' }}>{item.item_key}</span>
                    {item.project_key && (
                      <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', color: '#FFF', background: projColor }}>{item.project_key}</span>
                    )}
                    <span style={{ marginLeft: 'auto', fontSize: '11px', fontWeight: 600, color: ageCol(item.age_days ?? 0) }}>{item.age_days ?? 0}d</span>
                  </div>

                  {/* Title */}
                  <div style={{
                    fontSize: '13.5px', fontWeight: 500, color: '#020617', lineHeight: '1.35', marginBottom: '8px',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  } as React.CSSProperties}>
                    {item.title}
                  </div>

                  {/* Bottom: Priority + Assignee */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: priDot }} />
                      <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--fg-2)', textTransform: 'capitalize' }}>{item.priority || '—'}</span>
                    </div>
                    <span style={{ fontSize: '12.5px', fontWeight: 500, color: 'var(--fg-2)', maxWidth: '70px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.assigner_name ? item.assigner_name.split(' ')[0] : 'Unassigned'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
