/**
 * ThemeHealthChart — Horizontal progress bars for theme completion
 * Phase 11
 */

import { useNavigate } from 'react-router-dom';
import type { ThemeProgress } from '@/types/workhub.types';

interface Props {
  themes: ThemeProgress[];
}

export function ThemeHealthChart({ themes }: Props) {
  const navigate = useNavigate();

  if (!themes?.length) return null;

  return (
    <div style={{
      backgroundColor: 'var(--wh-surface)',
      border: '1px solid var(--wh-border)',
      borderRadius: 'var(--wh-radius-xl, 16px)',
      padding: 24,
    }}>
      <h3 style={{
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 16, fontWeight: 600,
        color: 'var(--wh-text-primary)', marginBottom: 16,
      }}>
        Theme Health
      </h3>

      <div>
        {themes.map(theme => (
          <div
            key={theme.id}
            onClick={() => navigate(`/projecthub/themes/${theme.id}`)}
            style={{
              padding: '12px 0',
              borderBottom: '1px solid var(--wh-border-light, #f1f5f9)',
              cursor: 'pointer',
              transition: 'background-color 150ms',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--wh-primary-light, #eff6ff)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  width: 10, height: 10, borderRadius: '50%',
                  backgroundColor: theme.color, flexShrink: 0,
                }} />
                <span style={{
                  fontFamily: 'Inter, system-ui, sans-serif',
                  fontSize: 14, fontWeight: 600,
                  color: 'var(--wh-text-primary)',
                }}>
                  {theme.name}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{
                  fontFamily: 'Inter, system-ui, sans-serif',
                  fontSize: 13, fontWeight: 700,
                  color: 'var(--wh-text-primary)',
                }}>
                  {theme.completion_percent}%
                </span>
                <span style={{
                  fontFamily: 'Inter, system-ui, sans-serif',
                  fontSize: 12,
                  color: 'var(--wh-text-tertiary)',
                }}>
                  {theme.done_items}/{theme.total_items} done
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div style={{
              height: 8, borderRadius: 9999,
              backgroundColor: 'var(--wh-border-light, #f1f5f9)',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${Math.min(theme.completion_percent, 100)}%`,
                backgroundColor: theme.color,
                borderRadius: 9999,
                transition: 'width 300ms ease',
              }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
