/**
 * StatusBadge — ProjectHub Dashboard
 * GUARDRAIL: Use StatusLozenge from @/components/ui/StatusLozenge for all status rendering.
 */
import { StatusLozenge } from '@/components/ui/StatusLozenge';

export type StatusColor = 'gray' | 'blue' | 'green';

export function getStatusColor(status: string): StatusColor {
  const GREEN_STATUSES = new Set(['in_beta', 'end_to_end_testing', 'production_ready', 'beta_ready', 'in_production']);
  const GRAY_STATUSES = new Set(['start', 'in_requirements', 'in_design', 'ready_for_development']);
  if (GREEN_STATUSES.has(status)) return 'green';
  if (GRAY_STATUSES.has(status)) return 'gray';
  return 'blue';
}

export function getStatusCellBg(status: string): string {
  const c = getStatusColor(status);
  if (c === 'green') return 'var(--sem-success-bg)';
  if (c === 'blue') return 'var(--cp-blue-wash)';
  return 'var(--bg-1)';
}

export function getStatusBarColor(status: string): string {
  const c = getStatusColor(status);
  if (c === 'green') return 'var(--sem-success)';
  if (c === 'blue') return 'var(--cp-blue)';
  return 'var(--fg-3)';
}

export default function StatusBadge({ status }: { status: string }) {
  return <StatusLozenge status={status} />;
}
