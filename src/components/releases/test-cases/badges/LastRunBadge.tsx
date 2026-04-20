/**
 * LastRunBadge — Test execution result indicator
 */

import { Lozenge, type LozengeAppearance } from '@/components/ads';

export type LastRunStatus = 'passed' | 'failed' | 'not_run';

interface LastRunBadgeProps {
  status: LastRunStatus;
  size?: 'sm' | 'default';
  className?: string;
}

const statusConfig: Record<LastRunStatus, {
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
  not_run: {
    label: 'Not Run',
    appearance: 'default',
  },
};

export function LastRunBadge({ status, className }: LastRunBadgeProps) {
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
