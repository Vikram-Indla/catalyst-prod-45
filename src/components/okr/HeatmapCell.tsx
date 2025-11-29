interface HeatmapCellProps {
  percentage: number | null;
  avgScore: number | null;
}

export function HeatmapCell({ percentage, avgScore }: HeatmapCellProps) {
  const getCellColor = (score: number | null) => {
    if (score === null) return 'bg-muted';
    if (score >= 0.7) return 'bg-success/20 border-success';
    if (score >= 0.4) return 'bg-warning/20 border-warning';
    return 'bg-destructive/20 border-destructive';
  };

  const getTextColor = (score: number | null) => {
    if (score === null) return 'text-muted-foreground';
    if (score >= 0.7) return 'text-success';
    if (score >= 0.4) return 'text-warning';
    return 'text-destructive';
  };

  return (
    <div 
      className={`rounded border-2 p-3 flex flex-col items-center justify-center min-h-[72px] ${getCellColor(avgScore)}`}
    >
      {percentage !== null ? (
        <>
          <div className={`text-2xl font-bold ${getTextColor(avgScore)}`}>
            {percentage}%
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Avg Score: {avgScore !== null ? avgScore.toFixed(2) : 'N/A'}
          </div>
        </>
      ) : (
        <div className="text-sm text-muted-foreground">No data</div>
      )}
    </div>
  );
}
