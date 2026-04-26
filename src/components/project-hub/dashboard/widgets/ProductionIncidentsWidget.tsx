// @ts-nocheck
/**
 * ProductionIncidentsWidget — top-10 open/recent incidents for a project.
 *
 * Rewritten Apr 19, 2026 per docs/design/BAU-Dashboard-Atlaskit-Conversion.md §5 Commit 5.
 *   - Hand-rolled <table> → <DynamicTable>
 *   - Bespoke status pills → <StatusLozenge> via toStatusCategory()
 *   - Hand-rolled avatars → <UserAvatar size="xsmall">
 *   - Bespoke empty state → <EmptyState>
 *
 * Apr 19, 2026 (Commit B.2a): Priority column dropped — reclaimed 8% of row
 * width for Title + Status + Assignee, which were clipping at the right edge
 * when the project side-panel was extended. Priority still surfaces via the
 * Lozenge pills in the status-summary bar above the table and via row drill-
 * through to IncidentHub.
 */
import type { WidgetProps } from '../widget-registry';
import WidgetWrapper from '../WidgetWrapper';
import WidgetGearButton from '../WidgetGearButton';
import { useDashboardIncidents } from '@/hooks/useDashboardWidgets';
import { useGadgetSettings } from '@/hooks/useGadgetSettings';
import { token } from '@atlaskit/tokens';
import Tooltip from '@atlaskit/tooltip';
import { useUWV } from '@/components/universal-work-view/UWVContext';
import {
  Lozenge,
  StatusLozenge,
  EmptyState,
  toStatusCategory,
} from '@/components/ads';
import { ResizableDynamicTable } from '../ResizableDynamicTable';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import PriorityIcon from '@/components/shared/PriorityIcon';
import RelativeTime from '@/components/shared/RelativeTime';
import UserAvatar from '@/components/shared/UserAvatar';

export default function ProductionIncidentsWidget({ projectId, projectKey, collapsed, onToggleCollapse }: WidgetProps) {
  const { settings } = useGadgetSettings('incidents', projectKey);
  const { data: incidents, isLoading } = useDashboardIncidents(projectId, projectKey, {
    dateFrom: settings.dateFrom,
    dateTo: settings.dateTo,
    statusFilter: settings.statusFilter,
    releaseFilter: settings.releaseFilter,
    assigneeFilter: settings.assigneeFilter,
    itemTypeFilter: settings.itemTypeFilter,
    priorityFilter: settings.priorityFilter,
  });
  const { openUWV } = useUWV();

  const handleExpand = () => openUWV({
    project: projectKey,
    hubSource: ['projecthub'],
    issueTypes: ['Production Incident'],
    dataType: 'incidents',
    title: `Production Incidents · ${projectKey}`,
    scope: settings.dateFrom ? 'custom' : 'all',
    dateFrom: settings.dateFrom ?? null,
    dateTo: settings.dateTo ?? null,
    dateLabel: settings.dateLabel,
    statusFilter: settings.statusFilter,
    assigneeFilter: settings.assigneeFilter,
    itemTypeFilter: settings.itemTypeFilter,
    priorityFilter: settings.priorityFilter,
    releaseFilter: settings.releaseFilter,
  });

  const footer = (
    <button
      type="button"
      onClick={handleExpand}
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
      View All in IncidentHub ↗
    </button>
  );

  // No width hints — .dashboard-widget-body in index.css sets
  //   table-layout: auto + min-width: max-content + white-space: nowrap
  // so each column sizes to its longest cell and the widget body scrolls
  // horizontally when the row is wider than the container. This gives
  // users the full title text (no ellipsis) with comfortable margins.
  // 6-column layout (Apr 25, 2026): adds Priority + Started.
  // Header cells wrap the label in a span with bumped typography so the
  // column heads read at executive scale (matches the rest of the
  // dashboard's 14px body / 28px KPI rhythm).
  const headLabel = (label: string) => (
    <span
      style={{
        fontSize: 12,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        color: token('color.text.subtle', '#44546F'),
      }}
    >
      {label}
    </span>
  );
  const head = {
    cells: [
      { key: 'priority', content: headLabel('P'),         isSortable: true },
      { key: 'key',      content: headLabel('Key'),       isSortable: true },
      { key: 'title',    content: headLabel('Title'),     isSortable: false },
      { key: 'status',   content: headLabel('Status'),    isSortable: true },
      { key: 'assignee', content: headLabel('Assignee'),  isSortable: false },
      { key: 'started',  content: headLabel('Started'),   isSortable: true },
    ],
  };

  const isClosed = (s?: string | null) => {
    const v = (s || '').toLowerCase();
    return v === 'resolved' || v === 'closed' || v === 'done';
  };

  // No slice cap (Apr 26, 2026) — outer WidgetWrapper body provides a
  // standardised 620px scroll container, so we render the full set
  // and let the user scroll inside the widget instead of capping at 10.
  const rows = (incidents ?? []).map((inc: any) => {
    const assigneeName = inc.assignee_display_name || '';
    const statusLabel = (inc.status || 'open').replace(/_/g, ' ');
    return {
      key: inc.id,
      cells: [
        {
          key: 'priority',
          content: (
            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
              <PriorityIcon level={inc.priority ?? null} size={16} />
            </span>
          ),
        },
        {
          key: 'key',
          content: (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                color: token('color.link', '#0C66E4'),
                fontWeight: 600,
                fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
                fontSize: 14,
                whiteSpace: 'nowrap',
              }}
            >
              <JiraIssueTypeIcon
                type={(inc as any).issue_type ?? 'Production Incident'}
                size={16}
              />
              {inc.issue_key ?? ''}
            </span>
          ),
        },
        {
          key: 'title',
          content: (
            // Tooltip surfaces the full title on hover — cell truncates
            // with ellipsis at its colgroup width (clipping applied by
            // ResizableDynamicTable). Display:block makes the span fill
            // the cell so ellipsis behaves predictably.
            <Tooltip content={inc.summary ?? ''} position="top">
              {(tp) => (
                <span
                  {...tp}
                  style={{
                    display: 'block',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontSize: 14,
                    fontWeight: 500,
                    color: token('color.text', '#172B4D'),
                    lineHeight: '20px',
                  }}
                >
                  {inc.summary ?? ''}
                </span>
              )}
            </Tooltip>
          ),
        },
        {
          key: 'status',
          content: (
            <StatusLozenge status={toStatusCategory(inc.status)}>
              {statusLabel}
            </StatusLozenge>
          ),
        },
        {
          key: 'assignee',
          content: assigneeName ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <UserAvatar
                size="small"
                name={assigneeName}
                src={inc.assignee_avatar_url}
              />
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: token('color.text', '#172B4D'),
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {assigneeName.split(' ')[0]}
              </span>
            </div>
          ) : (
            <span style={{ color: token('color.text.subtlest', '#6B6E76'), fontSize: 14 }}>—</span>
          ),
        },
        {
          key: 'started',
          content: (
            <RelativeTime
              iso={inc.jira_created_at ?? inc.created_at ?? null}
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: token('color.text.subtle', '#44546F'),
                fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
                whiteSpace: 'nowrap',
              }}
            />
          ),
        },
      ],
    };
  });

  return (
    <WidgetWrapper
      title="Production Incidents"
      subtitle="Cross-hub from IncidentHub"
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      span={2}
      footer={footer}
      flushBody
      onExpand={handleExpand}
      headerBadges={<WidgetGearButton gadgetType="incidents" projectKey={projectKey} projectId={projectId} />}
    >
      {isLoading ? (
        <div className="p-4 animate-pulse">
          <div
            className="h-24 rounded"
            style={{ background: token('color.background.neutral.subtle', '#F1F5F9') }}
          />
        </div>
      ) : !incidents?.length ? (
        <EmptyState
          size="compact"
          header="No production incidents"
          description="No open incidents for this project."
        />
      ) : (
        <>
          {/* Status summary bar */}
          <div
            style={{
              padding: '12px 24px',
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
            }}
          >
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: token('color.text', '#172B4D'),
              }}
            >
              {incidents.length} incidents
            </span>
            {(() => {
              const open = incidents.filter((d: any) => !isClosed(d.status)).length;
              const closed = incidents.filter((d: any) => isClosed(d.status)).length;
              return (
                <>
                  {open > 0 && <Lozenge appearance="inprogress">{open} OPEN</Lozenge>}
                  {closed > 0 && <Lozenge appearance="success">{closed} CLOSED</Lozenge>}
                </>
              );
            })()}
          </div>
          <div
            // Inner-scroll dropped Apr 26, 2026 — WidgetWrapper now owns a
            // standardised 620px body scroll for every widget. Keeping
            // overflowX for wide-table horizontal scroll.
            style={{ overflowX: 'auto' }}
          >
          <ResizableDynamicTable
            widgetKey={`prod-incidents-v3:${projectKey}`}
            head={head}
            rows={rows}
            ariaLabel="Production incidents"
            // Apr 26, 2026 — widths re-tuned for 14-15px executive
            // typography (was 12-13px). Mirrors QA Defects so the two
            // stacked widgets line up vertically with identical column
            // rhythm. Bumped widgetKey suffix to v3 to discard any
            // persisted user-customised widths from the previous pass.
            defaultWidths={{
              priority: 64,
              key: 170,
              title: 700,
              status: 140,
              assignee: 180,
              started: 120,
            }}
            minWidths={{
              priority: 48,
              key: 120,
              title: 240,
              status: 100,
              assignee: 110,
              started: 80,
            }}
          />
          </div>
        </>
      )}
    </WidgetWrapper>
  );
}
