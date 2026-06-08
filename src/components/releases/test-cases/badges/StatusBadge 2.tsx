/**
 * StatusBadge — Test case status
 * GUARDRAIL: Use StatusLozenge from @/components/ui/StatusLozenge for all status rendering.
 */
import { StatusLozenge } from '@/components/ui/StatusLozenge';

export type TestCaseStatus = 'draft' | 'ready' | 'approved' | 'deprecated';

interface StatusBadgeProps {
  status: TestCaseStatus;
  size?: 'sm' | 'default';
  className?: string;
}

export function StatusBadge({ status, size, className }: StatusBadgeProps) {
  return <StatusLozenge status={status} />;
}
