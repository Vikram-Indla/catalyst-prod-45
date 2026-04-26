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
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import PriorityIcon from '@/components/shared/PriorityIcon';
import UserAvatar from '@/components/shared/UserAvatar';
import TimeInStatusFullscreenModal from './TimeInStatusFullscreenModal';

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

/**
 * Cell background by status category — Jira-canonical colors via ADS tokens.
 *  todo        → gray  (color.background.accent.gray.subtler)
 *  in_progress → blue  (color.background.accent.blue.subtler)
 *  done        → green (color.background.accent.green.subtler)
 * Empty cells stay transparent. No more peach/red duration heatmap.
 */
function categoryBg(category: 'todo' | 'in_progress' | 'done' | undefined, ms: number): string {
  if (!ms || ms <= 0) return 'transparent';
  switch (category) {
    case 'in_progress':
      return 'var(--ds-background-accent-blue-subtler, #CCE0FF)';
    case 'done':
      return 'var(--ds-background-accent-green-subtler, #BAF3DB)';
    case 'todo':
    default:
      return 'var(--ds-background-accent-gray-subtler, #DCDFE4)';
  }
}

/** Total-column accent: subtle neutral so it doesn't compete with status cells. */
function totalBg(ms: number, max: number): string {
  if (!ms || max <= 0) return 'transparent';
  const ratio = Math.min(1, ms / max);
  if (ratio < 0.5) return 'transparent';
  return 'var(--ds-background-neutral, #F1F2F4)';
}

const ROW_HEIGHT = 40;
const STATUS_COL_MIN = 128;       // bumped from 96 — gives "3mo 12d ×2" room to breathe
const FROZEN_LEFT_WIDTH = 420;    // bumped from 380; priority + key + title + assignee
const TOTAL_COL_WIDTH = 110;

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
  // Fullscreen modal for the executive view. Replaces the previous
  // openUWV() route, which collapsed the matrix into a flat issue list
  // (UWV is a flat-list viewer; it has no notion of status columns +
  // durations, so the "expand" action effectively destroyed the widget's
  // value-add).
  const [fullscreen, setFullscreen] = useState(false);

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
      // Matrix manages its own internal scroll (sticky frozen-left
      // ticket col, sticky right total col, sticky thead). Bypass the
      // standardised 620px body height so both axes scroll inside the
      // <table> instead of fighting the wrapper's overflow-y.
      bodyHeight="auto"
      onExpand={() => setFullscreen(true)}
      headerBadges={
        <>
          <Lozenge appearance="default">{String(total)}</Lozenge>
          <WidgetGearButton
            gadgetType="workload"
            projectKey={projectKey}
            projectId={projectId}
          />
          <TimeInStatusFullscreenModal
            isOpen={fullscreen}
            onClose={() => setFullscreen(false)}
            projectKey={projectKey}
            initialIssueType={issueType}
            initialWindowPreset={windowPreset}
            assigneeFilter={settings.assigneeFilter}
            priorityFilter={settings.priorityFilter}
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
                <JiraIssueTypeIcon type={t} size={14} />
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
              // Apr 26, 2026 — base table font 12→14 to match the rest
              // of the dashboard. Cells with explicit fontSize still win.
              fontSize: 14,
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
                    padding: '10px 12px',
                    borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
                    borderRight: `1px solid ${token('color.border', '#DFE1E6')}`,
                    // Header style mirrors QA Defects / Production
                    // Incidents header: 12px uppercase 700 letter-spaced
                    // 0.04em color.text.subtle.
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: token('color.text.subtle', '#44546F'),
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
                      background: token('elevation.surface', '#FFFFFF'),
                    boxShadow: '1px 0 0 0 ' + token('color.border', '#E2E8F0'),
                      padding: '6px 12px',
                      borderBottom: `1px solid ${token('color.border', '#E2E8F0')}`,
                      borderRight: `1px solid ${token('color.border', '#E2E8F0')}`,
                      width: FROZEN_LEFT_WIDTH, minWidth: FROZEN_LEFT_WIDTH,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <PriorityIcon level={r.priority} size={16} />
                      <span
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 8,
                          color: token('color.link', '#0C66E4'),
                          fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
                          // Apr 26, 2026 — 12→14 / 500→600 to match
                          // Demand Fulfilment + QA Defects + Production
                          // Incidents row typography. Same density across
                          // every dashboard table.
                          fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        <JiraIssueTypeIcon type={r.issue_type ?? 'Task'} size={16} />
                        {r.issue_key}
                      </span>
                      <span
                        style={{
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          // Apr 26, 2026 — title now at 14/500 to match
                          // the rest of the dashboard row titles. Was
                          // unstyled (inheriting 12px from parent table).
                          fontSize: 14,
                          fontWeight: 500,
                          lineHeight: '20px',
                          color: token('color.text', '#172B4D'),
                        }}
                      >
                        {r.title}
                      </span>
                      {r.assignee_display_name && (
                        <UserAvatar size="small" name={r.assignee_display_name} src={r.assignee_avatar_url} />
                      )}
                    </div>
                  </td>

                  {/* Status cells — ADS category colors + ×N revisit counter */}
                  {statusColumns.map((s) => {
                    const ms = r.byStatus[s.name] ?? 0;
                    const visits = r.visitsByStatus?.[s.name] ?? 0;
                    return (
                      <td
                        key={s.name}
                        style={{
                          minWidth: STATUS_COL_MIN,
                          padding: '6px 12px',
                          borderBottom: `1px solid ${token('color.border', '#E2E8F0')}`,
                          borderRight: `1px solid ${token('color.border', '#E2E8F0')}`,
                          background: categoryBg(s.category, ms),
                          fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
                          fontSize: 11,
                          color: token('color.text', '#172B4D'),
                        }}
                      >
                        {ms > 0 ? (
                          <Tooltip
                            content={
                              visits > 1
                                ? `In ${s.name}: ${fmtDuration(ms)} across ${visits} visits`
                                : `In ${s.name}: ${fmtDuration(ms)}`
                            }
                            position="top"
                          >
                            {(tp) => (
                              <span
                                {...tp}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                              >
                                {fmtDuration(ms)}
                                {visits > 1 && (
                                  <span
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 700,
                                      color: 'var(--ds-text-accent-red, #AE2A19)',
                                      padding: '0 4px',
                                      borderRadius: 'var(--ds-border-radius, 4px)',
                                      background: 'var(--ds-background-accent-red-subtler, #FFD5D2)',
                                      lineHeight: 1.4,
                                    }}
                                    aria-label={`${visits} visits`}
                                  >
                                    ×{visits}
                                  </span>
                                )}
                              </span>
                            )}
                          </Tooltip>
                        ) : (
                          <span style={{ color: token('color.text.disabled', '#B3B9C4') }}>—</span>
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
                      background: totalBg(r.totalMs, totalMax),
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
