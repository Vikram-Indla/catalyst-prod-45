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
      <Card className="border bg-card h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-brand-gold" />
              Execution Against Outcomes
            </CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-xs">
                  <p className="text-xs">
                    Shows execution metrics for Objectives and strategic theme progress based on linked objectives' overall progress.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          {/* Legend */}
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span>≤39%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span>40-69%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span>≥70%</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !okrMetrics || !snapshotId ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              Select a snapshot to view execution metrics
            </div>
          ) : (
            <div className="space-y-4">
              {/* Strategic Objectives Row */}
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedLevel({
                    level: 'objectives',
                    levelLabel: 'Strategic Objectives',
                    alignedAccepted: acceptedCount,
                    alignedTotal: okrMetrics.count,
                    percentage: okrMetrics.avgProgress,
                    color: objectivesColor,
                  })}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:border-brand-gold/50 hover:bg-muted/30 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${getColorClass(objectivesColor)}`} />
                    <span className="text-sm font-medium truncate">Strategic Objectives</span>
                  </div>

                  <div className="flex items-center gap-3">
                    {objectivesColor === 'na' ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className="text-xs">N/A</Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">No objectives linked to this snapshot's themes</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <span className={`text-sm font-bold ${getColorText(objectivesColor)}`}>
                        {okrMetrics.avgProgress}%
                      </span>
                    )}

                    <div className="w-16 h-2 bg-muted rounded-full overflow-hidden hidden sm:block">
                      <div
                        className={`h-full transition-all ${getColorClass(objectivesColor)}`}
                        style={{ width: `${okrMetrics.avgProgress}%` }}
                      />
                    </div>

                    <Badge variant="outline" className="text-[10px] font-normal">
                      {acceptedCount}/{okrMetrics.count}
                    </Badge>

                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </button>
              </div>

              {/* Strategic Themes Progress Section */}
              {themes.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <Layers className="h-3.5 w-3.5" />
                    <span className="font-medium">Strategic Themes (KR Progress)</span>
                  </div>
                  {themes.map((theme) => {
                    const color = theme.objectives.length === 0 ? 'na' : getThresholdColor(theme.avgProgress);

                    return (
                      <div
                        key={theme.themeId}
                        className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${getColorClass(color)}`} />
                          <span className="text-sm font-medium truncate">{theme.themeName}</span>
                        </div>

                        <div className="flex items-center gap-3">
                          {color === 'na' ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="text-xs">N/S</Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">No objectives linked to this theme</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <span className={`text-sm font-bold ${getColorText(color)}`}>
                              {theme.avgProgress}%
                            </span>
                          )}

                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden hidden sm:block">
                            <div
                              className={`h-full transition-all ${getColorClass(color)}`}
                              style={{ width: `${theme.avgProgress}%` }}
                            />
                          </div>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className="text-[10px] font-normal">
                                  {theme.objectives.length} obj
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="max-w-xs">
                                <p className="text-xs font-medium mb-1">Linked Objectives:</p>
                                {theme.objectives.length === 0 ? (
                                  <p className="text-xs text-muted-foreground">None linked</p>
                                ) : (
                                  <ul className="text-xs space-y-0.5">
                                    {theme.objectives.slice(0, 5).map(obj => (
                                      <li key={obj.id} className="truncate">
                                        • {obj.name} ({obj.overall_progress}%)
                                      </li>
                                    ))}
                                    {theme.objectives.length > 5 && (
                                      <li className="text-muted-foreground">
                                        +{theme.objectives.length - 5} more...
                                      </li>
                                    )}
                                  </ul>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Drilldown Drawer */}
      <ExecutionDrilldownDrawer
        open={!!selectedLevel}
        onClose={() => setSelectedLevel(null)}
        level={selectedLevel}
        snapshotId={snapshotId}
      />
    </>
  );
}
