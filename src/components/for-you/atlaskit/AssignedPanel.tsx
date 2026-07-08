/**
 * AssignedPanel — "Assigned to me" tab.
 *
 * Grouping strategy (2026-07-08 noise-cut, CAT-HOME-NOISECUT-20260708-001):
 *   Groups by status_category — To do / In progress / Done — instead of the
 *   literal status value. Literal status (e.g. "On Hold", "Ready for
 *   development") no longer gets its own section or a row lozenge; it
 *   renders as plain meta text on the row when it differs from the bucket
 *   label, so no information is lost, just de-duplicated (CLAUDE.md
 *   zero-assumption: category is real DB data, no status-name guessing).
 *
 *   Done items hidden by default, toggleable via "Show completed" button.
 *
 * Data load fix (2026-06-03):
 *   Shows a loading state during background refetches to prevent the
 *   stale → fresh two-phase render flicker.
 */
import React, { useMemo, useState } from 'react';
import Spinner from '@atlaskit/spinner';
import { token } from '@atlaskit/tokens';
import ForYouRow from './ForYouRow';
import { ForYouEmptyState } from './helpers';
import { text } from '@/lib/typography';
import { CatyButton } from './CatyButton';
import type { WorkItem } from '@/hooks/useForYouData';

interface AssignedPanelProps {
  items: WorkItem[];
  isLoading: boolean;
  isRefreshing?: boolean;
  onSelect: (item: WorkItem) => void;
  onToggleStar: (id: string) => void;
  onAskCatyThemify?: () => void;
}

// Bucket + order by real status_category (todo / in-progress / done) — the
// only categories the data actually carries (useForYouData.ts, ph_issues).
// Live ph_issues values are 'todo' / 'in_progress' / 'done' (underscore) —
// verified via staging query 2026-07-08, CAT-HOME-NOISECUT-20260708-001.
// 'in progress' (space) / 'indeterminate' kept as defensive aliases for any
// other WorkItem source that may spell it differently.
function statusCategoryOrder(statusCategory?: string): number {
  const cat = (statusCategory || '').toLowerCase().trim();
  if (cat === 'done' || cat === 'closed') return 3; // done last
  if (cat === 'in_progress' || cat === 'in progress' || cat === 'indeterminate') return 2; // in-progress middle
  return 1; // todo first
}

const CATEGORY_LABEL: Record<number, string> = {
  1: 'To do',
  2: 'In progress',
  3: 'Done',
};

type StatusGroup = {
  categoryOrder: number;
  label: string;
  items: WorkItem[];
};

export default function AssignedPanel({ items, isLoading, isRefreshing, onSelect, onToggleStar, onAskCatyThemify }: AssignedPanelProps) {
  const [showDone, setShowDone] = useState(false);

  const { groups, doneCount } = useMemo(() => {
    const categoryMap = new Map<number, StatusGroup>();
    let done = 0;

    for (const item of items) {
      const isDoneItem = item.statusCategory?.toLowerCase() === 'done' || item.statusCategory?.toLowerCase() === 'closed';
      if (isDoneItem) {
        done++;
        if (!showDone) continue;
      }

      const order = statusCategoryOrder(item.statusCategory);
      if (!categoryMap.has(order)) {
        categoryMap.set(order, { categoryOrder: order, label: CATEGORY_LABEL[order] ?? 'Other', items: [] });
      }
      categoryMap.get(order)!.items.push(item);
    }

    const ordered = Array.from(categoryMap.values()).sort((a, b) => a.categoryOrder - b.categoryOrder);
    return { groups: ordered, doneCount: done };
  }, [items, showDone]);

  if (isLoading) {
    return <div style={{ padding: 24, color: token('color.text.subtle', 'var(--ds-icon-subtle)') }}>Loading…</div>;
  }

  if (items.length === 0 && !isRefreshing) {
    return (
      <ForYouEmptyState
        title="You're all caught up"
        description="Nothing is assigned to you right now. Enjoy the calm."
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {isRefreshing && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 16px',
          color: token('color.text.subtlest', 'var(--ds-icon-subtle)'),
          fontSize: 'var(--ds-font-size-200)',
        }}>
          <Spinner size="small" /> Refreshing…
        </div>
      )}
      {onAskCatyThemify && (
        <AskCatyThemifyButton onClick={onAskCatyThemify} />
      )}
      {groups.map(group => (
        <div key={group.categoryOrder}>
          <SectionHeading label={group.label} count={group.items.length} />
          {group.items.map(item => (
            <ForYouRow key={item.id} item={item} variant="jira-assigned" bucketLabel={group.label} onSelect={onSelect} onToggleStar={onToggleStar} />
          ))}
        </div>
      ))}

      {doneCount > 0 && (
        <button
          type="button"
          onClick={() => setShowDone(v => !v)}
          style={{
            alignSelf: 'flex-start',
            margin: `${token('space.100', '8px')} ${token('space.150', '12px')}`,
            background: 'transparent', border: 'none',
            font: `400 14px/20px var(--ds-font-family-body, "Atlassian Sans"), ui-sans-serif, sans-serif`,
            color: token('color.text.subtlest', 'var(--ds-icon-subtle)'),
            cursor: 'pointer', padding: `${token('space.050', '4px')} 0`,
            textDecoration: 'underline', textDecorationColor: 'transparent',
            transition: 'color 150ms, text-decoration-color 150ms',
          }}
          onMouseEnter={e => {
            const b = e.currentTarget;
            b.style.color = token('color.text.subtle', 'var(--cp-text-secondary, var(--cp-text-secondary))');
            b.style.textDecorationColor = 'currentColor';
          }}
          onMouseLeave={e => {
            const b = e.currentTarget;
            b.style.color = token('color.text.subtlest', 'var(--ds-icon-subtle)');
            b.style.textDecorationColor = 'transparent';
          }}
        >
          {showDone ? `Hide completed (${doneCount})` : `Show completed (${doneCount})`}
        </button>
      )}
    </div>
  );
}

function SectionHeading({ label, count }: { label: string; count: number }) {
  return (
    <div style={{
      paddingInlineStart: 0, paddingInlineEnd: 0,
      paddingBlockStart: 16, paddingBlockEnd: 4,
      display: 'flex', alignItems: 'baseline', gap: 8,
    }}>
      <span style={{
        font: `500 14px/20px var(--ds-font-family-body, "Atlassian Sans"), ui-sans-serif, sans-serif`,
        letterSpacing: 'normal', color: text.subtlest, textTransform: 'none',
      }}>
        {label}
      </span>
      <span style={{
        font: `400 12px/16px var(--ds-font-family-body, "Atlassian Sans"), ui-sans-serif, sans-serif`,
        color: token('color.text.subtlest', 'var(--ds-icon-subtle)'),
      }}>
        {count}
      </span>
    </div>
  );
}

function AskCatyThemifyButton({ onClick }: { onClick: () => void }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'flex-end',
      paddingBlockStart: 8,
      paddingBlockEnd: 16,
    }}>
      <CatyButton label="Themify" onClick={onClick} />
    </div>
  );
}
