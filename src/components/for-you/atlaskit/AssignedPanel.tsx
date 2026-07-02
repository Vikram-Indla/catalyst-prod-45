/**
 * AssignedPanel — "Assigned to me" tab.
 *
 * Grouping strategy (2026-07-02 Jira-parity redesign):
 *   Groups by SPECIFIC STATUS VALUE (not status_category), matching Jira's
 *   organization. Each unique status becomes a section header.
 *
 *   Sections are ordered by status_category progression:
 *   - Todo (Backlog, To Do, etc.)
 *   - In Progress (Ready for dev, In Dev, In QA, In UAT, etc.)
 *   - Done (Done, Closed, In Production, etc.)
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

// Jira parity: determine category for ordering sections (not for buckets)
function statusCategoryOrder(statusCategory?: string): number {
  const cat = (statusCategory || '').toLowerCase().trim();
  if (cat === 'done' || cat === 'closed') return 3; // done last
  if (cat === 'in progress' || cat === 'indeterminate') return 2; // in-progress middle
  return 1; // todo first
}

type StatusGroup = {
  status: string;
  statusCategory: string;
  categoryOrder: number;
  items: WorkItem[];
};

export default function AssignedPanel({ items, isLoading, isRefreshing, onSelect, onToggleStar, onAskCatyThemify }: AssignedPanelProps) {
  const [showDone, setShowDone] = useState(false);

  const { groups, doneCount } = useMemo(() => {
    const statusMap = new Map<string, StatusGroup>();
    let done = 0;

    for (const item of items) {
      const isDoneItem = item.statusCategory?.toLowerCase() === 'done' || item.statusCategory?.toLowerCase() === 'closed';
      if (isDoneItem) {
        done++;
        if (!showDone) continue;
      }

      const status = item.status || 'Backlog';
      if (!statusMap.has(status)) {
        statusMap.set(status, {
          status,
          statusCategory: item.statusCategory || 'to_do',
          categoryOrder: statusCategoryOrder(item.statusCategory),
          items: [],
        });
      }
      statusMap.get(status)!.items.push(item);
    }

    // Sort by category order, then by status name within category
    const ordered = Array.from(statusMap.values())
      .sort((a, b) => {
        if (a.categoryOrder !== b.categoryOrder) {
          return a.categoryOrder - b.categoryOrder;
        }
        return a.status.localeCompare(b.status);
      });

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
        <div key={group.status}>
          <SectionHeading label={group.status} count={group.items.length} />
          {group.items.map(item => (
            <ForYouRow key={item.id} item={item} variant="jira-assigned" onSelect={onSelect} onToggleStar={onToggleStar} />
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
