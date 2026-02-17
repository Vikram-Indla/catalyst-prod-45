import { getPriorityLevel } from '@/types/initiative';

interface PriorityBadgeProps {
  score: number | null;
  size?: 'sm' | 'md';
  showScore?: boolean;
}

export function PriorityBadge({ score, size = 'sm', showScore = true }: PriorityBadgeProps) {
  const p = getPriorityLevel(score);
  const heightClass = size === 'md' ? 'h-7 text-[13px]' : 'h-6 text-[12px]';

  return (
    <span
      className={`inline-flex items-center px-2.5 rounded-full border font-medium whitespace-nowrap ${heightClass}`}
      style={{ backgroundColor: p.bg, borderColor: p.border, color: p.text }}
    >
      {p.level}
      {showScore && score !== null && (
        <span className="ml-1 opacity-70">({score.toFixed(1)})</span>
      )}
    </span>
  );
}
