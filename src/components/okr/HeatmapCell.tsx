interface HeatmapCellProps {
  percentage: number | null;
  avgScore: number | null;
}

export function HeatmapCell({ percentage, avgScore }: HeatmapCellProps) {
  const getCellColor = (score: number | null) => {
    if (score === null) return 'bg-muted';
    if (score >= 0.7) return 'bg-green-500/20 border-green-500';
    if (score >= 0.4) return 'bg-yellow-500/20 border-yellow-500';
    return 'bg-red-500/20 border-red-500';
  };

  const getTextColor = (score: number | null) => {
    if (score === null) return 'text-muted-foreground';
    if (score >= 0.7) return 'text-green-700 dark:text-green-400';
    if (score >= 0.4) return 'text-yellow-700 dark:text-yellow-400';
    return 'text-red-700 dark:text-red-400';
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
