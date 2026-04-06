import React, { useEffect, useRef } from 'react';
import { getJiraIcon } from '../r360/R360JiraIcons';
import { initials } from './r360-helpers';
import { resolveStatusCategoryStatic } from '@/hooks/useStatusMappingLookup';

// ═══════════════════════════════════════════════════
// STATUS COLORS — 100% INLINE. No CSS classes for colors.
// GREEN = Done ONLY. AMBER = To Do. BLUE = In Progress.
// ═══════════════════════════════════════════════════
const SC: Record<string, { dot: string; bg: string; tx: string; label: string }> = {
  // ── Grey: To Do / Waiting ──
  'To Do':                { dot: '#D97706', bg: '#FFFBEB', tx: '#78350F', label: 'To Do' },
  'Open':                 { dot: '#D97706', bg: '#FFFBEB', tx: '#78350F', label: 'To Do' },
  'Backlog':              { dot: '#D97706', bg: '#FFFBEB', tx: '#78350F', label: 'Backlog' },
  'Re-Open':              { dot: '#D97706', bg: '#FFFBEB', tx: '#78350F', label: 'Re-Open' },
  'Reopened':             { dot: '#D97706', bg: '#FFFBEB', tx: '#78350F', label: 'Re-Open' },
  'In Requirements':      { dot: '#D97706', bg: '#FFFBEB', tx: '#78350F', label: 'Requirements' },
  'Awaiting Info':        { dot: '#D97706', bg: '#FFFBEB', tx: '#78350F', label: 'Awaiting' },
  'On Hold':              { dot: '#D97706', bg: '#FFFBEB', tx: '#78350F', label: 'On Hold' },
  'Todo':                 { dot: '#D97706', bg: '#FFFBEB', tx: '#78350F', label: 'To Do' },
  'Reported':             { dot: '#D97706', bg: '#FFFBEB', tx: '#78350F', label: 'Reported' },
  'Ready for Dev':        { dot: '#D97706', bg: '#FFFBEB', tx: '#78350F', label: 'Ready Dev' },
  'Ready for Test':       { dot: '#D97706', bg: '#FFFBEB', tx: '#78350F', label: 'Ready Test' },
  // ── Blue: In Progress ──
  'In Progress':          { dot: '#2563EB', bg: '#EFF6FF', tx: '#1E3A5F', label: 'In Progress' },
  'In Development':       { dot: '#2563EB', bg: '#EFF6FF', tx: '#1E3A5F', label: 'In Progress' },
  'Under Implementation': { dot: '#2563EB', bg: '#EFF6FF', tx: '#1E3A5F', label: 'In Progress' },
  'In Design':            { dot: '#2563EB', bg: '#EFF6FF', tx: '#1E3A5F', label: 'In Design' },
  'Ready for Development':{ dot: '#2563EB', bg: '#EFF6FF', tx: '#1E3A5F', label: 'Ready Dev' },
  'In Entity Integration':{ dot: '#2563EB', bg: '#EFF6FF', tx: '#1E3A5F', label: 'Integration' },
  'Deferred for Int':     { dot: '#2563EB', bg: '#EFF6FF', tx: '#1E3A5F', label: 'Deferred' },
  'In Beta':              { dot: '#2563EB', bg: '#EFF6FF', tx: '#1E3A5F', label: 'In Beta' },
  'In Production':        { dot: '#2563EB', bg: '#EFF6FF', tx: '#1E3A5F', label: 'In Prod' },
  'In Investigation':     { dot: '#2563EB', bg: '#EFF6FF', tx: '#1E3A5F', label: 'Investigating' },
  'In Fix':               { dot: '#2563EB', bg: '#EFF6FF', tx: '#1E3A5F', label: 'In Fix' },
  'In Execution':         { dot: '#2563EB', bg: '#EFF6FF', tx: '#1E3A5F', label: 'In Execution' },
  'Fix in Progress':      { dot: '#2563EB', bg: '#EFF6FF', tx: '#1E3A5F', label: 'Fixing' },
  // ── Teal: Review / QA ──
  'In Review':            { dot: '#0D9488', bg: '#F0FDFA', tx: '#134E4A', label: 'In Review' },
  'In QA':                { dot: '#0D9488', bg: '#F0FDFA', tx: '#134E4A', label: 'In QA' },
  'Ready for QA':         { dot: '#0D9488', bg: '#F0FDFA', tx: '#134E4A', label: 'Ready QA' },
  'Retest':               { dot: '#0D9488', bg: '#F0FDFA', tx: '#134E4A', label: 'Retest' },
  'Code Review':          { dot: '#0D9488', bg: '#F0FDFA', tx: '#134E4A', label: 'In Review' },
  'Technical Validation': { dot: '#0D9488', bg: '#F0FDFA', tx: '#134E4A', label: 'Validation' },
  'End to End Testing':   { dot: '#0D9488', bg: '#F0FDFA', tx: '#134E4A', label: 'E2E Testing' },
  'In Testing':           { dot: '#0D9488', bg: '#F0FDFA', tx: '#134E4A', label: 'Testing' },
  'QA Pass':              { dot: '#0D9488', bg: '#F0FDFA', tx: '#134E4A', label: 'QA Pass' },
  'QA Fail':              { dot: '#0D9488', bg: '#F0FDFA', tx: '#134E4A', label: 'QA Fail' },
  // ── Purple: UAT ──
  'In UAT':               { dot: '#7C3AED', bg: '#F5F3FF', tx: '#4C1D95', label: 'In UAT' },
  'UAT Ready':            { dot: '#7C3AED', bg: '#F5F3FF', tx: '#4C1D95', label: 'UAT Ready' },
  // ── Green: Done ──
  'Done':                 { dot: '#16A34A', bg: '#F0FDF4', tx: '#14532D', label: 'Done' },
  'Closed':               { dot: '#16A34A', bg: '#F0FDF4', tx: '#14532D', label: 'Done' },
  'Resolved':             { dot: '#16A34A', bg: '#F0FDF4', tx: '#14532D', label: 'Done' },
  'Ready for Production': { dot: '#16A34A', bg: '#F0FDF4', tx: '#14532D', label: 'Ready Prod' },
  'Beta Ready':           { dot: '#16A34A', bg: '#F0FDF4', tx: '#14532D', label: 'Beta Ready' },
  'Production Ready':     { dot: '#16A34A', bg: '#F0FDF4', tx: '#14532D', label: 'Prod Ready' },
  'Monitor':              { dot: '#16A34A', bg: '#F0FDF4', tx: '#14532D', label: 'Monitor' },
  'Released':             { dot: '#16A34A', bg: '#F0FDF4', tx: '#14532D', label: 'Released' },
  'Verified':             { dot: '#16A34A', bg: '#F0FDF4', tx: '#14532D', label: 'Verified' },
  'Approved':             { dot: '#16A34A', bg: '#F0FDF4', tx: '#14532D', label: 'Approved' },
  'Complete':             { dot: '#16A34A', bg: '#F0FDF4', tx: '#14532D', label: 'Complete' },
  'Completed':            { dot: '#16A34A', bg: '#F0FDF4', tx: '#14532D', label: 'Complete' },
  // ── Red: Blocked / Rejected ──
  'Blocked':              { dot: '#EF4444', bg: '#FEF2F2', tx: '#7F1D1D', label: 'Blocked' },
  'Rejected':             { dot: '#EF4444', bg: '#FEF2F2', tx: '#7F1D1D', label: 'Rejected' },
  'Impediment':           { dot: '#EF4444', bg: '#FEF2F2', tx: '#7F1D1D', label: 'Impediment' },
};

// Category-level fallbacks (Jira always provides these)
const CAT_DONE       = { dot: '#16A34A', bg: '#F0FDF4', tx: '#14532D', label: 'Done' };
const CAT_INPROGRESS = { dot: '#2563EB', bg: '#EFF6FF', tx: '#1E3A5F', label: 'In Progress' };
const CAT_TODO       = { dot: '#D97706', bg: '#FFFBEB', tx: '#78350F', label: 'To Do' };

function resolveStatus(item: any) {
  // 1. Try exact status_name match first (most descriptive label)
  const name = item.status_name || item.status || '';
  if (SC[name]) return SC[name];

  // 2. Custom server-side colors if provided
  if (item.status_dot_color && item.status_bg_color && item.status_color) {
    return { dot: item.status_dot_color, bg: item.status_bg_color, tx: item.status_color, label: name || 'To Do' };
  }

  // 3. Use shared admin mapping → resolves to 5-category, then map to visual
  const cat5 = resolveStatusCategoryStatic(name, item.status_category);
  if (cat5 === 'Done') return CAT_DONE;
  if (cat5 === 'In Progress' || cat5 === 'In Review') return CAT_INPROGRESS;
  if (cat5 === 'Blocked') return { dot: '#EF4444', bg: '#FEF2F2', tx: '#7F1D1D', label: name || 'Blocked' };

  // 4. Final fallback: To Do (never "Unknown")
  return CAT_TODO;
}

const PC: Record<string, string> = { BAU: '#2563EB', SEN: '#D97706', FAC: '#16A34A', OPS: '#0D9488', SUP: '#64748B', LND: '#7C3AED' };
const pColor = (k: string, fallback?: string) => fallback || PC[k] || '#64748B';
const ageCol = (d: number) => d <= 7 ? '#16A34A' : d <= 14 ? '#D97706' : '#EF4444';
const ageLabel = (d: number) => d === 0 ? 'Today' : d === 1 ? '1d ago' : `${d}d ago`;

interface Props {
  item: any;
  siblings: any[];
  onClose: () => void;
  onSiblingClick: (item: any) => void;
}

export const R360DetailPanel: React.FC<Props> = ({ item, siblings, onClose, onSiblingClick }) => {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    if (panelRef.current) panelRef.current.scrollTop = 0;
  }, [item?.id]);

  if (!item) return null;

  const s = resolveStatus(item);
  const ageDays = item.age_days ?? 0;
  const statusLabel = item.status_name || item.status || 'To Do';
  const projColor = pColor(item.project_key, item.project_color);

  const doneSiblings = siblings.filter(sib => {
    const sc = (sib.status_category || sib.status || '').toLowerCase();
    return sc.includes('done') || sc.includes('closed') || sc.includes('complete') || sc.includes('resolved');
  }).length;

  return (
    <>
      {/* Overlay */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.15)', zIndex: 200 }} />

      {/* Panel */}
      <div ref={panelRef} style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '460px',
        background: 'var(--cp-float)', borderLeft: '1px solid var(--divider)', zIndex: 201,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '-4px 0 20px rgba(15,23,42,.08)',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        animation: 'r3SlideIn 250ms cubic-bezier(.32,.72,0,1) forwards',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--divider)', background: 'var(--bg-app)', position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--cp-blue)', fontFamily: "'JetBrains Mono', monospace" }}>{item.item_key}</span>
            <button onClick={onClose} style={{
              width: '28px', height: '28px', border: '1px solid var(--divider)', borderRadius: '6px',
              background: 'var(--cp-float)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--fg-3)" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
            {/* Status pill — INLINE */}
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              padding: '3px 10px', borderRadius: '4px', fontSize: '11.5px', fontWeight: 600, lineHeight: '1',
              background: s.bg, color: s.tx,
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
              {statusLabel}
            </span>
            <span style={{ fontSize: '10.5px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: 'var(--bg-3)', color: 'var(--fg-2)', textTransform: 'capitalize' }}>
              {item.priority || '—'}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '10.5px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: '#FEF2F2', color: '#7F1D1D' }}>
              {getJiraIcon(item.item_type)} <span style={{ textTransform: 'uppercase' }}>{item.item_type}</span>
            </span>
            {item.project_key && (
              <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', color: '#FFF', background: projColor }}>{item.project_key}</span>
            )}
          </div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: '#020617', lineHeight: '1.4' }}>{item.title}</div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 0 }}>
          {/* Meta Grid 2×3 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--divider)' }}>
            {[
              { label: 'PROJECT', value: item.project_name || item.project_key || '—' },
              { label: 'ASSIGNER', value: item.assigner_name || item.reporter_name || '—', hasAvatar: true },
              { label: 'ASSIGNED', value: ageLabel(ageDays), sub: item.assigned_date || undefined },
              { label: 'DAYS SITTING', value: ageDays, isBar: true },
              { label: 'RELEASE', value: item.release || item.release_name || '—' },
              { label: 'DUE', value: item.due_date || '—' },
            ].map((cell, i) => (
              <div key={i} style={{
                padding: '12px 20px',
                borderBottom: '1px solid var(--bg-3)',
                borderRight: i % 2 === 0 ? '1px solid var(--bg-3)' : 'none',
              }}>
                <div style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: '4px' }}>{cell.label}</div>
                {cell.hasAvatar ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{
                      width: '18px', height: '18px', borderRadius: '50%',
                      background: 'linear-gradient(135deg,var(--cp-blue),var(--sem-success))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '7px', fontWeight: 700, color: 'white', flexShrink: 0,
                    }}>{initials(cell.value as string)}</div>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#020617' }}>{cell.value}</span>
                  </div>
                ) : cell.isBar ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: ageCol(cell.value as number), fontVariantNumeric: 'tabular-nums' }}>{cell.value}</span>
                    <div style={{ width: '60px', height: '4px', borderRadius: '4px', background: 'var(--bg-3)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: '4px',
                        width: `${Math.min((cell.value as number) / 21 * 100, 100)}%`,
                        background: ageCol(cell.value as number),
                        minWidth: (cell.value as number) > 0 ? '2px' : '0',
                      }} />
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: '#020617', wordBreak: 'break-word' }}>{cell.value}</div>
                    {cell.sub && <div style={{ fontSize: '11px', color: 'var(--fg-2)', marginTop: '2px' }}>{cell.sub}</div>}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Hierarchy */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--fg-2)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '10px' }}>Hierarchy</div>
            {item.parent_key ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {/* Parent */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--divider)', background: 'var(--bg-app)' }}>
                  {getJiraIcon(item.parent_type || 'epic')}
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: 'var(--fg-3)', whiteSpace: 'nowrap', flexShrink: 0, minWidth: '72px', fontWeight: 600 }}>{item.parent_key}</span>
                  <span style={{ fontSize: '12px', color: 'var(--fg-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.parent_title}</span>
                </div>
                <div style={{ paddingLeft: '20px', color: 'var(--fg-3)', fontSize: '11px', margin: '2px 0' }}>↳</div>
                {/* Current */}
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: '6px', padding: '6px 8px',
                  borderRadius: '6px', border: '1.5px solid var(--cp-blue)', background: '#EFF6FF',
                }}>
                  {getJiraIcon(item.item_type)}
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: 'var(--cp-blue)', whiteSpace: 'nowrap', flexShrink: 0, minWidth: '72px', fontWeight: 600 }}>{item.item_key}</span>
                  <span style={{
                    fontSize: '13px', fontWeight: 500, color: '#020617',
                    overflow: 'hidden', display: '-webkit-box',
                    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  } as React.CSSProperties}>{item.title}</span>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '12px', color: 'var(--fg-4)' }}>—</div>
            )}
          </div>

          {/* Siblings */}
          {siblings.length > 0 && (
            <div style={{ padding: '16px 20px', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--fg-2)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Siblings</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--fg-2)', background: 'var(--bg-3)', padding: '2px 8px', borderRadius: '12px' }}>{doneSiblings}/{siblings.length} done</span>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: '#CBD5E1 transparent', maxHeight: '320px' }}>
                {siblings.map(sib => {
                  const sibS = resolveStatus(sib);
                  const sibLabel = sib.status_name || sib.status || 'To Do';
                  const isCurrent = sib.item_key === item.item_key;
                  return (
                    <div key={sib.id || sib.item_key} onClick={() => !isCurrent && onSiblingClick(sib)} style={{
                      display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', borderRadius: '6px',
                      cursor: isCurrent ? 'default' : 'pointer', marginBottom: '2px',
                      border: isCurrent ? '1px solid var(--cp-blue)' : '1px solid transparent',
                      background: isCurrent ? '#EFF6FF' : 'transparent',
                    }}
                      onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = 'var(--bg-3)'; }}
                      onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <span style={{ flexShrink: 0 }}>{getJiraIcon(sib.item_type || 'Task')}</span>
                      <span style={{ fontSize: '11px', fontFamily: "'JetBrains Mono', monospace", color: 'var(--cp-blue)', fontWeight: 600, width: '72px', flexShrink: 0 }}>{sib.item_key}</span>
                      {/* Status pill — INLINE, small */}
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '3px',
                        padding: '2px 6px', borderRadius: '4px', fontSize: '10.5px', fontWeight: 600, lineHeight: '1',
                        background: sibS.bg, color: sibS.tx, flexShrink: 0,
                      }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: sibS.dot, flexShrink: 0 }} />
                        {sibLabel}
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: 500, color: '#020617', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sib.title}</span>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: ageCol(sib.age_days ?? 0), fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{sib.age_days ?? 0}d</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
