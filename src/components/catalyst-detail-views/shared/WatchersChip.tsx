/**
 * WatchersChip — Jira-parity watch indicator for the detail header.
 *
 * Placement: between IssueNavChevrons and the Share button in
 * CatalystViewBase. Mirrors Jira's pattern: outline eye when not watching,
 * filled eye when watching, count next to the icon.
 *
 * Atlaskit primitives: @atlaskit/button IconButton (interactive wrapper) +
 * @atlaskit/tooltip. The Atlaskit icon bundle in this version does NOT
 * ship a watch/eye glyph (verified 2026-05-03 via fs check), so we use
 * an inline SVG matching Jira's canonical eye shape.
 *
 * jira-compare 2026-05-03 — swapped from star/star-filled (which read as
 * "favourite", not "watcher") to eye/eye-filled to match Jira's parity.
 */
import React, { useEffect, useRef, useState } from 'react';
import { IconButton } from '@atlaskit/button/new';
import Button from '@atlaskit/button/new';
import Avatar from '@atlaskit/avatar';
import Tooltip from '@atlaskit/tooltip';
import { useCatalystWatchers } from './hooks/useCatalystWatchers';

/** Outline eye icon — Jira's canonical "Start watching" glyph. */
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

/** Filled eye icon — Jira's "Stop watching" glyph (selected state). */
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
  const label = isWatching ? 'Stop watching' : 'Start watching';

  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // Self-rolled click-outside (matches AllProjectsTable pattern; @atlaskit/popup
  // v4.16 has a known empty-portal bug in this codebase).
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (popupRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <span ref={triggerRef} style={{ display: 'inline-flex', alignItems: 'center', gap: 2, position: 'relative' }}>
      <Tooltip content={`${label} · ${count} watcher${count === 1 ? '' : 's'}`} position="bottom">
        <IconButton
          appearance="subtle"
          isSelected={isWatching}
          icon={() => isWatching ? <EyeFilledIcon size={16} /> : <EyeIcon size={16} />}
          label="Manage watchers"
          onClick={() => setOpen(o => !o)}
        />
      </Tooltip>
      <span style={{
        fontSize: 13, color: '#44546F', minWidth: 12, textAlign: 'center',
        fontFamily: "'Atlassian Sans', -apple-system, sans-serif",
      }}>
        {count}
      </span>

      {open && (
        <div
          ref={popupRef}
          role="dialog"
          aria-label="Manage watchers"
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', right: 0,
            minWidth: 260, maxWidth: 320, zIndex: 200,
            background: 'var(--ds-surface-overlay, #FFFFFF)',
            border: '1px solid var(--ds-border, #DFE1E6)',
            borderRadius: 6,
            boxShadow: 'var(--ds-shadow-overlay, 0 8px 16px rgba(9,30,66,0.15))',
            padding: '12px 0',
          }}
        >
          <div style={{
            padding: '0 16px 8px', fontSize: 12, fontWeight: 500,
            color: 'var(--ds-text-subtle, #44546F)', textTransform: 'uppercase', letterSpacing: 0.4,
          }}>
            Watching this issue
          </div>
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {watchers.length === 0 ? (
              <div style={{ padding: '8px 16px', fontSize: 13, color: 'var(--ds-text-subtle, #6B6E76)' }}>
                No watchers yet.
              </div>
            ) : (
              watchers.map(w => (
                <div key={w.user_id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '6px 16px', fontSize: 13,
                }}>
                  <Avatar size="small" name={w.full_name ?? w.email ?? 'Unknown'} src={w.avatar_url ?? undefined} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {w.full_name ?? w.email ?? 'Unknown'}
                  </span>
                </div>
              ))
            )}
          </div>
          <div style={{
            borderTop: '1px solid var(--ds-border, #DFE1E6)',
            padding: '8px 16px 0', display: 'flex', justifyContent: 'flex-end',
          }}>
            <Button
              appearance={isWatching ? 'subtle' : 'primary'}
              onClick={() => toggle.mutate()}
              isLoading={toggle.isPending}
            >
              {label}
            </Button>
          </div>
        </div>
      )}
    </span>
  );
}
