/**
 * AutomationBadge — Automation status indicator
 */

import { Lozenge, Tooltip, type LozengeAppearance } from '@/components/ads';

export type AutomationStatus = 'automated' | 'manual' | 'in_progress' | 'candidate';

interface AutomationBadgeProps {
  status: AutomationStatus;
  size?: 'sm' | 'default';
  showTooltip?: boolean;
  className?: string;
}

const statusConfig: Record<AutomationStatus, {
  label: string;
  shortLabel: string;
  tooltip: string;
  appearance: LozengeAppearance;
}> = {
  automated: {
    label: 'Automated',
    shortLabel: 'Auto',
    tooltip: 'This test case is fully automated',
    appearance: 'inprogress',
  },
  manual: {
    label: 'Manual',
    shortLabel: 'Manual',
    tooltip: 'This test case requires manual execution',
    appearance: 'default',
  },
  in_progress: {
    label: 'Automating',
    shortLabel: 'WIP',
    tooltip: 'Automation is in progress for this test case',
    appearance: 'inprogress',
  },
  candidate: {
    label: 'Candidate',
    shortLabel: 'Candidate',
    tooltip: 'This test case is a candidate for automation',
    appearance: 'default',
  },
};

export function AutomationBadge({
  status,
  size = 'default',
  showTooltip = true,
  className,
}: AutomationBadgeProps) {
  const config = statusConfig[status];
  const label = size === 'sm' ? config.shortLabel : config.label;

  const badge = className ? (
    <span className={className}>
      <Lozenge appearance={config.appearance}>{label}</Lozenge>
    </span>
  ) : (
    <Lozenge appearance={config.appearance}>{label}</Lozenge>
  );

  if (!showTooltip) return badge;

  return (
    <Tooltip position="top" content={<span className="text-xs">{config.tooltip}</span>}>
      {badge}
    </Tooltip>
  );
}
