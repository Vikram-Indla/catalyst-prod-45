// @ts-nocheck
/**
 * TimeInStatusWidget — canonical Jira "Time in Status" matrix.
 *
 * Apr 25, 2026. Path A+B unified.
 *   • Issue-type tabs (Story / Epic / Sub-task / Defect / Business
 *     Request / Task) drive the COLUMN set via catalyst_workflow_statuses.
 *   • Timeline picker (Last 14d / 30d / 90d / Q1..Q4 / All).
 *   • Each ROW = one ticket; each CELL = ms spent in that status.
 *   • Last column = TOTAL time across all statuses (sortable, default sort).
 *   • Heatmap shading per cell (longer = more saturated red).
 *   • Hover any cell = exact duration in tooltip.
 *   • Row click = UWV drawer drill-down.
 *
 * Data source: useTimeInStatusMatrix(projectKey, issueType, filters)
 * which reads catalyst_status_history (forward-tracked from ph_issues
 * trigger) joined with ph_issues for ticket meta. When history is empty
 * (pre-trigger tickets), the full duration sits in the current status —
 * widget shows a one-time banner explaining lifecycle data accumulates
 * forward from the migration date.
 */
import { useMemo, useState } from 'react';
import { token } from '@atlaskit/tokens';
import Spinner from '@atlaskit/spinner';
import Tooltip from '@atlaskit/tooltip';
import type { WidgetProps } from '../widget-registry';
import WidgetWrapper from '../WidgetWrapper';
import WidgetGearButton from '../WidgetGearButton';
import { useTimeInStatusMatrix, type TimeInStatusMatrixRow } from '@/hooks/useDashboardWidgets';
import { useGadgetSettings } from '@/hooks/useGadgetSettings';
import { useUWV } from '@/components/universal-work-view/UWVContext';
import {
  EmptyState,
  Lozenge,
  SectionMessage,
  StatusLozenge,
  toStatusCategory,
} from '@/components/ads';
import WorkItemIcon, { normalizeIconType } from '@/components/shared/WorkItemIcon';
import PriorityIcon from '@/components/shared/PriorityIcon';
import UserAvatar from '@/components/shared/UserAvatar';

const ISSUE_TYPES = ['Story', 'Epic', 'Sub-task', 'Defect', 'Business Request', 'Task'];

type WindowPreset = '14d' | '30d' | '90d' | 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'all';

const WINDOW_LABELS: Record<WindowPreset, string> = {
  '14d': 'Last 14 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  Q1: 'Q1 2026',
  Q2: 'Q2 2026',
  Q3: 'Q3 2026',
  Q4: 'Q4 2026',
  all: 'All time',
};

function resolveWindow(preset: WindowPreset): { dateFrom: string | null; dateTo: string | null } {
  const yr = 2026;
  const today = new Date();
  const iso = (d: Date) => d.toISOString();
  switch (preset) {
    case '14d': {
      const d = new Date(today); d.setDate(d.getDate() - 14);
      return { dateFrom: iso(d), dateTo: null };
    }
    case '30d': {
      const d = new Date(today); d.setDate(d.getDate() - 30);
      return { dateFrom: iso(d), dateTo: null };
    }
    case '90d': {
      const d = new Date(today); d.setDate(d.getDate() - 90);
      return { dateFrom: iso(d), dateTo: null };
    }
    case 'Q1': return { dateFrom: `${yr}-01-01`, dateTo: `${yr}-03-31` };
    case 'Q2': return { dateFrom: `${yr}-04-01`, dateTo: `${yr}-06-30` };
    case 'Q3': return { dateFrom: `${yr}-07-01`, dateTo: `${yr}-09-30` };
    case 'Q4': return { dateFrom: `${yr}-10-01`, dateTo: `${yr}-12-31` };
    case 'all': return { dateFrom: null, dateTo: null };
  }
}

/** Compact duration formatter — `4d 6h` / `2w 3d` / `1mo 12d`. */
function fmtDuration(ms: number | undefined): string {
  if (!ms || ms < 0) return '—';
  const sec = Math.floor(ms / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  const wk = Math.floor(day / 7);
  const mo = Math.floor(day / 30);
  if (mo >= 1) return `${mo}mo ${day - mo * 30}d`;
  if (wk >= 1) return `${wk}w ${day - wk * 7}d`;
  if (day >= 1) return `${day}d ${hr - day * 24}h`;
  if (hr >= 1) return `${hr}h ${min - hr * 60}m`;
  if (min >= 1) return `${min}m`;
  return `${sec}s`;
}

/** Heatmap shade — relative to max duration in the column. */
function heatBg(ms: number, max: number): string {
  if (!ms || ms <= 0 || max <= 0) return 'transparent';
  const ratio = Math.min(1, ms / max);
  if (ratio < 0.15) return 'transparent';
  if (ratio < 0.4)  return 'var(--ds-background-accent-orange-subtler, #FFE2BD)';
  if (ratio < 0.7)  return 'var(--ds-background-accent-orange-subtler, #F8E6A0)';
  return 'var(--ds-background-accent-red-subtler, #FFD5D2)';
}

const ROW_HEIGHT = 36;
const STATUS_COL_MIN = 96;
const FROZEN_LEFT_WIDTH = 380; // priority + key + title + assignee

export default function TimeInStatusWidget({
  projectId,
  projectKey,
  collapsed,
  onToggleCollapse,
}: WidgetProps) {
  const [issueType, setIssueType] = useState<string>('Story');
  const [windowPreset, setWindowPreset] = useState<WindowPreset>('Q2');
  const [pageSize] = useState(50);
  const [offset, setOffset] = useState(0);

  const { settings } = useGadgetSettings('workload', projectKey);
  const { dateFrom, dateTo } = resolveWindow(windowPreset);
  const { openUWV } = useUWV();

  const { data, isLoading, isError, isFetching } = useTimeInStatusMatrix(projectKey, {
    issueType,
    dateFrom,
    dateTo,
    assigneeFilter: settings.assigneeFilter,
    priorityFilter: settings.priorityFilter,
    limit: pageSize,
    offset,
  });

  const rows = data?.rows ?? [];
  const statusColumns = data?.statusColumns ?? [];
  const total = data?.total ?? 0;
  const hasAnyHistory = data?.hasAnyHistory ?? false;

  // Column-level max duration for heatmap normalization
  const colMax = useMemo(() => {
    const m: Record<string, number> = {};
    rows.forEach((r) => {
      Object.entries(r.byStatus).forEach(([s, ms]) => {
        if ((ms ?? 0) > (m[s] ?? 0)) m[s] = ms;
      });
    });
    return m;
  }, [rows]);

  const totalMax = useMemo(
    () => rows.reduce((max, r) => Math.max(max, r.totalMs), 0),
    [rows],
  );

  return (
    <WidgetWrapper
      title="Time in Status"
      subtitle="Time spent in each status, per ticket"
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      flushBody
      headerBadges={
        <>
          <Lozenge appearance="default">{String(total)}</Lozenge>
          <WidgetGearButton
            gadgetType="workload"
            projectKey={projectKey}
            projectId={projectId}
          />
        </>
      }
    >
      {/* ─── Filter bar ─────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: token('space.200', '16px'),
          padding: '12px 16px',
          borderBottom: `1px solid ${token('color.border', '#E2E8F0')}`,
          background: token('elevation.surface', '#FFFFFF'),
        }}
      >
        {/* Issue-type tabs */}
        <div style={{ display: 'flex', gap: 4, overflowX: 'auto', minWidth: 0 }}>
          {ISSUE_TYPES.map((t) => {
            const active = t === issueType;
            return (
              <button
                key={t}
                type="button"
                onClick={() => { setIssueType(t); setOffset(0); }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  height: 28,
                  padding: '0 12px',
                  fontSize: 12,
                  fontWeight: active ? 600 : 500,
                  borderRadius: 'var(--ds-border-radius, 4px)',
                  border: `1px solid ${active ? 'var(--ds-border-selected, #0C66E4)' : 'var(--ds-border, #DFE1E6)'}`,
                  background: active ? 'var(--ds-background-selected, #E9F2FF)' : 'transparent',
                  color: active ? 'var(--ds-text-selected, #0055CC)' : 'var(--ds-text-subtle, #505258)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                <WorkItemIcon type={normalizeIconType(t)} size={14} />
                {t}
              </button>
            );
          })}
        </div>

        {/* Timeline picker */}
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {(['14d', '30d', '90d', 'Q2', 'all'] as WindowPreset[]).map((w) => {
            const active = w === windowPreset;
            return (
              <button
                key={w}
                type="button"
                onClick={() => { setWindowPreset(w); setOffset(0); }}
                style={{
                  height: 26,
                  padding: '0 10px',
                  fontSize: 11,
                  fontWeight: active ? 600 : 500,
                  borderRadius: 'var(--ds-border-radius, 4px)',
                  border: `1px solid ${active ? 'var(--ds-border-selected, #0C66E4)' : 'var(--ds-border, #DFE1E6)'}`,
                  background: active ? 'var(--ds-background-selected, #E9F2FF)' : 'transparent',
                  color: active ? 'var(--ds-text-selected, #0055CC)' : 'var(--ds-text-subtle, #505258)',
                  cursor: 'pointer',
                }}
                title={WINDOW_LABELS[w]}
              >
                {WINDOW_LABELS[w]}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── History accumulation banner (when no rows have transitions yet) ─── */}
      {!isLoading && rows.length > 0 && !hasAnyHistory && (
        <div style={{ padding: '12px 16px 0' }}>
          <SectionMessage appearance="information" title="Lifecycle data accumulates forward">
            Status transitions are tracked from now onwards. Cells currently
            show full age in current status. As tickets transition, real
            time-per-status will populate. Historical Jira changelog backfill
            is a separate workstream.
          </SectionMessage>
        </div>
      )}

      {/* ─── Matrix body ────────────────────────────────────────── */}
      {isLoading ? (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: token('space.400', '32px'),
          }}
        >
          <Spinner size="medium" />
        </div>
      ) : isError ? (
        <EmptyState
          size="compact"
          header="Couldn't load matrix"
          description="Try refreshing or switch the issue type."
        />
      ) : !rows.length ? (
        <EmptyState
          size="compact"
          header={`No ${issueType} tickets in ${WINDOW_LABELS[windowPreset]}`}
          description="Adjust the timeline filter, or pick a different issue type."
        />
      ) : (
        <div style={{ overflow: 'auto', maxHeight: 520 }}>
          <table
            role="grid"
            style={{
              width: '100%',
              borderCollapse: 'separate',
              borderSpacing: 0,
              fontSize: 12,
            }}
          >
            <thead>
              <tr style={{ background: token('elevation.surface', '#FFFFFF'), position: 'sticky', top: 0, zIndex: 2 }}>
                <th
                  style={{
                    position: 'sticky', left: 0, zIndex: 3,
                    background: token('elevation.surface', '#FFFFFF'),
                    width: FROZEN_LEFT_WIDTH, minWidth: FROZEN_LEFT_WIDTH,
                    textAlign: 'left',
                    padding: '8px 12px',
                    borderBottom: `1px solid ${token('color.border', '#E2E8F0')}`,
                    borderRight: `1px solid ${token('color.border', '#E2E8F0')}`,
                    fontWeight: 600,
                    color: token('color.text', '#172B4D'),
                  }}
                >
                  Ticket
                </th>
                {statusColumns.map((s) => (
                  <th
                    key={s.name}
                    style={{
                      minWidth: STATUS_COL_MIN,
                      textAlign: 'left',
                      padding: '8px 12px',
                      borderBottom: `1px solid ${token('color.border', '#E2E8F0')}`,
                      borderRight: `1px solid ${token('color.border', '#E2E8F0')}`,
                    }}
                  >
                    <StatusLozenge status={s.category === 'in_progress' ? 'inProgress' : s.category}>
                      {s.name}
                    </StatusLozenge>
                  </th>
                ))}
                <th
                  style={{
                    minWidth: 96,
                    padding: '8px 12px',
                    textAlign: 'right',
                    borderBottom: `1px solid ${token('color.border', '#E2E8F0')}`,
                    fontWeight: 600,
                    color: token('color.text', '#172B4D'),
                    background: token('elevation.surface', '#FFFFFF'),
                    position: 'sticky', right: 0, zIndex: 2,
                  }}
                >
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: TimeInStatusMatrixRow) => (
                <tr
                  key={r.issue_key}
                  onClick={() =>
                    openUWV({
                      project: projectKey,
                      hubSource: ['projecthub'],
                      dataType: 'issue',
                      title: `${r.issue_key} · ${r.title}`,
                      issueKey: r.issue_key,
                    })
                  }
                  style={{ height: ROW_HEIGHT, cursor: 'pointer' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = token('color.background.neutral.subtle', '#F4F5F7'))}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* Frozen left cell */}
                  <td
                    style={{
                      position: 'sticky', left: 0,
                      background: 'inherit',
                      padding: '6px 12px',
                      borderBottom: `1px solid ${token('color.border', '#E2E8F0')}`,
                      borderRight: `1px solid ${token('color.border', '#E2E8F0')}`,
                      width: FROZEN_LEFT_WIDTH, minWidth: FROZEN_LEFT_WIDTH,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <PriorityIcon level={r.priority} size={14} />
                      <span
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          color: token('color.link', '#0C66E4'),
                          fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
                          fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        <WorkItemIcon type={normalizeIconType(r.issue_type)} size={14} />
                        {r.issue_key}
                      </span>
                      <span
                        style={{
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          color: token('color.text', '#172B4D'),
                        }}
                      >
                        {r.title}
                      </span>
                      {r.assignee_display_name && (
                        <UserAvatar size="xsmall" name={r.assignee_display_name} src={r.assignee_avatar_url} />
                      )}
                    </div>
                  </td>

                  {/* Status cells */}
                  {statusColumns.map((s) => {
                    const ms = r.byStatus[s.name] ?? 0;
                    const max = colMax[s.name] ?? 0;
                    return (
                      <td
                        key={s.name}
                        style={{
                          minWidth: STATUS_COL_MIN,
                          padding: '6px 12px',
                          borderBottom: `1px solid ${token('color.border', '#E2E8F0')}`,
                          borderRight: `1px solid ${token('color.border', '#E2E8F0')}`,
                          background: heatBg(ms, max),
                          fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
                          fontSize: 11,
                          color: token('color.text.subtle', '#505258'),
                        }}
                      >
                        {ms > 0 ? (
                          <Tooltip content={`In ${s.name}: ${fmtDuration(ms)}`} position="top">
                            {(tp) => <span {...tp}>{fmtDuration(ms)}</span>}
                          </Tooltip>
                        ) : (
                          '—'
                        )}
                      </td>
                    );
                  })}

                  {/* Total */}
                  <td
                    style={{
                      padding: '6px 12px',
                      textAlign: 'right',
                      borderBottom: `1px solid ${token('color.border', '#E2E8F0')}`,
                      fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
                      fontSize: 12,
                      fontWeight: 600,
                      color: token('color.text', '#172B4D'),
                      background: heatBg(r.totalMs, totalMax),
                      position: 'sticky', right: 0,
                    }}
                  >
                    {fmtDuration(r.totalMs)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination footer */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 16px',
              borderTop: `1px solid ${token('color.border', '#E2E8F0')}`,
              background: token('elevation.surface', '#FFFFFF'),
              fontSize: 11,
              color: token('color.text.subtle', '#505258'),
            }}
          >
            <span>
              Showing {rows.length} of {total} {issueType} tickets · {WINDOW_LABELS[windowPreset]}
            </span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {isFetching && <Spinner size="small" />}
              {offset > 0 && (
                <button
                  type="button"
                  onClick={() => setOffset(Math.max(0, offset - pageSize))}
                  style={{
                    height: 24, padding: '0 8px', fontSize: 11, cursor: 'pointer',
                    border: '1px solid var(--ds-border, #DFE1E6)',
                    borderRadius: 'var(--ds-border-radius, 4px)',
                    background: 'transparent',
                    color: 'var(--ds-text-subtle, #505258)',
                  }}
                >
                  ← Prev
                </button>
              )}
              {offset + rows.length < total && (
                <button
                  type="button"
                  onClick={() => setOffset(offset + pageSize)}
                  style={{
                    height: 24, padding: '0 8px', fontSize: 11, cursor: 'pointer',
                    border: '1px solid var(--ds-border, #DFE1E6)',
                    borderRadius: 'var(--ds-border-radius, 4px)',
                    background: 'transparent',
                    color: 'var(--ds-text-subtle, #505258)',
                  }}
                >
                  Next →
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </WidgetWrapper>
  );
}
