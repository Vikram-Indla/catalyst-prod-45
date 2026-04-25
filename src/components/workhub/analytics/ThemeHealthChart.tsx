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
      backgroundColor: 'var(--cp-float)',
      border: '1px solid var(--divider)',
      borderRadius: 'var(--wh-radius-xl, 16px)',
      padding: 24,
    }}>
      <h3 style={{
        fontFamily: 'var(--cp-font-body)',
        fontSize: 16, fontWeight: 600,
        color: 'var(--fg-1)', marginBottom: 16,
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
              borderBottom: '1px solid var(--bg-1)',
              cursor: 'pointer',
              transition: 'background-color 150ms',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--cp-primary-5)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  width: 10, height: 10, borderRadius: '50%',
                  backgroundColor: theme.color, flexShrink: 0,
                }} />
                <span style={{
                  fontFamily: 'var(--cp-font-body)',
                  fontSize: 14, fontWeight: 600,
                  color: 'var(--fg-1)',
                }}>
                  {theme.name}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{
                  fontFamily: 'var(--cp-font-body)',
                  fontSize: 13, fontWeight: 700,
                  color: 'var(--fg-1)',
                }}>
                  {theme.completion_percent}%
                </span>
                <span style={{
                  fontFamily: 'var(--cp-font-body)',
                  fontSize: 12,
                  color: 'var(--fg-4)',
                }}>
                  {theme.done_items}/{theme.total_items} done
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div style={{
              height: 8, borderRadius: 9999,
              backgroundColor: 'var(--bg-1)',
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
