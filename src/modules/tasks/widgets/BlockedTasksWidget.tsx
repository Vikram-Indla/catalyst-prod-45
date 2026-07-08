/**
 * BlockedTasksWidget — tasks with blocked=true.
 *
 * Phase 4 of the Tasks Hub canonical alignment plan (2026-06-16). Mirrors
 * `OnHoldWidget` visually (KPI strip + reason rows) but reads from
 * `useTaskItems` instead of ph_issues.
 *
 * REUSE FIRST (CLAUDE.md P0):
 *   - WidgetWrapper for chrome
 *   - Atlaskit Lozenge for the header count and per-row reason chip
 *   - dashboardTypography for type parity
 *
 * Zero-assumption rendering:
 *   - Row renders only when blocked === true.
 *   - When blocked_reason is null/empty, shows "No reason given" instead
 *     of a fabricated category.
 */
import { useMemo } from 'react';
import { token } from '@atlaskit/tokens';
import WidgetWrapper from '@/components/project-hub/dashboard/WidgetWrapper';
import type { WidgetProps } from '@/components/project-hub/dashboard/widget-types';
import { LABEL, SMALL, BODY, H_NUM } from '@/components/project-hub/dashboard/dashboardTypography';
import { EmptyState, Lozenge } from '@/components/ads';
import { useTaskItems } from '@/modules/tasks/hooks/useTaskItems';

export default function BlockedTasksWidget({ collapsed, onToggleCollapse }: WidgetProps) {
  const { data: tasks = [], isLoading } = useTaskItems(null);

  const blocked = useMemo(() => tasks.filter((t) => t.blocked), [tasks]);
  const total = blocked.length;
  const withReason = blocked.filter((t) => (t.blockedReason ?? '').trim().length > 0).length;
  const withoutReason = total - withReason;

  // Zero counts render no badge (ruthless-audit E3) — a green "0" is
  // semantic color used decoratively.
  const badge = total > 0 ? <Lozenge appearance="removed">{total}</Lozenge> : null;

  return (
    <WidgetWrapper
      title="Blocked tasks"
      subtitle="Tasks flagged as blocked"
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
          header="Nothing is blocked"
          description="No tasks are flagged as blocked."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* KPI strip */}
          <div
            style={{
              display: 'flex',
              background: token('elevation.surface.sunken', 'var(--ds-surface-sunken)'),
              borderRadius: token('border.radius', '4px'),
              border: `1px solid ${token('color.border', 'var(--ds-border)')}`,
              overflow: 'hidden',
            }}
          >
            <KpiCell label="Blocked" value={total} accent="var(--ds-text-accent-red-bolder)" />
            <KpiCell label="With reason" value={withReason} />
            <KpiCell label="No reason" value={withoutReason} last />
          </div>

          {/* Rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {blocked.slice(0, 10).map((t) => {
              const reason = (t.blockedReason ?? '').trim();
              return (
                <div
                  key={t.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '90px 1fr 160px',
                    alignItems: 'center',
                    gap: 12,
                    padding: '8px',
                    marginInline: -8,
                    borderRadius: token('border.radius', '4px'),
                    minHeight: 36,
                  }}
                >
                  <span style={{ ...BODY, color: token('color.link', 'var(--ds-link)'), whiteSpace: 'nowrap' }}>
                    {t.key}
                  </span>
                  <span
                    style={{
                      ...BODY,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      color: token('color.text', 'var(--ds-text)'),
                    }}
                  >
                    {t.title}
                  </span>
                  <span style={{ justifySelf: 'end' }}>
                    {reason ? (
                      <Lozenge appearance="moved">{reason.slice(0, 24)}</Lozenge>
                    ) : (
                      <span style={{ ...SMALL, color: token('color.text.subtlest', 'var(--ds-text-subtlest)') }}>
                        No reason given
                      </span>
                    )}
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
            background: token('color.background.neutral.subtle', 'var(--ds-background-neutral)'),
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
        gap: 0,
        padding: '8px 12px',
        borderRight: last ? 'none' : `1px solid ${token('color.border', 'var(--ds-border)')}`,
      }}
    >
      <span style={{ ...LABEL, textTransform: 'none', letterSpacing: '0.04em' }}>{label}</span>
      <span style={{ ...H_NUM, lineHeight: 1.1, color: accent ?? token('color.text', 'var(--ds-text)') }}>
        {value}
      </span>
    </div>
  );
}
