import type { InitiativeStatus } from '@/types/initiative';

interface ProgressBarProps {
  value: number;
  status?: InitiativeStatus;
  showLabel?: boolean;
}

function getFillColor(value: number, status?: InitiativeStatus): string {
  if (status === 'delivered') return 'bg-emerald-500';
  if (value >= 70) return 'bg-blue-500';
  if (value >= 40) return 'bg-amber-500';
  return 'bg-blue-500';
}

function getLabelColor(value: number): string {
  if (value === 0) return 'text-zinc-400';
  if (value >= 100) return 'text-emerald-600';
  return 'text-zinc-600';
}

export function ProgressBar({ value, status, showLabel = true }: ProgressBarProps) {
  const clamped = Math.min(Math.max(value, 0), 100);

  return (
    <div className="flex items-center gap-2">
      <div className="w-10 h-1 rounded-sm bg-zinc-200 flex-shrink-0">
        <div
          className={`h-full rounded-sm transition-all duration-300 ${getFillColor(clamped, status)}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <span className={`text-[12px] font-medium ${getLabelColor(clamped)}`}>
          {clamped}%
        </span>
      )}
    </div>
  );
}
