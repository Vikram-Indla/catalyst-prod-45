import { cn } from '@/lib/utils';

interface ScoreCellProps {
  score: number | null;
}

export function ScoreCell({ score }: ScoreCellProps) {
  if (score === null || score === undefined || score === 0) {
    return <span className="text-[var(--industry-text-disabled)]">—</span>;
  }

  // Database stores score as 0-500 (score * 100), convert to 0-5 scale
  const normalizedScore = score / 100;

  // Determine color based on score thresholds from spec
  // High (≥3.5): green, Medium (2.5-3.4): blue, Low (<2.5): amber
  const getScoreColor = (s: number) => {
    if (s >= 3.5) return {
      bar: 'bg-[var(--industry-priority-high)]',
      text: 'text-[var(--industry-priority-high)]'
    };
    if (s >= 2.5) return {
      bar: 'bg-[var(--industry-priority-medium)]',
      text: 'text-[var(--industry-priority-medium)]'
    };
    return {
      bar: 'bg-[var(--industry-priority-low)]',
      text: 'text-[var(--industry-priority-low)]'
    };
  };

  const colors = getScoreColor(normalizedScore);
  const percentage = Math.min(100, (normalizedScore / 5) * 100); // Score is 0-5 scale

  return (
    <div className="flex items-center gap-2">
      <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
        <div 
          className={cn("h-full rounded-full transition-all", colors.bar)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className={cn("text-xs font-semibold", colors.text)}>
        {normalizedScore.toFixed(2)}
      </span>
    </div>
  );
}
