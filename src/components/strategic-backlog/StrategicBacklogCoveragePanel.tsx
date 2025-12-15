/**
 * Coverage & Gaps Panel for Strategic Backlog
 * Executive-grade strategy health metrics
 */
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertTriangle, Palette, Target, Boxes } from 'lucide-react';

interface CoveragePanelProps {
  themes: number;
  themesWithObjectives: number;
  objectives: number;
  objectivesWithKRs: number;
  epics: number;
  epicsAligned: number;
  onNavigate: (section: 'themes' | 'objectives' | 'epics') => void;
}

export function StrategicBacklogCoveragePanel({
  themes,
  themesWithObjectives,
  objectives,
  objectivesWithKRs,
  epics,
  epicsAligned,
  onNavigate,
}: CoveragePanelProps) {
  // Calculate coverage percentages
  const themesCoverage = themes > 0 ? Math.round((themesWithObjectives / themes) * 100) : 0;
  const objectivesCoverage = objectives > 0 ? Math.round((objectivesWithKRs / objectives) * 100) : 0;
  const epicsCoverage = epics > 0 ? Math.round((epicsAligned / epics) * 100) : 0;

  const metrics = [
    {
      id: 'themes' as const,
      label: 'Themes',
      icon: Palette,
      count: themes,
      coverageLabel: 'with objectives',
      coverageValue: themesWithObjectives,
      coveragePercent: themesCoverage,
      hasGap: themes > 0 && themesWithObjectives < themes,
      actionLabel: themes === 0 ? 'Create theme' : themesWithObjectives < themes ? 'Add objective' : null,
    },
    {
      id: 'objectives' as const,
      label: 'Objectives',
      icon: Target,
      count: objectives,
      coverageLabel: 'with key results',
      coverageValue: objectivesWithKRs,
      coveragePercent: objectivesCoverage,
      hasGap: objectives > 0 && objectivesWithKRs < objectives,
      actionLabel: objectives === 0 && themes > 0 ? 'Create objective' : null,
    },
    {
      id: 'epics' as const,
      label: 'Epics aligned',
      icon: Boxes,
      count: epicsAligned,
      coverageLabel: 'to themes',
      coverageValue: epicsAligned,
      coveragePercent: epicsCoverage,
      hasGap: epics > epicsAligned,
      actionLabel: epicsAligned === 0 && themes > 0 ? 'Link epic' : null,
    },
  ];

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
        Coverage & Gaps
      </h3>
      
      <div className="space-y-3">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const isComplete = !metric.hasGap && metric.count > 0;
          const needsAttention = metric.hasGap || metric.count === 0;

          return (
            <button
              key={metric.id}
              onClick={() => onNavigate(metric.id)}
              className={cn(
                "w-full flex items-center justify-between p-2.5 rounded-md transition-colors text-left",
                "hover:bg-[rgba(92,124,92,0.08)]",
                needsAttention && "bg-amber-50/50 dark:bg-amber-950/10"
              )}
            >
              <div className="flex items-center gap-2.5">
                <div className={cn(
                  "p-1.5 rounded-md",
                  isComplete ? "bg-secondary-green/10" : "bg-muted"
                )}>
                  <Icon className={cn(
                    "h-3.5 w-3.5",
                    isComplete ? "text-secondary-green" : "text-muted-foreground"
                  )} />
                </div>
                
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-foreground">
                      {metric.label}
                    </span>
                    <span className={cn(
                      "text-sm font-semibold",
                      isComplete ? "text-secondary-green" : "text-foreground"
                    )}>
                      {metric.count}
                    </span>
                  </div>
                  
                  {metric.count > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {metric.coverageValue} {metric.coverageLabel} ({metric.coveragePercent}%)
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isComplete && (
                  <CheckCircle2 className="h-4 w-4 text-secondary-green" />
                )}
                {needsAttention && metric.actionLabel && (
                  <span className="text-xs text-brand-gold font-medium">
                    {metric.actionLabel} →
                  </span>
                )}
                {needsAttention && !metric.actionLabel && metric.hasGap && (
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
