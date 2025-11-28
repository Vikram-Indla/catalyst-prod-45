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
  const { data: heatmapData, isLoading } = useOKRHeatmap(snapshotId, piIds.slice(0, 3)); // Show max 3 PIs

  const getCellColor = (score: number | null) => {
    if (score === null) return 'bg-muted';
    if (score >= 0.7) return 'bg-green-500/30';
    if (score >= 0.4) return 'bg-yellow-500/30';
    return 'bg-red-500/30';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">OKR Heatmap</CardTitle>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => navigate(`/enterprise/okr-heatmap?snapshotId=${snapshotId}&piIds=${piIds.join(',')}`)}
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
              <div key={row.level} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{row.level}</span>
                  <Badge variant="outline" className="text-[10px] h-5">
                    {row.itemCount}
                  </Badge>
                </div>
                <div className="grid gap-1" style={{ 
                  gridTemplateColumns: row.spanAllColumns 
                    ? '1fr' 
                    : `repeat(${heatmapData.programIncrements.length}, 1fr)` 
                }}>
                  {row.spanAllColumns ? (
                    <div className={`rounded p-2 text-center ${getCellColor(row.cells[0]?.avgScore)}`}>
                      <div className="text-sm font-semibold">
                        {row.cells[0]?.percentage !== null ? `${row.cells[0].percentage}%` : 'N/A'}
                      </div>
                    </div>
                  ) : (
                    row.cells.map((cell, idx) => (
                      <div key={idx} className={`rounded p-2 text-center ${getCellColor(cell.avgScore)}`}>
                        <div className="text-sm font-semibold">
                          {cell.percentage !== null ? `${cell.percentage}%` : 'N/A'}
                        </div>
                      </div>
                    ))
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
