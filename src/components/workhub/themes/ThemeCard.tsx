/**
 * ThemeCard — Card with progress ring for theme grid
 */
import type { ThemeProgress } from '@/types/workhub.types';
import { ProgressRing } from '../shared/ProgressRing';
import { ThemeStatusBadge } from '../shared/ThemeStatusBadge';

interface ThemeCardProps {
  theme: ThemeProgress;
  onClick: () => void;
}

function formatShortDate(d?: string) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatYear(d?: string) {
  if (!d) return '';
  return new Date(d).getFullYear().toString();
}

export function ThemeCard({ theme, onClick }: ThemeCardProps) {
  const startStr = formatShortDate(theme.start_date);
  const endStr = formatShortDate(theme.end_date);
  const year = formatYear(theme.end_date || theme.start_date);
  const dateRange = startStr && endStr
    ? `${startStr} — ${endStr}, ${year}`
    : startStr ? `From ${startStr}` : endStr ? `Until ${endStr}` : null;

  const hasItems = theme.total_items > 0;

  return (
    <div
      onClick={onClick}
      className="wh-theme-card"
      style={{
        background: 'var(--cp-float)',
        border: '1px solid var(--divider)',
        borderRadius: 'var(--wh-radius-xl, 12px)',
        borderTop: `3px solid ${theme.color}`,
        padding: 24,
        boxShadow: 'var(--wh-shadow-sm)',
        cursor: 'pointer',
        transition: 'box-shadow 150ms ease, border-color 150ms ease',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: 12,
      }}
    >
      {/* Top: Ring + Status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
        <div style={{ flex: 1 }} />
        <ProgressRing
          percent={theme.completion_percent}
          size={80}
          strokeWidth={6}
          color={theme.color}
          emptyLabel="—"
        />
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <ThemeStatusBadge status={theme.status} />
        </div>
      </div>

      {/* Name */}
      <div style={{
        fontFamily: 'var(--cp-font-body)',
        fontSize: 16, fontWeight: 600,
        color: 'var(--fg-1)',
      }}>
        {theme.name}
      </div>

      {/* Description */}
      {theme.description && (
        <div style={{
          fontSize: 12, color: 'var(--fg-3)',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          overflow: 'hidden', lineHeight: '1.5',
        }}>
          {theme.description}
        </div>
      )}

      {/* Item breakdown */}
      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-3)', display: 'flex', gap: 8, alignItems: 'center' }}>
        {hasItems || theme.epic_count > 0 || theme.story_count > 0 || theme.subtask_count > 0 ? (
          <>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--cp-blue)' }} />
              E {theme.epic_count}
            </span>
            <span style={{ color: '#cbd5e1' }}>·</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--sem-success)' }} />
              S {theme.story_count}
            </span>
            <span style={{ color: '#cbd5e1' }}>·</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1' }} />
              ST {theme.subtask_count}
            </span>
          </>
        ) : (
          <span style={{ fontStyle: 'italic', color: 'var(--fg-4)' }}>No items</span>
        )}
      </div>

      {/* Date range */}
      <div style={{ fontSize: 12, color: 'var(--fg-4)' }}>
        {dateRange || <span style={{ fontStyle: 'italic' }}>No dates set</span>}
      </div>

      {/* Mini progress bar */}
      {hasItems && (
        <div style={{ width: '100%' }}>
          <div style={{
            height: 4, borderRadius: 9999, overflow: 'hidden',
            background: 'var(--bg-1)',
          }}>
            <div style={{
              height: '100%', borderRadius: 9999,
              background: theme.color,
              width: `${theme.completion_percent}%`,
              transition: 'width 400ms ease',
            }} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--fg-4)', marginTop: 4, textAlign: 'right' }}>
            {theme.done_items}/{theme.total_items} done
          </div>
        </div>
      )}
    </div>
  );
}
