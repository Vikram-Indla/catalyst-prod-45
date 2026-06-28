/**
 * ChatProjectRow — title slot for project channels in ChatSidebar.
 *
 * Renders the project KEY as the row label and shows a hover card anchored
 * to the row's left edge (the project icon position). The card surfaces the
 * full project name plus a stack of member avatars from ph_project_members.
 *
 * Uses canonical @atlaskit/avatar via @/components/ads. No hand-rolled
 * avatar primitives, no external <img>, no popper library — the empty-
 * portal bug in @atlaskit/popup makes a self-rolled fixed-position portal
 * the safer pattern (CLAUDE.md 2026-05-08 / 2026-06-03 lessons).
 */
import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { token } from '@atlaskit/tokens';
import { Avatar } from '@/components/ads/Avatar';
import { useProjectHoverData } from '@/hooks/chat/useProjectHoverData';

export interface ChatProjectRowProps {
  projectKey: string;
  fallbackTitle?: string;
}

const MAX_AVATARS = 6;

export function ChatProjectRow({ projectKey, fallbackTitle }: ChatProjectRowProps) {
  const wrapRef = useRef<HTMLSpanElement | null>(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ left: number; top: number; height: number } | null>(null);
  const { data } = useProjectHoverData(projectKey, open);

  const show = () => {
    const el = wrapRef.current?.closest('button') ?? wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setAnchor({ left: r.right + 8, top: r.top, height: r.height });
    setOpen(true);
  };
  const hide = () => setOpen(false);

  const visibleMembers = (data?.members ?? []).slice(0, MAX_AVATARS);
  const extra = Math.max(0, (data?.members.length ?? 0) - visibleMembers.length);

  return (
    <span
      ref={wrapRef}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      style={{ display: 'inline-flex', alignItems: 'center' }}
    >
      <span>{projectKey}</span>

      {open && anchor
        ? createPortal(
            <div
              role="tooltip"
              onMouseEnter={() => setOpen(true)}
              onMouseLeave={hide}
              style={{
                position: 'fixed',
                left: anchor.left,
                top: anchor.top,
                zIndex: 100000,
                minWidth: 240,
                maxWidth: 320,
                padding: 12,
                borderRadius: 6,
                background: token('elevation.surface.overlay', 'var(--ds-surface, #FFFFFF)'),
                boxShadow: token('elevation.shadow.overlay', '0 8px 24px var(--ds-shadow-raised, rgba(9,30,66,0.18))'),
                border: `1px solid ${token('color.border', 'var(--ds-border, #DFE1E6)')}`,
                fontFamily: 'var(--ds-font-family-body)',
                color: token('color.text', 'var(--ds-text, #172B4D)'),
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  borderBottom: `1px solid ${token('color.border', 'var(--ds-border, #DFE1E6)')}`,
                  paddingBottom: 8,
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: data?.color ?? token('color.background.brand.bold', 'var(--ds-link, #0052CC)'),
                    flexShrink: 0,
                  }}
                />
                <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span
                    style={{
                      fontSize: 'var(--ds-font-size-400)',
                      fontWeight: 600,
                      lineHeight: '18px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {data?.name ?? fallbackTitle ?? projectKey}
                  </span>
                  <span
                    style={{
                      fontSize: 'var(--ds-font-size-100)',
                      fontWeight: 500,
                      lineHeight: '14px',
                      color: token('color.text.subtlest', 'var(--ds-text-subtlest, #6B778C)'),
                      fontFamily: 'var(--ds-font-family-code)',
                    }}
                  >
                    {projectKey}
                  </span>
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span
                  style={{
                    fontSize: 'var(--ds-font-size-100)',
                    fontWeight: 600,
                    color: token('color.text.subtle', 'var(--ds-text-subtle, #42526E)'),
                  }}
                >
                  Members ({data?.members.length ?? 0})
                </span>
                {data?.members.length ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                    {visibleMembers.map((m) => (
                      <Avatar
                        key={m.user_id}
                        name={m.full_name ?? '?'}
                        size="small"
                        aria-label={m.full_name ?? 'Member'}
                      />
                    ))}
                    {extra > 0 ? (
                      <span
                        aria-label={`${extra} more members`}
                        style={{
                          fontSize: 'var(--ds-font-size-200)',
                          fontWeight: 500,
                          color: token('color.text.subtle', 'var(--ds-text-subtle, #42526E)'),
                          padding: '0 4px',
                        }}
                      >
                        +{extra}
                      </span>
                    ) : null}
                  </div>
                ) : (
                  <span style={{ fontSize: 'var(--ds-font-size-200)', color: token('color.text.subtlest', 'var(--ds-text-subtlest, #6B778C)') }}>
                    No members yet.
                  </span>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </span>
  );
}

export default ChatProjectRow;
