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
import { useEffect, useState } from 'react';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import type { WidgetProps } from '../widget-registry';
import WidgetWrapper from '../WidgetWrapper';
import WidgetGearButton from '../WidgetGearButton';
import PaginationFooter from '../PaginationFooter';
import { resolveColumns, getWidthsForGadget, getAllColumnIds } from '../gadgetColumns';
import { useWidgetEditState } from '../DashboardWidgetGrid';
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
import { SMALL, SMALL_STRONG, BODY, STRONG } from '../dashboardTypography';
import { ResizableDynamicTable } from '../ResizableDynamicTable';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import PriorityIcon from '@/components/shared/PriorityIcon';

import UserAvatar from '@/components/shared/UserAvatar';

export default function ProductionIncidentsWidget({ projectId, projectKey, collapsed, onToggleCollapse }: WidgetProps) {
  const { settings, save } = useGadgetSettings('incidents', projectKey);
  const [page, setPage] = useState(0);
  const { data: incidents, isLoading, refetch } = useDashboardIncidents(projectId, projectKey, {
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
    columnIds: activeColumns,
  });

  const footer = (
    <button
      type="button"
      onClick={handleExpand}
      style={{
        background: 'transparent',
        border: 0,
        cursor: 'pointer',
        ...SMALL,
        color: token('color.link', '#0C66E4'),
        padding: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
      }}
    >
      View all ↗
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
        ...SMALL_STRONG,
        fontWeight: 500,
        textTransform: 'none',
        letterSpacing: '0.04em',
        color: token('color.text', '#292A2E'),
      }}
    >
      {label}
    </span>
  );
  const editState = useWidgetEditState();
  const isSolo = !!(editState as any).soloWidgetId
    && (editState as any).soloWidgetId === (editState as any).widgetId;
  const activeColumns = isSolo
    ? getAllColumnIds('incidents')
    : resolveColumns('incidents', settings.columns ?? null);

  const allHeadCells = [
    { key: 'priority', content: headLabel('P'),          isSortable: true },
    { key: 'key',      content: headLabel('Key'),        isSortable: true },
    { key: 'title',    content: headLabel('Title'),      isSortable: false },
    { key: 'status',   content: headLabel('Status'),     isSortable: true },
    { key: 'assignee', content: headLabel('Assignee'),   isSortable: false },
    { key: 'started',  content: headLabel('Started'),    isSortable: true },
    { key: 'reporter', content: headLabel('Reporter'),   isSortable: false },
    { key: 'severity', content: headLabel('Severity'),   isSortable: true },
    { key: 'created',  content: headLabel('Created'),    isSortable: true },
    { key: 'updated',  content: headLabel('Updated'),    isSortable: true },
    { key: 'fixVersion', content: headLabel('Fix ver'),  isSortable: false },
    { key: 'resolution', content: headLabel('Resolution'), isSortable: false },
  ];

  const head = {
    cells: allHeadCells.filter((c) => activeColumns.includes(c.key)),
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
      cells: (([
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
                /* 2026-06-09 Vikram parity — Jira Key 14/400 sans, not 14/600 mono. */
                ...BODY,
                color: token('color.link', '#0C66E4'),
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
                    /* 2026-06-09 Vikram parity — match Epic Progress: 14/400 link */
                    ...BODY,
                    color: token('color.link', '#0C66E4'),
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
                  ...BODY,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {assigneeName.split(' ')[0]}
              </span>
            </div>
          ) : (
            <span style={{ ...BODY, color: token('color.text.subtlest', '#6B6E76') }}>—</span>
          ),
        },
        {
          key: 'started',
          content: (() => {
            const raw = inc.jira_created_at ?? inc.created_at ?? null;
            let display = '—';
            if (raw) {
              try {
                const d = new Date(raw);
                if (!Number.isNaN(d.getTime())) {
                  const dd = String(d.getDate()).padStart(2, '0');
                  const mon = d.toLocaleString('en-GB', { month: 'short' });
                  const yy = String(d.getFullYear()).slice(-2);
                  display = `${dd}/${mon}/${yy}`;
                }
              } catch { /* fallback */ }
            }
            return (
              <span
                style={{
                  ...STRONG,
                  color: token('color.text.subtle', '#44546F'),
                  /* 2026-06-09 Vikram parity — Jira Key uses Atlassian Sans 14/400, NOT mono */
                  whiteSpace: 'nowrap',
                }}
              >
                {display}
              </span>
            );
          })(),
        },
        // Extra columns (hidden by default, shown when user adds via column picker)
        { key: 'reporter', content: <span style={{ ...BODY }}>{inc.reporter_display_name ?? '—'}</span> },
        { key: 'severity', content: <span style={{ ...BODY }}>{inc.severity ?? '—'}</span> },
        { key: 'created',  content: <span style={{ ...BODY, fontFamily: 'monospace' }}>{inc.created_at ? new Date(inc.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}</span> },
        { key: 'updated',  content: <span style={{ ...BODY, fontFamily: 'monospace' }}>{inc.updated_at ? new Date(inc.updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}</span> },
        { key: 'fixVersion', content: <span style={{ ...BODY }}>{inc.fix_versions?.[0] ?? '—'}</span> },
        { key: 'resolution', content: <span style={{ ...BODY }}>{inc.resolution ?? '—'}</span> },
      ] as any[]).filter((c) => activeColumns.includes(c.key))),
    };
  });

  useEffect(() => {
    const pageSize = settings.numResults ?? 10;
    const maxPage = Math.max(0, Math.ceil(rows.length / pageSize) - 1);
    if (page > maxPage) setPage(maxPage);
  }, [rows.length, settings.numResults, page]);

  const lastRefreshed = useAutoRefresh(settings.autoRefresh, settings.autoRefreshMinutes, refetch);

  return (
    <WidgetWrapper
      title="Production Incidents"
      subtitle="Cross-hub incidents"
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      span={2}
      footer={footer}
      flushBody
      onExpand={handleExpand}
      lastRefreshed={lastRefreshed}
      empty={!isLoading && rows.length === 0}
      headerBadges={<WidgetGearButton gadgetType="incidents" projectKey={projectKey} projectId={projectId} />}
    >
      {isLoading ? (
        <div className="p-4 animate-pulse">
          <div
            className="h-24 rounded"
            style={{ background: token('color.background.neutral.subtle', '#F1F2F4') }}
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
                ...STRONG,
              }}
            >
              {incidents.length} incidents
            </span>
            {(() => {
              const open = incidents.filter((d: any) => !isClosed(d.status)).length;
              const closed = incidents.filter((d: any) => isClosed(d.status)).length;
              return (
                <>
                  {open > 0 && <Lozenge appearance="inprogress">{open} Open</Lozenge>}
                  {closed > 0 && <Lozenge appearance="success">{closed} Closed</Lozenge>}
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
            widgetKey={`prod-incidents-v4:${projectKey}`}
            head={head}
            rows={rows.slice(page * (settings.numResults ?? 10), (page + 1) * (settings.numResults ?? 10))}
            ariaLabel="Production incidents"
            // Apr 26, 2026 — widths re-tuned for 14-15px executive
            // typography (was 12-13px). Mirrors QA Defects so the two
            // stacked widgets line up vertically with identical column
            // rhythm. Bumped widgetKey suffix to v3 to discard any
            // persisted user-customised widths from the previous pass.
            defaultWidths={getWidthsForGadget('incidents').defaultWidths}
            minWidths={getWidthsForGadget('incidents').minWidths}
          />
          </div>
          <PaginationFooter
            page={page}
            pageSize={settings.numResults ?? 10}
            total={rows.length}
            onPageChange={setPage}
            onPageSizeChange={(n) => save({ ...settings, numResults: n })}
          />
        </>
      )}
    </WidgetWrapper>
  );
}
