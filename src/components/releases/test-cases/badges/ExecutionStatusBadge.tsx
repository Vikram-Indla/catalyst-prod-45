/**
 * ExecutionStatusBadge — Test execution result status
 */

import { Lozenge, type LozengeAppearance } from '@/components/ads';

export type ExecutionStatus = 'passed' | 'failed' | 'blocked' | 'skipped' | 'pending' | 'not_run';

interface ExecutionStatusBadgeProps {
  status: ExecutionStatus;
  size?: 'sm' | 'default';
  showIcon?: boolean;
  className?: string;
}

const statusConfig: Record<ExecutionStatus, {
  label: string;
  appearance: LozengeAppearance;
}> = {
  passed: {
    label: 'Passed',
    appearance: 'success',
  },
  failed: {
    label: 'Failed',
    appearance: 'removed',
  },
  blocked: {
    label: 'Blocked',
    appearance: 'removed',
  },
  skipped: {
    label: 'Skipped',
    appearance: 'moved',
  },
  pending: {
    label: 'Pending',
    appearance: 'default',
  },
  not_run: {
    label: 'Not Run',
    appearance: 'default',
  },
};

export function ExecutionStatusBadge({
  status,
  className,
}: ExecutionStatusBadgeProps) {
  const config = statusConfig[status];

  if (className) {
    return (
      <span className={className}>
        <Lozenge appearance={config.appearance}>{config.label}</Lozenge>
      </span>
    );
  }

  return <Lozenge appearance={config.appearance}>{config.label}</Lozenge>;
}
