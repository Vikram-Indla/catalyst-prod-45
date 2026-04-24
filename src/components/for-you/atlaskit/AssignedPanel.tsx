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
import type { WorkItem } from '@/hooks/useForYouData';

type StatusBucket = 'TO DO' | 'IN PROGRESS' | 'IN REVIEW' | 'DONE';

const STATUS_ORDER: StatusBucket[] = ['TO DO', 'IN PROGRESS', 'IN REVIEW', 'DONE'];

function toBucket(status: string): StatusBucket {
  const s = (status || '').toLowerCase();
  if (s.includes('done') || s.includes('closed') || s.includes('complet') || s.includes('approved')) return 'DONE';
  if (s.includes('review')) return 'IN REVIEW';
  if (s.includes('progress') || s.includes('dev') || s === 'active') return 'IN PROGRESS';
  return 'TO DO';
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
      <span
        style={{
          font: `600 11px/16px "Inter", system-ui, sans-serif`,
          letterSpacing: '0.08em',
          color: token('color.text.subtlest', '#8590A2'),
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      <span
        style={{
          font: `500 11px/14px "Inter", system-ui, sans-serif`,
          color: token('color.text.subtle', '#626F86'),
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
