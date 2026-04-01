import React, { useEffect, useRef, useState } from 'react';
import { useTransitions } from '@/hooks/useResource360';
import { HUB_COLORS, HUB_SHORT, WIT_STYLES, PRIORITY_ICONS } from '@/constants/resource360';
import { getStatusCategory, SC_COLORS } from '@/utils/statusCategory';

interface ContextModalProps {
  item: any;
  onClose: () => void;
}

function deriveHub(item: any): string {
  if (item.source_hub && item.source_hub !== 'ProjectHub') return item.source_hub;
  const type = (item.work_item_type || '').toLowerCase();
  if (['test case', 'test plan'].includes(type)) return 'TestHub';
  if (['incident'].includes(type)) return 'IncidentHub';
  if (['task'].includes(type)) return 'TaskHub';
  return item.source_hub || 'ProjectHub';
}

const MetaField = ({ label, children, span }: { label: string; children: React.ReactNode; span?: number }) => (
  <div style={{ gridColumn: span === 2 ? '1 / -1' : undefined }}>
    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-2)', marginBottom: 4 }}>
      {label}
    </div>
    <div style={{ fontSize: 13, color: 'var(--fg-1)' }}>{children}</div>
  </div>
);

const ContextModal: React.FC<ContextModalProps> = ({ item, onClose }) => {
  const { data: transitions } = useTransitions(item?.id ?? null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [showParentDesc, setShowParentDesc] = useState(false);

  // ESC to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Focus trap
  useEffect(() => {
    const el = modalRef.current;
    if (!el) return;
    const focusables = el.querySelectorAll<HTMLElement>('button, [tabindex]:not([tabindex="-1"]), a');
    if (focusables.length) focusables[0].focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', trap);
    return () => window.removeEventListener('keydown', trap);
  }, []);

  if (!item) return null;

  const sc = getStatusCategory(item.status_category || item.status);
  const colors = SC_COLORS[sc];
  const witStyle = WIT_STYLES[item.work_item_type] || { bg: 'var(--bg-3)', color: 'var(--fg-2)' };
  const hub = deriveHub(item);
  const hubColor = HUB_COLORS[hub] || '#64748B';
  const hubShort = HUB_SHORT[hub] || hub;

  const ageDays = item.age_days;
  const daysUntilDue = item.days_until_due;

  const description = item.description && item.description !== 'No description' ? item.description : null;
  const parentDescription = item.parent_description || null;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={`Work item details: ${item.item_key}`}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(15,23,42,0.45)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Inter', sans-serif",
        animation: 'ctxFadeIn 200ms ease-out',
      }}
    >
      <div
        ref={modalRef}
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--cp-float)', borderRadius: 12,
          width: 720, maxHeight: '85vh', overflow: 'auto',
          boxShadow: '0 8px 32px rgba(0,0,0,.18)',
          animation: 'ctxModalIn 250ms ease-out',
        }}
      >
        {/* ── Header ── */}
        <div style={{
          padding: '20px 24px 16px', borderBottom: '1px solid var(--divider)',
          display: 'flex', alignItems: 'flex-start', gap: 12,
        }}>
          <div style={{ flex: 1 }}>
            {/* Parent breadcrumb */}
            {item.parent_item_key && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--cp-blue)', fontWeight: 600 }}>
                  {item.parent_item_key}
                </span>
                {item.parent_summary && (
                  <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>
                    {item.parent_summary}
                  </span>
                )}
                <span style={{ fontSize: 10, color: 'var(--fg-4)' }}>›</span>
              </div>
            )}

            {/* Title row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 15, fontWeight: 900, fontFamily: 'monospace', color: 'var(--fg-1)' }}>
                    {item.item_key}
                  </span>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg-1)', margin: 0 }}>{item.title}</h2>
                </div>
                <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {/* WIT badge */}
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                    background: witStyle.bg, color: witStyle.color,
                  }}>
                    {item.work_item_type}
                  </span>
                  {/* Status pill */}
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 12,
                    background: colors.bg, color: colors.text,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: colors.dot }} />
                    {item.status}
                  </span>
                  {/* Priority */}
                  <span style={{ fontSize: 11, color: 'var(--fg-2)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    {PRIORITY_ICONS[item.priority] || ''} {item.priority}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="Close modal"
            style={{
              width: 32, height: 32, borderRadius: 8,
              border: '1px solid var(--divider)', background: 'var(--cp-float)',
              cursor: 'pointer', fontSize: 16, color: 'var(--fg-3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >✕</button>
        </div>

        {/* ── 2-Column Metadata Grid ── */}
        <div style={{ padding: '16px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
          <MetaField label="Source Hub">
            <span style={{
              fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
              background: hubColor, color: '#FFFFFF',
            }}>
              {hubShort}
            </span>
          </MetaField>
          <MetaField label="Project">{item.project_name || '—'}</MetaField>
          <MetaField label="Reported By">{item.reporter_name || '—'}</MetaField>
          <MetaField label="Release">
            {item.release_key ? (
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6,
                border: '1.5px solid #0D9488', color: '#0D9488', background: '#F0FDFA',
              }}>
                {item.release_key}
                {item.release_end_date && (
                  <span style={{ fontWeight: 400, marginLeft: 6, fontSize: 10, color: 'var(--fg-3)' }}>
                    ends {item.release_end_date.slice(0, 10)}
                  </span>
                )}
              </span>
            ) : <span style={{ color: 'var(--fg-3)', fontSize: 12 }}>—</span>}
          </MetaField>
          <MetaField label="Age">
            <span style={{ fontWeight: 700, color: ageDays != null && ageDays > 14 ? 'var(--sem-danger)' : ageDays != null && ageDays > 7 ? 'var(--sem-warning)' : '#059669' }}>
              {ageDays != null ? `${ageDays}d` : '—'}
            </span>
          </MetaField>
          <MetaField label="Due Date">
            {daysUntilDue != null ? (
              <span style={{
                fontSize: 13, fontWeight: 700,
                color: daysUntilDue < 0 ? 'var(--sem-danger)' : daysUntilDue <= 7 ? 'var(--sem-warning)' : '#059669',
              }}>
                {daysUntilDue < 0 ? `${Math.abs(daysUntilDue)}d overdue` : daysUntilDue === 0 ? 'Due today' : `${daysUntilDue}d remaining`}
              </span>
            ) : <span style={{ color: 'var(--fg-3)', fontSize: 12 }}>No due date</span>}
          </MetaField>
        </div>

        {/* ── Status Transition Timeline ── */}
        <div style={{ padding: '0 24px 16px' }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-2)', marginBottom: 10 }}>
            Status Transition Timeline
          </div>
          {transitions && transitions.length > 0 ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflow: 'auto', borderRadius: 8 }}>
                {transitions.map((t: any, i: number) => {
                  const tsc = getStatusCategory(t.to_category || t.to_status);
                  const tColors = SC_COLORS[tsc];
                  const minWidth = Math.max(60, Math.min(180, (t.dwell_days || 1) * 8));
                  return (
                    <React.Fragment key={t.id || i}>
                      <div style={{
                        minWidth, padding: '8px 10px',
                        background: tColors.bg,
                        borderRight: i < transitions.length - 1 ? '2px solid var(--bg-app)' : 'none',
                      }}>
                        <div style={{ fontSize: 10.5, fontWeight: 700, color: tColors.text, whiteSpace: 'nowrap' }}>{t.to_status}</div>
                        <div style={{ fontSize: 9.5, color: 'var(--fg-3)', marginTop: 2 }}>
                          {t.dwell_days != null ? `${t.dwell_days}d` : '—'}
                        </div>
                      </div>
                      {i < transitions.length - 1 && (
                        <span style={{ fontSize: 10, color: 'var(--fg-4)', padding: '0 2px' }}>→</span>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
              <div style={{ fontSize: 11, color: 'var(--fg-2)', marginTop: 8, fontWeight: 600 }}>
                Total: {transitions.reduce((sum: number, t: any) => sum + (t.dwell_days || 0), 0)}d
              </div>
            </>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--fg-4)', fontStyle: 'italic' }}>
              No transition history available
            </div>
          )}
        </div>

        {/* ── Description (capped) ── */}
        {description && (
          <div style={{ padding: '0 24px 16px' }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-2)', marginBottom: 6 }}>
              Description
            </div>
            <div style={{
              fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.6,
              position: 'relative',
              ...(!showFullDesc && description.length > 200 ? {
                maxHeight: '4.8em', overflow: 'hidden',
              } : {}),
            }}>
              {description}
              {!showFullDesc && description.length > 200 && (
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, height: 32,
                  background: 'linear-gradient(transparent, var(--cp-float))',
                }} />
              )}
            </div>
            {description.length > 200 && (
              <button onClick={() => setShowFullDesc(!showFullDesc)} style={{
                fontSize: 11, fontWeight: 600, color: 'var(--cp-blue)', background: 'none',
                border: 'none', cursor: 'pointer', padding: '4px 0', marginTop: 2,
              }}>
                {showFullDesc ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        )}

        {/* ── Parent description (collapsed by default) ── */}
        {parentDescription && item.parent_item_key && (
          <div style={{ padding: '0 24px 20px' }}>
            <button onClick={() => setShowParentDesc(!showParentDesc)} style={{
              fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', background: 'none',
              border: 'none', cursor: 'pointer', padding: '4px 0',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              {showParentDesc ? '▲' : '▼'} Show parent description ({item.parent_item_key})
            </button>
            {showParentDesc && (
              <div style={{
                fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.6, marginTop: 6,
                padding: '8px 12px', background: 'var(--bg-1)', borderRadius: 6,
                maxHeight: 200, overflow: 'auto',
              }}>
                {parentDescription}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes ctxFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes ctxModalIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  );
};

export default ContextModal;
