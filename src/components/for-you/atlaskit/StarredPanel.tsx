/**
 * StarredPanel — the Starred tab.
 *
 * Simplest of the five: a flat list of all items the user has starred,
 * most recently starred first. Star is always visible (gold) via
 * `alwaysShowStar` on ForYouRow so the tab reads as "these are all
 * starred" at a glance.
 *
 * Per CLAUDE.md: we don't re-implement star logic here — useForYouData
 * already owns toggleStar + starredItems state. We only render.
 */
import React from 'react';
import { token } from '@atlaskit/tokens';
import ForYouRow from './ForYouRow';
import { ForYouEmptyState } from './helpers';
import type { WorkItem } from '@/hooks/useForYouData';

interface StarredPanelProps {
  items: WorkItem[];
  isLoading: boolean;
  onSelect: (item: WorkItem) => void;
  onToggleStar: (id: string) => void;
}

export default function StarredPanel({ items, isLoading, onSelect, onToggleStar }: StarredPanelProps) {
  if (isLoading) return <div style={{ padding: 24, color: token('color.text.subtle', '#626F86') }}>Loading…</div>;

  if (items.length === 0) {
    return (
      <ForYouEmptyState
        title="No starred items yet"
        description="Star a work item to keep it close. Starred items appear here and in your sidebar."
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', paddingBlockStart: 8 }}>
      {items.map(item => (
        <ForYouRow
          key={item.id}
          item={item}
          alwaysShowStar
          onSelect={onSelect}
          onToggleStar={onToggleStar}
        />
      ))}
    </div>
  );
}
