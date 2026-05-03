/**
 * WatchersChip — Jira-parity watch indicator for the detail header.
 *
 * Placement: between IssueNavChevrons and the Share button in
 * CatalystViewBase. Mirrors Jira's pattern (filled star when watching,
 * outline star when not, count next to the icon).
 *
 * Atlaskit primitives: @atlaskit/button IconButton (interactive wrapper) +
 * @atlaskit/tooltip. Uses glyph star/star-filled (watch/unwatch icons not
 * yet in Atlaskit bundle per prior session notes).
 */
import React from 'react';
import { IconButton } from '@atlaskit/button/new';
import Tooltip from '@atlaskit/tooltip';
import StarIcon from '@atlaskit/icon/glyph/star';
import StarFilledIcon from '@atlaskit/icon/glyph/star-filled';
import { useCatalystWatchers } from './hooks/useCatalystWatchers';

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
          icon={() => isWatching ? <StarFilledIcon size="small" /> : <StarIcon size="small" />}
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
