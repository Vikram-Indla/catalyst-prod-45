import React, { useEffect, useCallback, useMemo } from 'react';
import type { Resource360Item } from '@/types/resource360';
import { getStatusCategory, getStaleIndicator, WH_HUB_COLORS, WH_HUB_SHORT } from '@/types/resource360';
import { useResource360Siblings } from './hooks/useResource360Siblings';

interface Props {
  item: Resource360Item | null;
  allItems: Resource360Item[];
  onClose: () => void;
  onNavigate: (item: Resource360Item) => void;
}

const T = {
  text1: 'var(--fg-1)', text2: '#1A1A2E', text3: '#3D3D56', text4: 'var(--fg-3)',
  border: 'var(--divider)', surface: 'var(--cp-float)', warm: '#FAF8F5',
  todo: '#E23636', progress: 'var(--cp-blue)', done: '#0E8A5F',
  mono: "'JetBrains Mono','SF Mono',monospace",
};

export function Resource360ContextModal({ item, allItems, onClose, onNavigate }: Props) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }, [onClose]);
  useEffect(() => { document.addEventListener('keydown', handleKeyDown); return () => document.removeEventListener('keydown', handleKeyDown); }, [handleKeyDown]);

  const { data: siblings = [] } = useResource360Siblings(item?.work_item_id ?? null);

  if (!item) return null;

  const statusCat = getStatusCategory(item.status, item.status_category);
  const statusColor = statusCat === 'done' ? T.done : statusCat === 'progress' ? T.progress : T.todo;
  const stale = getStaleIndicator(item.age_days, item.status, item.status_category);
  const isDone = statusCat === 'done';
  const hubColor = WH_HUB_COLORS[item.hub] ?? 'rgba(237,237,237,0.40)';
  const hubShort = WH_HUB_SHORT[item.hub] ?? item.hub?.slice(0, 4).toUpperCase();

  const dueStr = item.release_end_date ?? '2026-03-30';
  const dueDate = new Date(dueStr);
  const today = new Date();
  const daysLeft = Math.max(0, Math.ceil((dueDate.getTime() - today.getTime()) / 86400000));
  const totalDuration = Math.max(1, item.age_days + daysLeft);
  const dueProgress = Math.min(100, Math.round((item.age_days / totalDuration) * 100));

  const parentItem = item.parent_key ? allItems.find(t => t.item_key === item.parent_key) ?? null : null;

  const handleCopyKey = () => { navigator.clipboard.writeText(item.item_key); };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(4px)' }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div style={{
          display: 'flex', background: T.surface, borderRadius: 14, overflow: 'hidden',
          maxWidth: 720, width: '90vw', maxHeight: '85vh',
          boxShadow: '0 1px 0 0 rgba(255,255,255,.9) inset, 0 2px 12px rgba(0,0,0,.10), 0 8px 32px rgba(0,0,0,.06)',
          animation: 'r360ModalIn 200ms ease-out',
          fontFamily: "'Inter', sans-serif",
        }}>
          {/* ─── LEFT: Main content ─── */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            {/* Status accent bar */}
            <div style={{ height: 4, background: statusColor, flexShrink: 0 }} />

            {/* Header */}
            <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${T.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 800, color: T.text1 }}>{item.item_key}</span>
                <span style={{
                  fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 6,
                  textTransform: 'uppercase', letterSpacing: '.04em',
                  background: statusColor, color: '#fff',
                }}>● {item.status}</span>
                <span style={{
                  fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 4,
                  background: T.text2, color: '#fff', textTransform: 'uppercase', letterSpacing: '.06em',
                }}>{item.item_type}</span>
                {stale && (
                  <span style={{
                    fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4,
                    background: 'rgba(248,113,113,0.06)', color: 'var(--sem-danger)', border: '1px solid #FECACA',
                  }}>🔴 Stale — {item.age_days}d</span>
                )}
                <span style={{ flex: 1 }} />
                <button onClick={onClose} style={{
                  width: 28, height: 28, borderRadius: 6, border: `1px solid ${T.border}`,
                  background: 'var(--bg-app, #fff)', color: T.text4, fontSize: 14, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>✕</button>
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, color: T.text1, lineHeight: 1.3, letterSpacing: '-.02em' }}>
                {item.title}
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8, paddingTop: 10, borderTop: `1px solid ${T.border}` }}>
                <TagChip label={item.item_type} />
                {item.project_name && <TagChip label={item.project_name} />}
              </div>
            </div>

            {/* Meta grid */}
            <div style={{ padding: '16px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
              {[
                { label: 'Hub', value: <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 4, background: hubColor, color: '#fff' }}>{hubShort}</span> },
                { label: 'Project', value: item.project_name ?? '—' },
                { label: 'Reported By', value: item.assigner_name ?? '—', blue: true },
                { label: 'Assigned', value: item.assigned_at?.slice(0, 10) ?? '—', mono: true },
                { label: 'Priority', value: <PriorityIndicator priority={item.priority} /> },
                { label: 'Release', value: item.release_name ?? '—' },
              ].map((cell, i) => (
                <div key={i} style={{
                  padding: '12px 0', borderBottom: `1px solid ${T.border}`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  ...(i % 2 === 0 ? { paddingRight: 16, borderRight: `1px solid ${T.border}` } : { paddingLeft: 16 }),
                }}>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: T.text4 }}>{cell.label}</span>
                  <span style={{
                    fontSize: 12, fontWeight: 700, textAlign: 'right',
                    color: cell.blue ? 'var(--cp-blue)' : T.text1,
                    ...(cell.mono ? { fontFamily: T.mono, fontSize: 11 } : {}),
                  }}>
                    {cell.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Bottom section */}
            <div style={{ padding: '16px 24px 20px', borderTop: `1px solid ${T.border}`, background: T.warm, marginTop: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 16, alignItems: 'start' }}>
                {/* Cycle time */}
                <div style={{
                  background: 'var(--bg-app, #fff)', border: `1px solid ${stale ? '#FECACA' : T.border}`,
                  borderRadius: 12, padding: '14px 16px', textAlign: 'center',
                }}>
                  <div style={{
                    fontSize: 36, fontWeight: 900, lineHeight: 1, letterSpacing: '-.03em',
                    fontFamily: T.mono, color: stale ? T.todo : T.text1,
                  }}>{item.age_days}</div>
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: stale ? T.todo : T.text4, marginTop: 4 }}>
                    {isDone ? 'Days Cycle Time' : 'Days In Progress'}
                  </div>
                  {stale && <div style={{ fontSize: 9, fontWeight: 600, color: T.todo, marginTop: 6, paddingTop: 6, borderTop: '1px solid #FECACA' }}>⚠ Exceeds 14d threshold</div>}
                </div>

                {/* Timeline + Due */}
                <div>
                  <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: T.text4, marginBottom: 10 }}>Status Timeline</div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <TimelineNode letter="T" label="To Do" color={statusCat === 'todo' ? T.todo : '#B0ACA6'} active={statusCat === 'todo'} />
                    <div style={{ flex: 1, height: 3, background: statusCat !== 'todo' ? T.progress : '#D9D2C9' }} />
                    <TimelineNode letter="P" label="In Progress" color={statusCat === 'progress' ? T.progress : statusCat === 'done' ? '#B0ACA6' : '#D9D2C9'} active={statusCat === 'progress'} />
                    <div style={{ flex: 1, height: 3, background: statusCat === 'done' ? T.done : '#D9D2C9' }} />
                    <TimelineNode letter="✓" label="Done" color={statusCat === 'done' ? T.done : '#D9D2C9'} active={statusCat === 'done'} />
                  </div>

                  {/* Due bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: T.text4 }}>DUE</span>
                    <div style={{ flex: 1, height: 6, background: '#EDE7E0', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 4, width: `${dueProgress}%`,
                        background: dueProgress < 60 ? 'linear-gradient(90deg, #10B981, #34D399)' : dueProgress < 85 ? 'linear-gradient(90deg, #F59E0B, #FBBF24)' : 'linear-gradient(90deg, #EF4444, #F87171)',
                      }} />
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 800, fontFamily: T.mono,
                      color: dueProgress < 60 ? T.done : dueProgress < 85 ? '#D97706' : T.todo,
                    }}>
                      {daysLeft}d left
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ─── RIGHT: Sidebar ─── */}
          <div style={{
            width: 220, flexShrink: 0, background: T.warm,
            borderLeft: `1px solid ${T.border}`, padding: '20px 16px',
            display: 'flex', flexDirection: 'column', gap: 20,
            overflowY: 'auto',
          }}>
            {/* Hierarchy */}
            <div>
              <SidebarLabel>{item.parent_key ? 'Parent Item' : 'Hierarchy'}</SidebarLabel>
              {parentItem ? (
                <div
                  onClick={() => onNavigate(parentItem)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px',
                    background: 'var(--bg-app, #fff)', border: `1px solid ${T.border}`, borderRadius: 8, cursor: 'pointer',
                    transition: 'box-shadow .12s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,.08)'; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div style={{ width: 22, height: 22, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, background: '#FFF7ED', color: '#EA580C', flexShrink: 0 }}>E</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: T.mono, fontSize: 9, fontWeight: 800, color: T.text1 }}>{parentItem.item_key}</div>
                    <div style={{ fontSize: 10, fontWeight: 500, color: T.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{parentItem.title}</div>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 11, fontStyle: 'italic', color: 'var(--fg-4)', padding: '8px 0' }}>Top-level item — no parent</div>
              )}
            </div>

            {/* Related siblings */}
            {siblings.length > 0 && (
              <div>
                <SidebarLabel>Related ({siblings.length})</SidebarLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 200, overflowY: 'auto' }}>
                  {siblings.slice(0, 8).map(s => {
                    const isCurrent = s.item_key === item.item_key;
                    return (
                      <div key={s.item_key}
                        onClick={() => { const t = allItems.find(a => a.item_key === s.item_key); if (t) onNavigate(t); }}
                        style={{
                          padding: '6px 8px', borderRadius: 6, cursor: 'pointer',
                          background: isCurrent ? 'rgba(59,130,246,0.06)' : '#fff',
                          border: `1px solid ${isCurrent ? '#BFDBFE' : T.border}`,
                          transition: 'background .1s',
                        }}
                        onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = '#EDE7E0'; }}
                        onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = '#fff'; }}
                      >
                        <div style={{ fontFamily: T.mono, fontSize: 9, fontWeight: 700, color: T.text3 }}>{s.item_key}</div>
                        <div style={{ fontSize: 10, fontWeight: 500, color: T.text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ marginTop: 'auto' }}>
              <SidebarLabel>Actions</SidebarLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <button style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px',
                  borderRadius: 8, border: 'none', background: T.text2, color: '#fff',
                  fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'opacity .12s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                >
                  <span style={{ width: 20, height: 20, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, background: 'rgba(255,255,255,.15)' }}>↗</span>
                  Open in Hub
                </button>
                <button onClick={handleCopyKey} style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px',
                  borderRadius: 8, border: `1px solid ${T.border}`, background: 'var(--bg-app, #fff)',
                  color: T.text3, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  transition: 'background .12s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = T.warm; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
                >
                  <span style={{ width: 20, height: 20, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, background: T.warm }}>📋</span>
                  Copy Key
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes r360ModalIn {
          from { transform: scale(.97); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </>
  );
}

/* ─── Sub-components ─── */

function TagChip({ label }: { label: string }) {
  return (
    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: '#EDE7E0', color: '#3D3D56' }}>{label}</span>
  );
}

function SidebarLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--fg-3)', marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid var(--divider)' }}>
      {children}
    </div>
  );
}

function TimelineNode({ letter, label, color, active }: { letter: string; label: string; color: string; active: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: active ? color : '#fff', color: active ? '#fff' : color,
        border: `2px solid ${color}`, fontSize: 11, fontWeight: 800,
        boxShadow: active ? `0 0 0 3px ${color}33` : 'none',
        transition: 'all .15s',
      }}>{letter}</div>
      <span style={{ fontSize: 8, fontWeight: 700, color: active ? color : 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap' }}>{label}</span>
    </div>
  );
}

const PRI_MAP: Record<string, { icon: string; color: string; label: string }> = {
  Highest:  { icon: '⬆⬆', color: '#DC2626', label: 'Highest' },
  High:     { icon: '⬆', color: '#EA580C', label: 'High' },
  Medium:   { icon: '●', color: '#CA8A04', label: 'Medium' },
  Low:      { icon: '⬇', color: '#57534E', label: 'Low' },
  Lowest:   { icon: '⬇⬇', color: 'rgba(237,237,237,0.40)', label: 'Lowest' },
  Critical: { icon: '🔥', color: '#BE123C', label: 'Critical' },
};

function PriorityIndicator({ priority }: { priority?: string | null }) {
  if (!priority) return <span style={{ color: 'var(--fg-4)' }}>—</span>;
  const p = PRI_MAP[priority] ?? { icon: '●', color: '#6B6B80', label: priority };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: p.color }}>
      <span style={{ fontSize: 10 }}>{p.icon}</span> {p.label}
    </span>
  );
}