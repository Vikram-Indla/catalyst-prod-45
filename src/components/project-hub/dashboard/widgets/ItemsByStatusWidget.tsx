// @ts-nocheck
/**
 * ItemsByStatusWidget — stacked bar of todo / in-progress / done counts.
 *
 * Rewritten Apr 19, 2026 per docs/design/BAU-Dashboard-Atlaskit-Conversion.md §5 Commit 6.
 *   - Bespoke empty-state → <EmptyState>
 *   - Bespoke bar segments + legend swatches use the same hex triple as the
 *     StatusLozenge 3-colour guardrail (grey/blue/green) — kept as literals
 *     because Atlaskit does not expose semantic fills for status
 *     distribution bars. All other colour surfaces route through token().
 */
import type { WidgetProps } from '../widget-registry';
import WidgetWrapper from '../WidgetWrapper';
import { useDashboardStatusCounts } from '@/hooks/useDashboardWidgets';
import { useGadgetSettings } from '@/hooks/useGadgetSettings';
import { token } from '@atlaskit/tokens';
import { EmptyState } from '@/components/ads';
import WidgetGearButton from '../WidgetGearButton';

/** Canonical Catalyst status triple (matches StatusLozenge guardrail). */
const STATUS_COLORS = {
  todo: { bg: '#DFE1E6', text: '#253858' },
  inProgress: { bg: '#DEEBFF', text: '#0747A6' },
  done: { bg: '#E3FCEF', text: '#006644' },
} as const;

export default function ItemsByStatusWidget({ projectId, projectKey, collapsed, onToggleCollapse }: WidgetProps) {
  const { settings } = useGadgetSettings('items', projectKey);
  // Note: statusFilter is intentionally NOT forwarded — this widget *is* the
  // status segmentation. A user-selected status would zero out other buckets.
  const { data: counts, isLoading } = useDashboardStatusCounts(projectId, {
    dateFrom: settings.dateFrom,
    dateTo: settings.dateTo,
    releaseFilter: settings.releaseFilter,
    assigneeFilter: settings.assigneeFilter,
    itemTypeFilter: settings.itemTypeFilter,
    priorityFilter: settings.priorityFilter,
  });
  const { todo = 0, inProgress = 0, done = 0, total = 0 } = counts ?? {};

  return (
    <WidgetWrapper
      title="Items by Status"
      subtitle="Status distribution"
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      span={1}
      headerBadges={<WidgetGearButton gadgetType="items" projectKey={projectKey} projectId={projectId} />}
    >
      {isLoading ? (
        <div className="animate-pulse">
          <div
            className="h-7 rounded"
            style={{ background: token('color.background.neutral.subtle', '#F1F5F9') }}
          />
        </div>
      ) : total === 0 ? (
        <EmptyState size="compact" header="No items found" description="No tracked items for this project yet." />
      ) : (
        <div className="space-y-3">
          {/* Stacked bar */}
          <div className="flex" style={{ height: 28, borderRadius: 3, overflow: 'hidden' }}>
            {todo > 0 && (
              <div
                className="flex items-center justify-center"
                style={{
                  width: `${(todo / total) * 100}%`,
                  minWidth: 28,
                  fontSize: 11,
                  fontWeight: 700,
                  background: STATUS_COLORS.todo.bg,
                  color: STATUS_COLORS.todo.text,
                }}
              >
                {todo}
              </div>
            )}
            {inProgress > 0 && (
              <div
                className="flex items-center justify-center"
                style={{
                  width: `${(inProgress / total) * 100}%`,
                  minWidth: 28,
                  fontSize: 11,
                  fontWeight: 700,
                  background: STATUS_COLORS.inProgress.bg,
                  color: STATUS_COLORS.inProgress.text,
                }}
              >
                {inProgress}
              </div>
            )}
            {done > 0 && (
              <div
                className="flex items-center justify-center"
                style={{
                  width: `${(done / total) * 100}%`,
                  minWidth: 28,
                  fontSize: 11,
                  fontWeight: 700,
                  background: STATUS_COLORS.done.bg,
                  color: STATUS_COLORS.done.text,
                }}
              >
                {done}
              </div>
            )}
          </div>
          {/* Legend */}
          <div
            className="flex items-center gap-4"
            style={{ fontSize: 11, color: token('color.text.subtle', '#6B778C') }}
          >
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block"
                style={{ width: 8, height: 8, borderRadius: 2, background: STATUS_COLORS.todo.bg }}
              />
              To Do {todo}
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block"
                style={{ width: 8, height: 8, borderRadius: 2, background: STATUS_COLORS.inProgress.bg }}
              />
              In Progress {inProgress}
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block"
                style={{ width: 8, height: 8, borderRadius: 2, background: STATUS_COLORS.done.bg }}
              />
              Done {done}
            </span>
          </div>
        </div>
      )}
    </WidgetWrapper>
  );
}
