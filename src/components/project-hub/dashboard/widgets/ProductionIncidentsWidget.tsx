// @ts-nocheck
/**
 * ProductionIncidentsWidget — top-10 open/recent incidents for a project.
 *
 * Rewritten Apr 19, 2026 per docs/design/BAU-Dashboard-Atlaskit-Conversion.md §5 Commit 5.
 *   - Hand-rolled <table> → <DynamicTable>
 *   - Bespoke status pills → <StatusLozenge> via toStatusCategory()
 *   - Hand-rolled avatars → <Avatar size="xsmall">
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

export default function ProductionIncidentsWidget({ projectId, projectKey, collapsed, onToggleCollapse }: WidgetProps) {
  const { data: incidents, isLoading } = useDashboardIncidents(projectId, projectKey);
  const { openUWV } = useUWV();

  const footer = (
    <button
      type="button"
      onClick={() => openUWV({
        project: projectKey,
        hubSource: ['projecthub'],
        issueTypes: ['Production Incident'],
        dataType: 'incidents',
        title: `Production Incidents · ${projectKey}`,
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
      View All in IncidentHub ↗
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

  const isClosed = (s?: string | null) => {
    const v = (s || '').toLowerCase();
    return v === 'resolved' || v === 'closed' || v === 'done';
  };

  const rows = (incidents ?? []).slice(0, 10).map((inc: any) => {
    const assigneeName = inc.assignee_display_name || '';
    const statusLabel = (inc.status || 'open').replace(/_/g, ' ');
    return {
      key: inc.id,
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
              {inc.issue_key ?? ''}
            </span>
          ),
        },
        {
          key: 'title',
          content: (
            <span style={{ fontSize: 13, color: token('color.text', '#172B4D') }}>
              {inc.summary ?? ''}
            </span>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Avatar
                size="xsmall"
                name={assigneeName}
                src={inc.assignee_avatar_url}
              />
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
      title="Production Incidents"
      subtitle="Cross-hub from IncidentHub"
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      span={2}
      footer={footer}
      flushBody
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
          <DynamicTable
            head={head}
            rows={rows}
            aria-label="Production incidents"
            rowsPerPage={0}
          />
        </>
      )}
    </WidgetWrapper>
  );
}
