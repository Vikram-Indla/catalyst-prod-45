import { cn } from '@/lib/utils';

interface QualityScoreBarProps {
  score: number | null;
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'var(--quality-high, #059669)';
  if (score >= 70) return 'var(--quality-mid, #D97706)';
  return 'var(--quality-low, #DC2626)';
}

export function QualityScoreBar({ score }: QualityScoreBarProps) {
  if (score === null || score === undefined) {
    return <span className="text-[11px] text-muted-foreground font-mono">—</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <span
        className="text-[11px] font-semibold font-mono tabular-nums"
        style={{ color: getScoreColor(score) }}
      >
        {score}
      </span>
      <div className="w-10 h-1 bg-zinc-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${score}%`,
            backgroundColor: getScoreColor(score),
          }}
        />
      </div>
    </div>
  );
}
