import type { InitiativeStatus } from '@/types/initiative';

interface ProgressBarProps {
  value: number;
  status?: InitiativeStatus;
  showLabel?: boolean;
}

function getFillColor(value: number, status?: InitiativeStatus): string {
  if (status === 'done' || value >= 100) return '#10b981';
  if (value >= 40 && value < 70) return '#f59e0b';
  return '#2563eb';
}

export function ProgressBar({ value, status, showLabel = true }: ProgressBarProps) {
  const clamped = Math.min(Math.max(value, 0), 100);

  return (
    <div className="inline-flex items-center gap-2">
      <div className="flex-shrink-0 overflow-hidden" style={{ width: 40, height: 4, borderRadius: 4, background: '#e4e4e7' }}>
        <div
          style={{
            width: `${clamped}%`,
            height: '100%',
            borderRadius: 4,
            background: getFillColor(clamped, status),
            transition: 'width 300ms ease',
          }}
        />
      </div>
      {showLabel && (
        <span style={{ fontSize: 12, color: '#71717a', minWidth: 28 }} className="tabular-nums">
          {clamped}%
        </span>
      )}
    </div>
  );
}
