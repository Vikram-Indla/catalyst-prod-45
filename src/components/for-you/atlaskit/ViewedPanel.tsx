/**
 * ViewedPanel — "Viewed" tab.
 *
 * Jira groups this tab by view recency:
 *   TODAY → YESTERDAY
 *
 * Older views spill into EARLIER for scannability — Jira itself caps the
 * list around a week but we keep a long tail so users can jump back to
 * anything recent.
 *
 * The hook has already overwritten jira_updated_at with the
 * last_viewed_at timestamp, so `item.updatedAt` here is the view time,
 * not the edit time — which is what the user actually wants to scan by.
 */
import React from 'react';
import { token } from '@atlaskit/tokens';
import ForYouRow from './ForYouRow';
import { ForYouEmptyState, GroupHeading, groupByRecency } from './helpers';
import type { WorkItem } from '@/hooks/useForYouData';

interface ViewedPanelProps {
  items: WorkItem[];
  isLoading: boolean;
  onSelect: (item: WorkItem) => void;
  onToggleStar: (id: string) => void;
}

export default function ViewedPanel({ items, isLoading, onSelect, onToggleStar }: ViewedPanelProps) {
  if (isLoading) return <div style={{ padding: 24, color: token('color.text.subtle', '#626F86') }}>Loading…</div>;

  if (items.length === 0) {
    return (
      <ForYouEmptyState
        title="Nothing viewed yet"
        description="Work items you open will appear here so you can quickly jump back."
      />
    );
  }

  const groups = groupByRecency(items, ['TODAY', 'YESTERDAY', 'LAST_WEEK', 'LAST_MONTH', 'EARLIER']);

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {groups.map(({ bucket, items: groupItems }) => (
        <div key={bucket}>
          <GroupHeading bucket={bucket} />
          {groupItems.map(item => (
            <ForYouRow key={item.id} item={item} onSelect={onSelect} onToggleStar={onToggleStar} />
          ))}
        </div>
      ))}
    </div>
  );
}
