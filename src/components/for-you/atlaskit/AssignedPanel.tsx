/**
 * AssignedPanel — "Assigned to me" tab.
 *
 * 2026-05-17 jira-compare (LIVE Jira DOM probe):
 *   Jira's /jira/for-you Assigned tab groups by RAW STATUS NAME, NOT by
 *   statusCategory bucket. The visible section headers in the live DOM are
 *   "In Progress", "In Development", "TODO", "In Requirements" — i.e. the
 *   actual `issue.fields.status.name` values, NOT category labels.
 *   The earlier Catalyst grouping invented "Waiting" / "Active" bucket
 *   labels by rolling up statusCategory `new` / `indeterminate` — neither
 *   label exists in Jira and confused the user ("what is Waiting? from
 *   where? this doesn't exist?").
 *
 *   Ordering: Active statuses first (statusCategory indeterminate), Done
 *   last, To Do family in the middle. Within each, alphabetical.
 *
 * Done items are hidden by default. "Show completed (N)" toggle appears at
 * the bottom when there are any.
 */
import React, { useMemo, useState } from 'react';
import { token } from '@atlaskit/tokens';
import ForYouRow from './ForYouRow';
import { ForYouEmptyState } from './helpers';
import { text } from '@/lib/typography';
import type { WorkItem } from '@/hooks/useForYouData';

interface AssignedPanelProps {
  items: WorkItem[];
  isLoading: boolean;
  onSelect: (item: WorkItem) => void;
  onToggleStar: (id: string) => void;
}

function isDone(statusCategory?: string, status?: string): boolean {
  const cat = (statusCategory || '').toLowerCase().replace(/[\s_-]/g, '');
  if (cat === 'done' || cat === 'closed') return true;
  const s = (status || '').toLowerCase();
  return s.includes('done') || s.includes('closed') || s.includes('complet') || s.includes('approved');
}

function categoryRank(statusCategory?: string): number {
  // Active (indeterminate) → 0 (top), To Do (new) → 1, Done → 2
  const cat = (statusCategory || '').toLowerCase().replace(/[\s_-]/g, '');
  if (cat === 'indeterminate') return 0;
  if (cat === 'done' || cat === 'closed') return 2;
  return 1;
}

export default function AssignedPanel({ items, isLoading, onSelect, onToggleStar }: AssignedPanelProps) {
  const [showDone, setShowDone] = useState(false);

  const { groups, doneCount } = useMemo(() => {
    // Group by raw status NAME (preserves Jira's section labels exactly)
    const byStatus = new Map<string, { status: string; statusCategory: string | undefined; items: WorkItem[] }>();
    let done = 0;
    for (const item of items) {
      if (isDone(item.statusCategory, item.status)) {
        done++;
        if (!showDone) continue;
      }
      const key = item.status || 'Unknown';
      if (!byStatus.has(key)) byStatus.set(key, { status: key, statusCategory: item.statusCategory, items: [] });
      byStatus.get(key)!.items.push(item);
    }
    // Sort: by category rank first (Active → To Do → Done), then alphabetical
    const ordered = Array.from(byStatus.values()).sort((a, b) => {
      const ra = categoryRank(a.statusCategory);
      const rb = categoryRank(b.statusCategory);
      if (ra !== rb) return ra - rb;
      return a.status.localeCompare(b.status);
    });
    return { groups: ordered, doneCount: done };
  }, [items, showDone]);

  if (isLoading) {
    return <div style={{ padding: 24, color: token('color.text.subtle', '#626F86') }}>Loading…</div>;
  }

  if (items.length === 0) {
    return (
      <ForYouEmptyState
        title="You're all caught up"
        description="Nothing is assigned to you right now. Enjoy the calm."
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {groups.map(group => (
        <div key={group.status}>
          <SectionHeading label={group.status} />
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
            font: `400 13px/20px "Inter", system-ui, sans-serif`,
            color: token('color.text.subtlest', '#626F86'),
            cursor: 'pointer', padding: `${token('space.050', '4px')} 0`,
            textDecoration: 'underline', textDecorationColor: 'transparent',
            transition: 'color 150ms, text-decoration-color 150ms',
          }}
          onMouseEnter={e => {
            const b = e.currentTarget;
            b.style.color = token('color.text.subtle', '#44546F');
            b.style.textDecorationColor = 'currentColor';
          }}
          onMouseLeave={e => {
            const b = e.currentTarget;
            b.style.color = token('color.text.subtlest', '#626F86');
            b.style.textDecorationColor = 'transparent';
          }}
        >
          {showDone ? `Hide completed (${doneCount})` : `Show completed (${doneCount})`}
        </button>
      )}
    </div>
  );
}

function SectionHeading({ label }: { label: string }) {
  // 2026-05-17 jira-compare LIVE probe: section header is
  //   14px / 500 / rgb(107,110,118) [subtlest] / textTransform:none
  //   parent padding: 12px 0 4px
  // Earlier 12/500/subtle was based on the user's spec sheet — live DOM is
  // 14/500/subtlest. Trusting the live probe over the spec sheet.
  return (
    <div style={{
      // 2026-05-17 LIVE Jira probe: section header parent has padding
      // `12px 0 4px` — text sits at the panel's LEFT EDGE while rows
      // indent 16px (row padding). Aligning to Jira exactly.
      paddingInlineStart: 0, paddingInlineEnd: 0,
      paddingBlockStart: 12, paddingBlockEnd: 4,
    }}>
      <span style={{
        font: `500 14px/20px var(--ds-font-family-body, "Inter"), system-ui, sans-serif`,
        letterSpacing: 'normal', color: text.subtlest, textTransform: 'none',
      }}>
        {label}
      </span>
    </div>
  );
}
