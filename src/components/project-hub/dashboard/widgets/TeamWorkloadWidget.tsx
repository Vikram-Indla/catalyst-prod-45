// @ts-nocheck
/**
 * TeamWorkloadWidget — per-assignee open work in active releases.
 *
 * Apr 26, 2026 — Enterprise redesign per per-widget design brief.
 *   Mental model: "Who is overloaded?" — answer must read at a glance.
 *
 * Changes vs the previous single-line cramped layout:
 *   - Headline KPI strip: assignees · total open · max-load (with name).
 *   - Each row is now TWO lines on a 56px tall row:
 *       Line 1: avatar (size="medium" 32px) + display name + total count.
 *       Line 2: thick stacked bar (stories blue / bugs red) +
 *               compact meta "31 stories · 2 bugs".
 *   - Bar palette routed through Atlaskit BOLDER tokens (was bespoke
 *     rgba(37,99,235,0.20) + var(--ds-text-brand, #0C66E4) hex). Stories blue-bolder, bugs
 *     red-bolder. Track neutral-subtle.
 *   - Tabular-num counts so column right edges line up across rows.
 *   - Sort by total desc — highest-load assignee at top.
 *   - Hover state, focus ring, full keyboard support preserved.
 *
 * Wiring strictly preserved:
 *   - openUWV row click-through with workflow-aware status filter via
 *     `openStatusNames` (catalyst_workflow_statuses where category != 'done').
 *   - openUWV header expand for "all open work".
 *   - WidgetGearButton in headerBadges.
 *   - settings filters (date / release / assignee / itemType / priority)
 *     forwarded to the workload hook + the click-through.
 *   - Loading skeleton + EmptyState fallback.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { WidgetProps } from '../widget-types';
import WidgetWrapper from '../WidgetWrapper';
import {
  useDashboardTeamWorkload,
  useTeamRoleMap,
  YEAR_2026_START,
} from '@/hooks/useDashboardWidgets';
import { useGadgetSettings } from '@/hooks/useGadgetSettings';
import { useQuery } from '@tanstack/react-query';
import { typedQuery } from '@/integrations/supabase/client';
import { token } from '@atlaskit/tokens';
import { EmptyState } from '@/components/ads';
import UserAvatar from '@/components/shared/UserAvatar';
import { useUWV } from '@/components/universal-work-view/UWVContext';
import WidgetGearButton from '../WidgetGearButton';
import TeamMemberHoverCard from './TeamMemberHoverCard';
import { LABEL, SMALL, SMALL_STRONG, BODY, STRONG, TITLE, H_NUM } from '../dashboardTypography';

// Atlaskit canonical bolder palette — same blues / reds / teals used by
// the StatusLozenge + WorkItemIcon families. Subtler variants washed out
// at thicker heights. Teal for subtasks matches Jira's canonical subtask
// icon colour, so the bar's three segments stay legible at a glance:
//   Stories blue · Subtasks teal · Bugs red.
const STORIES_FILL = 'var(--ds-background-accent-blue-bolder, #0C66E4)';
const SUBTASKS_FILL = 'var(--ds-background-accent-teal-bolder, #206A83)';
const BUGS_FILL = 'var(--ds-background-accent-red-bolder, #C9372C)';

// 2026-06-09 — capacity-target signal coloring. ≤80% brand blue, 80-100% amber,
// >100% danger. Norman affordance: color = signal, not decoration.
const CAPACITY_TARGET = 50;
const FILL_HEALTHY = 'var(--ds-background-brand-bold, #0C66E4)';
const FILL_HIGH = 'var(--ds-background-warning-bold, #946F00)';
const FILL_OVER = 'var(--ds-background-danger-bold, #C9372C)';

export default function TeamWorkloadWidget({ projectId, projectKey, collapsed, onToggleCollapse }: WidgetProps) {
  const { settings } = useGadgetSettings('workload', projectKey);
  const { data: workload, isLoading } = useDashboardTeamWorkload(projectId, {
    dateFrom: settings.dateFrom,
    dateTo: settings.dateTo,
    statusFilter: settings.statusFilter,
    releaseFilter: settings.releaseFilter,
    assigneeFilter: settings.assigneeFilter,
    itemTypeFilter: settings.itemTypeFilter,
    priorityFilter: settings.priorityFilter,
  });
  const { openUWV } = useUWV();
  // Detect native fullscreen of this widget's card. When fullscreen, drop the
  // 10-row cap so all teammates are visible in the maximised view.
  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    const onChange = () => {
      const el = document.fullscreenElement as HTMLElement | null;
      setIsFullscreen(!!el?.matches?.('[data-widget-id]'));
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // Workflow-aware status filter — preserved verbatim. Long staleTime —
  // workflow definitions change rarely.
  const { data: openStatusNames } = useQuery({
    queryKey: ['catalyst-workflow-open-statuses'],
    queryFn: async () => {
      try {
        const { data } = await typedQuery('catalyst_workflow_statuses' as any)
          .select('name, category')
          .neq('category', 'done');
        return ((data as any) ?? []).map((s: any) => s.name as string);
      } catch {
        return [] as string[];
      }
    },
    staleTime: 30 * 60_000,
  });

  // Sort by total desc — top of list = highest load.
  const sorted = [...(workload ?? [])].sort((a, b) => b.total - a.total);
  const maxCount = Math.max(1, ...sorted.map((w) => w.total));
  // 2026-06-09 Vikram — KPI strip now ToDo / In Progress / Done aggregates.
  // Resolve role + profile-id for each assignee from resource_inventory.role_name.
  const accountIds = sorted.map((w: any) => w.assignee_account_id ?? null);
  const { data: roleMap } = useTeamRoleMap(accountIds);
  const kpiTotals = sorted.reduce(
    (acc, w: any) => ({
      todo: acc.todo + (w.todo ?? 0),
      inprogress: acc.inprogress + (w.inprogress ?? 0),
      done: acc.done + (w.done ?? 0),
    }),
    { todo: 0, inprogress: 0, done: 0 },
  );
  const top = sorted[0];

  // Mirror the widget hook's 2026 fiscal guardrail so UWV totals reconcile
  // with the bar counts. Without this, UWV pulls every open item ever
  // (including pre-2026 carry-ins) while the widget shows 2026-active only,
  // and the user sees e.g. widget=33 but UWV=257.
  const fiscalDateFrom = settings.dateFrom ?? YEAR_2026_START;
  const fiscalDateTo = settings.dateTo ?? null;

  const handleExpand = () => openUWV({
    project: projectKey,
    hubSource: ['projecthub'],
    dataType: 'all',
    title: `Team Workload · ${projectKey}`,
    scope: settings.dateFrom ? 'custom' : 'all',
    statusFilter: openStatusNames ?? [],
    dateFrom: fiscalDateFrom,
    dateTo: fiscalDateTo,
    dateLabel: settings.dateFrom ? settings.dateLabel : '2026 fiscal',
    releaseFilter: settings.releaseFilter,
  });

  // 2026-06-09 Vikram — cap at 10 rows. If team > 10 teammates, footer link
  // routes to UWV grouped by assignee for the complete list.
  const ROW_CAP = 10;
  const overflow = Math.max(0, sorted.length - ROW_CAP);

  return (
    <WidgetWrapper
      title="Team Workload"
      subtitle="Open items · 2026 fiscal"
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      onExpand={handleExpand}
      headerBadges={<WidgetGearButton gadgetType="workload" projectKey={projectKey} projectId={projectId} />}
      footer={overflow > 0 && !isFullscreen ? (
        <button
          type="button"
          onClick={(e) => {
            const card = (e.currentTarget as HTMLElement).closest('[data-widget-id]') as HTMLElement | null;
            if (!card) return;
            if (document.fullscreenElement) {
              document.exitFullscreen().catch(() => {});
            } else {
              card.requestFullscreen().catch(() => {});
            }
          }}
          style={{
            background: 'transparent',
            border: 0,
            cursor: 'pointer',
            padding: 0,
            ...SMALL,
            color: token('color.link', '#0C66E4'),
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          View all {sorted.length} teammates · open fullscreen ⤢
        </button>
      ) : undefined}
    >
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                height: 56,
                borderRadius: token('border.radius', '4px'),
                background: token('color.background.neutral.subtle', '#F1F2F4'),
              }}
              className="animate-pulse"
            />
          ))}
        </div>
      ) : !sorted.length ? (
        <EmptyState
          size="compact"
          header="No open items"
          description="No assignees with open work items in active releases."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* ── KPI headline strip ─────────────────────────────────────── */}
          <KpiHeadline
            todo={kpiTotals.todo}
            inprogress={kpiTotals.inprogress}
            done={kpiTotals.done}
          />

          {/* ── Workload rows ─────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {(isFullscreen ? sorted : sorted.slice(0, ROW_CAP)).map((w) => {
              const accountId = (w as any).assignee_account_id ?? '';
              const role = roleMap?.get(accountId)?.role ?? null;
              const profileId = roleMap?.get(accountId)?.profile_id ?? null;
              return (
              <WorkloadRow
                key={w.assignee}
                assignee={w.assignee}
                role={role}
                profileId={profileId}
                projectId={projectId ?? null}
                total={w.total}
                inprogress={(w as any).inprogress ?? 0}
                stories={w.stories}
                subtasks={(w as any).subtasks ?? 0}
                bugs={w.bugs}
                maxCount={maxCount}
                onOpenIssue={(issueKey) =>
                  openUWV({
                    project: projectKey,
                    hubSource: ['projecthub'],
                    dataType: 'issue',
                    title: issueKey,
                    issueKey,
                  })
                }
                onClick={() =>
                  openUWV({
                    project: projectKey,
                    hubSource: ['projecthub'],
                    dataType: 'all',
                    title: `Open work · ${w.assignee}`,
                    scope: settings.dateFrom ? 'custom' : 'all',
                    assigneeFilter: [w.assignee],
                    statusFilter: openStatusNames ?? [],
                    // Apply the same 2026 fiscal guardrail used by the
                    // widget hook so the click-through count reconciles
                    // with the bar count for this assignee.
                    dateFrom: fiscalDateFrom,
                    dateTo: fiscalDateTo,
                    dateLabel: `${w.assignee} · 2026 open work`,
                    releaseFilter: settings.releaseFilter,
                    itemTypeFilter: [],
                    priorityFilter: [],
                  })
                }
              />
              );
            })}
          </div>
        </div>
      )}
    </WidgetWrapper>
  );
}

// ─── KPI headline ──────────────────────────────────────────────────────────
//
// Three cells in a sunken band: total assignees, total open work, and the
// top-loaded teammate (most overloaded). Mirrors the Items-by-Status
// headline pattern so the dashboard reads with consistent rhythm.

function KpiHeadline({
  todo, inprogress, done,
}: { todo: number; inprogress: number; done: number }) {
  return (
    <div
      style={{
        display: 'flex',
        background: token('elevation.surface.sunken', '#F7F8F9'),
        borderRadius: token('border.radius', '4px'),
        border: `1px solid ${token('color.border', '#DFE1E6')}`,
        overflow: 'hidden',
      }}
    >
      <KpiCell label="To do" value={todo} accent={token('color.background.neutral.bold', '#44546F')} />
      <KpiCell label="In progress" value={inprogress} accent={token('color.background.brand.bold', '#0C66E4')} />
      <KpiCell label="Done" value={done} accent={token('color.background.success.bold', '#1F845A')} last />
    </div>
  );
}

function KpiCell({
  label,
  value,
  accent,
  last,
}: {
  label: string;
  value: React.ReactNode;
  accent?: string;
  last?: boolean;
}) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        padding: '10px 12px',
        borderRight: last ? 'none' : `1px solid ${token('color.border', '#DFE1E6')}`,
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        {accent && <span aria-hidden style={{ width: 8, height: 8, borderRadius: 2, background: accent }} />}
        <span
          style={{
            ...LABEL,
            textTransform: 'none',
            letterSpacing: '0.04em',
          }}
        >
          {label}
        </span>
      </span>
      <span
        style={{
          ...H_NUM,
          lineHeight: 1.1,
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Workload row ──────────────────────────────────────────────────────────
//
// Two-line, 56px row. Avatar on the left in its own column; name + total
// on top right; thick stacked bar + meta below. Whole row is the click
// target. Atlaskit-canonical hover + focus rings.

function WorkloadRow({
  assignee, role, profileId, projectId,
  total, inprogress, stories, subtasks, bugs, maxCount,
  onClick, onOpenIssue,
}: {
  assignee: string;
  role: string | null;
  profileId: string | null;
  projectId: string | null;
  total: number; inprogress: number;
  stories: number; subtasks: number; bugs: number; maxCount: number;
  onClick: () => void;
  onOpenIssue: (issueKey: string) => void;
}) {
  const [hoverOpen, setHoverOpen] = useState(false);
  const [anchorPoint, setAnchorPoint] = useState<{ x: number; y: number } | null>(null);
  const openTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  // Capacity-driven alert color (Norman affordance — color = signal).
  const capacityPct = Math.min(150, Math.round((total / CAPACITY_TARGET) * 100));
  const fillPct = Math.min(100, capacityPct);
  const fillColor = capacityPct > 100 ? FILL_OVER : capacityPct >= 80 ? FILL_HIGH : FILL_HEALTHY;

  // Inside the fill, sub-segment widths (only when healthy, else solid alert).
  const showSegments = total > 0 && capacityPct <= 100;
  const storiesPct = total ? (stories / total) * 100 : 0;
  const subtasksPct = total ? (subtasks / total) * 100 : 0;
  const bugsPct = total ? (bugs / total) * 100 : 0;

  const cancelTimers = () => {
    if (openTimerRef.current) { window.clearTimeout(openTimerRef.current); openTimerRef.current = null; }
    if (closeTimerRef.current) { window.clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
  };
  const scheduleOpen = (x: number, y: number) => {
    cancelTimers();
    openTimerRef.current = window.setTimeout(() => {
      setAnchorPoint({ x, y });
      setHoverOpen(true);
    }, 200);
  };
  const scheduleClose = () => {
    cancelTimers();
    closeTimerRef.current = window.setTimeout(() => setHoverOpen(false), 150);
  };

  const statsCaption = useMemo(() => {
    const parts: string[] = [];
    if (stories > 0) parts.push(`${stories} ${stories === 1 ? 'story' : 'stories'}`);
    if (subtasks > 0) parts.push(`${subtasks} ${subtasks === 1 ? 'subtask' : 'subtasks'}`);
    if (bugs > 0) parts.push(`${bugs} ${bugs === 1 ? 'bug' : 'bugs'}`);
    if (!parts.length) parts.push('no items');
    return parts.join(' · ');
  }, [stories, subtasks, bugs]);

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            (e.currentTarget as HTMLDivElement).click();
          }
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = token('color.background.neutral.subtle.hovered', '#F1F2F4');
          scheduleOpen(e.clientX, e.clientY);
        }}
        onMouseMove={(e) => {
          if (!hoverOpen) return;
          setAnchorPoint({ x: e.clientX, y: e.clientY });
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          scheduleClose();
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 8px',
          marginInline: -8,
          borderRadius: token('border.radius', '4px'),
          cursor: 'pointer',
          transition: 'background 80ms ease',
        }}
      >
        <div style={{ flexShrink: 0 }}>
          <UserAvatar size="medium" name={assignee} />
        </div>

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {/* Top line — name · role | open count + in-progress sub-metric */}
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <span
              style={{
                ...STRONG,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                minWidth: 0,
                letterSpacing: '-0.005em',
              }}
            >
              {assignee}
              {role && (
                <span
                  style={{
                    ...BODY,
                    fontWeight: 400,
                    color: token('color.text.subtle', '#44546F'),
                    marginLeft: 8,
                  }}
                >
                  · {role}
                </span>
              )}
            </span>
            <span
              style={{
                ...TITLE,
                fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
                flexShrink: 0,
                display: 'inline-flex',
                alignItems: 'baseline',
                gap: 8,
              }}
            >
              <span>{total}</span>
              <span
                style={{
                  ...SMALL,
                  fontWeight: 500,
                  color: inprogress > 0
                    ? token('color.text.brand', '#0C66E4')
                    : token('color.text.subtle', '#44546F'),
                }}
              >
                {inprogress > 0 ? `${inprogress} in progress` : 'idle'}
              </span>
            </span>
          </div>

          {/* Stats caption — ABOVE the bar */}
          <div
            style={{
              ...SMALL,
              color: token('color.text.subtle', '#44546F'),
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {statsCaption}
          </div>

          {/* Capacity bar — neutral track, single signal-colored fill */}
          <div
            style={{
              height: 10,
              borderRadius: 5,
              background: token('color.background.neutral', '#F1F2F4'),
              overflow: 'hidden',
              position: 'relative',
            }}
            aria-label={`${capacityPct}% of capacity`}
          >
            <div
              style={{
                height: '100%',
                width: `${fillPct}%`,
                background: showSegments ? 'transparent' : fillColor,
                display: 'flex',
                transition: 'width 320ms cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              {showSegments && stories > 0 && (
                <div style={{ width: `${storiesPct}%`, background: STORIES_FILL }} />
              )}
              {showSegments && subtasks > 0 && (
                <div style={{ width: `${subtasksPct}%`, background: SUBTASKS_FILL }} />
              )}
              {showSegments && bugs > 0 && (
                <div style={{ width: `${bugsPct}%`, background: BUGS_FILL }} />
              )}
            </div>
          </div>
        </div>
      </div>

      <TeamMemberHoverCard
        open={hoverOpen}
        anchorPoint={anchorPoint}
        name={assignee}
        role={role}
        profileId={profileId}
        projectId={projectId}
        onItemClick={(k) => { setHoverOpen(false); onOpenIssue(k); }}
        onMouseEnter={cancelTimers}
        onMouseLeave={scheduleClose}
        requestClose={() => setHoverOpen(false)}
      />
    </>
  );
}

// MetaPill removed 2026-06-09 — stats now rendered as a single caption above the bar.
