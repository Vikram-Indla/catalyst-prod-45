import { cn } from '@/lib/utils';

interface ScoreCellProps {
  score: number | null;
}

export function ScoreCell({ score }: ScoreCellProps) {
  const getScoreClass = (s: number) => {
    if (s >= 80) return 'text-green-600 dark:text-green-400';
    if (s >= 60) return 'text-blue-600 dark:text-blue-400';
    if (s >= 40) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  if (score === null || score === undefined) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <div className="flex flex-col gap-1">
      <span className={cn("text-sm font-semibold", getScoreClass(score))}>
        {score.toFixed(0)}
      </span>
      <div className="w-12 h-[3px] bg-muted rounded-full overflow-hidden">
        <div 
          className={cn("h-full rounded-full transition-all", 
            score >= 80 ? 'bg-green-500' :
            score >= 60 ? 'bg-blue-500' :
            score >= 40 ? 'bg-amber-500' : 'bg-red-500'
          )}
          style={{ width: `${Math.min(100, score)}%` }}
        />
      </div>
    </div>
  );
}
