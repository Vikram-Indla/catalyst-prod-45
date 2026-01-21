// ════════════════════════════════════════════════════════════════════════════
// FEATURES TAB - Toggle space features
// ════════════════════════════════════════════════════════════════════════════

import { useSpaceFeatures, useToggleFeature } from '@/hooks/spaces';
import { cn } from '@/lib/utils';

interface FeaturesTabProps {
  spaceId: string;
}

const FEATURE_DESCRIPTIONS: Record<string, { title: string; description: string }> = {
  board_enabled: {
    title: 'Board View',
    description: 'Enable Kanban board view for work items',
  },
  backlog_enabled: {
    title: 'Backlog View',
    description: 'Enable backlog list view for work items',
  },
  timeline_enabled: {
    title: 'Timeline View',
    description: 'Enable Gantt-style timeline view',
  },
  reports_enabled: {
    title: 'Reports',
    description: 'Enable reporting and analytics dashboard',
  },
  automations_enabled: {
    title: 'Automations',
    description: 'Enable workflow automations',
  },
  time_tracking_enabled: {
    title: 'Time Tracking',
    description: 'Enable time tracking on work items',
  },
  estimation_enabled: {
    title: 'Estimation',
    description: 'Enable story points and estimation',
  },
};

export function FeaturesTab({ spaceId }: FeaturesTabProps) {
  const { data: features, isLoading } = useSpaceFeatures(spaceId);
  const toggleFeature = useToggleFeature();

  const handleToggle = (feature: string, currentValue: boolean) => {
    toggleFeature.mutate({
      spaceId,
      feature: feature as any,
      enabled: !currentValue,
    });
  };

  if (isLoading || !features) {
    return (
      <div className="p-6">
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded-md animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-4">
        <h3 className="font-medium text-foreground">Space Features</h3>
        <p className="text-sm text-muted-foreground">
          Enable or disable features for this space
        </p>
      </div>

      <div className="space-y-3">
        {Object.entries(FEATURE_DESCRIPTIONS).map(([key, info]) => {
          const isEnabled = (features as any)[key] ?? false;

          return (
            <div
              key={key}
              className="flex items-center justify-between p-4 bg-muted/30 rounded-lg"
            >
              <div>
                <div className="font-medium text-sm text-foreground">
                  {info.title}
                </div>
                <div className="text-xs text-muted-foreground">
                  {info.description}
                </div>
              </div>

              <button
                onClick={() => handleToggle(key, isEnabled)}
                className={cn(
                  'relative w-11 h-6 rounded-full transition-colors',
                  isEnabled ? 'bg-primary' : 'bg-muted'
                )}
              >
                <span
                  className={cn(
                    'absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform',
                    isEnabled && 'translate-x-5'
                  )}
                />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
