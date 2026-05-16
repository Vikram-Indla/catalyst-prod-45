/**
 * AssignedPanel — "Assigned to me" tab.
 *
 * B-1 (2026-05-16): Group by statusCategory (`new` → "Waiting",
 *   `indeterminate` → "Active"), NOT by raw status label text — avoids
 *   "Prioritized Backlog" appearing as a To Do group alongside In Progress
 *   items.
 *
 * B-2 (2026-05-16): Hide done items by default. Show "Show completed (N)"
 *   toggle at the bottom so the user's queue stays clean.
 */
import React, { useMemo, useState } from 'react';
import { token } from '@atlaskit/tokens';
import ForYouRow from './ForYouRow';
import { ForYouEmptyState } from './helpers';
import { text } from '@/lib/typography';
import type { WorkItem } from '@/hooks/useForYouData';

// ─── Status category → bucket mapping ────────────────────────────────────────
// Jira's statusCategory values: 'new' (To Do family) | 'indeterminate' (active)
// | 'done'. We map to goal-centric user labels per the handover spec.
type StatusBucket = 'Active' | 'Waiting';

const BUCKET_ORDER: StatusBucket[] = ['Active', 'Waiting'];

function toBucket(statusCategory?: string, statusLabel?: string): StatusBucket | 'done' {
  const cat = (statusCategory || '').toLowerCase().replace(/[\s_-]/g, '');
  if (cat === 'done' || cat === 'closed') return 'done';
  if (cat === 'indeterminate') return 'Active';
  if (cat === 'new') return 'Waiting';

  // Fallback: infer from status label text when statusCategory is missing
  const s = (statusLabel || '').toLowerCase();
  if (s.includes('done') || s.includes('closed') || s.includes('complet') || s.includes('approved')) return 'done';
  if (
    s.includes('progress') || s.includes('review') || s.includes('active') ||
    s.includes('dev') || s.includes('testing') || s.includes('staging')
  ) return 'Active';
  return 'Waiting';
}

interface AssignedPanelProps {
  items: WorkItem[];
  isLoading: boolean;
  onSelect: (item: WorkItem) => void;
  onToggleStar: (id: string) => void;
}

export default function AssignedPanel({ items, isLoading, onSelect, onToggleStar }: AssignedPanelProps) {
  const [showDone, setShowDone] = useState(false);

  const { buckets, doneCount } = useMemo(() => {
    const b = new Map<StatusBucket, WorkItem[]>();
    let done = 0;
    for (const item of items) {
      const bucket = toBucket(item.statusCategory, item.status);
      if (bucket === 'done') {
        done++;
        if (showDone) {
          // Flatten done items into Waiting group so they appear at the bottom
          if (!b.has('Waiting')) b.set('Waiting', []);
          b.get('Waiting')!.push(item);
        }
        continue;
      }
      if (!b.has(bucket)) b.set(bucket, []);
      b.get(bucket)!.push(item);
    }
    return { buckets: b, doneCount: done };
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

  const activeBuckets = BUCKET_ORDER.filter(b => (buckets.get(b)?.length ?? 0) > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {activeBuckets.map(bucket => (
        <div key={bucket}>
          <SectionHeading label={bucket} count={buckets.get(bucket)!.length} />
          {buckets.get(bucket)!.map(item => (
            <ForYouRow key={item.id} item={item} onSelect={onSelect} onToggleStar={onToggleStar} />
          ))}
        </div>
      ))}

      {/* B-2: Show completed toggle */}
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

function SectionHeading({ label, count }: { label: string; count: number }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      paddingInline: 12, paddingBlockStart: 16, paddingBlockEnd: 8,
    }}>
      <span style={{
        font: `500 14px/20px "Inter", system-ui, sans-serif`,
        letterSpacing: 'normal', color: text.subtlest, textTransform: 'none',
      }}>
        {label}
      </span>
      <span style={{
        font: `400 12px/16px "Inter", system-ui, sans-serif`,
        color: text.subtle,
        backgroundColor: token('elevation.surface.sunken', '#F7F8F9'),
        paddingInline: 6, borderRadius: 999,
      }}>
        {count}
      </span>
    </div>
  );
}
