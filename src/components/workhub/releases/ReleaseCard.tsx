/**
 * ReleaseCard — Card component for releases list
 * Shows version, title, stacked progress bar, stats, status badge
 */
import { ArrowRight, AlertTriangle } from 'lucide-react';
import type { ReleaseProgress } from '@/types/workhub.types';
import { ReleaseStatusBadge } from '../shared/ReleaseStatusBadge';
import { StackedProgressBar, releaseProgressSegments } from '../shared/StackedProgressBar';

interface ReleaseCardProps {
  release: ReleaseProgress;
  onClick: () => void;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateRange(start?: string, target?: string): string {
  if (!target) return '';
  if (!start) return `Due: ${formatDate(target)}`;
  return `${formatDate(start)} → ${formatDate(target)}`;
}

export function ReleaseCard({ release, onClick }: ReleaseCardProps) {
  const isOverdue = release.status !== 'Completed'
    && release.status !== 'Cancelled'
    && release.target_date
    && new Date(release.target_date) < new Date();

  const segments = releaseProgressSegments(release);

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--wh-surface, #fff)',
        border: '1px solid var(--wh-border, #e2e8f0)',
        borderRadius: 'var(--wh-radius-xl, 12px)',
        padding: '20px 20px 20px 24px',
        boxShadow: 'var(--wh-shadow-sm)',
        cursor: 'pointer',
        transition: 'box-shadow 150ms ease, border-color 150ms ease',
        position: 'relative',
        overflow: 'hidden',
        marginBottom: 16,
      }}
      className="wh-release-card"
    >
      {/* Color bar */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0,
        width: 4, background: release.color || '#2563eb',
        borderRadius: '12px 0 0 12px',
      }} />

      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{
            fontFamily: 'var(--wh-font-display, Sora, sans-serif)',
            fontSize: 18, fontWeight: 700,
            color: 'var(--wh-text-primary, #0f172a)',
          }}>
            {release.name}
          </div>
          <div style={{
            fontSize: 14, fontWeight: 500,
            color: 'var(--wh-text-secondary, #64748b)',
            marginTop: 2,
          }}>
            {release.title}
          </div>
        </div>
        <ReleaseStatusBadge status={release.status} />
      </div>

      {/* Date range */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: 'var(--wh-text-secondary, #64748b)' }}>
          {formatDateRange(release.start_date, release.target_date)}
        </span>
        {isOverdue && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 12, fontWeight: 600, color: '#ef4444',
          }}>
            <AlertTriangle size={14} />
            Overdue
          </span>
        )}
      </div>

      {/* Stacked progress bar */}
      <StackedProgressBar
        segments={segments}
        total={release.total_items}
        height={8}
        showLegend={true}
        showPercent={true}
        percentValue={release.completion_percent}
      />

      {/* Stats + View Detail */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: 12,
      }}>
        <span style={{ fontSize: 12, color: 'var(--wh-text-tertiary, #94a3b8)' }}>
          {release.total_items} items · {release.unique_assignees} assignees · {release.project_count} projects
        </span>
        <span
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 13, fontWeight: 500, color: 'var(--wh-primary, #2563eb)',
            cursor: 'pointer',
          }}
          className="wh-view-detail"
        >
          View Detail <ArrowRight size={14} />
        </span>
      </div>
    </div>
  );
}
