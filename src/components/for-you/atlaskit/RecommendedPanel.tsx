/**
 * RecommendedPanel — the default For You tab.
 *
 * Jira's Recommended tab is a two-section surface:
 *   1. "Reply to mentions" card — prompts the user to respond to mentions
 *      in the last 7 days. Shown as a single callout-style card at top.
 *   2. Recommended list — issues the user is most likely to act on next.
 *
 * We approximate (1) by counting items in the `recommended` source where
 * the signal was a comment-mention (the hook guarantees mention-origin
 * items appear first). If any such items exist, the card is rendered.
 *
 * For (2) we render a flat list grouped by recency — same primitive as
 * every other tab, just without sub-headers when everything is TODAY.
 */
import React from 'react';
import { token } from '@atlaskit/tokens';
import { MessageCircle } from 'lucide-react';
import ForYouRow from './ForYouRow';
import { ForYouEmptyState, GroupHeading, groupByRecency } from './helpers';
import type { WorkItem } from '@/hooks/useForYouData';

interface RecommendedPanelProps {
  items: WorkItem[];
  isLoading: boolean;
  onSelect: (item: WorkItem) => void;
  onToggleStar: (id: string) => void;
}

export default function RecommendedPanel({
  items,
  isLoading,
  onSelect,
  onToggleStar,
}: RecommendedPanelProps) {
  if (isLoading) return <div style={{ padding: 24, color: token('color.text.subtle', '#626F86') }}>Loading…</div>;

  if (items.length === 0) {
    return (
      <ForYouEmptyState
        title="Nothing recommended yet"
        description="When teammates mention you or you pick up work, recommendations will show here."
      />
    );
  }

  const groups = groupByRecency(items, ['TODAY', 'YESTERDAY', 'LAST_WEEK', 'LAST_MONTH', 'EARLIER']);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <MentionsCard count={items.length} onClick={() => onSelect(items[0])} />
      {groups.map(({ bucket, items: groupItems }) => (
        <div key={bucket}>
          <GroupHeading bucket={bucket} />
          {groupItems.map(item => (
            <ForYouRow
              key={item.id}
              item={item}
              onSelect={onSelect}
              onToggleStar={onToggleStar}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Mentions card ──────────────────────────────────────────────────────────

function MentionsCard({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        padding: '16px 20px',
        marginBlockEnd: 16,
        background: token('color.background.information', '#E9F2FF'),
        border: `1px solid ${token('color.border.information', '#85B8FF')}`,
        borderRadius: 6,
        cursor: 'pointer',
        textAlign: 'left',
        outline: 'none',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 8,
          backgroundColor: token('color.background.information.bold', '#0C66E4'),
          color: token('color.text.inverse', '#FFFFFF'),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <MessageCircle size={20} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            font: `600 14px/20px "Inter", system-ui, sans-serif`,
            color: token('color.text', '#172B4D'),
          }}
        >
          Reply to mentions
        </div>
        <div
          style={{
            font: `400 12px/16px "Inter", system-ui, sans-serif`,
            color: token('color.text.subtle', '#626F86'),
            marginBlockStart: 2,
          }}
        >
          You've been mentioned {count === 1 ? 'once' : `in ${count} items`} in the last 7 days.
        </div>
      </div>
    </button>
  );
}
