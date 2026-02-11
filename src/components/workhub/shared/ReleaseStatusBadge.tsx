/**
 * ReleaseStatusBadge — Pill with colored dot + status text
 */
import type { ReleaseStatus } from '@/types/workhub.types';

const CONFIG: Record<ReleaseStatus, { bg: string; text: string; dot: string }> = {
  Planned:   { bg: '#f1f5f9', text: '#475569', dot: '#94a3b8' },
  Active:    { bg: '#dbeafe', text: '#1d4ed8', dot: '#2563eb' },
  'At Risk': { bg: '#fee2e2', text: '#991b1b', dot: '#ef4444' },
  Completed: { bg: '#d1fae5', text: '#047857', dot: '#16a34a' },
  Cancelled: { bg: '#f1f5f9', text: '#475569', dot: '#64748b' },
};

export function ReleaseStatusBadge({ status }: { status: ReleaseStatus }) {
  const cfg = CONFIG[status] ?? CONFIG.Planned;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 10px', borderRadius: 'var(--wh-radius-full, 9999px)',
      background: cfg.bg, fontSize: 12, fontWeight: 600,
      color: cfg.text, textDecoration: status === 'Cancelled' ? 'line-through' : undefined,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
      {status}
    </span>
  );
}
