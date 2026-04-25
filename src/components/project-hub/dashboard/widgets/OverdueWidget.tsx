// @ts-nocheck
/**
 * OverdueWidget — past-due items in active releases.
 *
 * Rewritten Apr 19, 2026 per docs/design/BAU-Dashboard-Atlaskit-Conversion.md §5 Commit 6.
 *   - Header count badge → <Lozenge appearance="success|removed">
 *   - Bespoke empty-state → <EmptyState>
 *   - Row list: var(--cp-*) → token()
 */
import type { WidgetProps } from '../widget-registry';
import WidgetWrapper from '../WidgetWrapper';
import { useDashboardOverdueItems } from '@/hooks/useDashboardWidgets';
import { useGadgetSettings } from '@/hooks/useGadgetSettings';
import { token } from '@atlaskit/tokens';
import { useUWV } from '@/components/universal-work-view/UWVContext';
import { EmptyState, Lozenge } from '@/components/ads';
import WorkItemIcon, { normalizeIconType } from '@/components/shared/WorkItemIcon';
import WidgetGearButton from '../WidgetGearButton';

export default function OverdueWidget({ projectId, projectKey, collapsed, onToggleCollapse }: WidgetProps) {
  const { settings } = useGadgetSettings('overdue', projectKey);
  const { data: items, isLoading } = useDashboardOverdueItems(projectId, {
    dateFrom: settings.dateFrom,
    dateTo: settings.dateTo,
    statusFilter: settings.statusFilter,
    releaseFilter: settings.releaseFilter,
    assigneeFilter: settings.assigneeFilter,
    itemTypeFilter: settings.itemTypeFilter,
    priorityFilter: settings.priorityFilter,
  });
  const count = items?.length ?? 0;
  const { openUWV } = useUWV();

  const badge = (
    <>
      <Lozenge appearance={count === 0 ? 'success' : 'removed'}>{count}</Lozenge>
      <WidgetGearButton gadgetType="overdue" projectKey={projectKey} projectId={projectId} />
    </>
  );

  const footer = (
    <button
      type="button"
      onClick={() => openUWV({
        project: projectKey,
        hubSource: ['projecthub'],
        dataType: 'overdue',
        title: `Overdue Items · ${projectKey}`,
        scope: settings.dateFrom ? 'custom' : 'all',
        dateFrom: settings.dateFrom ?? null,
        dateTo: settings.dateTo ?? null,
        dateLabel: settings.dateLabel,
        statusFilter: settings.statusFilter,
        assigneeFilter: settings.assigneeFilter,
        itemTypeFilter: settings.itemTypeFilter,
        priorityFilter: settings.priorityFilter,
        releaseFilter: settings.releaseFilter,
      })}
      style={{
        background: 'transparent',
        border: 0,
        cursor: 'pointer',
        fontSize: 12,
        color: token('color.link', '#0C66E4'),
        padding: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
      }}
    >
      View all overdue ↗
    </button>
  );

  return (
    <WidgetWrapper
      title="Overdue"
      subtitle="Past due date"
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      span={1}
      headerBadges={badge}
      footer={footer}
    >
      {isLoading ? (
        <div className="animate-pulse">
          <div
            className="h-12 rounded"
            style={{ background: token('color.background.neutral.subtle', '#F1F5F9') }}
          />
        </div>
      ) : count === 0 ? (
        <EmptyState
          size="compact"
          header="All items on track"
          description="No overdue items across active releases."
        />
      ) : (
        <div className="space-y-0">
          {items!.slice(0, 8).map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2"
              style={{
                height: 36,
                borderBottom: `1px solid ${token('color.border', '#E2E8F0')}`,
                fontSize: 12,
              }}
            >
              <span style={{ flexShrink: 0, display: 'inline-flex' }}>
                <WorkItemIcon type={normalizeIconType((item as any).issue_type)} size={14} />
              </span>
              <span
                style={{
                  color: token('color.link', '#0C66E4'),
                  fontWeight: 500,
                  fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
                  fontSize: 11,
                  flexShrink: 0,
                }}
              >
                {item.issue_key}
              </span>
              <span
                className="truncate flex-1"
                style={{ color: token('color.text.subtle', '#42526E') }}
              >
                {item.summary}
              </span>
              <span
                style={{
                  color: token('color.text.danger', '#AE2A19'),
                  fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
                  fontSize: 11,
                  flexShrink: 0,
                }}
              >
                {Math.ceil((Date.now() - new Date((item as any).effective_due_date ?? (item as any).due_date).getTime()) / 86400000)}d
              </span>
            </div>
          ))}
        </div>
      )}
    </WidgetWrapper>
  );
}
