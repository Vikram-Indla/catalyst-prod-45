import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight, Target, AlertCircle, Info, Layers } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
      case 'red': return 'text-red-700';
      case 'yellow': return 'text-amber-700';
      case 'green': return 'text-green-700';
      default: return 'text-muted-foreground';
    }
  };

  // Calculate color based on average progress
  const getObjectivesColor = (): 'red' | 'yellow' | 'green' | 'na' => {
    if (!okrMetrics || okrMetrics.count === 0) return 'na';
    return getThresholdColor(okrMetrics.avgProgress);
  };

  // Calculate accepted objectives (completed/accepted status)
  const getAcceptedCount = () => {
    if (!okrMetrics) return 0;
    return okrMetrics.objectives.filter(obj => 
      ['completed', 'accepted', 'done', 'closed'].includes(obj.status?.toLowerCase() || '')
    ).length;
  };

  // Group objectives by theme for theme progress display
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

    // Calculate average progress per theme
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

  return (
    <>
      <Card 
        className="h-full rounded-lg shadow-sm" 
        style={{ 
          borderLeft: '2px solid var(--accent-color)',
          backgroundColor: 'var(--surface-1)',
        }}
      >
        <CardHeader className="py-2.5 px-3" style={{ backgroundColor: 'var(--surface-2)', borderRadius: '8px 8px 0 0' }}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-1)' }}>
              Execution
            </CardTitle>
            <div className="flex items-center gap-2 text-[10px]" style={{ color: 'var(--text-3)' }}>
              <div className="flex items-center gap-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <span>≤39</span>
              </div>
              <div className="flex items-center gap-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span>40-69</span>
              </div>
              <div className="flex items-center gap-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span>≥70</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-3 py-2">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : !okrMetrics || !snapshotId ? (
            <div className="text-center py-4 text-xs" style={{ color: 'var(--text-3)' }}>
              Select a snapshot to view metrics
            </div>
          ) : (
            <div className="space-y-1">
              {/* Strategic Objectives Row */}
              <button
                onClick={() => setSelectedLevel({
                  level: 'objectives',
                  levelLabel: 'Strategic Objectives',
                  alignedAccepted: acceptedCount,
                  alignedTotal: okrMetrics.count,
                  percentage: okrMetrics.avgProgress,
                  color: objectivesColor,
                })}
                className="w-full flex items-center justify-between py-1.5 rounded transition-colors text-left focus:outline-none"
                style={{ borderBottom: '1px solid var(--divider)' }}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getColorClass(objectivesColor)}`} />
                  <span className="text-xs font-medium truncate" style={{ color: 'var(--text-1)' }}>Objectives</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold ${getColorText(objectivesColor)}`}>
                    {okrMetrics.avgProgress}%
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>
                    {acceptedCount}/{okrMetrics.count}
                  </span>
                  <ChevronRight className="h-3 w-3" style={{ color: 'var(--text-3)' }} />
                </div>
              </button>

              {/* Strategic Themes */}
              {themes.slice(0, 3).map((theme) => {
                const color = theme.objectives.length === 0 ? 'na' : getThresholdColor(theme.avgProgress);
                return (
                  <div
                    key={theme.themeId}
                    className="flex items-center justify-between py-1.5"
                    style={{ borderBottom: '1px solid var(--divider)' }}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getColorClass(color)}`} />
                      <span className="text-xs truncate" style={{ color: 'var(--text-2)' }}>{theme.themeName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold ${getColorText(color)}`}>
                        {theme.avgProgress}%
                      </span>
                      <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>
                        {theme.objectives.length}
                      </span>
                    </div>
                  </div>
                );
              })}
              {themes.length > 3 && (
                <div className="text-center py-1">
                  <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>+{themes.length - 3} more themes</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <ExecutionDrilldownDrawer
        open={!!selectedLevel}
        onClose={() => setSelectedLevel(null)}
        level={selectedLevel}
        snapshotId={snapshotId}
      />
    </>
  );
}
