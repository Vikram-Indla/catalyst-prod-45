import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  if (avgScore >= 0.7) return 'hsl(142 76% 36%)'; // green
  if (avgScore >= 0.4) return 'hsl(38 92% 50%)'; // amber/orange
  return 'hsl(0 84% 60%)'; // red
}

function getHeatmapCellTextColor(avgScore: number | null): string {
  if (avgScore === null) return 'hsl(var(--muted-foreground))';
  return 'white';
}

export function OkrHeatmap({ selectedSnapshot, programIncrements, onCellClick }: OkrHeatmapProps) {
  const navigate = useNavigate();
  const { data: heatmapData, isLoading } = useOKRHeatmap(selectedSnapshot, programIncrements);

  const handleThemeClick = (themeId: string) => {
    navigate(`/enterprise/okr-hub?themeId=${themeId}`);
  };

  const handleOpenOKRHub = () => {
    navigate('/enterprise/okr-hub');
  };

  if (isLoading) {
    return (
      <Card className="border-l-4 border-l-brand-gold">
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
      <Card className="border-l-4 border-l-brand-gold">
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

  // Calculate total objectives count
  const totalObjectives = heatmapData.rows.reduce((sum, row) => sum + row.itemCount, 0);

  return (
    <Card className="border-l-4 border-l-brand-gold">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold">OKR Heatmap</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenOKRHub}
            tabIndex={-1}
            className="focus:outline-none focus:ring-0"
          >
            <ExternalLink className="h-4 w-4 mr-1.5" />
            OKR Hub
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          {/* Header Row - Theme Names */}
          <div className="flex">
            {heatmapData.rows.map((row) => (
              <div
                key={row.themeId}
                className="flex-1 min-w-[140px] px-2 py-3 text-center"
              >
                <span className="text-sm font-semibold text-foreground">
                  {row.themeName}
                </span>
              </div>
            ))}
            <div className="w-[100px] px-2 py-3 text-center">
              <span className="text-sm font-semibold text-foreground">Level</span>
            </div>
            <div className="w-[100px] px-2 py-3 text-center">
              <span className="text-sm font-semibold text-foreground">Item Count</span>
            </div>
          </div>

          {/* Single Objectives Row - Catalyst has one tier only */}
          <div className="flex">
            {heatmapData.rows.map((row) => {
              const avgScore = row.avgProgress / 100;
              const cellColor = getHeatmapCellColor(row.itemCount > 0 ? avgScore : null);
              const textColor = getHeatmapCellTextColor(row.itemCount > 0 ? avgScore : null);
              
              return (
                <div
                  key={row.themeId}
                  className="flex-1 min-w-[140px] p-1"
                >
                  <div
                    className="rounded-md py-6 px-3 text-center cursor-pointer transition-opacity hover:opacity-90"
                    style={{ backgroundColor: cellColor }}
                    onClick={() => handleThemeClick(row.themeId)}
                    tabIndex={-1}
                  >
                    {row.itemCount > 0 ? (
                      <>
                        <div className="text-2xl font-bold" style={{ color: textColor }}>
                          {row.avgProgress}%
                        </div>
                        <div className="text-sm mt-1" style={{ color: textColor, opacity: 0.9 }}>
                          {avgScore.toFixed(1)} avg score
                        </div>
                      </>
                    ) : (
                      <div className="text-lg font-semibold text-muted-foreground">
                        N/A
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div className="w-[100px] px-2 flex items-center justify-center">
              <span className="text-sm text-foreground">Objectives</span>
            </div>
            <div className="w-[100px] px-2 flex items-center justify-center">
              <span className="text-sm font-medium text-foreground">{totalObjectives}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
