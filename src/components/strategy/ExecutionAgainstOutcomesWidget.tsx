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
    <div className="flex items-center gap-1">
      <span className="w-2 h-2 rounded-full bg-red-500"></span>
      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
      <span className="w-2 h-2 rounded-full bg-green-500"></span>
    </div>
  );

  return (
    <>
      <PremiumCard className="h-full flex flex-col">
        <PremiumCardHeader title="Execution Health" action={legendAction} />
        <PremiumCardContent className="flex-1 py-2">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : !okrMetrics || !snapshotId ? (
            <div className="flex items-center justify-center h-full min-h-[80px]">
              <span className="text-[13px]" style={{ color: 'var(--text-3)' }}>
                Select a snapshot
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
                className="w-full flex items-center justify-between py-1.5 rounded transition-colors text-left focus:outline-none hover:bg-[var(--surface-2)]"
                style={{ borderBottom: '1px solid var(--divider)' }}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${getColorClass(objectivesColor)}`} />
                  <span className="text-[14px] font-medium" style={{ color: 'var(--text-1)' }}>Objectives</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[14px] font-bold ${getColorText(objectivesColor)}`}>
                    {okrMetrics.avgProgress}%
                  </span>
                  <span className="text-[13px] font-medium" style={{ color: 'var(--text-1)' }}>
                    {acceptedCount}/{okrMetrics.count}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5" style={{ color: 'var(--text-3)' }} />
                </div>
              </button>

              {themes.slice(0, 3).map((theme) => {
                const color = theme.objectives.length === 0 ? 'na' : getThresholdColor(theme.avgProgress);
                return (
                  <div
                    key={theme.themeId}
                    className="flex items-center justify-between py-1.5"
                    style={{ borderBottom: '1px solid var(--divider)' }}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${getColorClass(color)}`} />
                      <span className="text-[13px] truncate" style={{ color: 'var(--text-1)' }}>{theme.themeName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[13px] font-semibold ${getColorText(color)}`}>
                        {theme.avgProgress}%
                      </span>
                      <span className="text-[12px] font-medium min-w-[16px] text-right" style={{ color: 'var(--text-2)' }}>
                        {theme.objectives.length}
                      </span>
                    </div>
                  </div>
                );
              })}
              {themes.length > 3 && (
                <div className="text-center pt-1">
                  <span className="text-[11px] font-medium" style={{ color: 'var(--text-3)' }}>+{themes.length - 3} more</span>
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
