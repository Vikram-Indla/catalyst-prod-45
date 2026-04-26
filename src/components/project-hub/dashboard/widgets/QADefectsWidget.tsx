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
import type { WidgetProps } from '../widget-registry';
import WidgetWrapper from '../WidgetWrapper';
import WidgetGearButton from '../WidgetGearButton';
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
import { ResizableDynamicTable } from '../ResizableDynamicTable';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import PriorityIcon from '@/components/shared/PriorityIcon';
import RelativeTime from '@/components/shared/RelativeTime';
import UserAvatar from '@/components/shared/UserAvatar';

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
        fontSize: 12,
        color: token('color.link', '#0C66E4'),
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
      { key: 'priority', content: headLabel('P'),        isSortable: true },
      { key: 'key',      content: headLabel('Key'),      isSortable: true },
      { key: 'title',    content: headLabel('Title'),    isSortable: false },
      { key: 'status',   content: headLabel('Status'),   isSortable: true },
      { key: 'assignee', content: headLabel('Assignee'), isSortable: false },
      { key: 'age',      content: headLabel('Age'),      isSortable: true },
    ],
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
      cells: [
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
                color: token('color.link', '#0C66E4'),
                fontWeight: 600,
                fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
                fontSize: 14,
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
                    fontSize: 14,
                    fontWeight: 500,
                    color: token('color.text', '#172B4D'),
                    lineHeight: '20px',
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
          key: 'age',
          content: (
            <RelativeTime
              iso={d.created_at ?? d.jira_created_at ?? null}
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
      title="QA Defects"
      subtitle="Cross-hub from TestHub"
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
            style={{ background: token('color.background.neutral.subtle', '#F1F5F9') }}
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
                fontSize: 14,
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
          <div
            // Inner-scroll dropped Apr 26, 2026 — WidgetWrapper now owns a
            // standardised 620px body scroll for every widget. Keeping
            // overflowX for wide-table horizontal scroll.
            style={{ overflowX: 'auto' }}
          >
          <ResizableDynamicTable
            widgetKey={`qa-defects-v3:${projectKey}`}
            head={head}
            rows={rows}
            ariaLabel="QA defects"
            // Apr 26, 2026 — widths re-tuned for 14-15px executive
            // typography (was 12-13px). Each column gets ~10-30px more
            // room for the bigger text + 16px icons + small (24px)
            // avatars. Bumped widgetKey suffix to v3 so any persisted
            // user-customised widths from the previous typography pass
            // are discarded — fresh defaults paint correctly.
            defaultWidths={{
              priority: 64,
              key: 170,
              title: 700,
              status: 140,
              assignee: 180,
              age: 120,
            }}
            minWidths={{
              priority: 48,
              key: 120,
              title: 240,
              status: 100,
              assignee: 110,
              age: 80,
            }}
          />
          </div>
        </>
      )}
    </WidgetWrapper>
  );
}
