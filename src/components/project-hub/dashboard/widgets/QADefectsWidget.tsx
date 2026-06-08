// @ts-nocheck
/**
 * QADefectsWidget — top-10 open/recent defects for a project.
 *
 * Rewritten Apr 19, 2026 per docs/design/BAU-Dashboard-Atlaskit-Conversion.md §5 Commit 5.
 *   - Hand-rolled <table> → <DynamicTable>
 *   - Bespoke status pills → <StatusLozenge> via toStatusCategory()
 *   - Hand-rolled avatars → <UserAvatar size="xsmall">
 *   - Bespoke empty state → <EmptyState>
 *
 * Apr 19, 2026 (Commit B.2a): Severity column dropped — reclaimed 10% of row
 * width for Title + Status + Assignee, which were clipping at the right edge
 * when the project side-panel was extended. Severity still surfaces via the
 * Lozenge pills in the status-summary bar above the table and via row drill-
 * through to TestHub.
 */
import { useEffect, useState } from 'react';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import type { WidgetProps } from '../widget-registry';
import WidgetWrapper from '../WidgetWrapper';
import WidgetGearButton from '../WidgetGearButton';
import PaginationFooter from '../PaginationFooter';
import { resolveColumns, getWidthsForGadget } from '../gadgetColumns';
import { useDashboardDefects } from '@/hooks/useDashboardWidgets';
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

export default function QADefectsWidget({ projectId, projectKey, collapsed, onToggleCollapse }: WidgetProps) {
  const { settings } = useGadgetSettings('qa', projectKey);
  const [page, setPage] = useState(0);
  const { data: defects, isLoading, refetch } = useDashboardDefects(projectId, projectKey, {
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
  // 6-column layout (Apr 25, 2026): adds Priority + Age. Defects use the
  // `severity` column from tm_defects which holds the same Atlassian
  // priority strings (Highest/High/Medium/Low/Lowest) as ph_issues.priority.
  // Header cells wrap the label in a span with bumped typography so the
  // column heads read at executive scale (matches the rest of the
  // dashboard's 14px body / 28px KPI rhythm). Atlaskit DynamicTable's
  // built-in header style is too small at our card dimensions.
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
  const activeColumns = resolveColumns('qa', settings.columns ?? null);

  const allHeadCells = [
    { key: 'priority', content: headLabel('P'),        isSortable: true },
    { key: 'key',      content: headLabel('Key'),      isSortable: true },
    { key: 'title',    content: headLabel('Title'),    isSortable: false },
    { key: 'status',   content: headLabel('Status'),   isSortable: true },
    { key: 'assignee', content: headLabel('Assignee'), isSortable: false },
    { key: 'age',      content: headLabel('Age'),      isSortable: true },
    { key: 'reporter', content: headLabel('Reporter'), isSortable: false },
    { key: 'created',  content: headLabel('Created'),  isSortable: true },
    { key: 'updated',  content: headLabel('Updated'),  isSortable: true },
    { key: 'fixVersion', content: headLabel('Fix ver'), isSortable: false },
    { key: 'labels',   content: headLabel('Labels'),   isSortable: false },
    { key: 'resolution', content: headLabel('Resolution'), isSortable: false },
  ];

  const head = {
    cells: allHeadCells.filter((c) => activeColumns.includes(c.key)),
  };

  // No slice cap (Apr 26, 2026) — outer WidgetWrapper body provides a
  // standardised 620px scroll container, so we render the full set
  // and let the user scroll inside the widget instead of capping at 10.
  const rows = (defects ?? []).map((d: any) => {
    const assigneeName = d.jira_assignee_name || '';
    const displayKey = d.jira_key || d.defect_key;
    const statusLabel = (d.status || 'open').replace(/_/g, ' ');
    const priorityValue = d.priority ?? d.severity ?? null;
    return {
      key: d.id,
      cells: (([
        {
          key: 'priority',
          content: (
            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
              <PriorityIcon level={priorityValue} size={16} />
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
                ...STRONG,
                color: token('color.link', '#0C66E4'),
                fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
                whiteSpace: 'nowrap',
              }}
            >
              <JiraIssueTypeIcon type={(d as any).issue_type ?? 'Defect'} size={16} />
              {displayKey}
            </span>
          ),
        },
        {
          key: 'title',
          content: (
            // Tooltip surfaces the full title on hover — the cell itself
            // truncates with ellipsis at its colgroup width (clipping
            // applied by ResizableDynamicTable). Display:block makes the
            // span fill the cell so ellipsis behaves predictably.
            <Tooltip content={d.title ?? ''} position="top">
              {(tp) => (
                <span
                  {...tp}
                  style={{
                    display: 'block',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    ...STRONG,
                  }}
                >
                  {d.title ?? ''}
                </span>
              )}
            </Tooltip>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <UserAvatar size="small" name={assigneeName} src={d.assignee_avatar_url} />
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
          key: 'age',
          content: (() => {
            const raw = d.created_at ?? d.jira_created_at ?? null;
            let display = '—';
            if (raw) {
              try {
                const dt = new Date(raw);
                if (!Number.isNaN(dt.getTime())) {
                  const dd = String(dt.getDate()).padStart(2, '0');
                  const mon = dt.toLocaleString('en-GB', { month: 'short' });
                  const yy = String(dt.getFullYear()).slice(-2);
                  display = `${dd}/${mon}/${yy}`;
                }
              } catch { /* fallback */ }
            }
            return (
              <span
                style={{
                  ...STRONG,
                  color: token('color.text.subtle', '#44546F'),
                  fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
                  whiteSpace: 'nowrap',
                }}
              >
                {display}
              </span>
            );
          })(),
        },
        // Extra columns (hidden by default, shown when user adds via column picker)
        { key: 'reporter', content: <span style={{ ...BODY }}>{d.reporter_display_name ?? '—'}</span> },
        { key: 'created', content: <span style={{ ...BODY, fontFamily: 'monospace' }}>{d.created_at ? new Date(d.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}</span> },
        { key: 'updated', content: <span style={{ ...BODY, fontFamily: 'monospace' }}>{d.updated_at ? new Date(d.updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}</span> },
        { key: 'fixVersion', content: <span style={{ ...BODY }}>{d.fix_versions?.[0] ?? '—'}</span> },
        { key: 'labels', content: <span style={{ ...BODY }}>{d.labels?.join(', ') ?? '—'}</span> },
        { key: 'resolution', content: <span style={{ ...BODY }}>{d.resolution ?? '—'}</span> },
      ] as any[]).filter((c) => activeColumns.includes(c.key))),
    };
  });

  useEffect(() => {
    const pageSize = settings.numResults ?? 10;
    const maxPage = Math.max(0, Math.ceil(rows.length / pageSize) - 1);
    if (page > maxPage) setPage(maxPage);
  }, [rows.length, settings.numResults, page]);

  useAutoRefresh(settings.autoRefresh, settings.autoRefreshMinutes, refetch);

  return (
    <WidgetWrapper
      title="QA Defects"
      subtitle="Cross-hub defects"
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      span={1}
      footer={footer}
      flushBody
      onExpand={handleExpand}
      headerBadges={<WidgetGearButton gadgetType="qa" projectKey={projectKey} projectId={projectId} />}
    >
      {isLoading ? (
        <div className="p-4 animate-pulse">
          <div
            className="h-20 rounded"
            style={{ background: token('color.background.neutral.subtle', '#F1F2F4') }}
          />
        </div>
      ) : !defects?.length ? (
        <EmptyState size="compact" header="No defects found" description="No open QA defects for this project." />
      ) : (
        <>
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
              {defects.length} defects
            </span>
            {(() => {
              const open = defects.filter((d: any) => ['open', 'new', 'in_progress', 'reopened'].includes(d.status)).length;
              const resolved = defects.filter((d: any) => ['resolved', 'fixed', 'verified'].includes(d.status)).length;
              const closed = defects.filter((d: any) => d.status === 'closed').length;
              return (
                <>
                  {open > 0 && <Lozenge appearance="inprogress">{open} Open</Lozenge>}
                  {resolved > 0 && <Lozenge appearance="success">{resolved} Resolved</Lozenge>}
                  {closed > 0 && <Lozenge appearance="default">{closed} Closed</Lozenge>}
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
            widgetKey={`qa-defects-v4:${projectKey}`}
            head={head}
            rows={rows.slice(page * (settings.numResults ?? 10), (page + 1) * (settings.numResults ?? 10))}
            ariaLabel="QA defects"
            // Apr 26, 2026 — widths re-tuned for 14-15px executive
            // typography (was 12-13px). Each column gets ~10-30px more
            // room for the bigger text + 16px icons + small (24px)
            // avatars. Bumped widgetKey suffix to v3 so any persisted
            // user-customised widths from the previous typography pass
            // are discarded — fresh defaults paint correctly.
            defaultWidths={getWidthsForGadget('qa').defaultWidths}
            minWidths={getWidthsForGadget('qa').minWidths}
          />
          </div>
          <PaginationFooter
            page={page}
            pageSize={settings.numResults ?? 10}
            total={rows.length}
            onPageChange={setPage}
          />
        </>
      )}
    </WidgetWrapper>
  );
}
