import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { mockObjectives, ObjectiveLevel } from '@/data/strategyMockData';
import { useState } from 'react';

interface OkrHeatmapProps {
  selectedSnapshot: string;
  programIncrements: string[];
  onCellClick: (level: ObjectiveLevel, pi: string) => void;
}

export function OkrHeatmap({ selectedSnapshot, programIncrements, onCellClick }: OkrHeatmapProps) {
  const [activeCell, setActiveCell] = useState<string | null>(null);

  const levels: { key: ObjectiveLevel; label: string }[] = [
    { key: "STRATEGIC", label: "Strategic Goals" },
    { key: "PORTFOLIO", label: "Portfolio Objectives" },
    { key: "PROGRAM", label: "Program Objectives" },
    { key: "TEAM", label: "Team Objectives" },
  ];

  // Calculate metrics for each cell
  const getCellData = (level: ObjectiveLevel, pi: string) => {
    const objectives = mockObjectives.filter(
      (obj) =>
        obj.level === level &&
        obj.snapshotId === selectedSnapshot &&
        obj.programIncrementIds.includes(pi)
    );

    if (objectives.length === 0) return null;

    const avgScore = objectives.reduce((sum, obj) => sum + obj.score, 0) / objectives.length;
    const percentage = Math.round(avgScore * 100);

    return { percentage, avgScore: avgScore.toFixed(1), count: objectives.length };
  };

  const getCellColor = (percentage: number | null) => {
    if (percentage === null) return 'bg-muted/50 text-muted-foreground';
    if (percentage >= 60) return 'bg-green-500 text-white';
    if (percentage >= 35) return 'bg-orange-500 text-white';
    return 'bg-red-500 text-white';
  };

  const getTotalCount = (level: ObjectiveLevel) => {
    return mockObjectives.filter(
      (obj) => obj.level === level && obj.snapshotId === selectedSnapshot
    ).length;
  };

  const handleCellClick = (level: ObjectiveLevel, pi: string) => {
    const cellKey = `${level}-${pi}`;
    setActiveCell(cellKey);
    onCellClick(level, pi);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>OKR Heatmap</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border p-2 bg-muted text-left font-semibold text-sm"></th>
                {programIncrements.map((pi) => (
                  <th key={pi} className="border p-2 bg-muted text-center font-semibold text-sm">
                    {pi}
                  </th>
                ))}
                <th className="border p-2 bg-muted text-center font-semibold text-sm">Level</th>
                <th className="border p-2 bg-muted text-center font-semibold text-sm">Item Count</th>
              </tr>
            </thead>
            <tbody>
              {levels.map(({ key, label }) => (
                <tr key={key}>
                  <td className="border p-2 font-medium text-sm text-primary">{label}</td>
                  {programIncrements.map((pi) => {
                    const cellData = getCellData(key, pi);
                    const cellKey = `${key}-${pi}`;
                    const isActive = activeCell === cellKey;

                    return (
                      <td
                        key={pi}
                        className={`border p-4 text-center cursor-pointer transition-all ${
                          getCellColor(cellData?.percentage ?? null)
                        } ${isActive ? 'ring-2 ring-primary ring-inset' : ''}`}
                        onClick={() => handleCellClick(key, pi)}
                      >
                        {cellData ? (
                          <div>
                            <div className="text-2xl font-bold">{cellData.percentage}%</div>
                            <div className="text-xs opacity-90">{cellData.avgScore} avg score</div>
                          </div>
                        ) : (
                          <div className="text-lg font-semibold">N/A</div>
                        )}
                      </td>
                    );
                  })}
                  <td className="border p-2 text-center text-sm font-medium">{label}</td>
                  <td className="border p-2 text-center text-lg font-bold">
                    {getTotalCount(key)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
