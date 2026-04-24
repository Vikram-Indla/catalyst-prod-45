/**
 * WorkedOnPanel — "Worked on" tab.
 *
 * Jira groups this tab by recency:
 *   IN THE LAST WEEK → IN THE LAST MONTH → EARLIER
 *
 * A work item is "worked on" if the user has updated, commented on, or
 * transitioned it. The hook hands us items already sorted most-recent-
 * first; we just bucket them.
 */
import React from 'react';
import { token } from '@atlaskit/tokens';
import ForYouRow from './ForYouRow';
import { ForYouEmptyState, GroupHeading, groupByRecency } from './helpers';
import type { WorkItem } from '@/hooks/useForYouData';

interface WorkedOnPanelProps {
  items: WorkItem[];
  isLoading: boolean;
  onSelect: (item: WorkItem) => void;
  onToggleStar: (id: string) => void;
}

export default function WorkedOnPanel({ items, isLoading, onSelect, onToggleStar }: WorkedOnPanelProps) {
  if (isLoading) return <div style={{ padding: 24, color: token('color.text.subtle', '#626F86') }}>Loading…</div>;

  if (items.length === 0) {
    return (
      <ForYouEmptyState
        title="You haven't worked on anything recently"
        description="Work items you touch will appear here ordered by recency."
      />
    );
  }

  const groups = groupByRecency(items, ['LAST_WEEK', 'LAST_MONTH', 'EARLIER']);

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
