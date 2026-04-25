// @ts-nocheck
/**
 * TeamWorkloadWidget — per-assignee open work in active releases.
 *
 * Rewritten Apr 19, 2026 per docs/design/BAU-Dashboard-Atlaskit-Conversion.md §5 Commit 6.
 *   - Bespoke initials div → <Avatar size="small" name={assignee}>
 *   - Bespoke empty-state → <EmptyState>
 *   - var(--cp-*) + Tailwind hex → token()
 *   - Workload bar kept as bespoke <div> (Atlaskit has no horizontal
 *     distribution bar with an accent border); colours routed through
 *     token() where possible, with one scoped rgba for the fill tint.
 */
import type { WidgetProps } from '../widget-registry';
import WidgetWrapper from '../WidgetWrapper';
import { useDashboardTeamWorkload } from '@/hooks/useDashboardWidgets';
import { useGadgetSettings } from '@/hooks/useGadgetSettings';
import { token } from '@atlaskit/tokens';
import { EmptyState, Avatar } from '@/components/ads';
import WidgetGearButton from '../WidgetGearButton';

const WORKLOAD_FILL = 'rgba(37, 99, 235, 0.20)';
const WORKLOAD_ACCENT = '#2563EB';

export default function TeamWorkloadWidget({ projectId, projectKey, collapsed, onToggleCollapse }: WidgetProps) {
  const { settings } = useGadgetSettings('workload', projectKey);
  const { data: workload, isLoading } = useDashboardTeamWorkload(projectId, {
    dateFrom: settings.dateFrom,
    dateTo: settings.dateTo,
  });
  const maxCount = Math.max(1, ...(workload ?? []).map((w) => w.total));

  return (
    <WidgetWrapper
      title="Team Workload"
      subtitle="Open items in active releases"
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      span={2}
      headerBadges={<WidgetGearButton gadgetType="workload" projectKey={projectKey} projectId={projectId} />}
    >
      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-5 rounded"
              style={{
                width: `${80 - i * 15}%`,
                background: token('color.background.neutral.subtle', '#F1F5F9'),
              }}
            />
          ))}
        </div>
      ) : !workload?.length ? (
        <EmptyState
          size="compact"
          header="No open items"
          description="No assignees with open work items in active releases."
        />
      ) : (
        <div className="space-y-0">
          {workload.map((w) => (
            <div
              key={w.assignee}
              className="flex items-center gap-3"
              style={{ height: 36 }}
            >
              {/* Avatar + name */}
              <div
                className="flex items-center gap-2"
                style={{ minWidth: 160, maxWidth: 160 }}
              >
                <Avatar size="small" name={w.assignee} />
                <span
                  className="truncate"
                  style={{ fontSize: 13, color: token('color.text', '#172B4D') }}
                >
                  {w.assignee}
                </span>
              </div>

              {/* Bar track */}
              <div
                className="flex-1"
                style={{
                  height: 18,
                  borderRadius: 3,
                  overflow: 'hidden',
                  background: token('color.background.neutral.subtle', '#F1F5F9'),
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${Math.max(4, (w.total / maxCount) * 100)}%`,
                    background: WORKLOAD_FILL,
                    borderLeft: `3px solid ${WORKLOAD_ACCENT}`,
                    transition: 'width 300ms ease',
                  }}
                />
              </div>

              {/* Count */}
              <span
                style={{
                  minWidth: 32,
                  textAlign: 'right',
                  fontSize: 13,
                  fontWeight: 650,
                  color: token('color.text', '#172B4D'),
                }}
              >
                {w.total}
              </span>

              {/* Meta */}
              <span
                style={{
                  fontSize: 11,
                  color: token('color.text.subtle', '#6B778C'),
                  minWidth: 100,
                }}
              >
                {w.stories} stories · {w.bugs} bugs
              </span>
            </div>
          ))}
        </div>
      )}
    </WidgetWrapper>
  );
}
