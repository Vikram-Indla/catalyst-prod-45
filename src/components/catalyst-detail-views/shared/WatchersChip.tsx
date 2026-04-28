/**
 * WatchersChip — Jira-parity eye + count chip for the detail header.
 *
 * Placement: between IssueNavChevrons and the Share button in
 * CatalystViewBase. Mirrors Jira's pattern (filled eye when watching,
 * outline eye when not, count next to the icon).
 *
 * Atlaskit primitives: @atlaskit/button IconButton (interactive wrapper) +
 * @atlaskit/tooltip. Glyph is lucide Eye / EyeOff to match the rest of
 * this file's icon usage; the @atlaskit/icon `WatchIcon` is the canonical
 * substitute and can be swapped in once it's added to the bundle.
 */
import React from 'react';
import { IconButton } from '@atlaskit/button/new';
import Tooltip from '@atlaskit/tooltip';
import { Eye, EyeOff } from 'lucide-react';
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
          icon={() => isWatching ? <Eye size={16} /> : <EyeOff size={16} />}
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
