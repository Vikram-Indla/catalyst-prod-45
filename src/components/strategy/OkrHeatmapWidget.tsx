import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useOKRHeatmap } from "@/hooks/useOKRHeatmap";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface OkrHeatmapWidgetProps {
  snapshotId?: string;
  piIds: string[];
}

export function OkrHeatmapWidget({ snapshotId, piIds }: OkrHeatmapWidgetProps) {
  const navigate = useNavigate();
  const { data: heatmapData, isLoading } = useOKRHeatmap(snapshotId, piIds.slice(0, 3));

  const getCellColor = (score: number | null) => {
    if (score === null) return 'bg-muted';
    if (score >= 0.7) return 'bg-success/30';
    if (score >= 0.4) return 'bg-warning/30';
    return 'bg-destructive/30';
  };

  const getHealthBadgeClass = (health: string): string => {
    switch (health) {
      case 'good': return 'bg-green-100 text-green-700';
      case 'fair': return 'bg-amber-100 text-amber-700';
      case 'poor': return 'bg-red-100 text-red-700';
      case 'at_risk': return 'bg-amber-100 text-amber-700';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">OKR Heatmap</CardTitle>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => navigate('/enterprise/okr-hub')}
        >
          View Full
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !heatmapData || heatmapData.rows.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            No OKR data available
          </div>
        ) : (
          <div className="space-y-3">
            {heatmapData.rows.slice(0, 4).map((row) => (
              <div key={row.themeId} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium truncate flex-1">{row.themeName}</span>
                  <Badge variant="outline" className="text-[10px] h-5">
                    {row.itemCount}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  {/* Progress bar */}
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all"
                      style={{ 
                        width: `${row.avgProgress}%`,
                        backgroundColor: row.avgProgress >= 70 
                          ? 'hsl(var(--success))' 
                          : row.avgProgress >= 40 
                            ? 'hsl(var(--warning))' 
                            : 'hsl(var(--destructive))'
                      }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-8 text-right">
                    {row.avgProgress}%
                  </span>
                </div>
                {/* Health breakdown */}
                <div className="flex gap-1">
                  {row.byHealth.good > 0 && (
                    <Badge className={`${getHealthBadgeClass('good')} text-[10px] px-1`}>
                      {row.byHealth.good}
                    </Badge>
                  )}
                  {row.byHealth.fair > 0 && (
                    <Badge className={`${getHealthBadgeClass('fair')} text-[10px] px-1`}>
                      {row.byHealth.fair}
                    </Badge>
                  )}
                  {row.byHealth.poor > 0 && (
                    <Badge className={`${getHealthBadgeClass('poor')} text-[10px] px-1`}>
                      {row.byHealth.poor}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
