/**
 * CatalystProgressTracker — ADS-canonical multi-step progress.
 * Replaces hand-rolled wizard steppers (import wizard, setup flows).
 */
import { ProgressTracker, type Stages } from '@atlaskit/progress-tracker';

interface CatalystProgressTrackerProps {
  stages: Array<{
    id: string;
    label: string;
    status: 'current' | 'visited' | 'unvisited' | 'disabled';
  }>;
}

export function CatalystProgressTracker({ stages }: CatalystProgressTrackerProps) {
  const items: Stages = stages.map((s) => ({
    id: s.id,
    label: s.label,
    percentageComplete: s.status === 'visited' ? 100 : s.status === 'current' ? 50 : 0,
    status: s.status,
  }));

  return <ProgressTracker items={items} />;
}
