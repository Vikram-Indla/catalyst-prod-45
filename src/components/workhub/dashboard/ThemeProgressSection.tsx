/**
 * ThemeProgressSection — Mini theme progress cards
 * Phase 8
 */
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { ThemeProgress } from '@/types/workhub.types';
import { ProgressRing } from '../shared/ProgressRing';

interface ThemeProgressSectionProps {
  themes: ThemeProgress[];
}

export function ThemeProgressSection({ themes }: ThemeProgressSectionProps) {
  const navigate = useNavigate();
  const active = themes.filter(t => t.status === 'Active');

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 18,
          fontWeight: 600,
          color: 'var(--wh-text-primary, #0f172a)',
          margin: 0,
        }}>
          Theme Progress
        </h2>
        <button
          onClick={() => navigate('/workhub/themes')}
          style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: 13,
            color: 'var(--wh-primary, #2563eb)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
          className="hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500/30 rounded"
        >
          View All <ArrowRight style={{ width: 14, height: 14 }} />
        </button>
      </div>

      {active.length === 0 ? (
        <p style={{
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 13,
          color: 'var(--wh-text-tertiary, #94a3b8)',
        }}>
          No active themes
        </p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}
          className="max-[700px]:grid-cols-1">
          {active.map(theme => (
            <div
              key={theme.id}
              onClick={() => navigate(`/workhub/themes/${theme.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && navigate(`/workhub/themes/${theme.id}`)}
              style={{
                background: 'var(--wh-surface, #fff)',
                border: '1px solid var(--wh-border, #e2e8f0)',
                borderTop: `3px solid ${theme.color}`,
                borderRadius: 'var(--wh-radius-lg, 12px)',
                padding: 16,
                cursor: 'pointer',
                transition: 'var(--wh-transition-fast, all 150ms ease)',
                display: 'flex',
                gap: 14,
                alignItems: 'center',
              }}
              className="hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              {/* Ring */}
              <ProgressRing
                percent={theme.completion_percent}
                size={40}
                strokeWidth={4}
                color={theme.color}
              />

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: 'Inter, system-ui, sans-serif',
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--wh-text-primary, #0f172a)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {theme.name}
                </div>
                <div style={{
                  fontSize: 12,
                  color: 'var(--wh-text-secondary, #64748b)',
                  marginTop: 2,
                }}>
                  {theme.status}
                </div>
                <div style={{
                  fontSize: 12,
                  color: 'var(--wh-text-tertiary, #94a3b8)',
                  marginTop: 2,
                }}>
                  E {theme.epic_count} · S {theme.story_count} · ST {theme.subtask_count}
                </div>
                <div style={{
                  fontSize: 12,
                  color: 'var(--wh-text-tertiary, #94a3b8)',
                  marginTop: 2,
                }}>
                  {theme.done_items}/{theme.total_items} done
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
