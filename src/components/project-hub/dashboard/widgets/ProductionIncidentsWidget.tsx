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
import { useDashboardIncidents } from '@/hooks/useDashboardWidgets';
import { ExternalLink } from 'lucide-react';
import { token } from '@atlaskit/tokens';
import {
  DynamicTable,
  Lozenge,
  StatusLozenge,
  Avatar,
  EmptyState,
  TruncateCell,
  toStatusCategory,
} from '@/components/ads';

export default function ProductionIncidentsWidget({ projectId, projectKey, collapsed, onToggleCollapse }: WidgetProps) {
  const { data: incidents, isLoading } = useDashboardIncidents(projectId, projectKey);

  const footer = (
    <a
      href="/incident-hub"
      style={{
        fontSize: 12,
        fontWeight: 500,
        color: token('color.link', '#0052CC'),
        textDecoration: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
      }}
    >
      View All in IncidentHub <ExternalLink size={11} />
    </a>
  );

  // Column widths sum to 100 — required for table-layout: fixed (applied via
  // .dashboard-widget-body in index.css) to partition row width correctly.
  // Without Title width, Atlaskit falls back to auto-sizing and long titles
  // expand the Title cell past its fair share, crushing Status to wrap.
  const head = {
    cells: [
      { key: 'key', content: 'Key', isSortable: true, width: 12 },
      { key: 'title', content: 'Title', isSortable: false, width: 56 },
      { key: 'status', content: 'Status', isSortable: true, width: 18 },
      { key: 'assignee', content: 'Assignee', isSortable: false, width: 14 },
    ],
  };

  const rows = (incidents ?? []).slice(0, 10).map((inc: any) => {
    const assigneeName = inc.assignee || '';
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
              {inc.issue_key}
            </span>
          ),
        },
        {
          key: 'title',
          content: <TruncateCell text={inc.title ?? ''} />,
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
              padding: '8px 12px',
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
              const open = incidents.filter((d: any) => d.status_category !== 'Done').length;
              const resolved = incidents.filter((d: any) => d.status_category === 'Done' && d.resolution).length;
              const closed = incidents.filter((d: any) => d.status_category === 'Done' && !d.resolution).length;
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
            aria-label="Production incidents"
            rowsPerPage={0}
          />
        </>
      )}
    </WidgetWrapper>
  );
}
