/**
 * WorkItemsProgressBar — canonical multi-segment status distribution bar
 * for a list of work items. Extracted from
 * `src/components/releases/detail/WorkItemsSection.tsx` (`ProgressSection`)
 * so surfaces beyond the release detail page can reuse it — currently
 * the SubtasksPanel renders it above its subtask table (Vikram 2026-07-02).
 *
 * Contract: input is any list of items with a `status_category` field.
 * Buckets: Done / In progress / To do.
 * Rendering: header row with "N of M done" + chevron collapse toggle,
 * a segmented bar underneath, and (when expanded) a per-status stat list.
 */
import { useMemo, useState } from 'react';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';

const TEXT = 'var(--ds-text)';
const SUBTLE = 'var(--ds-text-subtle)';
const PROGRESS_DONE = 'var(--ds-background-success-bold)';
const PROGRESS_WIP = 'var(--ds-background-information-bold)';
const PROGRESS_TODO = 'var(--ds-border)';

export interface WorkItemsProgressItem {
  status_category?: string | null;
}

export interface WorkItemsProgressBarProps<T extends WorkItemsProgressItem> {
  items: T[];
  /** Section title (default: "Work items"). SubtasksPanel passes "Subtasks". */
  label?: string;
  /** Section heading — hidden by default when embedded above a table. */
  showHeading?: boolean;
  /** Hide the per-status stat list under the bar (default false). */
  compact?: boolean;
  /** Hide the header row (label + "N of M done" + collapse chevron).
   *  Bar-only mode — used by SubtasksPanel where the section title
   *  already lives above (Vikram 2026-07-02). */
  hideHeader?: boolean;
  /** Render a "N% Done" suffix to the right of the bar (Vikram
   *  2026-07-02, SubtasksPanel Jira-parity). Ignored when hideHeader
   *  is false because the header already carries the count. */
  showPercentSuffix?: boolean;
}

export function WorkItemsProgressBar<T extends WorkItemsProgressItem>({
  items,
  label = 'Work items',
  showHeading = false,
  compact = false,
  hideHeader = false,
  showPercentSuffix = false,
}: WorkItemsProgressBarProps<T>) {
  const [collapsed, setCollapsed] = useState(compact);
  const total = items.length;
  const counts = useMemo(() => {
    let done = 0, inProgress = 0, toDo = 0;
    for (const i of items) {
      const c = String(i.status_category ?? '').toLowerCase();
      if (c === 'done') done += 1;
      else if (c === 'in progress' || c === 'inprogress' || c === 'in_progress') inProgress += 1;
      else toDo += 1;
    }
    return { done, inProgress, toDo };
  }, [items]);

  const segments = total
    ? [
        { key: 'done', pct: (counts.done / total) * 100, color: PROGRESS_DONE },
        { key: 'wip', pct: (counts.inProgress / total) * 100, color: PROGRESS_WIP },
        { key: 'todo', pct: (counts.toDo / total) * 100, color: PROGRESS_TODO },
      ].filter((s) => s.pct > 0)
    : [];
  const donePercent = total ? Math.round((counts.done / total) * 100) : 0;

  const bar = (
    <div
      role="progressbar"
      aria-valuenow={counts.done}
      aria-valuemin={0}
      aria-valuemax={total}
      style={{
        display: 'flex',
        gap: 0,
        height: 8,
        flex: 1,
        borderRadius: 4,
        overflow: 'hidden',
        background: PROGRESS_TODO,
      }}
    >
      {segments.map((seg, i) => (
        <div
          key={seg.key}
          style={{
            width: `${seg.pct}%`,
            background: seg.color,
            height: '100%',
            borderRadius:
              segments.length === 1
                ? 4
                : i === 0
                ? '4px 0 0 4px'
                : i === segments.length - 1
                ? '0 4px 4px 0'
                : 0,
          }}
        />
      ))}
    </div>
  );

  if (total === 0) return null;

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {showHeading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <h2 style={{ margin: 0, fontSize: 'var(--ds-font-size-500)', fontWeight: 700, color: TEXT }}>
            Progress
          </h2>
        </div>
      )}
      {!hideHeader && (
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          style={{
            all: 'unset',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
          aria-expanded={!collapsed}
        >
          <span style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 600, color: TEXT }}>{label}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: SUBTLE, fontSize: 'var(--ds-font-size-300)' }}>
            {counts.done} of {total} done
            {collapsed ? <ChevronRightIcon label="" size="small" /> : <ChevronDownIcon label="" size="small" />}
          </span>
        </button>
      )}
      {showPercentSuffix ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {bar}
          <span
            aria-live="polite"
            aria-atomic="true"
            style={{
              fontSize: 'var(--ds-font-size-200)',
              fontWeight: 500,
              color: SUBTLE,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {donePercent}% Done
          </span>
        </div>
      ) : (
        bar
      )}
      {!collapsed && !compact && (
        <ul style={{ listStyle: 'none', margin: 0, padding: '4px 0 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <ProgressStatRow color={PROGRESS_DONE} label="Done" count={counts.done} />
          <ProgressStatRow color={PROGRESS_WIP} label="In progress" count={counts.inProgress} />
          <ProgressStatRow color={PROGRESS_TODO} label="To do" count={counts.toDo} />
        </ul>
      )}
    </section>
  );
}

function ProgressStatRow({ color, label, count }: { color: string; label: string; count: number }) {
  return (
    <li style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--ds-font-size-400)', color: TEXT }}>
      <span
        aria-hidden
        style={{
          display: 'inline-block',
          width: 10,
          height: 10,
          borderRadius: 2,
          background: color,
          flexShrink: 0,
        }}
      />
      <span style={{ flex: 1 }}>{label}</span>
      <span style={{ color: SUBTLE }}>{count}</span>
    </li>
  );
}
