import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { token } from '@atlaskit/tokens';
import { supabase } from '@/integrations/supabase/client';

interface PostMortemResult {
  summary: string;
  timeline: string;
  lessons: string[];
}

interface BrPostMortemModalProps {
  brId: string | null;
  brTitle: string;
  onClose: () => void;
}

export function BrPostMortemModal({ brId, brTitle, onClose }: BrPostMortemModalProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['br-postmortem', brId],
    enabled: !!brId,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('ai-post-mortem', {
        body: { brId },
      });
      if (error) throw error;
      return data as PostMortemResult;
    },
  });

  if (!brId) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--ds-shadow-raised, rgba(9,30,66,0.54))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 500,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        data-testid="postmortem-modal"
        style={{
          background: token('elevation.surface.overlay', 'var(--ds-surface, #FFFFFF)'),
          borderRadius: 8,
          boxShadow: token('elevation.shadow.overlay', '0 8px 24px var(--ds-shadow-raised, rgba(0,0,0,0.20))'),
          width: '100%',
          maxWidth: 560,
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: `${token('space.200', '16px')} ${token('space.250', '20px')}`,
            borderBottom: `1px solid ${token('color.border', 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6))')}`,
            flexShrink: 0,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 'var(--ds-font-size-500)',
              fontWeight: 600,
              color: token('color.text', 'var(--cp-text-primary, var(--cp-text-inverse, #172B4D))'),
            }}
          >
            {brTitle}
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: token('color.text.subtlest', 'var(--ds-text-disabled, #8590A2)'),
              fontSize: 'var(--ds-font-size-600)',
              lineHeight: 1,
              padding: 4,
              borderRadius: 4,
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: token('space.250', '20px'),
          }}
        >
          {isLoading && (
            <div
              data-testid="postmortem-loading"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              {[80, 60, 90, 50].map((w, i) => (
                <div
                  key={i}
                  style={{
                    height: 14,
                    width: `${w}%`,
                    borderRadius: 4,
                    background: token('color.background.neutral', 'var(--ds-background-neutral-subtle, #F4F5F7)'),
                  }}
                />
              ))}
            </div>
          )}

          {isError && (
            <div
              data-testid="postmortem-error"
              style={{
                padding: token('space.150', '12px'),
                background: token('color.background.danger', 'var(--ds-background-danger, #FFECEB)'),
                borderRadius: 6,
                fontSize: 'var(--ds-font-size-300)',
                color: token('color.text.danger', 'var(--ds-text-danger, #AE2A19)'),
              }}
            >
              Failed to generate post-mortem. Please try again.
            </div>
          )}

          {data && (
            <div
              data-testid="postmortem-content"
              style={{ display: 'flex', flexDirection: 'column', gap: token('space.150', '12px') }}
            >
              <section>
                <h3
                  style={{
                    margin: '0 0 6px',
                    fontSize: 'var(--ds-font-size-200)',
                    fontWeight: 600,
                    color: token('color.text.subtlest', 'var(--ds-text-disabled, #8590A2)'),
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  Summary
                </h3>
                <p style={{ margin: 0, fontSize: 'var(--ds-font-size-400)', color: token('color.text', 'var(--cp-text-primary, var(--cp-text-inverse, #172B4D))'), lineHeight: 1.6 }}>
                  {data.summary}
                </p>
              </section>

              <section>
                <h3
                  style={{
                    margin: '0 0 6px',
                    fontSize: 'var(--ds-font-size-200)',
                    fontWeight: 600,
                    color: token('color.text.subtlest', 'var(--ds-text-disabled, #8590A2)'),
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  Timeline
                </h3>
                <p style={{ margin: 0, fontSize: 'var(--ds-font-size-400)', color: token('color.text', 'var(--cp-text-primary, var(--cp-text-inverse, #172B4D))'), lineHeight: 1.6 }}>
                  {data.timeline}
                </p>
              </section>

              {data.lessons.length > 0 && (
                <section>
                  <h3
                    style={{
                      margin: '0 0 6px',
                      fontSize: 'var(--ds-font-size-200)',
                      fontWeight: 600,
                      color: token('color.text.subtlest', 'var(--ds-text-disabled, #8590A2)'),
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                    }}
                  >
                    Lessons Learned
                  </h3>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {data.lessons.map((lesson, i) => (
                      <li
                        key={i}
                        style={{ fontSize: 'var(--ds-font-size-400)', color: token('color.text', 'var(--cp-text-primary, var(--cp-text-inverse, #172B4D))'), lineHeight: 1.6 }}
                      >
                        {lesson}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
