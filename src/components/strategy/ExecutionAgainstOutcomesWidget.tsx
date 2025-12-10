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
import { 
  useExecutionAgainstOutcomes, 
  useThemeProgress,
  getThresholdColor,
  type ExecutionMetrics,
  type ThemeProgress,
} from "@/hooks/useExecutionMetrics";
import { ExecutionDrilldownDrawer } from "./ExecutionDrilldownDrawer";

interface ExecutionAgainstOutcomesWidgetProps {
  snapshotId?: string;
  piIds?: string[];
}

export function ExecutionAgainstOutcomesWidget({ snapshotId }: ExecutionAgainstOutcomesWidgetProps) {
  const [selectedLevel, setSelectedLevel] = useState<ExecutionMetrics | null>(null);
  const { data, isLoading } = useExecutionAgainstOutcomes(snapshotId);
  const { data: themeProgressData, isLoading: themesLoading } = useThemeProgress(snapshotId);

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

  // Get color for theme progress (0-1 value)
  const getThemeColor = (progress: number | null): 'red' | 'yellow' | 'green' | 'na' => {
    if (progress === null) return 'na';
    const percentage = Math.round(progress * 100);
    return getThresholdColor(percentage);
  };

  return (
    <>
      <Card className="h-full">
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
                    Shows execution metrics by objective level and strategic theme progress based on linked Portfolio objectives' KR progress.
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
          {isLoading || themesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !data || !snapshotId ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              Select a snapshot to view execution metrics
            </div>
          ) : (
            <div className="space-y-4">
              {/* Execution Metrics by Level */}
              <div className="space-y-2">
                {data.metrics.map((metric) => (
                  <button
                    key={metric.level}
                    onClick={() => setSelectedLevel(metric)}
                    className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:border-brand-gold/50 hover:bg-muted/30 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${getColorClass(metric.color)}`} />
                      <span className="text-sm font-medium truncate">{metric.levelLabel}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      {metric.color === 'na' ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="text-xs">N/A</Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">No aligned execution items</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className={`text-sm font-bold ${getColorText(metric.color)}`}>
                          {metric.percentage}%
                        </span>
                      )}

                      <div className="w-16 h-2 bg-muted rounded-full overflow-hidden hidden sm:block">
                        <div
                          className={`h-full transition-all ${getColorClass(metric.color)}`}
                          style={{ width: `${metric.percentage}%` }}
                        />
                      </div>

                      <Badge variant="outline" className="text-[10px] font-normal">
                        {metric.alignedAccepted}/{metric.alignedTotal}
                      </Badge>

                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </button>
                ))}
              </div>

              {/* Strategic Themes Progress Section */}
              {themeProgressData && themeProgressData.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <Layers className="h-3.5 w-3.5" />
                    <span className="font-medium">Strategic Themes (KR Progress)</span>
                  </div>
                  {themeProgressData.map((theme) => {
                    const color = getThemeColor(theme.krProgress);
                    const percentage = theme.krProgress !== null 
                      ? Math.round(theme.krProgress * 100) 
                      : 0;

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
                                  <p className="text-xs">No linked Portfolio objectives with KR progress</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <span className={`text-sm font-bold ${getColorText(color)}`}>
                              {percentage}%
                            </span>
                          )}

                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden hidden sm:block">
                            <div
                              className={`h-full transition-all ${getColorClass(color)}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className="text-[10px] font-normal">
                                  {theme.objectiveCount} obj
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="max-w-xs">
                                <p className="text-xs font-medium mb-1">Linked Portfolio Objectives:</p>
                                {theme.objectives.length === 0 ? (
                                  <p className="text-xs text-muted-foreground">None linked</p>
                                ) : (
                                  <ul className="text-xs space-y-0.5">
                                    {theme.objectives.slice(0, 5).map(obj => (
                                      <li key={obj.id} className="truncate">
                                        • {obj.name} ({obj.key_result_progress !== null 
                                          ? `${Math.round(obj.key_result_progress * 100)}%` 
                                          : 'N/S'})
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
