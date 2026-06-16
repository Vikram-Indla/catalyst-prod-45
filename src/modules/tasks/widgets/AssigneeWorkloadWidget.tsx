/**
 * AssigneeWorkloadWidget — open tasks per assignee.
 *
 * Phase 4 of the Tasks Hub canonical alignment plan (2026-06-16). Mirrors
 * `TeamWorkloadWidget` visually (horizontal bar list, count per person)
 * but reads from `useTaskItems` and groups by `assigneeId`.
 *
 * REUSE FIRST (CLAUDE.md P0):
 *   - WidgetWrapper for chrome
 *   - UserAvatar for the leading avatar
 *   - dashboardTypography for parity
 *
 * Zero-assumption rendering:
 *   - Unassigned tasks bucket under "Unassigned" (never fabricate a name).
 *   - Done tasks excluded (workload = open work only).
 *   - Empty state if no tasks at all.
 */
import { useMemo } from 'react';
import { token } from '@atlaskit/tokens';
import WidgetWrapper from '@/components/project-hub/dashboard/WidgetWrapper';
import type { WidgetProps } from '@/components/project-hub/dashboard/widget-types';
import { LABEL, SMALL, BODY } from '@/components/project-hub/dashboard/dashboardTypography';
import { EmptyState, Lozenge } from '@/components/ads';
import UserAvatar from '@/components/shared/UserAvatar';
import { useTaskItems } from '@/modules/tasks/hooks/useTaskItems';

type Bucket = { id: string; name: string; count: number };

export default function AssigneeWorkloadWidget({ collapsed, onToggleCollapse }: WidgetProps) {
  const { data: tasks = [], isLoading } = useTaskItems(null);

  const { buckets, max, total } = useMemo(() => {
    const map = new Map<string, Bucket>();
    let totalLocal = 0;
    for (const t of tasks) {
      if (t.status === 'done') continue;
      totalLocal += 1;
      const id = t.assigneeId ?? '__unassigned__';
      const name = t.assigneeName ?? 'Unassigned';
      const existing = map.get(id);
      if (existing) existing.count += 1;
      else map.set(id, { id, name, count: 1 });
    }
    const list = Array.from(map.values()).sort((a, b) => b.count - a.count);
    const maxCount = list.reduce((m, b) => Math.max(m, b.count), 0);
    return { buckets: list, max: maxCount, total: totalLocal };
  }, [tasks]);

  const badge = (
    <Lozenge appearance={buckets.length === 0 ? 'default' : 'inprogress'}>
      {buckets.length}
    </Lozenge>
  );

  return (
    <WidgetWrapper
      title="Assignee workload"
      subtitle="Open tasks per assignee"
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      headerBadges={badge}
      empty={!isLoading && buckets.length === 0}
    >
      {isLoading ? (
        <SkeletonRows count={5} />
      ) : buckets.length === 0 ? (
        <EmptyState
          size="compact"
          header="No open tasks"
          description="Workload is clear."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* Sub-header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '32px 1fr 1fr 60px',
              alignItems: 'center',
              gap: 12,
              padding: '4px 0 8px 0',
              borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
              ...SMALL,
              fontWeight: 600,
              color: token('color.text.subtle', '#6B778C'),
            }}
          >
            <span />
            <span>Assignee</span>
            <span>Open work</span>
            <span style={{ justifySelf: 'end' }}>Count</span>
          </div>

          {buckets.slice(0, 10).map((b) => {
            const pct = max > 0 ? (b.count / max) * 100 : 0;
            const isUnassigned = b.id === '__unassigned__';
            return (
              <div
                key={b.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '32px 1fr 1fr 60px',
                  alignItems: 'center',
                  gap: 12,
                  padding: '4px 0',
                  minHeight: 32,
                }}
              >
                {isUnassigned ? (
                  <span
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: token('color.background.neutral', '#F1F2F4'),
                      border: `1px dashed ${token('color.border', '#DFE1E6')}`,
                    }}
                  />
                ) : (
                  <UserAvatar size="small" name={b.name} />
                )}
                <span
                  style={{
                    ...BODY,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    color: isUnassigned ? token('color.text.subtle', '#42526E') : token('color.text', '#172B4D'),
                    fontStyle: isUnassigned ? 'italic' : 'normal',
                  }}
                >
                  {b.name}
                </span>
                <div
                  style={{
                    height: 8,
                    background: token('color.background.neutral.subtle', '#F1F2F4'),
                    borderRadius: 4,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      background: token('color.background.brand.bold', '#0052CC'),
                      transition: 'width 200ms ease',
                    }}
                  />
                </div>
                <span
                  style={{
                    ...BODY,
                    fontVariantNumeric: 'tabular-nums',
                    justifySelf: 'end',
                    color: token('color.text', '#172B4D'),
                  }}
                >
                  {b.count}
                </span>
              </div>
            );
          })}
          {buckets.length > 10 && (
            <div style={{ ...SMALL, color: token('color.text.subtlest', '#6B778C'), paddingTop: 4 }}>
              +{buckets.length - 10} more assignees
            </div>
          )}
          <div style={{ ...LABEL, color: token('color.text.subtle', '#6B778C'), paddingTop: 8 }}>
            {total} open tasks across {buckets.length} assignees
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
            height: 28,
            borderRadius: token('border.radius', '4px'),
            background: token('color.background.neutral.subtle', '#F1F2F4'),
          }}
        />
      ))}
    </div>
  );
}
