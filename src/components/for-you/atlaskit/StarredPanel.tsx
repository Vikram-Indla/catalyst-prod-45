/**
 * StarredPanel — the Starred tab.
 *
 * A grouped list of all items the user has starred, bucketed by recency of
 * activity (TODAY / YESTERDAY / IN THE LAST WEEK / IN THE LAST MONTH /
 * EARLIER). Star is always visible (gold) via `alwaysShowStar` on
 * ForYouRow so the tab reads as "these are all starred" at a glance.
 *
 * Per CLAUDE.md: we don't re-implement star logic here — useForYouData
 * already owns toggleStar + starredItems state. We only render.
 *
 * Loading state mirrors `RecommendedPanel`'s shimmering skeleton so users
 * never see a bare "Loading…" text on one tab and a designed skeleton on
 * its sibling — consistency across the For You strip.
 */
import React from 'react';
import { token } from '@atlaskit/tokens';
import ForYouRow from './ForYouRow';
import { ForYouEmptyState, GroupHeading, groupByRecency, StarSparkleArt } from './helpers';
import type { WorkItem, TabType } from '@/hooks/useForYouData';
import { CatyStarredDigest } from './CatyStarredDigest';

interface StarredPanelProps {
  items: WorkItem[];
  isLoading: boolean;
  onSelect: (item: WorkItem) => void;
  onToggleStar: (id: string) => void;
  /**
   * Lets the empty state route the user to a tab where they can actually
   * star something. design-critique 2026-05-17 — Cooper goal-directed:
   * empty states without a recovery path are dead ends. Optional so existing
   * tests that mount StarredPanel directly don't need to pass it.
   */
  onSwitchTab?: (tab: TabType) => void;
}

function StarredSkeletonLine({ width = '100%', height = 12 }: { width?: string | number; height?: number }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 4,
        background: `linear-gradient(90deg, ${token('color.background.neutral.subtle', '#F0F1F2')} 25%, ${token('color.background.neutral', '#E4E5E7')} 50%, ${token('color.background.neutral.subtle', '#F0F1F2')} 75%)`,
        backgroundSize: '200% 100%',
        animation: 'catalyst-shimmer 1.4s infinite',
      }}
    />
  );
}

function StarredPanelSkeleton() {
  return (
    <>
      <style>{`
        @keyframes catalyst-shimmer {
          0%   { background-position: 200% 0 }
          100% { background-position: -200% 0 }
        }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column', paddingBlockStart: 8 }}>
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              height: 56,
              paddingInline: 16,
              paddingBlock: 12,
            }}
          >
            <div style={{ width: 20, height: 20, borderRadius: 4, background: token('color.background.neutral', '#E4E5E7'), flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <StarredSkeletonLine width="60%" height={14} />
              <StarredSkeletonLine width="35%" height={10} />
            </div>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: token('color.background.neutral', '#E4E5E7') }} />
          </div>
        ))}
      </div>
    </>
  );
}

export default function StarredPanel({ items, isLoading, onSelect, onToggleStar, onSwitchTab }: StarredPanelProps) {
  if (isLoading) return <StarredPanelSkeleton />;

  if (items.length === 0) {
    return (
      <ForYouEmptyState
        title="No starred items yet"
        description="Star a work item to keep it close. Starred items appear here and in your sidebar."
        renderImage={() => <StarSparkleArt />}
        // Primary action routes the user to a tab with content where they
        // can actually star something. Without it the Starred tab is a
        // dead end (Cooper goal-directed P0, design-critique 2026-05-17).
        primaryActionText={onSwitchTab ? 'Browse assigned work' : undefined}
        onPrimaryAction={onSwitchTab ? () => onSwitchTab('assigned') : undefined}
      />
    );
  }

  // Recency grouping — mirrors RecommendedPanel's fallback so the Starred
  // tab scales past a handful of items without becoming an unscannable
  // dump. Order matches the rest of the For You strip exactly.
  const groups = groupByRecency(items, ['TODAY', 'YESTERDAY', 'LAST_WEEK', 'LAST_MONTH', 'EARLIER']);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', paddingBlockStart: 8 }}>
      <CatyStarredDigest starredKeys={items.map(i => i.jiraKey || i.id)} />
      {groups.map(({ bucket, items: groupItems }) => (
        <div key={bucket}>
          <GroupHeading bucket={bucket} />
          {groupItems.map(item => (
            <ForYouRow
              key={item.id}
              item={item}
              alwaysShowStar
              onSelect={onSelect}
              onToggleStar={onToggleStar}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
