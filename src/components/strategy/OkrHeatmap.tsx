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

// Mock data matching the specification
const mockHeatmapData: HeatmapRow[] = [
  {
    level: 'Strategic Goals',
    itemCount: 4,
    spanAllColumns: true,
    cells: [{ percentage: 66, avgScore: 0.7 }]
  },
  {
    level: 'Portfolio Objectives',
    itemCount: 9,
    cells: [
      { percentage: 41, avgScore: 0.4 },
      { percentage: 21, avgScore: 0.2 },
      { percentage: 36, avgScore: 0.4 }
    ]
  },
  {
    level: 'Program Objectives',
    itemCount: 113,
    cells: [
      { percentage: 4, avgScore: 0.1 },
      { percentage: 7, avgScore: 0.1 },
      { percentage: null, avgScore: null }
    ]
  },
  {
    level: 'Team Objectives',
    itemCount: 73,
    cells: [
      { percentage: 7, avgScore: 0.1 },
      { percentage: 8, avgScore: 0.2 },
      { percentage: null, avgScore: null }
    ]
  }
];

function getHeatmapCellColor(avgScore: number | null): string {
  if (avgScore === null) return 'hsl(var(--okr-heatmap-gray))';
  if (avgScore >= 0.7) return 'hsl(var(--okr-heatmap-green))';
  if (avgScore >= 0.4) return 'hsl(var(--okr-heatmap-yellow))';
  return 'hsl(var(--okr-heatmap-red))';
}

export function OkrHeatmap({ selectedSnapshot, programIncrements, onCellClick }: OkrHeatmapProps) {
  const { data: heatmapData, isLoading } = useOKRHeatmap(selectedSnapshot, programIncrements);
  const [activeCell, setActiveCell] = useState<string | null>(null);

  const handleCellClick = (level: string, pi: string) => {
    const cellKey = `${level}-${pi}`;
    setActiveCell(cellKey);
    onCellClick(level, pi);
  };

  return (
    <Card className="border rounded-lg">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">OKR Heatmap</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Heatmap Grid */}
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: 'repeat(3, 1fr) 180px 100px',
            alignItems: 'stretch'
          }}
        >
          {/* Headers */}
          {programIncrements.map((pi) => (
            <div key={pi} className="text-center py-3 px-4 font-semibold text-sm">
              {pi}
            </div>
          ))}
          <div className="text-left py-3 px-4 font-semibold text-sm">Level</div>
          <div className="text-center py-3 px-4 font-semibold text-sm">Item Count</div>

          {/* Rows */}
          {mockHeatmapData.map((row) => (
            <Fragment key={row.level}>
              {row.spanAllColumns ? (
                <div
                  key={`${row.level}-span`}
                  className="rounded-md p-6 text-center text-white flex flex-col items-center justify-center min-h-[80px]"
                  style={{
                    gridColumn: 'span 3',
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
                    onClick={() => handleCellClick(row.level, programIncrements[idx])}
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
