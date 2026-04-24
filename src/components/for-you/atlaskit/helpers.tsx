/**
 * helpers — shared utilities for the For You Atlaskit panels.
 *
 * - GroupHeading: the small uppercase label above each row group
 *   (e.g. "TODAY", "YESTERDAY", "IN THE LAST WEEK") — matches Jira's
 *   For You section labels exactly.
 *
 * - bucketByRecency: places an item into a recency bucket for the
 *   Viewed, Worked-on, and Recommended tabs.
 *
 * - ForYouEmptyState: consistent empty-state artwork across all panels.
 *   Uses Atlaskit EmptyState so messaging, spacing, and CTA behavior match
 *   the rest of the product without a bespoke design.
 */
import React from 'react';
import EmptyState from '@atlaskit/empty-state';
import { token } from '@atlaskit/tokens';
import { text } from '@/lib/typography';
import type { WorkItem } from '@/hooks/useForYouData';

// ─── Recency buckets ────────────────────────────────────────────────────────
export type Recency =
  | 'TODAY'
  | 'YESTERDAY'
  | 'LAST_WEEK'
  | 'LAST_MONTH'
  | 'EARLIER';

export const RECENCY_LABELS: Record<Recency, string> = {
  // Jira parity (DOM probe 2026-04-24, Assigned tab): Title Case, not
  // SHOUTING CAPS. Jira's group heading is a plain 14px/500 span — CSS
  // does not uppercase it, and the raw text is Title Case.
  TODAY:      'Today',
  YESTERDAY:  'Yesterday',
  LAST_WEEK:  'In the last week',
  LAST_MONTH: 'In the last month',
  EARLIER:    'Earlier',
};

/**
 * Bucket a work item by how recently its `updatedAt` (which we've
 * repointed to `last_viewed_at` for the Viewed tab) fell.
 *
 * The item carries a formatted `updatedAt` string ("yesterday", "2 hours
 * ago", "3 days ago", "1 week ago"), so we parse that string rather than
 * requiring every tab to pass a raw timestamp. Matches Jira's section
 * headings exactly.
 */
export function bucketByRelative(updatedAt: string): Recency {
  const s = (updatedAt || '').toLowerCase();
  if (
    s === 'just now' ||
    s.endsWith('minute ago') ||
    s.endsWith('minutes ago') ||
    s.endsWith('hour ago') ||
    s.endsWith('hours ago')
  ) {
    return 'TODAY';
  }
  if (s === 'yesterday') return 'YESTERDAY';

  const daysMatch = s.match(/^(\d+) days? ago$/);
  if (daysMatch) {
    const n = Number(daysMatch[1]);
    if (n <= 7) return 'LAST_WEEK';
    if (n <= 30) return 'LAST_MONTH';
    return 'EARLIER';
  }

  const weeksMatch = s.match(/^(\d+) weeks? ago$/);
  if (weeksMatch) {
    const n = Number(weeksMatch[1]);
    if (n <= 1) return 'LAST_WEEK';
    if (n <= 4) return 'LAST_MONTH';
    return 'EARLIER';
  }

  // "1 week ago" or "3 weeks ago" would have matched above. Anything else
  // (e.g. an ISO-ish fallback) → EARLIER.
  return 'EARLIER';
}

export function groupByRecency(items: WorkItem[], order: Recency[]): Array<{ bucket: Recency; items: WorkItem[] }> {
  const buckets = new Map<Recency, WorkItem[]>();
  items.forEach(item => {
    const b = bucketByRelative(item.updatedAt);
    if (!buckets.has(b)) buckets.set(b, []);
    buckets.get(b)!.push(item);
  });
  return order
    .filter(b => (buckets.get(b)?.length ?? 0) > 0)
    .map(b => ({ bucket: b, items: buckets.get(b)! }));
}

// ─── Group heading ──────────────────────────────────────────────────────────

export function GroupHeading({ bucket }: { bucket: Recency }) {
  // Jira parity (DOM probe 2026-04-24): the group heading on For You is a
  // 14px / weight 500 / Title Case span in `color.text.subtlest` (#6B6E76,
  // rgb(107,110,118)). It is NOT uppercase and has no letter-spacing —
  // earlier iterations mistook a per-row status lozenge for the group heading.
  return (
    <div
      style={{
        font: `500 14px/20px "Inter", system-ui, sans-serif`,
        letterSpacing: 'normal',
        color: text.subtlest,
        textTransform: 'none',
        paddingInline: 12,
        paddingBlockEnd: 8,
        paddingBlockStart: 16,
      }}
    >
      {RECENCY_LABELS[bucket]}
    </div>
  );
}

// ─── Empty state ────────────────────────────────────────────────────────────

interface ForYouEmptyStateProps {
  title: string;
  description: string;
  primaryActionText?: string;
  onPrimaryAction?: () => void;
}

export function ForYouEmptyState({
  title,
  description,
  primaryActionText,
  onPrimaryAction,
}: ForYouEmptyStateProps) {
  return (
    <div style={{ padding: '48px 16px' }}>
      <EmptyState
        header={title}
        description={<span style={{ color: token('color.text.subtle', '#626F86') }}>{description}</span>}
        primaryAction={
          primaryActionText && onPrimaryAction ? (
            <button
              type="button"
              onClick={onPrimaryAction}
              style={{
                padding: '6px 14px',
                background: token('color.background.selected.bold', '#0C66E4'),
                color: token('color.text.inverse', '#FFFFFF'),
                border: 'none',
                borderRadius: 3,
                cursor: 'pointer',
                font: `500 14px/20px "Inter", system-ui, sans-serif`,
              }}
            >
              {primaryActionText}
            </button>
          ) : undefined
        }
      />
    </div>
  );
}
