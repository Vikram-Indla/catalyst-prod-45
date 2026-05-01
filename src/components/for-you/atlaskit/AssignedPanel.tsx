/**
 * AssignedPanel — "Assigned to me" tab.
 *
 * Jira groups this tab by status category:
 *   TO DO → IN PROGRESS → IN REVIEW → DONE
 *
 * We route each WorkItem's status.toLowerCase() into one of those four
 * buckets, then render them in that fixed order so the user's day-to-day
 * queue reads top-to-bottom.
 */
import React from 'react';
import { token } from '@atlaskit/tokens';
import ForYouRow from './ForYouRow';
import { ForYouEmptyState } from './helpers';
import { text } from '@/lib/typography';
import type { WorkItem } from '@/hooks/useForYouData';

// Jira parity (DOM probe 2026-04-24, Assigned tab): the group heading is
// rendered in Title Case as plain text (CSS text-transform: none), so the
// enum values ARE the display strings — no uppercase conversion.
type StatusBucket = 'To Do' | 'In Progress' | 'In Review' | 'Done';

const STATUS_ORDER: StatusBucket[] = ['To Do', 'In Progress', 'In Review', 'Done'];

function toBucket(status: string): StatusBucket {
  const s = (status || '').toLowerCase();
  if (s.includes('done') || s.includes('closed') || s.includes('complet') || s.includes('approved')) return 'Done';
  if (s.includes('review')) return 'In Review';
  if (s.includes('progress') || s.includes('dev') || s === 'active') return 'In Progress';
  return 'To Do';
}

interface AssignedPanelProps {
  items: WorkItem[];
  isLoading: boolean;
  onSelect: (item: WorkItem) => void;
  onToggleStar: (id: string) => void;
}

export default function AssignedPanel({ items, isLoading, onSelect, onToggleStar }: AssignedPanelProps) {
  if (isLoading) return <div style={{ padding: 24, color: token('color.text.subtle', '#626F86') }}>Loading…</div>;

  if (items.length === 0) {
    return (
      <ForYouEmptyState
        title="You're all caught up"
        description="Nothing is assigned to you right now. Enjoy the calm."
      />
    );
  }

  const buckets = new Map<StatusBucket, WorkItem[]>();
  items.forEach(item => {
    const b = toBucket(item.status);
    if (!buckets.has(b)) buckets.set(b, []);
    buckets.get(b)!.push(item);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {STATUS_ORDER.filter(b => (buckets.get(b)?.length ?? 0) > 0).map(bucket => (
        <div key={bucket}>
          <SectionHeading label={bucket} count={buckets.get(bucket)!.length} />
          {buckets.get(bucket)!.map(item => (
            <ForYouRow key={item.id} item={item} onSelect={onSelect} onToggleStar={onToggleStar} />
          ))}
        </div>
      ))}
    </div>
  );
}

function SectionHeading({ label, count }: { label: string; count: number }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        paddingInline: 12,
        paddingBlockStart: 16,
        paddingBlockEnd: 8,
      }}
    >
      {/* Section label — Jira parity (DOM probe 2026-04-24, Assigned tab):
          14px / weight 500 / Title Case / color var(--ds-text-subtlest, #6B6E76) (subtlest). NOT
          uppercase — Jira renders "In Progress", not "IN PROGRESS". This
          matches the `<span>` at level-0 inside
          `global-pages.home.common.ui.item-list.list`. */}
      <span
        style={{
          font: `500 14px/20px "Inter", system-ui, sans-serif`,
          letterSpacing: 'normal',
          color: text.subtlest,
          textTransform: 'none',
        }}
      >
        {label}
      </span>
      {/* Count chip — weight 400, kept compact. Background + shape
          distinguish it from the label, no weight jump needed. */}
      <span
        style={{
          font: `400 12px/16px "Inter", system-ui, sans-serif`,
          color: text.subtle,
          backgroundColor: token('elevation.surface.sunken', '#F7F8F9'),
          paddingInline: 6,
          borderRadius: 999,
        }}
      >
        {count}
      </span>
    </div>
  );
}
