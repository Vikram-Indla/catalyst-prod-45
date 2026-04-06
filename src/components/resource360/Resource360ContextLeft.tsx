import React from 'react';
import type { Resource360Item } from '@/types/resource360';
import { getStatusCategory, STATUS_COLORS, WH_HUB_COLORS } from '@/types/resource360';

interface Props {
  item: Resource360Item;
  onClose: () => void;
}

export function Resource360ContextLeft({ item, onClose }: Props) {
  const cat = getStatusCategory(item.status, item.status_category);
  const sc = STATUS_COLORS[cat];
  const hubColor = WH_HUB_COLORS[item.hub] ?? 'rgba(237,237,237,0.40)';

  const dueStr = item.release_end_date ?? '2026-03-30';
  const dueDate = new Date(dueStr);
  const today = new Date();
  const daysLeft = Math.ceil((dueDate.getTime() - today.getTime()) / 86400000);
  const dueColor = daysLeft < 0 ? 'var(--sem-danger)' : daysLeft <= 7 ? 'var(--sem-warning)' : '#059669';
  const dueText = daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`;

  const transitions: { status: string; days: number }[] = Array.isArray(item.status_transitions)
    ? item.status_transitions
    : [];
  const totalCycle = item.total_cycle_days ?? 0;

  const typeColors: Record<string, { bg: string; text: string }> = {
    Epic:        { bg: '#DBEAFE', text: '#2563EB' },
    Feature:     { bg: '#CCFBF1', text: '#0D9488' },
    Story:       { bg: '#F3F4F6', text: '#6B7280' },
    Subtask:     { bg: '#F3F4F6', text: '#6B7280' },
    Bug:         { bg: 'rgba(248,113,113,0.10)', text: '#DC2626' },
    Incident:    { bg: 'rgba(248,113,113,0.10)', text: '#EF4444' },
    Task:        { bg: '#F3F4F6', text: 'rgba(237,237,237,0.40)' },
    'Test Case': { bg: 'rgba(251,191,36,0.10)', text: '#D97706' },
  };
  const tc = typeColors[item.item_type] ?? { bg: '#F3F4F6', text: '#6B7280' };

  return (
    <div className="flex flex-col flex-1 min-w-0" style={{ borderRight: '1px solid #F0F0F3' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg-3)', fontFamily: "'Inter', monospace" }}>
            {item.item_key}
          </span>
          <span
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 11, fontWeight: 600,
              color: sc.text, background: sc.bg,
              padding: '2px 8px', borderRadius: 4,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: sc.dot }} />
            {item.status}
          </span>
          <span
            style={{
              fontSize: 10, fontWeight: 600, letterSpacing: '0.03em',
              color: tc.text, background: tc.bg,
              padding: '2px 7px', borderRadius: 4,
            }}
          >
            {item.item_type}
          </span>
        </div>

        <button
          onClick={onClose}
          style={{
            width: 28, height: 28, borderRadius: 6, border: 'none',
            background: 'transparent', cursor: 'pointer',
            fontSize: 16, color: 'var(--fg-4)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            transition: 'all 120ms',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = '#F3F4F6';
            (e.currentTarget as HTMLElement).style.color = '#111827';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
            (e.currentTarget as HTMLElement).style.color = 'var(--fg-4)';
          }}
        >
          ✕
        </button>
      </div>

      {/* Title */}
      <div className="px-6 pb-3">
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg-1)', lineHeight: 1.35, margin: 0, fontFamily: 'Geist, -apple-system, sans-serif' }}>
          {item.title}
        </h2>
      </div>

      {/* Body — scrollable */}
      <div className="flex-1 overflow-y-auto px-6 pb-6" style={{ fontFamily: 'Geist, -apple-system, sans-serif' }}>
        {/* Properties */}
        <div style={{ marginBottom: 20 }}>
          <PropertyRow label="Hub">
            <span style={{ fontSize: 12, fontWeight: 600, color: hubColor }}>{item.hub}</span>
          </PropertyRow>
          <PropertyRow label="Project">
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-2)' }}>{item.project_name ?? '—'}</span>
          </PropertyRow>
          <PropertyRow label="Reported By">
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-2)' }}>{item.assigner_name ?? '—'}</span>
          </PropertyRow>
          <PropertyRow label="Assigned">
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-2)' }}>{item.assigned_at?.slice(0, 10) ?? '—'}</span>
          </PropertyRow>
          <PropertyRow label="Release">
            <div className="flex flex-col">
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-2)' }}>{item.release_name ?? '—'}</span>
              <span style={{ fontSize: 10, color: 'var(--fg-4)' }}>ends {dueStr}</span>
            </div>
          </PropertyRow>
          <PropertyRow label="Due" isLast>
            <span style={{ fontSize: 12, fontWeight: 600, color: dueColor }}>{dueText}</span>
          </PropertyRow>
        </div>

        {/* Status Timeline */}
        {transitions.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--fg-4)', textTransform: 'uppercase' as const, marginBottom: 8 }}>
              Status Timeline
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              {transitions.map((tr, i) => {
                const trCat = getTransitionCategory(tr.status);
                const trSc = STATUS_COLORS[trCat];
                return (
                  <div key={i} className="flex items-center gap-1">
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 3,
                      fontSize: 10, fontWeight: 600,
                      color: trSc.text, background: trSc.bg,
                      padding: '2px 7px', borderRadius: 4,
                    }}>
                      {tr.status}
                    </span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--fg-4)', fontFamily: "'Inter', monospace" }}>
                      {tr.days}d
                    </span>
                    {i < transitions.length - 1 && (
                      <span style={{ color: 'rgba(237,237,237,0.53)', fontSize: 10 }}>→</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {transitions.length === 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--fg-4)', textTransform: 'uppercase' as const, marginBottom: 8 }}>
              Status Timeline
            </div>
            <div style={{ fontSize: 12, color: 'var(--fg-4)', fontStyle: 'italic' }}>
              No transition history available
            </div>
          </div>
        )}

        {/* Cycle time */}
        <div className="flex items-center gap-2" style={{ marginTop: 8 }}>
          <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--fg-1)', fontFamily: "'Inter', sans-serif", lineHeight: 1 }}>
            {totalCycle}
          </span>
          <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-4)', lineHeight: 1.2 }}>
            days<br />cycle time
          </span>
        </div>
      </div>
    </div>
  );
}

function PropertyRow({
  label,
  children,
  isLast = false,
}: {
  label: string;
  children: React.ReactNode;
  isLast?: boolean;
}) {
  return (
    <div
      className="flex items-start justify-between py-2"
      style={{
        borderBottom: isLast ? 'none' : '1px solid #F5F5F7',
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-4)', minWidth: 80, flexShrink: 0 }}>
        {label}
      </span>
      <div style={{ textAlign: 'right' }}>
        {children}
      </div>
    </div>
  );
}

function getTransitionCategory(status: string): 'todo' | 'progress' | 'done' {
  if (/QA|Beta|Production|Resolved|Done|Closed/i.test(status)) return 'done';
  if (/Development|Design|Investigation|Progress|Execution|Fix|Review/i.test(status)) return 'progress';
  return 'todo';
}
