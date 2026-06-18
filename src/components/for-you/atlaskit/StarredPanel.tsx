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
import { useNavigate } from 'react-router-dom';
import { StarredEmptyState } from './StarredEmptyState';
import { StarredHubList } from './StarredHubList';
import { CatyStarredDigest } from './CatyStarredDigest';
import { useStarredHub } from '@/hooks/home/useStarredHub';
import { useToggleStar } from '@/hooks/home/useStarredItems';
import { useGlobalSearchStore } from '@/store/globalSearchStore';
import type { WorkItem, TabType } from '@/hooks/useForYouData';

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
  /**
   * Routes the empty state to the user's most-recent hub filters. Optional —
   * omitted when there's no recent hub visit, so the Filters CTA is never a
   * dead link (zero-assumption, no guessed project key).
   */
  onBrowseFilters?: () => void;
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

export default function StarredPanel({ onSwitchTab, onBrowseFilters }: StarredPanelProps) {
  const navigate = useNavigate();
  const toggleStar = useToggleStar();
  const { data: rows = [], isLoading } = useStarredHub();

  if (isLoading) return <StarredPanelSkeleton />;

  if (rows.length === 0) {
    // Teaching empty state bound to the unified star model — replaces the
    // generic single-CTA placeholder (design-critique 2026-06-18).
    return (
      <StarredEmptyState
        onBrowseWork={() => onSwitchTab?.('assigned')}
        onOpenBoard={() => onSwitchTab?.('board')}
        onBrowseFilters={onBrowseFilters}
      />
    );
  }

  // Open: work items via openDetail(issue_key); surfaces via stored route.
  // No route + non-issue → no-op (never navigate somewhere guessed).
  const handleOpen = (row: typeof rows[number]) => {
    if (row.category === 'work_item') {
      useGlobalSearchStore.getState().openDetail({ id: row.id });
    } else if (row.route) {
      navigate(row.route);
    }
  };

  const handleUnstar = (row: typeof rows[number]) => {
    toggleStar.mutate({ itemId: row.id, itemType: row.type, isCurrentlyStarred: true });
  };

  // Work-item keys feed the Caty digest (it summarises issues only).
  const workItemKeys = rows.filter(r => r.category === 'work_item').map(r => r.id);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', paddingBlockStart: 8 }}>
      {workItemKeys.length > 0 && <CatyStarredDigest starredKeys={workItemKeys} />}
      <StarredHubList rows={rows} onOpenRow={handleOpen} onUnstar={handleUnstar} />
    </div>
  );
}
