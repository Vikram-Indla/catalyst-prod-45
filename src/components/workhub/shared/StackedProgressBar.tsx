/**
 * StackedProgressBar — Shared component for release/theme progress
 * Shows proportional segments with optional legend and percentage
 */
import type { ReleaseProgress } from '@/types/workhub.types';

export interface ProgressSegment {
  label: string;
  value: number;
  color: string;
}

interface StackedProgressBarProps {
  segments: ProgressSegment[];
  total: number;
  height?: number;
  showLegend?: boolean;
  showPercent?: boolean;
  percentValue?: number;
}

export function releaseProgressSegments(progress: ReleaseProgress): ProgressSegment[] {
  return [
    { label: 'Done', value: progress.done_items, color: '#16a34a' },
    { label: 'In Progress', value: progress.in_progress_items, color: '#2563eb' },
    { label: 'In Review', value: progress.in_review_items, color: '#7c3aed' },
    { label: 'Blocked', value: progress.blocked_items, color: '#ef4444' },
    { label: 'To Do', value: progress.todo_items, color: '#94a3b8' },
  ];
}

export function StackedProgressBar({
  segments,
  total,
  height = 8,
  showLegend = true,
  showPercent = true,
  percentValue,
}: StackedProgressBarProps) {
  const pct = percentValue ?? (total > 0 ? Math.round((segments[0]?.value ?? 0) / total * 100) : 0);
  const nonZeroSegments = segments.filter(s => s.value > 0);

  // Calculate cumulative offsets
  let cumulative = 0;
  const segmentData = segments.map(seg => {
    const width = total > 0 ? (seg.value / total) * 100 : 0;
    const left = cumulative;
    cumulative += width;
    return { ...seg, width, left };
  }).filter(s => s.width > 0);

  return (
    <div>
      {/* Bar + Percent */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          flex: 1,
          height,
          borderRadius: 'var(--wh-radius-full, 9999px)',
          background: 'var(--wh-border-light, #f1f5f9)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {segmentData.map((seg, i) => (
            <div
              key={seg.label}
              style={{
                position: 'absolute',
                left: `${seg.left}%`,
                width: `${seg.width}%`,
                height: '100%',
                background: seg.color,
                transition: 'width 400ms ease-out, left 400ms ease-out',
              }}
            />
          ))}
        </div>
        {showPercent && (
          <span style={{
            fontSize: height >= 12 ? 18 : 14,
            fontWeight: 700,
            color: 'var(--wh-text-primary, #0f172a)',
            fontFamily: 'Inter, system-ui, sans-serif',
            minWidth: 40,
            textAlign: 'right',
          }}>
            {pct}%
          </span>
        )}
      </div>

      {/* Legend */}
      {showLegend && nonZeroSegments.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
          {nonZeroSegments.map(seg => (
            <span key={seg.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: seg.color, display: 'inline-block', flexShrink: 0,
              }} />
              <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--wh-text-secondary, #64748b)' }}>
                {seg.label} {seg.value}
              </span>
            </span>
          ))}
        </div>
      )}

      {/* Empty state */}
      {total === 0 && (
        <span style={{ fontSize: 12, color: 'var(--wh-text-tertiary, #94a3b8)', marginTop: 4, display: 'block' }}>
          No items
        </span>
      )}
    </div>
  );
}
