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
import type { WidgetProps } from '../widget-types';
import WidgetWrapper from '../WidgetWrapper';
import WidgetGearButton from '../WidgetGearButton';
import { useTimeInStatusMatrix, type TimeInStatusMatrixRow } from '@/hooks/useDashboardWidgets';
import { useGadgetSettings } from '@/hooks/useGadgetSettings';
import { useUWV } from '@/components/universal-work-view/UWVContext';
import {
  EmptyState,
  Lozenge,
  toStatusCategory,
} from '@/components/ads';
// 2026-06-09 — ADS wrapper for shrink-wrap behaviour.
import { Lozenge as AkLozenge } from '@/components/ads';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import PriorityIcon from '@/components/shared/PriorityIcon';
import UserAvatar from '@/components/shared/UserAvatar';
import TimeInStatusFullscreenModal from './TimeInStatusFullscreenModal';
import TimeInStatusEtaStrip from './TimeInStatusEtaStrip';
import DwellPatternLozenge from './DwellPatternLozenge';
import { classifyDwell, type DwellPattern } from '@/lib/tis-dwell-classifier/classifier';
import { LABEL, SMALL, SMALL_STRONG, BODY, STRONG } from '../dashboardTypography';

// Project module: Business Request + Task explicitly hidden (per dashboard
// guardrail — those types live in Product Hub / BAU TaskHub, not project
// delivery). Story / Epic / Sub-task / Defect cover the project domain.
const ISSUE_TYPES = ['Story', 'Epic', 'Sub-task', 'Defect'];

// Phase 4 row 5 — outlier #1 (Predictive ETA). Mocked client-side cohort
// table until tis-forecast-cohort edge fn ships in row 9. P50 per
// (issue_type, status_name) in HOURS. Confidence is a flat constant for V1.
const COHORT_P50_HOURS: Record<string, Record<string, number>> = {
  Story:    { 'In Requirements': 168, 'Demand Validation': 96, 'In Design': 192, 'Prioritized Backlog': 240, 'In Development': 168, 'In Review': 48,  'Done': 0, 'On Hold': 720 },
  Epic:     { 'In Requirements': 336, 'Demand Validation': 168,'In Design': 480, 'Prioritized Backlog': 720, 'In Development': 1440,'In Review': 96,  'Done': 0, 'On Hold': 1440 },
  'Sub-task':{ 'In Requirements': 48, 'Demand Validation': 24, 'In Design': 96,  'Prioritized Backlog': 168, 'In Development': 96,  'In Review': 24,  'Done': 0, 'On Hold': 168 },
  Defect:   { 'In Requirements': 24,  'Demand Validation': 24, 'In Design': 48,  'Prioritized Backlog': 96,  'In Development': 72,  'In Review': 24,  'Done': 0, 'On Hold': 96 },
};
const MOCK_CONFIDENCE = 0.71;
function getCohortP50Hours(issueType: string, statusName: string): number | null {
  const row = COHORT_P50_HOURS[issueType];
  if (!row) return null;
  const v = row[statusName];
  if (v == null || v <= 0) return null;
  return v;
}

// Phase 4 row 6 — outlier #5 (Pattern Lozenge). V1 mocks dwell input from
// what we already know cell-side: visit count (proxy for reassignments)
// and dwell vs P50. Once backfill (row 9) is live, this becomes a real
// classifyDwell() call with the changelog events + comments + links from
// the status window. Until then we still render the lozenge when the
// proxy heuristics fire — it's directionally correct and unlocks the UI.
function classifyCellMocked(opts: {
  issueType: string;
  statusName: string;
  durationMs: number;
  visits: number;
}): { pattern: DwellPattern; confidence: number; description?: string } {
  // Proxy ping_pong on visits ≥ 2 (re-entered the status).
  if (opts.visits >= 2) {
    return classifyDwell({
      events: [
        { field: 'assignee', from_display: null, to_display: 'A', actor_name: 'sys', changed_at: new Date().toISOString() },
        { field: 'assignee', from_display: 'A', to_display: 'B', actor_name: 'sys', changed_at: new Date().toISOString() },
        { field: 'assignee', from_display: 'B', to_display: 'A', actor_name: 'sys', changed_at: new Date().toISOString() },
      ],
      comments: [],
      links: [],
      durationMs: opts.durationMs,
      p50Hours: getCohortP50Hours(opts.issueType, opts.statusName),
    });
  }
  // Proxy silent dwell when current > 2x P50 AND no revisit signal.
  const p50h = getCohortP50Hours(opts.issueType, opts.statusName);
  if (p50h != null && opts.durationMs > 2 * p50h * 60 * 60 * 1000) {
    return classifyDwell({
      events: [],
      comments: [],
      links: [],
      durationMs: opts.durationMs,
      p50Hours: p50h,
    });
  }
  return { pattern: 'none', confidence: 0.4 };
}

/**
 * Map Jira status_category (+ status name for blocked / on hold carve-out)
 * to an Atlaskit Lozenge appearance — same mapping Epic Progress uses so the
 * column-header status pills carry Jira-standard colors, not the washed-out
 * `isBold={false}` look of the generic StatusLozenge wrapper.
 */
const lozengeAppearance = (
  category?: 'todo' | 'in_progress' | 'done' | string | null,
  status?: string | null,
): 'default' | 'success' | 'removed' | 'inprogress' | 'moved' | 'new' => {
  if (status && ['on hold', 'blocked', 'awaiting info'].includes(status.toLowerCase())) {
    return 'moved';
  }
  if (!category) return 'default';
  const c = String(category).toLowerCase();
  if (c === 'done') return 'success';
  if (c === 'in_progress' || c === 'in progress') return 'inprogress';
  return 'default';
};

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

const ROW_HEIGHT = 35;
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
  // Widget body shows top-10 worst offenders only. "View all in table"
  // CTA hands off the full filtered set to UWV. Rest of the data lives
  // there — keeps the dashboard cell light and the data drill-down
  // explicit. Fullscreen modal keeps pageSize=50.
  const [pageSize] = useState(10);
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
          borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
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
                  padding: '0 10px',
                  ...(active ? SMALL_STRONG : SMALL),
                  borderRadius: 'var(--ds-border-radius, 3px)',
                  border: '1px solid transparent',
                  background: active ? 'var(--ds-background-neutral, #F1F2F4)' : 'transparent',
                  color: active ? 'var(--ds-text, #292A2E)' : 'var(--ds-text-subtle, #505258)',
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
                  ...(active ? SMALL_STRONG : SMALL),
                  borderRadius: 'var(--ds-border-radius, 3px)',
                  border: '1px solid transparent',
                  background: active ? 'var(--ds-background-neutral, #F1F2F4)' : 'transparent',
                  color: active ? 'var(--ds-text, #292A2E)' : 'var(--ds-text-subtle, #505258)',
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

      {/* Banner removed 2026-06-09 — Vikram directive. Lifecycle-accumulating
          messaging now lives in fullscreen modal only (executive view). */}

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
              ...BODY,
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
                    padding: '4px',
                    borderBottom: '0.5px solid rgba(11,18,14,0.14)',
                    borderRight: `1px solid ${token('color.border', '#DFE1E6')}`,
                    ...SMALL_STRONG,
                    fontWeight: 500,
                    textTransform: 'none',
                    letterSpacing: '0.04em',
                    color: token('color.text', '#292A2E'),
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
                      padding: '4px',
                      borderBottom: '0.5px solid rgba(11,18,14,0.14)',
                      borderRight: `1px solid ${token('color.border', '#DFE1E6')}`,
                    }}
                  >
                    <AkLozenge appearance={lozengeAppearance(s.category, s.name)} isBold>
                      {s.name}
                    </AkLozenge>
                  </th>
                ))}
                <th
                  style={{
                    minWidth: 96,
                    padding: '4px',
                    textAlign: 'right',
                    borderBottom: '0.5px solid rgba(11,18,14,0.14)',
                    ...STRONG,
                    fontWeight: 500,
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
                    boxShadow: '1px 0 0 0 ' + token('color.border', '#DFE1E6'),
                      padding: '4px',
                      borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
                      borderRight: `1px solid ${token('color.border', '#DFE1E6')}`,
                      width: FROZEN_LEFT_WIDTH, minWidth: FROZEN_LEFT_WIDTH,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <PriorityIcon level={r.priority} size={16} />
                      {/* 2026-06-09 Vikram parity — match Epic Progress
                          summary cell: key + title both 14/400 blue link
                          (BODY), Atlas Sans. Was 14/600 STRONG mono +
                          14/600 STRONG black. Drift between widgets
                          banned. */}
                      <span
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 8,
                          color: token('color.link', '#0C66E4'),
                          fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
                          ...BODY, whiteSpace: 'nowrap',
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
                          ...BODY,
                          color: token('color.link', '#0C66E4'),
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
                          padding: '4px',
                          borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
                          borderRight: `1px solid ${token('color.border', '#DFE1E6')}`,
                          background: categoryBg(s.category, ms),
                          fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
                          ...LABEL,
                          color: token('color.text', '#292A2E'),
                        }}
                      >
                        {ms > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
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
                                        ...LABEL,
                                        color: 'var(--ds-text-accent-red, #AE2A19)',
                                        padding: '0 4px',
                                        borderRadius: 'var(--ds-border-radius, 4px)',
                                        background: 'var(--ds-background-accent-red-subtler, #FFD5D2)',
                                      }}
                                      aria-label={`${visits} visits`}
                                    >
                                      ×{visits}
                                    </span>
                                  )}
                                </span>
                              )}
                            </Tooltip>
                            {/* Phase 4 row 5 — outlier #1 ETA strip.
                                Only render on in_progress category cells —
                                done/todo cells aren't forecasting candidates. */}
                            {s.category === 'in_progress' && (
                              <TimeInStatusEtaStrip
                                currentMs={ms}
                                p50Hours={getCohortP50Hours(issueType, s.name)}
                                confidence={MOCK_CONFIDENCE}
                              />
                            )}
                            {/* Phase 4 row 6 — outlier #5 pattern lozenge
                                (compact variant on cell). Returns null
                                when classifier yields 'none'. */}
                            {(() => {
                              const cls = classifyCellMocked({
                                issueType,
                                statusName: s.name,
                                durationMs: ms,
                                visits,
                              });
                              if (cls.pattern === 'none') return null;
                              return (
                                <div style={{ marginTop: 2 }}>
                                  <DwellPatternLozenge
                                    pattern={cls.pattern}
                                    confidence={cls.confidence}
                                    description={cls.description}
                                    compact
                                  />
                                </div>
                              );
                            })()}
                          </div>
                        ) : (
                          <span style={{ color: token('color.text.disabled', '#B3B9C4') }}>—</span>
                        )}
                      </td>
                    );
                  })}

                  {/* Total */}
                  <td
                    style={{
                      padding: '4px',
                      textAlign: 'right',
                      borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
                      fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
                      ...SMALL_STRONG,
                      color: token('color.text', '#292A2E'),
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

          {/* Footer — "View all N in table" handoff to UWV.
              2026-06-09 Vikram directive: widget shows top-10 only;
              rest of the data drilled via UWV (canonical full-table
              surface). Replaces in-widget pagination. */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 16px',
              borderTop: `1px solid ${token('color.border', '#DFE1E6')}`,
              background: token('elevation.surface', '#FFFFFF'),
              ...LABEL,
              color: token('color.text.subtle', '#505258'),
            }}
          >
            <span>
              Top {rows.length} of {total} {issueType} tickets · {WINDOW_LABELS[windowPreset]}
            </span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {isFetching && <Spinner size="small" />}
              {total > rows.length && (
                <button
                  type="button"
                  onClick={() =>
                    openUWV({
                      project: projectKey,
                      hubSource: ['projecthub'],
                      dataType: 'issue',
                      title: `${issueType} · ${WINDOW_LABELS[windowPreset]}`,
                      filters: {
                        issue_type: [issueType],
                        ...(dateFrom ? { jira_updated_at_gte: dateFrom } : {}),
                        ...(dateTo ? { jira_updated_at_lte: dateTo } : {}),
                        ...(settings.assigneeFilter?.length
                          ? { assignee_display_name: settings.assigneeFilter }
                          : {}),
                        ...(settings.priorityFilter?.length
                          ? { priority: settings.priorityFilter }
                          : {}),
                      },
                    } as any)
                  }
                  style={{
                    ...LABEL, height: 24, padding: '0 10px', cursor: 'pointer',
                    border: '1px solid var(--ds-border, #DFE1E6)',
                    borderRadius: 'var(--ds-border-radius, 3px)',
                    background: 'transparent',
                    color: 'var(--ds-link, #0C66E4)',
                    fontWeight: 600,
                  }}
                >
                  View all {total} in table →
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </WidgetWrapper>
  );
}
