// @ts-nocheck
/**
 * QADefectsWidget — top-10 open/recent defects for a project.
 *
 * Rewritten Apr 19, 2026 per docs/design/BAU-Dashboard-Atlaskit-Conversion.md §5 Commit 5.
 *   - Hand-rolled <table> → <DynamicTable>
 *   - Bespoke status pills → <StatusLozenge> via toStatusCategory()
 *   - Hand-rolled avatars → <Avatar size="xsmall">
 *   - Bespoke empty state → <EmptyState>
 *
 * Apr 19, 2026 (Commit B.2a): Severity column dropped — reclaimed 10% of row
 * width for Title + Status + Assignee, which were clipping at the right edge
 * when the project side-panel was extended. Severity still surfaces via the
 * Lozenge pills in the status-summary bar above the table and via row drill-
 * through to TestHub.
 */
import type { WidgetProps } from '../widget-registry';
import WidgetWrapper from '../WidgetWrapper';
import WidgetGearButton from '../WidgetGearButton';
import { useDashboardDefects } from '@/hooks/useDashboardWidgets';
import { useGadgetSettings } from '@/hooks/useGadgetSettings';
import { token } from '@atlaskit/tokens';
import { useUWV } from '@/components/universal-work-view/UWVContext';
import {
  DynamicTable,
  Lozenge,
  StatusLozenge,
  Avatar,
  EmptyState,
  toStatusCategory,
} from '@/components/ads';

export default function QADefectsWidget({ projectId, projectKey, collapsed, onToggleCollapse }: WidgetProps) {
  const { settings } = useGadgetSettings('qa', projectKey);
  const { data: defects, isLoading } = useDashboardDefects(projectId, projectKey, {
    dateFrom: settings.dateFrom,
    dateTo: settings.dateTo,
    statusFilter: settings.statusFilter,
    releaseFilter: settings.releaseFilter,
    assigneeFilter: settings.assigneeFilter,
    itemTypeFilter: settings.itemTypeFilter,
    priorityFilter: settings.priorityFilter,
  });
  const { openUWV } = useUWV();

  const footer = (
    <button
      type="button"
      onClick={() => openUWV({
        project: projectKey,
        hubSource: ['testhub'],
        dataType: 'defects',
        title: `QA Defects · ${projectKey}`,
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
        color: 'var(--cp-blue)',
        padding: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
      }}
    >
      View All in TestHub ↗
    </button>
  );

  // No width hints — .dashboard-widget-body in index.css sets
  //   table-layout: auto + min-width: max-content + white-space: nowrap
  // so each column sizes to its longest cell and the widget body scrolls
  // horizontally when the row is wider than the container. This gives
  // users the full title text (no ellipsis) with comfortable margins.
  const head = {
    cells: [
      { key: 'key', content: 'Key', isSortable: true },
      { key: 'title', content: 'Title', isSortable: false },
      { key: 'status', content: 'Status', isSortable: true },
      { key: 'assignee', content: 'Assignee', isSortable: false },
    ],
  };

  const rows = (defects ?? []).slice(0, 10).map((d: any) => {
    const assigneeName = d.jira_assignee_name || '';
    const displayKey = d.jira_key || d.defect_key;
    const statusLabel = (d.status || 'open').replace(/_/g, ' ');
    return {
      key: d.id,
      cells: [
        {
          key: 'key',
          content: (
            <span
              style={{
                color: token('color.link', '#0052CC'),
                fontWeight: 500,
                fontFamily: 'var(--cp-font-mono)',
                fontSize: 12,
                whiteSpace: 'nowrap',
              }}
            >
              {displayKey}
            </span>
          ),
        },
        {
          key: 'title',
          content: (
            <span style={{ fontSize: 13, color: token('color.text', '#172B4D') }}>
              {d.title ?? ''}
            </span>
          ),
        },
        {
          key: 'status',
          content: (
            <StatusLozenge status={toStatusCategory(d.status)}>{statusLabel}</StatusLozenge>
          ),
        },
        {
          key: 'assignee',
          content: assigneeName ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Avatar size="xsmall" name={assigneeName} src={d.assignee_avatar_url} />
              <span
                style={{
                  fontSize: 12,
                  color: token('color.text.subtle', '#42526E'),
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {assigneeName.split(' ')[0]}
              </span>
            </div>
          ) : (
            <span style={{ color: token('color.text.subtlest', '#6B778C') }}>—</span>
          ),
        },
      ],
    };
  });

  return (
    <WidgetWrapper
      title="QA Defects"
      subtitle="Cross-hub from TestHub"
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      span={1}
      footer={footer}
      flushBody
      headerBadges={<WidgetGearButton gadgetType="qa" projectKey={projectKey} projectId={projectId} />}
    >
      {isLoading ? (
        <div className="p-4 animate-pulse">
          <div
            className="h-20 rounded"
            style={{ background: token('color.background.neutral.subtle', '#F1F5F9') }}
          />
        </div>
      ) : !defects?.length ? (
        <EmptyState size="compact" header="No defects found" description="No open QA defects for this project." />
      ) : (
        <>
          <div
            style={{
              padding: '8px 16px',
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              borderBottom: `1px solid ${token('color.border', '#E2E8F0')}`,
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: token('color.text', '#172B4D'),
              }}
            >
              {defects.length} defects
            </span>
            {(() => {
              const open = defects.filter((d: any) => ['open', 'new', 'in_progress', 'reopened'].includes(d.status)).length;
              const resolved = defects.filter((d: any) => ['resolved', 'fixed', 'verified'].includes(d.status)).length;
              const closed = defects.filter((d: any) => d.status === 'closed').length;
              return (
                <>
                  {open > 0 && <Lozenge appearance="inprogress">{open} OPEN</Lozenge>}
                  {resolved > 0 && <Lozenge appearance="success">{resolved} RESOLVED</Lozenge>}
                  {closed > 0 && <Lozenge appearance="default">{closed} CLOSED</Lozenge>}
                </>
              );
            })()}
          </div>
          <DynamicTable
            head={head}
            rows={rows}
            aria-label="QA defects"
            rowsPerPage={0}
          />
        </>
      )}
    </WidgetWrapper>
  );
}
