// @ts-nocheck
/**
 * TimeInStatusFullscreenModal — executive-view variant of the matrix.
 *
 * The widget's "Open in executive view" maximize icon wires to this modal
 * (NOT to UWV — UWV is a flat-list viewer and would strip the status
 * columns + durations, which is what was happening before this file
 * existed). The modal owns its own filter state seeded from the widget's
 * current selection so the user gets a continuous read.
 */
import { useMemo, useState } from 'react';
import { token } from '@atlaskit/tokens';
import Spinner from '@atlaskit/spinner';
import Tooltip from '@atlaskit/tooltip';
import Modal, {
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTransition,
} from '@atlaskit/modal-dialog';
import Button, { IconButton } from '@atlaskit/button/new';
import { X } from '@/lib/atlaskit-icons';
import {
  useTimeInStatusMatrix,
  type TimeInStatusMatrixRow,
} from '@/hooks/useDashboardWidgets';
import TimeInStatusHoverCard from './TimeInStatusHoverCard';
import {
  EmptyState,
  Lozenge,
  SectionMessage,
} from '@/components/ads';
// 2026-06-09 — ADS wrapper for shrink-wrap behaviour.
import { Lozenge as AkLozenge } from '@/components/ads';
import { StatusPill as JiraStatusPill } from '@/components/shared/JiraTable/cells';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import PriorityIcon from '@/components/shared/PriorityIcon';
import UserAvatar from '@/components/shared/UserAvatar';
import { LABEL, SMALL, SMALL_STRONG, BODY, STRONG } from '../dashboardTypography';

// Project module: Business Request + Task explicitly hidden.
const ISSUE_TYPES = ['Story', 'Epic', 'Sub-task', 'Defect'];

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

// 2026-06-10 — Jira-canonical cell tints (alpha-mixed pill colors).
// Matches TimeInStatusWidget.
function categoryBg(category: 'todo' | 'in_progress' | 'done' | undefined, ms: number): string {
  if (!ms || ms <= 0) return 'transparent';
  switch (category) {
    case 'in_progress':
      return 'var(--ds-background-information, rgba(143, 184, 246, 0.22))';
    case 'done':
      return 'var(--ds-background-success-bold, rgba(179, 223, 114, 0.30))';
    case 'todo':
    default:
      return 'var(--ds-background-neutral, rgba(221, 222, 225, 0.55))';
  }
}

function totalBg(ms: number, max: number): string {
  if (!ms || max <= 0) return 'transparent';
  const ratio = Math.min(1, ms / max);
  if (ratio < 0.5) return 'transparent';
  return 'var(--ds-background-neutral)';
}

const ROW_HEIGHT = 35;
const STATUS_COL_MIN = 160;
const FROZEN_LEFT_WIDTH = 520;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  projectKey: string;
  initialIssueType?: string;
  initialWindowPreset?: WindowPreset;
  assigneeFilter?: string[];
  priorityFilter?: string[];
}

export default function TimeInStatusFullscreenModal({
  isOpen,
  onClose,
  projectKey,
  initialIssueType = 'Story',
  initialWindowPreset = 'Q2',
  assigneeFilter,
  priorityFilter,
}: Props) {
  const [issueType, setIssueType] = useState<string>(initialIssueType);
  const [windowPreset, setWindowPreset] = useState<WindowPreset>(initialWindowPreset);
  // 2026-06-10 Fix 6 — load ALL tickets in modal (fullscreen IS the "all"
  // surface). Drop pagination. pageSize bumped to a safe ceiling above
  // any realistic project size; useTimeInStatusMatrix returns total + rows
  // unaffected if total < limit.
  const pageSize = 1000;
  const { dateFrom, dateTo } = resolveWindow(windowPreset);

  const { data, isLoading, isError, isFetching } = useTimeInStatusMatrix(projectKey, {
    issueType,
    dateFrom,
    dateTo,
    assigneeFilter,
    priorityFilter,
    limit: pageSize,
    offset: 0,
  });

  const rows = data?.rows ?? [];
  const statusColumns = data?.statusColumns ?? [];
  const total = data?.total ?? 0;
  const hasAnyHistory = data?.hasAnyHistory ?? false;

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
    <ModalTransition>
      {isOpen && (
        <Modal
          onClose={onClose}
          // 2026-06-10 Fix 2 — modal stretches to 90vw. AtlasKit's
          // x-large preset capped near 968px which left ~30% of viewport
          // unused and truncated long status names. Numeric width prop
          // accepts a px value.
          width={Math.round((typeof window !== 'undefined' ? window.innerWidth : 1600) * 0.9)}
          shouldScrollInViewport={false}
          autoFocus
        >
          <ModalHeader>
            <ModalTitle>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                Time in Status · {projectKey}
                <Lozenge appearance="default">{String(total)} {issueType}</Lozenge>
              </span>
            </ModalTitle>
            <IconButton
              label="Close"
              icon={(props: any) => <X size={16} aria-label={props?.label} />}
              appearance="subtle"
              onClick={onClose}
            />
          </ModalHeader>
          <ModalBody>
            {/* Filter bar — same controls as the widget but with executive sizing */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: token('space.200', '16px'),
                padding: '8px 0 16px 0',
                borderBottom: `1px solid ${token('color.border', 'var(--ds-border)')}`,
              }}
            >
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
                        gap: 4,
                        height: 28,
                        padding: '0 10px',
                        ...(active ? SMALL_STRONG : SMALL),
                        borderRadius: 'var(--ds-border-radius, 3px)',
                        border: '1px solid transparent',
                        background: active ? 'var(--ds-background-neutral)' : 'transparent',
                        color: active ? 'var(--ds-text)' : 'var(--ds-text-subtle)',
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
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                {(['14d', '30d', '90d', 'Q1', 'Q2', 'Q3', 'Q4', 'all'] as WindowPreset[]).map((w) => {
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
                        background: active ? 'var(--ds-background-neutral)' : 'transparent',
                        color: active ? 'var(--ds-text)' : 'var(--ds-text-subtle)',
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

            {/* 2026-06-10 Fix 5 — Lifecycle banner removed in modal too.
                Widget dropped this 2026-06-09 per Vikram directive;
                modal continues that contract. */}

            {/* Matrix body */}
            {isLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
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
              <div style={{ overflow: 'auto', maxHeight: 'calc(85vh - 220px)', marginTop: 12 }}>
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
                    <tr style={{ background: token('elevation.surface', 'var(--ds-surface)'), position: 'sticky', top: 0, zIndex: 2 }}>
                      <th
                        style={{
                          position: 'sticky', left: 0, zIndex: 3,
                          background: token('elevation.surface', 'var(--ds-surface)'),
                          width: FROZEN_LEFT_WIDTH, minWidth: FROZEN_LEFT_WIDTH,
                          textAlign: 'left',
                          padding: '4px',
                          borderBottom: '0.5px solid var(--ds-text, rgba(11,18,14,0.14))',
                          borderRight: `1px solid ${token('color.border', 'var(--ds-border)')}`,
                          ...STRONG,
                          fontWeight: 500,
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
                            borderBottom: '0.5px solid var(--ds-text, rgba(11,18,14,0.14))',
                            borderRight: `1px solid ${token('color.border', 'var(--ds-border)')}`,
                          }}
                        >
                          {/* 2026-06-10 — Jira-canonical StatusPill
                              (cornflower/lime/gray DOM-probed hexes). */}
                          <JiraStatusPill appearance={lozengeAppearance(s.category, s.name)}>
                            {s.name}
                          </JiraStatusPill>
                        </th>
                      ))}
                      <th
                        style={{
                          minWidth: 110,
                          padding: '4px',
                          textAlign: 'right',
                          borderBottom: '0.5px solid var(--ds-text, rgba(11,18,14,0.14))',
                          ...STRONG,
                          fontWeight: 500,
                          background: token('elevation.surface', 'var(--ds-surface)'),
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
                        style={{ height: ROW_HEIGHT }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = token('color.background.neutral.subtle', 'var(--ds-background-neutral-subtle, var(--ds-background-neutral-subtle))'))}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td
                          style={{
                            position: 'sticky', left: 0,
                            background: token('elevation.surface', 'var(--ds-surface)'),
                            boxShadow: '1px 0 0 0 ' + token('color.border', 'var(--ds-border)'),
                            padding: '4px',
                            borderBottom: `1px solid ${token('color.border', 'var(--ds-border)')}`,
                            borderRight: `1px solid ${token('color.border', 'var(--ds-border)')}`,
                            width: FROZEN_LEFT_WIDTH, minWidth: FROZEN_LEFT_WIDTH,
                          }}
                        >
                          {/* 2026-06-10 Fix 3 — mirror widget BODY
                              typography on the ticket cell. Was STRONG +
                              mono bold for the key; now matches widget's
                              14/400 blue link + 16px type icon. Avatar
                              size kept small but `marginLeft: 'auto'`
                              prevents bleed into sticky Total column. */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                            <PriorityIcon level={r.priority} size={16} />
                            <span
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 8,
                                color: token('color.link', 'var(--ds-link)'),
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
                                color: token('color.link', 'var(--ds-link)'),
                              }}
                            >
                              {r.title}
                            </span>
                            {r.assignee_display_name && (
                              <span style={{ flexShrink: 0, marginRight: 8 }}>
                                <UserAvatar size="small" name={r.assignee_display_name} src={r.assignee_avatar_url} />
                              </span>
                            )}
                          </div>
                        </td>
                        {statusColumns.map((s) => {
                          const ms = r.byStatus[s.name] ?? 0;
                          const visits = r.visitsByStatus?.[s.name] ?? 0;
                          return (
                            <td
                              key={s.name}
                              style={{
                                minWidth: STATUS_COL_MIN,
                                padding: '4px',
                                borderBottom: `1px solid ${token('color.border', 'var(--ds-border)')}`,
                                borderRight: `1px solid ${token('color.border', 'var(--ds-border)')}`,
                                background: categoryBg(s.category, ms),
                                fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
                                ...SMALL,
                              }}
                            >
                              {ms > 0 ? (
                                // 2026-06-10 — share the rich hover card
                                // with the widget. Cell canonical = duration
                                // only; ETA + pattern surface on hover.
                                <Tooltip
                                  content={() => (
                                    <TimeInStatusHoverCard
                                      issueKey={r.issue_key}
                                      issueType={r.issue_type ?? issueType}
                                      title={r.title}
                                      assigneeDisplayName={r.assignee_display_name}
                                      assigneeAvatarUrl={r.assignee_avatar_url}
                                      priority={r.priority}
                                      statusName={s.name}
                                      statusCategory={s.category}
                                      currentMs={ms}
                                      visits={visits}
                                      p50Hours={null}
                                      confidence={0}
                                      pattern="none"
                                      patternConfidence={0}
                                    />
                                  )}
                                  position="top"
                                >
                                  {(tp) => (
                                    <span {...tp} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'help' }}>
                                      {fmtDuration(ms)}
                                      {visits > 1 && (
                                        <span
                                          style={{
                                            ...LABEL,
                                            color: 'var(--ds-text-accent-red)',
                                            padding: '0 4px',
                                            borderRadius: 'var(--ds-border-radius, 4px)',
                                            background: 'var(--ds-background-accent-red-subtler)',
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
                        <td
                          style={{
                            padding: '4px',
                            textAlign: 'right',
                            borderBottom: `1px solid ${token('color.border', 'var(--ds-border)')}`,
                            fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
                            ...STRONG,
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
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            {/* 2026-06-10 Fix 6 — drop Prev/Next pagination. Fullscreen
                IS the "all data" surface; load all rows in one fetch.
                Footer = ticket count + close. */}
            <span
              style={{
                ...SMALL,
                color: token('color.text.subtle', '#505258'),
                marginRight: 'auto',
              }}
            >
              {total} {issueType} tickets · {WINDOW_LABELS[windowPreset]}
              {isFetching && (
                <span style={{ marginLeft: 8, display: 'inline-flex', verticalAlign: 'middle' }}>
                  <Spinner size="small" />
                </span>
              )}
            </span>
            <Button appearance="primary" onClick={onClose}>
              Close
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </ModalTransition>
  );
}
