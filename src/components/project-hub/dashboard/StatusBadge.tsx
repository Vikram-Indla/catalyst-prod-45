/**
 * StatusBadge — 3-color status system with dot + border for ProjectHub Dashboard V3
 * Gray: start, in_requirements, in_design, ready_for_development
 * Blue: in_development, on_hold, in_qa, in_uat, in_entity_integration, technical_validation
 * Green: in_beta, end_to_end_testing, production_ready, beta_ready, in_production
 */

const GRAY_STATUSES = new Set(['start', 'in_requirements', 'in_design', 'ready_for_development']);
const GREEN_STATUSES = new Set(['in_beta', 'end_to_end_testing', 'production_ready', 'beta_ready', 'in_production']);

export type StatusColor = 'gray' | 'blue' | 'green';

export function getStatusColor(status: string): StatusColor {
  if (GREEN_STATUSES.has(status)) return 'green';
  if (GRAY_STATUSES.has(status)) return 'gray';
  return 'blue';
}

export function getStatusCellBg(status: string): string {
  const c = getStatusColor(status);
  if (c === 'green') return '#F0FDF4';
  if (c === 'blue') return '#EFF6FF';
  return '#F8FAFC';
}

export function getStatusBarColor(status: string): string {
  const c = getStatusColor(status);
  if (c === 'green') return '#16A34A';
  if (c === 'blue') return '#2563EB';
  return '#64748B';
}

const COLOR_MAP: Record<StatusColor, { bg: string; text: string; border: string; dot: string }> = {
  gray: { bg: '#F1F5F9', text: '#334155', border: '#CBD5E1', dot: '#64748B' },
  blue: { bg: '#DBEAFE', text: '#1E3A8A', border: '#93C5FD', dot: '#2563EB' },
  green: { bg: '#DCFCE7', text: '#14532D', border: '#86EFAC', dot: '#16A34A' },
};

function formatLabel(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function StatusBadge({ status }: { status: string }) {
  const color = getStatusColor(status);
  const { bg, text, border, dot } = COLOR_MAP[color];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 10.5,
        fontWeight: 600,
        fontFamily: "'Inter', sans-serif",
        padding: '3px 10px',
        borderRadius: 9999,
        background: bg,
        color: text,
        border: `1px solid ${border}`,
        whiteSpace: 'nowrap',
        lineHeight: '16px',
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot, flexShrink: 0 }} />
      {formatLabel(status)}
    </span>
  );
}
