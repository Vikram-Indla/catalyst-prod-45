/**
 * ProgressBar — Horizontal progress bar with auto color logic
 */

interface ProgressBarProps {
  value: number;
  color?: string;
  height?: number;
  showLabel?: boolean;
  animated?: boolean;
  className?: string;
}

function getProgressColor(value: number): string {
  if (value >= 70) return 'var(--catalyst-success, #0D9488)';
  if (value >= 50) return 'var(--catalyst-warning, #D97706)';
  return 'var(--catalyst-danger, #EF4444)';
}

export function ProgressBar({ value, color, height = 6, showLabel = false, animated = true, className = '' }: ProgressBarProps) {
  const fillColor = color ?? getProgressColor(value);
  const clampedValue = Math.max(0, Math.min(100, value));

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        style={{
          flex: 1,
          height,
          borderRadius: height / 2,
          background: 'var(--catalyst-bg-hover, #F1F5F9)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${clampedValue}%`,
            height: '100%',
            borderRadius: height / 2,
            background: fillColor,
            transition: animated ? 'width 800ms ease-out' : undefined,
          }}
        />
      </div>
      {showLabel && (
        <span style={{ fontSize: 11, fontWeight: 600, color: fillColor, minWidth: 32, textAlign: 'right' }}>
          {Math.round(clampedValue)}%
        </span>
      )}
    </div>
  );
}
