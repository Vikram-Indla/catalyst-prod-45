/**
 * UtilizationBar — Reusable utilization progress bar
 * Phase 6: Resource 360
 */
import { AlertTriangle } from 'lucide-react';

export function getUtilColor(pct: number): string {
  if (pct > 80) return 'var(--sem-danger)';
  if (pct > 60) return 'var(--sem-warning)';
  if (pct >= 40) return 'var(--sem-success)';
  return 'var(--fg-4)';
}

interface UtilizationBarProps {
  percent: number;
  height?: number;
  showLabel?: boolean;
  showWarning?: boolean;
  compact?: boolean;
}

export function UtilizationBar({
  percent,
  height = 10,
  showLabel = true,
  showWarning = true,
  compact = false,
}: UtilizationBarProps) {
  const color = getUtilColor(percent);
  const fillWidth = Math.min(percent, 100);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
      <div
        style={{
          flex: 1,
          height,
          borderRadius: 9999,
          backgroundColor: 'var(--bg-1)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${fillWidth}%`,
            backgroundColor: color,
            borderRadius: 9999,
            transition: 'width 300ms ease',
          }}
        />
      </div>
      {showLabel && (
        <span
          style={{
            fontFamily: 'var(--cp-font-body)',
            fontSize: compact ? 12 : 14,
            fontWeight: 700,
            color,
            whiteSpace: 'nowrap',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          {Math.round(percent)}%
          {showWarning && percent > 100 && (
            <AlertTriangle style={{ width: 14, height: 14 }} />
          )}
        </span>
      )}
    </div>
  );
}
