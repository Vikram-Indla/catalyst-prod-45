/**
 * StatusBadge — 3-color status system for ProjectHub Dashboard V3
 * Gray: start, in_requirements, in_design, ready_for_development
 * Blue: in_development, on_hold, in_qa, in_uat, in_entity_integration, technical_validation
 * Green: in_beta, end_to_end_testing, production_ready, beta_ready, in_production
 */

const GRAY_STATUSES = new Set(['start', 'in_requirements', 'in_design', 'ready_for_development']);
const BLUE_STATUSES = new Set(['in_development', 'on_hold', 'in_qa', 'in_uat', 'in_entity_integration', 'technical_validation']);
const GREEN_STATUSES = new Set(['in_beta', 'end_to_end_testing', 'production_ready', 'beta_ready', 'in_production']);

export type StatusColor = 'gray' | 'blue' | 'green';

export function getStatusColor(status: string): StatusColor {
  if (GREEN_STATUSES.has(status)) return 'green';
  if (BLUE_STATUSES.has(status)) return 'blue';
  return 'gray';
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
  return '#94A3B8';
}

const COLOR_MAP: Record<StatusColor, { bg: string; text: string }> = {
  gray: { bg: '#F1F5F9', text: '#475569' },
  blue: { bg: '#DBEAFE', text: '#1E40AF' },
  green: { bg: '#DCFCE7', text: '#166534' },
};

function formatLabel(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function StatusBadge({ status }: { status: string }) {
  const color = getStatusColor(status);
  const { bg, text } = COLOR_MAP[color];
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: 11,
        fontWeight: 500,
        fontFamily: "'Inter', sans-serif",
        padding: '2px 8px',
        borderRadius: 9999,
        background: bg,
        color: text,
        whiteSpace: 'nowrap',
        lineHeight: '18px',
      }}
    >
      {formatLabel(status)}
    </span>
  );
}
