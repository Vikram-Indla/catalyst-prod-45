/**
 * TasksByStatusWidget — distribution of tasks across the 5-state status
 * ladder (backlog · planned · in-progress · review · done).
 *
 * Phase 4 of the Tasks Hub canonical alignment plan (2026-06-16). Mirrors
 * `ItemsByStatusWidget` visually (KPI strip + per-status bar list) but
 * queries `tasks` via `useTaskItems` instead of `ph_issues`.
 *
 * REUSE FIRST (CLAUDE.md P0):
 *   - WidgetWrapper for chrome (header, collapse, footer, height)
 *   - Atlaskit Lozenge for the header count
 *   - dashboardTypography for typography parity with project widgets
 *
 * Zero-assumption rendering:
 *   - When tasks list is empty the widget renders an EmptyState — never
 *     fabricated counts.
 */
import { useMemo } from 'react';
import { token } from '@atlaskit/tokens';
import WidgetWrapper from '@/components/project-hub/dashboard/WidgetWrapper';
import type { WidgetProps } from '@/components/project-hub/dashboard/widget-types';
import { LABEL, SMALL, H_NUM } from '@/components/project-hub/dashboard/dashboardTypography';
import { EmptyState, Lozenge } from '@/components/ads';
import { useTaskItems } from '@/modules/tasks/hooks/useTaskItems';
import { useTaskStatuses } from '@/modules/tasks/hooks/useTaskStatuses';
import { COLUMN_CONFIG, STATUS_COLORS } from '@/modules/tasks/types';

// Fallback rows when the DB status list hasn't loaded — the 5 system defaults.
const FALLBACK_STATUS_ROWS = COLUMN_CONFIG.map((c) => ({
  slug: c.id,
  name: c.title,
  color: STATUS_COLORS[c.id] ?? c.color,
}));

export default function TasksByStatusWidget({ collapsed, onToggleCollapse }: WidgetProps) {
  const { data: tasks = [], isLoading } = useTaskItems(null);
  const { data: dbStatuses = [] } = useTaskStatuses();

  // Status rows are DB-driven (task_statuses) so custom/admin statuses appear.
  const statusRows = dbStatuses.length
    ? dbStatuses.map((s) => ({ slug: s.slug, name: s.name, color: s.color }))
    : FALLBACK_STATUS_ROWS;

  const { total, byStatus, doneCount, inFlight } = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of tasks) counts[t.status] = (counts[t.status] ?? 0) + 1;
    const totalLocal = tasks.length;
    const done = counts['done'] ?? 0;
    const flight = (counts['in-progress'] ?? 0) + (counts['review'] ?? 0);
    return { total: totalLocal, byStatus: counts, doneCount: done, inFlight: flight };
  }, [tasks]);

  const badge = (
    <Lozenge appearance={total === 0 ? 'default' : 'inprogress'}>{total}</Lozenge>
  );

  return (
    <WidgetWrapper
      title="Tasks by status"
      subtitle="Where is work concentrated?"
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      headerBadges={badge}
      empty={!isLoading && total === 0}
    >
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[0, 1, 2, 3, 4].map((i) => (
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
      ) : total === 0 ? (
        <EmptyState
          size="compact"
          header="No tasks yet"
          description="Create a task to see status distribution."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* KPI strip */}
          <div
            style={{
              display: 'flex',
              background: token('elevation.surface.sunken', '#F7F8F9'),
              borderRadius: token('border.radius', '4px'),
              border: `1px solid ${token('color.border', '#DFE1E6')}`,
              overflow: 'hidden',
            }}
          >
            <KpiCell label="Total" value={total} />
            <KpiCell label="In flight" value={inFlight} />
            <KpiCell label="Done" value={doneCount} last />
          </div>

          {/* Per-status bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {statusRows.map((row) => {
              const count = byStatus[row.slug] ?? 0;
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={row.slug} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 60px', alignItems: 'center', gap: 12 }}>
                  <span style={{ ...SMALL, color: token('color.text.subtle', '#42526E') }}>{row.name}</span>
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
                        background: row.color || token('color.text.subtlest', '#64748b'),
                        transition: 'width 200ms ease',
                      }}
                    />
                  </div>
                  <span style={{ ...SMALL, color: token('color.text', '#172B4D'), fontVariantNumeric: 'tabular-nums', justifySelf: 'end' }}>
                    {count}
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

function KpiCell({ label, value, last }: { label: string; value: number; last?: boolean }) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        padding: '8px 12px',
        borderRight: last ? 'none' : `1px solid ${token('color.border', '#DFE1E6')}`,
      }}
    >
      <span style={{ ...LABEL, textTransform: 'none', letterSpacing: '0.04em' }}>{label}</span>
      <span style={{ ...H_NUM, lineHeight: 1.1, color: token('color.text', '#292A2E') }}>{value}</span>
    </div>
  );
}
