/**
 * R360 Drawer — Shared constants, types, and small helper components
 * Extracted from R360ProfileDrawer.tsx for reuse across tab sub-components
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Inbox } from 'lucide-react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { fetchItemDetail, calcDaysSitting } from '@/lib/r360/fetchItemDetail';

// ── Colour tokens ──
export const INK1 = '#0F172A';
export const INK2 = '#334155';
export const INK4 = '#64748B';
export const MUTED = '#94A3B8';
export const SUCCESS = '#16A34A';
export const WARNING = '#D97706';
export const DANGER = '#DC2626';
export const BRAND = '#2563EB';
export const BORDER = 'rgba(15,23,42,0.12)';
export const BORDER_LIGHT = 'rgba(15,23,42,0.06)';
export const SLATE = '#64748B';

export const TYPE_COLORS: Record<string, { color: string; opacity: number }> = {
  Bug:      { color: '#FF5630', opacity: 0.75 },
  Story:    { color: '#36B37E', opacity: 0.80 },
  Subtask:  { color: '#2684FF', opacity: 0.75 },
  Incident: { color: '#FF5630', opacity: 0.50 },
};

// ── Panel stack types ──
export type PanelView =
  | { type: 'list'; label: string; items: any[] }
  | { type: 'detail'; itemKey: string };

export type TabKey = 'overview' | 'behavioural' | 'weekly' | 'items';

// ── Small shared components ──
export function Skeleton({ h = 20, w = '100%', r = 4 }: { h?: number; w?: string | number; r?: number }) {
  return (
    <div style={{
      height: h, width: w, borderRadius: r, background: 'var(--divider)',
      animation: 'pulse 1.5s ease-in-out infinite',
    }} />
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: 'var(--cp-font-body)', fontSize: 11, fontWeight: 500,
      textTransform: 'uppercase', letterSpacing: '0.05em', color: INK4, marginBottom: 12,
    }}>{children}</div>
  );
}

export function R360StatusLozenge({ status }: { status: string }) {
  const s = (status ?? '').toLowerCase().replace(/[\s_-]/g, '');
  let bg = '#DFE1E6';
  let color = '#42526E';
  if (['done', 'closed', 'completed', 'approved', 'resolved'].includes(s)) {
    bg = '#1B7F37'; color = '#FFFFFF';
  } else if (['inprogress', 'inreview', 'active', 'started'].includes(s)) {
    bg = '#0C66E4'; color = '#FFFFFF';
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      backgroundColor: bg, color,
      fontSize: '11px', fontWeight: 700,
      letterSpacing: '0.03em', textTransform: 'uppercase' as const,
      padding: '0 6px', height: '20px', borderRadius: '4px',
      lineHeight: '20px', whiteSpace: 'nowrap' as const,
      fontFamily: 'var(--cp-font-body)',
    }}>
      {(status || '').toUpperCase()}
    </span>
  );
}

// ── FilteredListPanel ──
export function FilteredListPanel({
  label, items, onBack, onItemClick,
}: {
  label: string;
  items: any[];
  onBack: () => void;
  onItemClick: (item: any) => void;
}) {
  const relTime = (ds: string) => {
    const d = Math.floor((Date.now() - new Date(ds).getTime()) / 86400000);
    if (d === 0) return 'Today';
    if (d === 1) return '1d ago';
    return `${d}d ago`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        height: 48, flexShrink: 0, borderBottom: '0.75px solid var(--divider)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px',
      }}>
        <button onClick={onBack} style={{
          display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none',
          border: 'none', cursor: 'pointer', padding: 0,
        }}>
          <ChevronLeft size={16} color={INK4} />
          <span style={{ fontSize: 13, color: INK2 }}>Back</span>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: INK1 }}>{label}</span>
          <span style={{
            display: 'inline-flex', alignItems: 'center',
            backgroundColor: '#DFE1E6', color: '#42526E',
            fontSize: '11px', fontWeight: 700, padding: '0 6px', height: '20px', borderRadius: '4px',
          }}>{items.length} item{items.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {items.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 8, padding: '48px 16px',
          }}>
            <Inbox size={24} color={MUTED} />
            <span style={{ fontSize: 13, color: INK4 }}>No items found</span>
          </div>
        ) : (
          items.map((item: any, idx: number) => (
            <div
              key={item.id || idx}
              onClick={() => onItemClick(item)}
              style={{
                display: 'flex', alignItems: 'center', height: 50, padding: '8px 12px', gap: 8,
                borderBottom: idx < items.length - 1 ? '0.75px solid var(--divider)' : 'none',
                background: 'var(--bg-app)', cursor: 'pointer', transition: 'background 120ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.03)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-app)'; }}
            >
              <span style={{ width: 20, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                <JiraIssueTypeIcon type={item.work_item_type || 'Task'} size={16} />
              </span>
              <span style={{ fontSize: 12, fontFamily: 'var(--cp-font-mono)', color: INK4, flexShrink: 0 }}>{item.item_key}</span>
              <span style={{
                flex: 1, fontSize: 13, color: INK2, overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
              }}>{item.title}</span>
              <R360StatusLozenge status={item.status || item.status_category || 'To Do'} />
              <span style={{ fontSize: 11, color: MUTED, flexShrink: 0 }}>{relTime(item.updated_at)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── ItemDetailPanel ──
export function ItemDetailPanel({
  itemKey, onBack, backLabel,
}: {
  itemKey: string;
  onBack: () => void;
  backLabel: string;
}) {
  const { data: detail, isLoading } = useQuery({
    queryKey: ['r360-item-detail', itemKey],
    queryFn: () => fetchItemDetail(itemKey),
    enabled: !!itemKey,
    staleTime: 2 * 60 * 1000,
  });

  const relTime = (ds: string | null) => {
    if (!ds) return '—';
    const d = Math.floor((Date.now() - new Date(ds).getTime()) / 86400000);
    if (d === 0) return 'Today';
    if (d === 1) return '1d ago';
    return `${d}d ago`;
  };

  const daysSitting = detail ? calcDaysSitting(detail.assignedAt, detail.resolution) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        height: 48, flexShrink: 0, borderBottom: '0.75px solid var(--divider)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px',
      }}>
        <button onClick={onBack} style={{
          display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none',
          border: 'none', cursor: 'pointer', padding: 0,
        }}>
          <ChevronLeft size={16} color={INK4} />
          <span style={{ fontSize: 13, color: INK2 }}>{backLabel}</span>
        </button>
        <span style={{ fontSize: 12, fontFamily: 'var(--cp-font-mono)', color: INK4 }}>{itemKey}</span>
      </div>
      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Skeleton h={20} w="40%" />
            <Skeleton h={28} w="80%" />
            <Skeleton h={16} w="50%" />
            <Skeleton h={120} />
          </div>
        ) : !detail ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '48px 0' }}>
            <Inbox size={24} color={MUTED} />
            <span style={{ fontSize: 13, color: INK4 }}>Item not found</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Type + Key */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <JiraIssueTypeIcon type={detail.type || 'Task'} size={16} />
              <span style={{ fontSize: 13, fontFamily: 'var(--cp-font-mono)', color: INK4 }}>{detail.key}</span>
            </div>

            {/* Title */}
            <div style={{ fontSize: 16, fontWeight: 650, color: INK1, lineHeight: 1.4 }}>{detail.title}</div>

            {/* Status + Priority */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <R360StatusLozenge status={detail.status} />
              <span style={{ fontSize: 12, color: INK4 }}>Priority: {detail.priority}</span>
            </div>

            {/* Metadata grid */}
            <div style={{ border: '1px solid var(--divider)', borderRadius: 8, overflow: 'hidden' }}>
              {[
                { label: 'Project', value: detail.projectName },
                { label: 'Assignee', value: detail.assigneeName },
                { label: 'Assigned', value: relTime(detail.assignedAt) },
                { label: 'Days Sitting', value: `${daysSitting}d` },
                ...(detail.releaseName ? [{ label: 'Release', value: detail.releaseName }] : []),
                ...(detail.dueDate ? [{ label: 'Due Date', value: new Date(detail.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }] : []),
                ...(detail.sprintName ? [{ label: 'Release', value: detail.sprintName }] : []),
                ...(detail.resolution ? [{ label: 'Resolution', value: detail.resolution }] : []),
              ].map((row, i, arr) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  height: 50, padding: '0 14px',
                  borderBottom: i < arr.length - 1 ? '0.75px solid var(--divider)' : 'none',
                }}>
                  <span style={{ fontSize: 12, color: INK4 }}>{row.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: INK1 }}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* Parent */}
            {detail.parentKey && (
              <div style={{ border: '1px solid var(--divider)', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: INK4, marginBottom: 6 }}>PARENT</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, fontFamily: 'var(--cp-font-mono)', color: INK4 }}>{detail.parentKey}</span>
                  <span style={{ fontSize: 13, color: INK2 }}>{detail.parentName || '—'}</span>
                </div>
              </div>
            )}

            {/* Days Sitting Progress */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: INK4, marginBottom: 6 }}>TIME IN ASSIGNMENT</div>
              <div style={{ height: 6, borderRadius: 4, background: 'var(--divider)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 4,
                  width: `${Math.min((daysSitting / 30) * 100, 100)}%`,
                  background: daysSitting >= 29 ? DANGER : daysSitting >= 15 ? WARNING : SUCCESS,
                  transition: 'width 300ms',
                }} />
              </div>
              <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{daysSitting}d sitting · {daysSitting >= 29 ? 'Critical' : daysSitting >= 15 ? 'Aging' : 'Healthy'}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
