/**
 * WatchersChip — Jira-parity watch indicator for the detail header.
 *
 * Jira UX (2026-05-17 re-probe, canonical):
 *   [eye icon]  [count]
 *   ↑ direct toggle    ↑ click opens watcher list popover
 *
 * Eye icon = instantly start/stop watching (no intermediate popover).
 * Count number = click opens the watchers list popover.
 *
 * Atlaskit primitives: @atlaskit/button IconButton + @atlaskit/tooltip.
 * Eye glyph: inline SVG (verified absent from @atlaskit/icon bundles 2026-05-03).
 *
 * History:
 *   2026-05-03 — swapped star → eye glyph for Jira parity
 *   2026-05-05 — self-rolled popover (manages watcher list), Escape capture guard
 *   2026-05-17 — FIXED: eye now directly toggles (was opening popover, breaking Jira parity)
 *                count span now opens the watcher list popover
 */
import React, { useEffect, useRef, useState } from 'react';
import { IconButton } from '@atlaskit/button/new';
import CatalystAvatar from '@/components/shared/CatalystAvatar';
import Tooltip from '@atlaskit/tooltip';
import { resolveAvatarUrl } from '@/lib/avatars';
import { useCatalystWatchers } from './hooks/useCatalystWatchers';

/** Outline eye — "Start watching" glyph. */
function EyeIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zm0 13c-3.04 0-5.5-2.46-5.5-5.5S8.96 6.5 12 6.5s5.5 2.46 5.5 5.5-2.46 5.5-5.5 5.5zm0-9a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z"
      />
    </svg>
  );
}

/** Filled eye — "Stop watching" glyph (selected state). */
function EyeFilledIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17a5 5 0 1 1 0-10 5 5 0 0 1 0 10z"
      />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
    </svg>
  );
}

interface Props {
  issueKey: string | null;
}

export function WatchersChip({ issueKey }: Props) {
  const { data, toggle } = useCatalystWatchers(issueKey);
  const count = data?.count ?? 0;
  const isWatching = data?.isWatching ?? false;
  const watchers = data?.watchers ?? [];
  const actionLabel = isWatching ? 'Stop watching' : 'Start watching';
  const tooltipLabel = `${actionLabel} · ${count} watcher${count === 1 ? '' : 's'}`;

  const [listOpen, setListOpen] = useState(false);
  const countRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // Self-rolled click-outside for the watcher list popover.
  useEffect(() => {
    if (!listOpen) return;
    const mouseHandler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (countRef.current?.contains(target)) return;
      if (popupRef.current?.contains(target)) return;
      setListOpen(false);
    };
    // Capture-phase Escape: closes popover without propagating to parent modal.
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setListOpen(false);
      }
    };
    document.addEventListener('mousedown', mouseHandler);
    document.addEventListener('keydown', keyHandler, true);
    return () => {
      document.removeEventListener('mousedown', mouseHandler);
      document.removeEventListener('keydown', keyHandler, true);
    };
  }, [listOpen]);

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 0, position: 'relative' }}>
      {/* Eye icon — direct toggle (Jira parity: click eye = start/stop watching immediately) */}
      <Tooltip content={tooltipLabel} position="bottom">
        <IconButton
          appearance="subtle"
          isSelected={isWatching}
          isLoading={toggle.isPending}
          icon={() => isWatching ? <EyeFilledIcon size={16} /> : <EyeIcon size={16} />}
          label={actionLabel}
          onClick={() => toggle.mutate()}
        />
      </Tooltip>

      {/* Count — only rendered when there are watchers; clicking opens the list popover */}
      {count > 0 && (
        <Tooltip content={`${count} watcher${count === 1 ? '' : 's'} — click to view`} position="bottom">
          <button
            ref={countRef}
            onClick={() => setListOpen(o => !o)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '0 6px', minWidth: 16, textAlign: 'center',
              fontSize: 'var(--ds-font-size-400)', fontWeight: 500, color: 'var(--ds-text-subtle)',
              fontFamily: "'Atlassian Sans', -apple-system, sans-serif",
              lineHeight: '32px', borderRadius: 3,
            }}
            aria-label={`${count} watchers — open list`}
          >
            {count}
          </button>
        </Tooltip>
      )}

      {/* Watcher list popover — opens from count click */}
      {listOpen && (
        <div
          ref={popupRef}
          role="dialog"
          aria-label="Watchers"
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', right: 0,
            minWidth: 260, maxWidth: 320, zIndex: 200,
            background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))',
            border: '1px solid var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral)))',
            borderRadius: 6,
            boxShadow: 'var(--ds-shadow-overlay, 0 8px 16px rgba(9,30,66,0.15))',
            padding: '12px 0',
          }}
        >
          <div style={{
            padding: '0 16px 8px', fontSize: 'var(--ds-font-size-100)', fontWeight: 600,
            color: 'var(--ds-text-subtlest, var(--cp-text-secondary))', textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}>
            Watchers
          </div>
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {watchers.length === 0 ? (
              <div style={{ padding: '8px 16px', fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtle)' }}>
                No watchers yet.
              </div>
            ) : (
              watchers.map(w => (
                <div key={w.user_id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '6px 16px', fontSize: 'var(--ds-font-size-300)',
                  color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))',
                }}>
                  <CatalystAvatar size="small" name={w.full_name ?? w.email ?? 'Unknown'} src={resolveAvatarUrl(w.full_name ?? w.email) ?? w.avatar_url} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {w.full_name ?? w.email ?? 'Unknown'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </span>
  );
}
