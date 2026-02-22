import React, { useEffect, useRef } from 'react';
import { useTransitions } from '@/hooks/useResource360';
import { HUB_COLORS, HUB_SHORT, STATUS_CATEGORY_COLORS, WIT_STYLES, PRIORITY_ICONS } from '@/constants/resource360';

interface ContextModalProps {
  item: any;
  onClose: () => void;
}

const ContextModal: React.FC<ContextModalProps> = ({ item, onClose }) => {
  const { data: transitions } = useTransitions(item?.id ?? null);
  const modalRef = useRef<HTMLDivElement>(null);

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

  const sc = STATUS_CATEGORY_COLORS[item.status_category as keyof typeof STATUS_CATEGORY_COLORS];
  const witStyle = WIT_STYLES[item.work_item_type] || { bg: '#F1F5F9', color: '#334155' };
  const hubColor = HUB_COLORS[item.source_hub] || '#64748B';
  const hubShort = HUB_SHORT[item.source_hub] || item.source_hub;

  const totalCycle = transitions?.length
    ? transitions.reduce((sum: number, t: any) => sum + (t.dwell_days || 0), 0)
    : item.age_days;

  const daysUntilDue = item.days_until_due;

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Work item details: ${item.item_key}`}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(15,23,42,0.4)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Inter', sans-serif",
        animation: 'fadeIn 200ms ease-out',
      }}
    >
      <div
        ref={modalRef}
        onClick={e => e.stopPropagation()}
        style={{
          background: '#FFFFFF', borderRadius: 12,
          width: 720, maxHeight: '85vh', overflow: 'auto',
          boxShadow: '0 8px 32px rgba(0,0,0,.18)',
          animation: 'scaleIn 250ms ease-out',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px', borderBottom: '1px solid #E2E8F0',
          display: 'flex', alignItems: 'flex-start', gap: 12,
        }}>
          <div style={{ flex: 1 }}>
            {item.parent_item_key && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#2563EB', fontWeight: 600 }}>
                  {item.parent_item_key}
                </span>
                {item.parent_summary && (
                  <span style={{ fontSize: 11, color: '#64748B' }}>
                    {item.parent_summary}
                  </span>
                )}
                <span style={{ fontSize: 10, color: '#94A3B8' }}>›</span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 15, fontWeight: 900, fontFamily: 'monospace', color: '#0F172A' }}>
                {item.item_key}
              </span>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0 }}>{item.title}</h2>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                background: witStyle.bg, color: witStyle.color,
              }}>
                {item.work_item_type}
              </span>
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
              {sc && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 12,
                  background: sc.bg, color: sc.text,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: sc.dot }} />
                  {item.status}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            style={{
              width: 32, height: 32, borderRadius: 8,
              border: '1px solid #E2E8F0', background: '#FFFFFF',
              cursor: 'pointer', fontSize: 16, color: '#64748B',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 24px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
          <Field label="Source Hub">
            <span style={{
              fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
              background: hubColor, color: '#FFFFFF',
            }}>
              {hubShort}
            </span>
          </Field>
          <Field label="Project">{item.project_name || '—'}</Field>
          <Field label="Reported By">{item.reporter_name || '—'}</Field>
          <Field label="Assigned Date">{item.assigned_date?.slice(0, 10) || '—'}</Field>
          <Field label="Priority">
            <span>{PRIORITY_ICONS[item.priority] || ''} {item.priority}</span>
          </Field>
          <Field label="Release">
            {item.release_key ? (
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6,
                border: '1.5px solid #0D9488', color: '#0D9488', background: '#F0FDFA',
              }}>
                {item.release_key}
                {item.release_end_date && <span style={{ fontWeight: 400, marginLeft: 6, fontSize: 10, color: '#64748B' }}>
                  ends {item.release_end_date.slice(0, 10)}
                </span>}
              </span>
            ) : <span style={{ color: '#64748B', fontSize: 12 }}>Not Assigned</span>}
          </Field>

          {/* Due Date */}
          <Field label="Due Date Countdown" span={2}>
            {daysUntilDue != null ? (
              <span style={{
                fontSize: 13, fontWeight: 700,
                color: daysUntilDue < 0 ? '#DC2626' : daysUntilDue <= 7 ? '#D97706' : '#059669',
              }}>
                {daysUntilDue < 0 ? `${Math.abs(daysUntilDue)}d overdue` : daysUntilDue === 0 ? 'Due today' : `${daysUntilDue}d remaining`}
              </span>
            ) : <span style={{ color: '#64748B', fontSize: 12 }}>No due date</span>}
          </Field>

          {/* Description */}
          <Field label="Description" span={2}>
            {item.description ? (
              <span style={{ fontSize: 12, color: '#334155', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                {item.description}
              </span>
            ) : <span style={{ color: '#64748B', fontSize: 12 }}>No description</span>}
          </Field>

          {/* Parent Details */}
          {item.parent_item_key && (
              <Field label="Parent Description" span={2}>
                {item.parent_description ? (
                  <span style={{ fontSize: 12, color: '#334155', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {item.parent_description}
                  </span>
                ) : <span style={{ color: '#64748B', fontSize: 12 }}>No description</span>}
              </Field>
          )}
        </div>

        {/* Transition Timeline */}
        {transitions && transitions.length > 0 && (
          <div style={{ padding: '0 24px 20px' }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748B', marginBottom: 10 }}>
              Status Transition Timeline
            </div>
            <div style={{ display: 'flex', gap: 0, borderRadius: 8, overflow: 'auto' }}>
              {transitions.map((t: any, i: number) => {
                const cat = STATUS_CATEGORY_COLORS[t.to_category as keyof typeof STATUS_CATEGORY_COLORS];
                const flex = Math.max(t.dwell_days || 1, 1);
                return (
                  <div key={t.id || i} style={{
                    flex, minWidth: 60,
                    padding: '8px 10px',
                    background: cat?.bg || '#F1F5F9',
                    borderRight: i < transitions.length - 1 ? '1px solid #FFFFFF' : 'none',
                  }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: cat?.text || '#334155', whiteSpace: 'nowrap' }}>{t.to_status}</div>
                    <div style={{ fontSize: 9.5, color: '#64748B', marginTop: 2 }}>
                      {t.dwell_days != null ? `${t.dwell_days}d` : '—'}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize: 11, color: '#475569', marginTop: 8, fontWeight: 600 }}>
              Total Cycle: {totalCycle}d
            </div>
          </div>
        )}
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  );
};

const Field = ({ label, children, span }: { label: string; children: React.ReactNode; span?: number }) => (
  <div style={{ gridColumn: span === 2 ? '1 / -1' : undefined }}>
    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748B', marginBottom: 4 }}>
      {label}
    </div>
    <div style={{ fontSize: 13, color: '#0F172A' }}>{children}</div>
  </div>
);

export default ContextModal;
