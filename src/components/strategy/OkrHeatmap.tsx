import { Fragment, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { useOKRHeatmap } from '@/hooks/useOKRHeatmap';
import { useNavigate } from 'react-router-dom';

interface OkrHeatmapProps {
  selectedSnapshot: string;
  programIncrements: string[];
  onCellClick: (level: string, pi: string) => void;
}

function getHeatmapCellColor(avgScore: number | null): string {
  if (avgScore === null) return 'hsl(var(--muted))';
  if (avgScore >= 0.7) return 'hsl(var(--success))';
  if (avgScore >= 0.4) return 'hsl(var(--warning))';
  return 'hsl(var(--destructive))';
}

function getHealthBadgeClass(health: string): string {
  switch (health) {
    case 'good': return 'bg-green-100 text-green-700';
    case 'fair': return 'bg-amber-100 text-amber-700';
    case 'poor': return 'bg-red-100 text-red-700';
    case 'at_risk': return 'bg-amber-100 text-amber-700';
    default: return 'bg-muted text-muted-foreground';
  }
}

export function OkrHeatmap({ selectedSnapshot, programIncrements, onCellClick }: OkrHeatmapProps) {
  const navigate = useNavigate();
  const { data: heatmapData, isLoading, error } = useOKRHeatmap(selectedSnapshot, programIncrements);

  const handleThemeClick = (themeId: string) => {
    // Navigate to OKR Hub with theme filter
    navigate(`/enterprise/okr-hub?themeId=${themeId}`);
  };

  const handleOpenOKRHub = () => {
    navigate('/enterprise/okr-hub');
  };

  if (isLoading) {
    return (
      <Card className="border bg-card">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">OKR Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            Loading heatmap data...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!heatmapData || !heatmapData.rows || heatmapData.rows.length === 0) {
    return (
      <Card className="border bg-card">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">OKR Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <p>No objectives found for this snapshot's themes.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={handleOpenOKRHub}
            >
              <ExternalLink className="h-4 w-4 mr-1.5" />
              Open OKR Hub
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <CardTitle className="text-xl font-semibold">OKR Heatmap</CardTitle>
            <p className="text-sm text-muted-foreground">
              Objectives grouped by Theme. Click a row to view objectives in OKR Hub.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenOKRHub}
          >
            <ExternalLink className="h-4 w-4 mr-1.5" />
            OKR Hub
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Header */}
          <div className="grid grid-cols-[1fr_120px_160px_100px] gap-3 px-4 py-2 bg-muted/30 rounded-md text-sm font-semibold">
            <div>Theme</div>
            <div className="text-center">Progress</div>
            <div className="text-center">Health Breakdown</div>
            <div className="text-center">Objectives</div>
          </div>

          {/* Rows */}
          {heatmapData.rows.map((row) => (
            <div
              key={row.themeId}
              className="grid grid-cols-[1fr_120px_160px_100px] gap-3 px-4 py-3 border rounded-md hover:bg-muted/20 cursor-pointer transition-colors"
              onClick={() => handleThemeClick(row.themeId)}
            >
              {/* Theme Name */}
              <div className="flex items-center">
                <span className="font-medium text-sm">{row.themeName}</span>
              </div>

              {/* Progress Bar */}
              <div className="flex items-center justify-center">
                <div className="w-full max-w-[100px]">
                  <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${row.avgProgress}%`,
                        backgroundColor: getHeatmapCellColor(row.avgProgress / 100)
                      }}
                    />
                  </div>
                  <div className="text-xs text-center mt-1 text-muted-foreground">
                    {row.avgProgress}%
                  </div>
                </div>
              </div>

              {/* Health Breakdown */}
              <div className="flex items-center justify-center gap-1">
                {row.byHealth.good > 0 && (
                  <Badge className={`${getHealthBadgeClass('good')} text-xs px-1.5`}>
                    {row.byHealth.good}
                  </Badge>
                )}
                {row.byHealth.fair > 0 && (
                  <Badge className={`${getHealthBadgeClass('fair')} text-xs px-1.5`}>
                    {row.byHealth.fair}
                  </Badge>
                )}
                {row.byHealth.poor > 0 && (
                  <Badge className={`${getHealthBadgeClass('poor')} text-xs px-1.5`}>
                    {row.byHealth.poor}
                  </Badge>
                )}
                {row.byHealth.at_risk > 0 && (
                  <Badge className={`${getHealthBadgeClass('at_risk')} text-xs px-1.5`}>
                    {row.byHealth.at_risk}
                  </Badge>
                )}
                {row.itemCount === 0 && (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </div>

              {/* Objective Count */}
              <div className="flex items-center justify-center">
                <span className="text-sm font-medium">{row.itemCount}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
