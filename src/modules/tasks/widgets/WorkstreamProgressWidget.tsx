/**
 * WorkstreamProgressWidget — completion percentage per workstream.
 *
 * Phase 4 of the Tasks Hub canonical alignment plan (2026-06-16). Mirrors
 * `DemandFulfilmentGadget` visually (rollup progress per group) but reads
 * from `useTaskItems` and groups by `teamId` (workstream).
 *
 * REUSE FIRST (CLAUDE.md P0):
 *   - WidgetWrapper for chrome
 *   - dashboardTypography for parity
 *
 * Zero-assumption rendering:
 *   - Tasks with no workstream bucket under "Unassigned workstream".
 *   - Progress = doneCount / total per bucket.
 *   - Empty state when no tasks at all — never fabricate 0% bars.
 */
import { useMemo } from 'react';
import { token } from '@atlaskit/tokens';
import WidgetWrapper from '@/components/project-hub/dashboard/WidgetWrapper';
import type { WidgetProps } from '@/components/project-hub/dashboard/widget-types';
import { LABEL, SMALL, BODY } from '@/components/project-hub/dashboard/dashboardTypography';
import { EmptyState, Lozenge } from '@/components/ads';
import { useTaskItems } from '@/modules/tasks/hooks/useTaskItems';

type Bucket = {
  id: string;
  name: string;
  color: string;
  total: number;
  done: number;
};

export default function WorkstreamProgressWidget({ collapsed, onToggleCollapse }: WidgetProps) {
  const { data: tasks = [], isLoading } = useTaskItems(null);

  const buckets = useMemo<Bucket[]>(() => {
    const map = new Map<string, Bucket>();
    for (const t of tasks) {
      const id = t.teamId ?? '__none__';
      const name = t.teamName ?? 'Unassigned workstream';
      const color = t.teamColor ?? token('color.background.neutral.bold', 'var(--ds-text-subtlest, #6B778C)');
      const existing = map.get(id);
      if (existing) {
        existing.total += 1;
        if (t.status === 'done') existing.done += 1;
      } else {
        map.set(id, { id, name, color, total: 1, done: t.status === 'done' ? 1 : 0 });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [tasks]);

  const totalTasks = tasks.length;
  const totalDone = tasks.filter((t) => t.status === 'done').length;
  const overallPct = totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0;

  const badge = (
    <Lozenge appearance={buckets.length === 0 ? 'default' : 'inprogress'}>
      {buckets.length}
    </Lozenge>
  );

  return (
    <WidgetWrapper
      title="Workstream progress"
      subtitle="Completion percentage per workstream"
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      headerBadges={badge}
      empty={!isLoading && buckets.length === 0}
    >
      {isLoading ? (
        <SkeletonRows count={4} />
      ) : buckets.length === 0 ? (
        <EmptyState
          size="compact"
          header="No tasks yet"
          description="Create tasks under a workstream to see progress."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Overall summary */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '8px 12px',
              background: token('elevation.surface.sunken', 'var(--ds-surface-sunken, #F7F8F9)'),
              borderRadius: token('border.radius', '4px'),
              border: `1px solid ${token('color.border', 'var(--ds-border, #DFE1E6)')}`,
            }}
          >
            <span style={{ ...LABEL, textTransform: 'none' }}>Overall</span>
            <div
              style={{
                flex: 1,
                height: 10,
                background: token('color.background.neutral.subtle', 'var(--ds-background-neutral, #F1F2F4)'),
                borderRadius: 4,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${overallPct}%`,
                  height: '100%',
                  background: token('color.background.success.bold', 'var(--ds-background-success-bold, #1F845A)'),
                  transition: 'width 200ms ease',
                }}
              />
            </div>
            <span style={{ ...BODY, fontVariantNumeric: 'tabular-nums', minWidth: 80, textAlign: 'right' }}>
              {totalDone} / {totalTasks} ({overallPct}%)
            </span>
          </div>

          {/* Per-workstream rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {buckets.map((b) => {
              const pct = b.total > 0 ? Math.round((b.done / b.total) * 100) : 0;
              const isNone = b.id === '__none__';
              return (
                <div
                  key={b.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '180px 1fr 120px',
                    alignItems: 'center',
                    gap: 12,
                    padding: '4px 0',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      ...SMALL,
                      color: isNone ? token('color.text.subtle', 'var(--ds-text-subtle, #42526E)') : token('color.text', 'var(--ds-text, #172B4D)'),
                      fontStyle: isNone ? 'italic' : 'normal',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    <span
                      aria-hidden
                      style={{
                        display: 'inline-block',
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: b.color,
                        flexShrink: 0,
                      }}
                    />
                    {b.name}
                  </span>
                  <div
                    style={{
                      height: 8,
                      background: token('color.background.neutral.subtle', 'var(--ds-background-neutral, #F1F2F4)'),
                      borderRadius: 4,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: b.color,
                        transition: 'width 200ms ease',
                      }}
                    />
                  </div>
                  <span
                    style={{
                      ...SMALL,
                      fontVariantNumeric: 'tabular-nums',
                      justifySelf: 'end',
                      color: token('color.text.subtle', 'var(--ds-text-subtle, #42526E)'),
                    }}
                  >
                    {b.done} / {b.total} ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </WidgetWrapper>
  );
}

function SkeletonRows({ count }: { count: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse"
          style={{
            height: 24,
            borderRadius: token('border.radius', '4px'),
            background: token('color.background.neutral.subtle', 'var(--ds-background-neutral, #F1F2F4)'),
          }}
        />
      ))}
    </div>
  );
}
