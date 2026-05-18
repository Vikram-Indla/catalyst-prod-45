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
//
// Atlaskit EmptyState requires three things per ADS guidelines:
//   1. Header that names the absence (✓ always)
//   2. Description that explains it (✓ always)
//   3. An illustration to give the surface visual weight (added 2026-05-17)
//      AND a primary action so the user can recover (added 2026-05-17).
//
// Earlier version of this helper supported only header + description + optional
// primary action — design-critique 2026-05-17 scored the resulting surface
// 16/30 because every Cooper-goal-directed and Rams-thorough lens failed.
// `renderImage` + threaded primary action is the canonical fix.

interface ForYouEmptyStateProps {
  title: string;
  description: string;
  /**
   * Custom JSX illustration. Pass an inline SVG sized ~120-160px square so
   * Atlaskit's wrapper centers it correctly. When omitted the EmptyState
   * renders without an image (legacy callers that haven't been updated).
   */
  renderImage?: () => React.ReactNode;
  primaryActionText?: string;
  onPrimaryAction?: () => void;
  secondaryActionText?: string;
  onSecondaryAction?: () => void;
}

export function ForYouEmptyState({
  title,
  description,
  renderImage,
  primaryActionText,
  onPrimaryAction,
  secondaryActionText,
  onSecondaryAction,
}: ForYouEmptyStateProps) {
  return (
    <div style={{ padding: '48px 16px' }}>
      <EmptyState
        header={title}
        description={<span style={{ color: token('color.text.subtle', '#626F86') }}>{description}</span>}
        renderImage={renderImage}
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
        secondaryAction={
          secondaryActionText && onSecondaryAction ? (
            <button
              type="button"
              onClick={onSecondaryAction}
              style={{
                padding: '6px 14px',
                background: 'transparent',
                color: token('color.text.subtle', 'var(--cp-text-secondary, var(--cp-text-secondary, #44546F))'),
                border: 'none',
                borderRadius: 3,
                cursor: 'pointer',
                font: `500 14px/20px "Inter", system-ui, sans-serif`,
              }}
            >
              {secondaryActionText}
            </button>
          ) : undefined
        }
      />
    </div>
  );
}

// ─── Inline illustrations for empty states ──────────────────────────────────
//
// We stay inline (no external assets) so the empty state is zero-network
// even on first paint, and so the colors flow through ADS tokens — purple
// here matches the PurpleCategoryTile family used by the Recommended feed
// section. Both glyphs are 120×120 viewBox-relative so EmptyState's wrapper
// can scale them down on narrow surfaces.

/** Star + sparkle dots — Starred empty state. */
export function StarSparkleArt() {
  const fill = token('color.background.accent.purple.subtler', 'rgb(201, 124, 244)');
  const ink = token('color.icon.accent.purple', 'rgb(80, 32, 158)');
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Background tile */}
      <rect x="20" y="20" width="80" height="80" rx="16" fill={fill} />
      {/* Star outline */}
      <path
        d="M60 36 L67.2 53.8 L86 55.6 L71.6 68.2 L76.4 86 L60 76.4 L43.6 86 L48.4 68.2 L34 55.6 L52.8 53.8 Z"
        fill="none"
        stroke={ink}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* Sparkle dots */}
      <circle cx="28" cy="30" r="3" fill={ink} />
      <circle cx="96" cy="40" r="2.5" fill={ink} />
      <circle cx="32" cy="92" r="2" fill={ink} />
      <circle cx="90" cy="94" r="3" fill={ink} />
    </svg>
  );
}

/** Speech bubble + sparkles — Recommended empty state (no mentions/comments). */
export function MentionSparkleArt() {
  const fill = token('color.background.accent.purple.subtler', 'rgb(201, 124, 244)');
  const ink = token('color.icon.accent.purple', 'rgb(80, 32, 158)');
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="20" y="20" width="80" height="80" rx="16" fill={fill} />
      {/* Speech bubble */}
      <path
        d="M40 48 a8 8 0 0 1 8 -8 h24 a8 8 0 0 1 8 8 v18 a8 8 0 0 1 -8 8 h-12 l-10 8 v-8 h-2 a8 8 0 0 1 -8 -8 z"
        fill="none"
        stroke={ink}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* @ glyph hint as 2 lines inside bubble */}
      <line x1="52" y1="52" x2="68" y2="52" stroke={ink} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="52" y1="60" x2="62" y2="60" stroke={ink} strokeWidth="2.5" strokeLinecap="round" />
      {/* Sparkles */}
      <circle cx="30" cy="32" r="3" fill={ink} />
      <circle cx="94" cy="38" r="2.5" fill={ink} />
      <circle cx="88" cy="92" r="3" fill={ink} />
    </svg>
  );
}
