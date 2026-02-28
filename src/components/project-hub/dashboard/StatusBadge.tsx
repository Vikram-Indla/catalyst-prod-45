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

export default function StatusBadge({ status }: { status: string }) {
  return <StatusLozenge status={status} />;
}
