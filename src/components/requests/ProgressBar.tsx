import type { RequestStatus } from '@/types/request';

interface ProgressBarProps {
  value: number;
  status?: RequestStatus;
  showLabel?: boolean;
}

function getFillColor(value: number, status?: RequestStatus): string {
  if (status === 'done' || value >= 100) return 'var(--ds-background-success-bold)';
  if (value >= 40 && value < 70) return 'var(--ds-text-warning)';
  return 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))';
}

export function ProgressBar({ value, status, showLabel = true }: ProgressBarProps) {
  const clamped = Math.min(Math.max(value, 0), 100);

  return (
    <div className="inline-flex items-center gap-2">
      <div className="flex-shrink-0 overflow-hidden" style={{ width: 40, height: 4, borderRadius: 4, background: 'var(--ds-border)' }}>
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
        <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtlest)', minWidth: 28 }} className="tabular-nums">
          {clamped}%
        </span>
      )}
    </div>
  );
}
