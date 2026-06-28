/**
 * AssignedPanel — "Assigned to me" tab.
 *
 * Grouping strategy (2026-06-03 redesign):
 *   Groups by status_category into 2 visible buckets:
 *   - "To do" (statusCategory 'new' or unset)
 *   - "In progress" (statusCategory 'indeterminate')
 *   - Done items hidden by default, toggleable
 *
 *   Each item still shows its specific status chip (e.g. "In Requirements",
 *   "In Development") so the user can see the exact status — but the section
 *   headers collapse 10+ raw statuses into 2 actionable groups.
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

function isDone(statusCategory?: string, status?: string): boolean {
  const cat = (statusCategory || '').toLowerCase().replace(/[\s_-]/g, '');
  if (cat === 'done' || cat === 'closed') return true;
  const s = (status || '').toLowerCase();
  return s.includes('done') || s.includes('closed') || s.includes('complet') || s.includes('approved');
}

type CategoryBucket = 'in_progress' | 'to_do' | 'done';

function toBucket(statusCategory?: string, status?: string): CategoryBucket {
  if (isDone(statusCategory, status)) return 'done';
  const cat = (statusCategory || '').toLowerCase().trim();
  if (cat === 'in progress' || cat === 'indeterminate') return 'in_progress';
  return 'to_do';
}

const BUCKET_LABELS: Record<CategoryBucket, string> = {
  in_progress: 'In progress',
  to_do: 'To do',
  done: 'Done',
};

const BUCKET_ORDER: CategoryBucket[] = ['in_progress', 'to_do', 'done'];

export default function AssignedPanel({ items, isLoading, isRefreshing, onSelect, onToggleStar, onAskCatyThemify }: AssignedPanelProps) {
  const [showDone, setShowDone] = useState(false);

  const { groups, doneCount } = useMemo(() => {
    const buckets = new Map<CategoryBucket, WorkItem[]>();
    let done = 0;
    for (const item of items) {
      const bucket = toBucket(item.statusCategory, item.status);
      if (bucket === 'done') {
        done++;
        if (!showDone) continue;
      }
      if (!buckets.has(bucket)) buckets.set(bucket, []);
      buckets.get(bucket)!.push(item);
    }
    const ordered = BUCKET_ORDER
      .filter(b => buckets.has(b))
      .map(b => ({ bucket: b, label: BUCKET_LABELS[b], items: buckets.get(b)!, count: buckets.get(b)!.length }));
    return { groups: ordered, doneCount: done };
  }, [items, showDone]);

  if (isLoading) {
    return <div style={{ padding: 24, color: token('color.text.subtle', 'var(--ds-icon-subtle, #626F86)') }}>Loading…</div>;
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
          color: token('color.text.subtlest', 'var(--ds-icon-subtle, #626F86)'),
          fontSize: 'var(--ds-font-size-200)',
        }}>
          <Spinner size="small" /> Refreshing…
        </div>
      )}
      {onAskCatyThemify && (
        <AskCatyThemifyButton onClick={onAskCatyThemify} />
      )}
      {groups.map(group => (
        <div key={group.bucket}>
          <SectionHeading label={group.label} count={group.count} />
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
            color: token('color.text.subtlest', 'var(--ds-icon-subtle, #626F86)'),
            cursor: 'pointer', padding: `${token('space.050', '4px')} 0`,
            textDecoration: 'underline', textDecorationColor: 'transparent',
            transition: 'color 150ms, text-decoration-color 150ms',
          }}
          onMouseEnter={e => {
            const b = e.currentTarget;
            b.style.color = token('color.text.subtle', 'var(--cp-text-secondary, var(--cp-text-secondary, #44546F))');
            b.style.textDecorationColor = 'currentColor';
          }}
          onMouseLeave={e => {
            const b = e.currentTarget;
            b.style.color = token('color.text.subtlest', 'var(--ds-icon-subtle, #626F86)');
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
        color: token('color.text.subtlest', 'var(--ds-icon-subtle, #626F86)'),
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
