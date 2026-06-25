/**
 * OverdueTasksWidget — tasks past due_date that are not yet done.
 *
 * Phase 4 of the Tasks Hub canonical alignment plan (2026-06-16). Mirrors
 * `OverdueWidget` visually (KPI strip + sorted overdue rows) but reads
 * from `useTaskItems` instead of ph_issues.
 *
 * REUSE FIRST (CLAUDE.md P0):
 *   - WidgetWrapper for chrome
 *   - Atlaskit Lozenge with severity grading (default/moved/removed)
 *   - dashboardTypography (LABEL/SMALL/BODY/H_NUM) for parity
 *
 * Zero-assumption rendering:
 *   - Rows render only when due_date is present AND status !== 'done'.
 *   - Empty state when no overdue tasks — no fabricated counts.
 */
import { useMemo } from 'react';
import { token } from '@atlaskit/tokens';
import WidgetWrapper from '@/components/project-hub/dashboard/WidgetWrapper';
import type { WidgetProps } from '@/components/project-hub/dashboard/widget-types';
import { LABEL, SMALL, BODY, H_NUM } from '@/components/project-hub/dashboard/dashboardTypography';
import { EmptyState, Lozenge } from '@/components/ads';
import { useTaskItems } from '@/modules/tasks/hooks/useTaskItems';

const MS_PER_DAY = 86_400_000;

function daysOverdue(dueIso: string | null | undefined): number {
  if (!dueIso) return 0;
  const t = new Date(dueIso).getTime();
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.ceil((Date.now() - t) / MS_PER_DAY));
}

function severityAppearance(days: number): 'default' | 'moved' | 'removed' {
  if (days > 30) return 'removed';
  if (days >= 7) return 'moved';
  return 'default';
}

export default function OverdueTasksWidget({ collapsed, onToggleCollapse }: WidgetProps) {
  const { data: tasks = [], isLoading } = useTaskItems(null);

  const { rows, total, critical, thisWeek } = useMemo(() => {
    const now = Date.now();
    const overdue = tasks
      .filter((t) => t.status !== 'done' && t.dueDate)
      .map((t) => ({ ...t, _days: daysOverdue(t.dueDate) }))
      .filter((t) => t._days > 0)
      .sort((a, b) => b._days - a._days);
    return {
      rows: overdue,
      total: overdue.length,
      critical: overdue.filter((t) => t._days > 30).length,
      thisWeek: overdue.filter((t) => t._days < 7).length,
    };
  }, [tasks]);

  const badge = (
    <Lozenge appearance={total === 0 ? 'success' : 'removed'}>{total}</Lozenge>
  );

  return (
    <WidgetWrapper
      title="Overdue tasks"
      subtitle="Past due date — sorted by most slipped first"
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      headerBadges={badge}
      empty={!isLoading && total === 0}
    >
      {isLoading ? (
        <SkeletonRows count={4} />
      ) : total === 0 ? (
        <EmptyState
          size="compact"
          header="All tasks on track"
          description="No overdue tasks."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* KPI strip */}
          <div
            style={{
              display: 'flex',
              background: token('elevation.surface.sunken', 'var(--ds-surface-sunken, #F7F8F9)'),
              borderRadius: token('border.radius', '4px'),
              border: `1px solid ${token('color.border', 'var(--ds-border, #DFE1E6)')}`,
              overflow: 'hidden',
            }}
          >
            <KpiCell label="Overdue" value={total} />
            <KpiCell
              label="Critical >30d"
              value={critical}
              accent={critical > 0 ? 'var(--ds-text-accent-red-bolder, #AE2A19)' : undefined}
            />
            <KpiCell label="This week" value={thisWeek} last />
          </div>

          {/* Rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {rows.slice(0, 10).map((t) => {
              const appearance = severityAppearance(t._days);
              return (
                <div
                  key={t.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '90px 1fr 110px 110px',
                    alignItems: 'center',
                    gap: 12,
                    padding: '8px',
                    marginInline: -8,
                    borderRadius: token('border.radius', '4px'),
                    minHeight: 36,
                  }}
                >
                  <span style={{ ...BODY, color: token('color.link', 'var(--ds-link, #0C66E4)'), whiteSpace: 'nowrap' }}>
                    {t.key}
                  </span>
                  <span
                    style={{
                      ...BODY,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      color: token('color.text', 'var(--ds-text, #172B4D)'),
                    }}
                  >
                    {t.title}
                  </span>
                  <span style={{ ...SMALL, color: token('color.text.subtle', 'var(--ds-text-subtle, #42526E)'), whiteSpace: 'nowrap' }}>
                    {t.dueDate ? new Date(t.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
                  </span>
                  <span style={{ fontVariantNumeric: 'tabular-nums', justifySelf: 'end' }}>
                    <Lozenge appearance={appearance}>{t._days}d overdue</Lozenge>
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
            height: 36,
            borderRadius: token('border.radius', '4px'),
            background: token('color.background.neutral.subtle', 'var(--ds-background-neutral, #F1F2F4)'),
          }}
        />
      ))}
    </div>
  );
}

function KpiCell({
  label,
  value,
  accent,
  last,
}: {
  label: string;
  value: number;
  accent?: string;
  last?: boolean;
}) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        padding: '8px 12px',
        borderRight: last ? 'none' : `1px solid ${token('color.border', 'var(--ds-border, #DFE1E6)')}`,
      }}
    >
      <span style={{ ...LABEL, textTransform: 'none', letterSpacing: '0.04em' }}>{label}</span>
      <span style={{ ...H_NUM, lineHeight: 1.1, color: accent ?? token('color.text', 'var(--ds-text, #172B4D)') }}>
        {value}
      </span>
    </div>
  );
}
