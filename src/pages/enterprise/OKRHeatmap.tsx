import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { useOKRHeatmap } from '@/hooks/useOKRHeatmap';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

export default function OKRHeatmap() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const snapshotId = searchParams.get('snapshotId') || undefined;
  const [searchQuery, setSearchQuery] = useState('');

  const { data: heatmapData, isLoading } = useOKRHeatmap(snapshotId, []);

  const getHealthBadgeClass = (health: string): string => {
    switch (health) {
      case 'good': return 'bg-green-100 text-green-700';
      case 'fair': return 'bg-amber-100 text-amber-700';
      case 'poor': return 'bg-red-100 text-red-700';
      case 'at_risk': return 'bg-amber-100 text-amber-700';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getProgressColor = (progress: number): string => {
    if (progress >= 70) return 'hsl(var(--success))';
    if (progress >= 40) return 'hsl(var(--warning))';
    return 'hsl(var(--destructive))';
  };

  const handleThemeClick = (themeId: string) => {
    navigate(`/enterprise/okr-hub?themeId=${themeId}`);
  };

  const filteredRows = heatmapData?.rows.filter(row => 
    row.themeName.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="h-full flex flex-col p-6">
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search themes..."
            className="pl-9 h-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/enterprise/okr-hub')}
        >
          <ExternalLink className="h-4 w-4 mr-1.5" />
          OKR Hub
        </Button>
      </div>

      {/* Heatmap Grid */}
      <Card className="flex-1">
        <CardHeader>
          <CardTitle>OKR Heatmap by Theme</CardTitle>
          <p className="text-sm text-muted-foreground">
            Objectives grouped by strategic theme. Click a row to view objectives in OKR Hub.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {heatmapData?.rows.length === 0 
                ? 'No objectives found. Select a snapshot with themes and objectives.'
                : 'No themes match your search.'
              }
            </div>
          ) : (
            <div className="space-y-3">
              {/* Header */}
              <div className="grid grid-cols-[1fr_120px_160px_100px] gap-3 px-4 py-2 bg-muted/30 rounded-md text-sm font-semibold">
                <div>Theme</div>
                <div className="text-center">Progress</div>
                <div className="text-center">Health</div>
                <div className="text-center">Objectives</div>
              </div>

              {/* Rows */}
              {filteredRows.map((row) => (
                <div
                  key={row.themeId}
                  className="grid grid-cols-[1fr_120px_160px_100px] gap-3 px-4 py-3 border rounded-md hover:bg-muted/20 cursor-pointer transition-colors"
                  onClick={() => handleThemeClick(row.themeId)}
                >
                  {/* Theme Name */}
                  <div className="flex items-center">
                    <span className="font-medium text-sm">{row.themeName}</span>
                  </div>

                  {/* Progress */}
                  <div className="flex items-center justify-center">
                    <div className="w-full max-w-[100px]">
                      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${row.avgProgress}%`,
                            backgroundColor: getProgressColor(row.avgProgress)
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
                    <Badge variant="outline">{row.itemCount}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
