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
import { X } from 'lucide-react';
import {
  useTimeInStatusMatrix,
  type TimeInStatusMatrixRow,
} from '@/hooks/useDashboardWidgets';
import {
  EmptyState,
  Lozenge,
  SectionMessage,
  StatusLozenge,
} from '@/components/ads';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
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

function totalBg(ms: number, max: number): string {
  if (!ms || max <= 0) return 'transparent';
  const ratio = Math.min(1, ms / max);
  if (ratio < 0.5) return 'transparent';
  return 'var(--ds-background-neutral, #F1F2F4)';
}

const ROW_HEIGHT = 40;
const STATUS_COL_MIN = 140;
const FROZEN_LEFT_WIDTH = 460;

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
  const pageSize = 100; // Bigger page in executive view; whole matrix at once.
  const [offset, setOffset] = useState(0);
  const { dateFrom, dateTo } = resolveWindow(windowPreset);

  const { data, isLoading, isError, isFetching } = useTimeInStatusMatrix(projectKey, {
    issueType,
    dateFrom,
    dateTo,
    assigneeFilter,
    priorityFilter,
    limit: pageSize,
    offset,
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
          width="x-large"
          shouldScrollInViewport={false}
          // Bypass Atlaskit's max-width so the matrix can stretch to ~96vw
          // for very wide workflows (10+ status columns).
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
                borderBottom: `1px solid ${token('color.border', '#E2E8F0')}`,
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
                        gap: 6,
                        height: 32,
                        padding: '0 14px',
                        fontSize: 13,
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
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                {(['14d', '30d', '90d', 'Q1', 'Q2', 'Q3', 'Q4', 'all'] as WindowPreset[]).map((w) => {
                  const active = w === windowPreset;
                  return (
                    <button
                      key={w}
                      type="button"
                      onClick={() => { setWindowPreset(w); setOffset(0); }}
                      style={{
                        height: 28,
                        padding: '0 12px',
                        fontSize: 12,
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

            {!isLoading && rows.length > 0 && !hasAnyHistory && (
              <div style={{ padding: '12px 0 0' }}>
                <SectionMessage appearance="information" title="Lifecycle data accumulates forward">
                  Status transitions are tracked from now onwards. Cells currently
                  show full age in current status. Run the Jira changelog backfill
                  to populate historical transitions.
                </SectionMessage>
              </div>
            )}

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
                    fontSize: 13,
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
                          borderBottom: `1px solid ${token('color.border', '#E2E8F0')}`,
                          borderRight: `1px solid ${token('color.border', '#E2E8F0')}`,
                          fontWeight: 600,
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
                            padding: '10px 12px',
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
                          minWidth: 110,
                          padding: '10px 12px',
                          textAlign: 'right',
                          borderBottom: `1px solid ${token('color.border', '#E2E8F0')}`,
                          fontWeight: 600,
                          color: token('color.text', '#292A2E'),
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
                        style={{ height: ROW_HEIGHT }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = token('color.background.neutral.subtle', '#F4F5F7'))}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td
                          style={{
                            position: 'sticky', left: 0,
                            background: token('elevation.surface', '#FFFFFF'),
                            boxShadow: '1px 0 0 0 ' + token('color.border', '#E2E8F0'),
                            padding: '8px 12px',
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
                                fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap',
                                flexShrink: 0,
                              }}
                            >
                              <JiraIssueTypeIcon type={r.issue_type ?? 'Task'} size={14} />
                              {r.issue_key}
                            </span>
                            <span
                              style={{
                                flex: 1,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                color: token('color.text', '#292A2E'),
                              }}
                            >
                              {r.title}
                            </span>
                            {r.assignee_display_name && (
                              <UserAvatar size="small" name={r.assignee_display_name} src={r.assignee_avatar_url} />
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
                                padding: '8px 12px',
                                borderBottom: `1px solid ${token('color.border', '#E2E8F0')}`,
                                borderRight: `1px solid ${token('color.border', '#E2E8F0')}`,
                                background: categoryBg(s.category, ms),
                                fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
                                fontSize: 12,
                                color: token('color.text', '#292A2E'),
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
                                    <span {...tp} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
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
                        <td
                          style={{
                            padding: '8px 12px',
                            textAlign: 'right',
                            borderBottom: `1px solid ${token('color.border', '#E2E8F0')}`,
                            fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
                            fontSize: 13,
                            fontWeight: 600,
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
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <span
              style={{
                fontSize: 12,
                color: token('color.text.subtle', '#505258'),
                marginRight: 'auto',
              }}
            >
              Showing {rows.length} of {total} {issueType} tickets · {WINDOW_LABELS[windowPreset]}
              {isFetching && (
                <span style={{ marginLeft: 8, display: 'inline-flex', verticalAlign: 'middle' }}>
                  <Spinner size="small" />
                </span>
              )}
            </span>
            {offset > 0 && (
              <Button appearance="subtle" onClick={() => setOffset(Math.max(0, offset - pageSize))}>
                ← Prev
              </Button>
            )}
            {offset + rows.length < total && (
              <Button appearance="subtle" onClick={() => setOffset(offset + pageSize)}>
                Next →
              </Button>
            )}
            <Button appearance="primary" onClick={onClose}>
              Done
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </ModalTransition>
  );
}
