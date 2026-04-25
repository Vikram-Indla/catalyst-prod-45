// @ts-nocheck
/**
 * OnHoldWidget — blocked / paused items list.
 *
 * Rewritten Apr 19, 2026 per docs/design/BAU-Dashboard-Atlaskit-Conversion.md §5 Commit 6.
 *   - Header count badge + per-row ON HOLD pill → <StatusLozenge status="todo">
 *   - Bespoke empty-state → <EmptyState>
 *   - var(--cp-*) → token()
 */
import type { WidgetProps } from '../widget-registry';
import WidgetWrapper from '../WidgetWrapper';
import { useDashboardOnHoldItems } from '@/hooks/useDashboardWidgets';
import { useGadgetSettings } from '@/hooks/useGadgetSettings';
import { token } from '@atlaskit/tokens';
import { useUWV } from '@/components/universal-work-view/UWVContext';
import { EmptyState, StatusLozenge } from '@/components/ads';
import WorkItemIcon, { normalizeIconType } from '@/components/shared/WorkItemIcon';
import WidgetGearButton from '../WidgetGearButton';

export default function OnHoldWidget({ projectId, projectKey, collapsed, onToggleCollapse }: WidgetProps) {
  const { settings } = useGadgetSettings('onhold', projectKey);
  const { data: items, isLoading } = useDashboardOnHoldItems(projectId, {
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
      <StatusLozenge status="todo">{String(count)}</StatusLozenge>
      <WidgetGearButton gadgetType="onhold" projectKey={projectKey} projectId={projectId} />
    </>
  );

  const footer = (
    <button
      type="button"
      onClick={() => openUWV({
        project: projectKey,
        hubSource: ['projecthub'],
        dataType: 'onhold',
        title: `On Hold · ${projectKey}`,
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
      View all on hold ↗
    </button>
  );

  return (
    <WidgetWrapper
      title="On Hold"
      subtitle="Blocked items"
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
          header="No items on hold"
          description="No blocked or paused items."
        />
      ) : (
        <div className="space-y-0 w-full min-w-0 overflow-hidden">
          {items!.slice(0, 8).map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 w-full min-w-0"
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
                className="truncate flex-1 min-w-0"
                style={{ color: token('color.text.subtle', '#42526E') }}
              >
                {item.summary}
              </span>
              <span
                className="flex-shrink-0"
                style={{
                  display: 'inline-flex',
                  maxWidth: '45%',
                  overflow: 'hidden',
                }}
                title={(item.status ?? 'ON HOLD').toUpperCase()}
              >
                <StatusLozenge status="todo">
                  <span
                    style={{
                      display: 'inline-block',
                      maxWidth: '100%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      verticalAlign: 'bottom',
                    }}
                  >
                    {(item.status ?? 'ON HOLD').toUpperCase()}
                  </span>
                </StatusLozenge>
              </span>
            </div>
          ))}
        </div>
      )}
    </WidgetWrapper>
  );
}
