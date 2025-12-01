import { Fragment, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useOKRHeatmap } from '@/hooks/useOKRHeatmap';

interface HeatmapCell {
  percentage: number | null;
  avgScore: number | null;
}

interface HeatmapRow {
  level: string;
  itemCount: number;
  cells: HeatmapCell[];
  spanAllColumns?: boolean;
}

interface OkrHeatmapProps {
  selectedSnapshot: string;
  programIncrements: string[];
  onCellClick: (level: string, pi: string) => void;
}

function getHeatmapCellColor(avgScore: number | null): string {
  if (avgScore === null) return 'hsl(var(--okr-heatmap-gray))';
  if (avgScore >= 0.7) return 'hsl(var(--okr-heatmap-green))';
  if (avgScore >= 0.4) return 'hsl(var(--okr-heatmap-yellow))';
  return 'hsl(var(--okr-heatmap-red))';
}

export function OkrHeatmap({ selectedSnapshot, programIncrements, onCellClick }: OkrHeatmapProps) {
  const { data: heatmapData, isLoading, error } = useOKRHeatmap(selectedSnapshot, programIncrements);
  const [activeCell, setActiveCell] = useState<string | null>(null);

  console.log('📊 OkrHeatmap render:', { 
    selectedSnapshot, 
    programIncrements, 
    hasData: !!heatmapData, 
    isLoading,
    error: error?.message,
    rows: heatmapData?.rows?.length,
    pis: heatmapData?.programIncrements?.length,
    rowDetails: heatmapData?.rows?.map(r => ({
      level: r.level,
      itemCount: r.itemCount,
      cellsWithData: r.cells.filter(c => c.percentage !== null).length
    }))
  });

  const handleCellClick = (level: string, pi: string) => {
    const cellKey = `${level}-${pi}`;
    setActiveCell(cellKey);
    onCellClick(level, pi);
  };

  const numPIs = heatmapData?.programIncrements?.length || 2;
  const gridColumns = `repeat(${numPIs}, 1fr) 180px 100px`;

  if (isLoading) {
    return (
      <Card className="border rounded-lg">
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
      <Card className="border rounded-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">OKR Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            No heatmap data available. Please select a snapshot and program increments.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border rounded-lg">
      <CardHeader>
        <div className="space-y-2">
          <CardTitle className="text-xl font-semibold">OKR Heatmap</CardTitle>
          <p className="text-sm text-muted-foreground">
            Visual overview of progress on achieving strategic goals and objectives across Program Increments. 
            Click any cell to filter objectives by level and PI.
          </p>
        </div>
      </CardHeader>
      <CardContent>
        {/* Heatmap Grid */}
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: gridColumns,
            alignItems: 'stretch'
          }}
        >
          {/* Headers */}
          {heatmapData?.programIncrements?.map((pi) => (
            <div key={pi.id} className="text-center py-3 px-4 font-semibold text-sm">
              {pi.name}
            </div>
          ))}
          <div className="text-left py-3 px-4 font-semibold text-sm">Level</div>
          <div className="text-center py-3 px-4 font-semibold text-sm">Item Count</div>

          {/* Rows */}
          {heatmapData?.rows.map((row) => (
            <Fragment key={row.level}>
              {row.spanAllColumns ? (
                <div
                  key={`${row.level}-span`}
                  className="rounded-md p-6 text-center text-white flex flex-col items-center justify-center min-h-[80px]"
                  style={{
                    gridColumn: `span ${numPIs}`,
                    backgroundColor: getHeatmapCellColor(row.cells[0].avgScore)
                  }}
                >
                  <div className="text-2xl font-bold">
                    {row.cells[0].percentage}%
                  </div>
                  <div className="text-sm opacity-90 mt-1">
                    {row.cells[0].avgScore?.toFixed(1)} avg score
                  </div>
                </div>
              ) : (
                row.cells.map((cell, idx) => (
                  <div
                    key={`${row.level}-${idx}`}
                    className="rounded-md p-6 text-center text-white flex flex-col items-center justify-center min-h-[80px] cursor-pointer transition-opacity hover:opacity-90"
                    style={{
                      backgroundColor: getHeatmapCellColor(cell.avgScore)
                    }}
                    onClick={() => handleCellClick(row.level, heatmapData?.programIncrements?.[idx]?.id || '')}
                  >
                    {cell.percentage !== null ? (
                      <>
                        <div className="text-2xl font-bold">
                          {cell.percentage}%
                        </div>
                        <div className="text-sm opacity-90 mt-1">
                          {cell.avgScore?.toFixed(1)} avg score
                        </div>
                      </>
                    ) : (
                      <div className="text-lg font-semibold">N/A</div>
                    )}
                  </div>
                ))
              )}
              <div className="flex items-center py-3 px-4 text-sm text-primary cursor-pointer hover:underline">
                {row.level}
              </div>
              <div className="flex items-center justify-center py-3 px-4 text-sm font-medium">
                {row.itemCount}
              </div>
            </Fragment>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
