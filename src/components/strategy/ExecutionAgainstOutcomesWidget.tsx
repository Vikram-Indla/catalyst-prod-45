import { useState } from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight } from "lucide-react";
import { PremiumCard, PremiumCardHeader, PremiumCardContent } from '@/components/ui/premium-card';
import { useOKRv2StrategyMetrics } from "@/hooks/useOKRv2StrategyMetrics";
import { ExecutionDrilldownDrawer } from "./ExecutionDrilldownDrawer";
import { getThresholdColor, type ExecutionMetrics } from "@/hooks/useExecutionMetrics";

interface ExecutionAgainstOutcomesWidgetProps {
  snapshotId?: string;
  piIds?: string[];
}

export function ExecutionAgainstOutcomesWidget({ snapshotId }: ExecutionAgainstOutcomesWidgetProps) {
  const [selectedLevel, setSelectedLevel] = useState<ExecutionMetrics | null>(null);
  const { data: okrMetrics, isLoading } = useOKRv2StrategyMetrics(snapshotId);

  const getColorClass = (color: 'red' | 'yellow' | 'green' | 'na') => {
    switch (color) {
      case 'red': return 'bg-red-500';
      case 'yellow': return 'bg-amber-500';
      case 'green': return 'bg-green-500';
      default: return 'bg-muted';
    }
  };

  const getColorText = (color: 'red' | 'yellow' | 'green' | 'na') => {
    switch (color) {
      case 'red': return 'text-red-600';
      case 'yellow': return 'text-amber-600';
      case 'green': return 'text-green-600';
      default: return 'text-muted-foreground';
    }
  };

  const getObjectivesColor = (): 'red' | 'yellow' | 'green' | 'na' => {
    if (!okrMetrics || okrMetrics.count === 0) return 'na';
    return getThresholdColor(okrMetrics.avgProgress);
  };

  const getAcceptedCount = () => {
    if (!okrMetrics) return 0;
    return okrMetrics.objectives.filter(obj => 
      ['completed', 'accepted', 'done', 'closed'].includes(obj.status?.toLowerCase() || '')
    ).length;
  };

  const themeProgressData = () => {
    if (!okrMetrics) return [];
    
    const themeMap = new Map<string, { 
      themeId: string; 
      themeName: string; 
      objectives: typeof okrMetrics.objectives;
      avgProgress: number;
    }>();

    okrMetrics.objectives.forEach(obj => {
      if (!obj.theme_id) return;
      
      if (!themeMap.has(obj.theme_id)) {
        themeMap.set(obj.theme_id, {
          themeId: obj.theme_id,
          themeName: obj.theme_name || 'Unknown Theme',
          objectives: [],
          avgProgress: 0,
        });
      }
      themeMap.get(obj.theme_id)!.objectives.push(obj);
    });

    themeMap.forEach(theme => {
      if (theme.objectives.length > 0) {
        const total = theme.objectives.reduce((sum, obj) => sum + obj.overall_progress, 0);
        theme.avgProgress = Math.round(total / theme.objectives.length);
      }
    });

    return Array.from(themeMap.values());
  };

  const themes = themeProgressData();
  const objectivesColor = getObjectivesColor();
  const acceptedCount = getAcceptedCount();

  // Compact pill legend
  const legendAction = (
    <div className="flex items-center gap-1.5">
      <span 
        className="px-1.5 py-0.5 rounded text-[10px] font-medium"
        style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'rgb(220, 38, 38)' }}
      >
        ≤39%
      </span>
      <span 
        className="px-1.5 py-0.5 rounded text-[10px] font-medium"
        style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'rgb(217, 119, 6)' }}
      >
        40-69%
      </span>
      <span 
        className="px-1.5 py-0.5 rounded text-[10px] font-medium"
        style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: 'rgb(22, 163, 74)' }}
      >
        ≥70%
      </span>
    </div>
  );

  return (
    <>
      <PremiumCard className="h-full flex flex-col">
        <PremiumCardHeader title="Execution" action={legendAction} />
        <PremiumCardContent className="flex-1">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !okrMetrics || !snapshotId ? (
            <div className="flex items-center justify-center h-full min-h-[120px]">
              <span className="text-sm" style={{ color: 'var(--text-3)' }}>
                Select a snapshot to view metrics
              </span>
            </div>
          ) : (
            <div className="space-y-0">
              <button
                onClick={() => setSelectedLevel({
                  level: 'objectives',
                  levelLabel: 'Strategic Objectives',
                  alignedAccepted: acceptedCount,
                  alignedTotal: okrMetrics.count,
                  percentage: okrMetrics.avgProgress,
                  color: objectivesColor,
                })}
                className="w-full flex items-center justify-between py-2.5 rounded transition-colors text-left focus:outline-none hover:bg-[var(--surface-2)]"
                style={{ borderBottom: '1px solid var(--divider)' }}
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${getColorClass(objectivesColor)}`} />
                  <span className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>Objectives</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-bold ${getColorText(objectivesColor)}`}>
                    {okrMetrics.avgProgress}%
                  </span>
                  <span className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>
                    {acceptedCount}/{okrMetrics.count}
                  </span>
                  <ChevronRight className="h-4 w-4" style={{ color: 'var(--text-3)' }} />
                </div>
              </button>

              {themes.slice(0, 3).map((theme) => {
                const color = theme.objectives.length === 0 ? 'na' : getThresholdColor(theme.avgProgress);
                return (
                  <div
                    key={theme.themeId}
                    className="flex items-center justify-between py-2.5"
                    style={{ borderBottom: '1px solid var(--divider)' }}
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${getColorClass(color)}`} />
                      <span className="text-sm truncate" style={{ color: 'var(--text-1)' }}>{theme.themeName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-semibold ${getColorText(color)}`}>
                        {theme.avgProgress}%
                      </span>
                      <span className="text-xs font-medium min-w-[16px] text-right" style={{ color: 'var(--text-2)' }}>
                        {theme.objectives.length}
                      </span>
                    </div>
                  </div>
                );
              })}
              {themes.length > 3 && (
                <div className="text-center py-2">
                  <span className="text-xs font-medium" style={{ color: 'var(--text-3)' }}>+{themes.length - 3} more themes</span>
                </div>
              )}
            </div>
          )}
        </PremiumCardContent>
      </PremiumCard>

      <ExecutionDrilldownDrawer
        open={!!selectedLevel}
        onClose={() => setSelectedLevel(null)}
        level={selectedLevel}
        snapshotId={snapshotId}
      />
    </>
  );
}
