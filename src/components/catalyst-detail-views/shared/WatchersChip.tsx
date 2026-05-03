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
import React from 'react';
import { IconButton } from '@atlaskit/button/new';
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
  const label = isWatching ? 'Stop watching' : 'Start watching';

  return (
    <Tooltip content={`${label} · ${count} watcher${count === 1 ? '' : 's'}`} position="bottom">
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
        <IconButton
          appearance="subtle"
          isSelected={isWatching}
          icon={() => isWatching ? <EyeFilledIcon size={16} /> : <EyeIcon size={16} />}
          label={label}
          onClick={() => toggle.mutate()}
        />
        <span style={{
          fontSize: 13, color: '#44546F', minWidth: 12, textAlign: 'center',
          fontFamily: "'Atlassian Sans', -apple-system, sans-serif",
        }}>
          {count}
        </span>
      </span>
    </Tooltip>
  );
}
