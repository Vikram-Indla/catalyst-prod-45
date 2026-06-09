// @ts-nocheck
/**
 * TeamWorkloadWidget — per-assignee workload.
 *
 * 2026-06-09 v3 — Vikram feedback:
 *   - KPI strip → ToDo / In Progress / Done totals across all assignees
 *     (was: Assignees · Open Work · Most Loaded — three metrics that didn't
 *     actually answer "what's the team's state?").
 *   - Row right-side number = open count + "in progress" sub-metric. Removed
 *     arbitrary "% cap" — capacity ceiling was guessed (50 items) and
 *     therefore meaningless.
 *   - Bar fill width = open / max-open-across-team (relative). Stacked
 *     sub-segments still show story/subtask/bug split inside the fill.
 *   - Role pulled from resource_inventory.role_name (admin module HR source),
 *     NOT profiles.role (RBAC system role).
 *   - Hover card now anchors to mouse pointer (clientX/Y) with viewport
 *     clamping — was anchored to row right-edge which pushed it off-screen.
 */
import { useMemo, useRef, useState } from 'react';
import type { WidgetProps } from '../widget-registry';
import WidgetWrapper from '../WidgetWrapper';
import PaginationFooter from '../PaginationFooter';
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
import { LABEL, SMALL, BODY, STRONG, TITLE, H_NUM } from '../dashboardTypography';

const STORIES_FILL = 'var(--ds-background-accent-blue-bolder, #0C66E4)';
const SUBTASKS_FILL = 'var(--ds-background-accent-teal-bolder, #206A83)';
const BUGS_FILL = 'var(--ds-background-accent-red-bolder, #C9372C)';

export default function TeamWorkloadWidget({ projectId, projectKey, collapsed, onToggleCollapse }: WidgetProps) {
  const { settings } = useGadgetSettings('workload', projectKey);
  const [page, setPage] = useState(0);
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

  const sorted = useMemo(
    () => [...(workload ?? [])].sort((a, b) => (b as any).open - (a as any).open),
    [workload],
  );
  const totals = useMemo(() => {
    let todo = 0, inprogress = 0, done = 0;
    for (const w of sorted) {
      todo += (w as any).todo ?? 0;
      inprogress += (w as any).inprogress ?? 0;
      done += (w as any).done ?? 0;
    }
    return { todo, inprogress, done };
  }, [sorted]);
  const maxOpen = Math.max(1, ...sorted.map((w) => (w as any).open ?? 0));

  const accountIds = sorted.map((w) => (w as any).assignee_account_id ?? null);
  const { data: roleMap } = useTeamRoleMap(accountIds);

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

  return (
    <WidgetWrapper
      title="Team Workload"
      subtitle="2026 fiscal"
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      onExpand={handleExpand}
      headerBadges={<WidgetGearButton gadgetType="workload" projectKey={projectKey} projectId={projectId} />}
    >
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                height: 64,
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
          header="No work items"
          description="No assignees with work items in this project."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <KpiHeadline {...totals} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {sorted.slice(page * 10, page * 10 + 10).map((w) => {
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
                  open={(w as any).open ?? 0}
                  inprogress={(w as any).inprogress ?? 0}
                  todo={(w as any).todo ?? 0}
                  done={(w as any).done ?? 0}
                  stories={w.stories}
                  subtasks={(w as any).subtasks ?? 0}
                  bugs={w.bugs}
                  maxOpen={maxOpen}
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
          <PaginationFooter
            page={page}
            pageSize={10}
            total={sorted.length}
            onPageChange={setPage}
          />
        </div>
      )}
    </WidgetWrapper>
  );
}

// ─── KPI headline ──────────────────────────────────────────────────────────

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
      <KpiCell
        label="To do"
        value={todo}
        accent={token('color.background.neutral.bold', '#44546F')}
      />
      <KpiCell
        label="In progress"
        value={inprogress}
        accent={token('color.background.brand.bold', '#0C66E4')}
      />
      <KpiCell
        label="Done"
        value={done}
        accent={token('color.background.success.bold', '#1F845A')}
        last
      />
    </div>
  );
}

function KpiCell({
  label, value, accent, last,
}: { label: string; value: React.ReactNode; accent?: string; last?: boolean }) {
  return (
    <div
      style={{
        flex: 1, display: 'flex', flexDirection: 'column', gap: 4,
        padding: '10px 12px',
        borderRight: last ? 'none' : `1px solid ${token('color.border', '#DFE1E6')}`,
        position: 'relative',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        {accent && (
          <span aria-hidden style={{ width: 8, height: 8, borderRadius: 2, background: accent }} />
        )}
        <span style={{ ...LABEL, textTransform: 'none', letterSpacing: '0.04em' }}>{label}</span>
      </span>
      <span style={{ ...H_NUM, lineHeight: 1.1 }}>{value}</span>
    </div>
  );
}

// ─── Workload row ──────────────────────────────────────────────────────────

function WorkloadRow({
  assignee, role, profileId, projectId,
  open, inprogress, todo, done,
  stories, subtasks, bugs, maxOpen,
  onClick, onOpenIssue,
}: {
  assignee: string;
  role: string | null;
  profileId: string | null;
  projectId: string | null;
  open: number; inprogress: number; todo: number; done: number;
  stories: number; subtasks: number; bugs: number;
  maxOpen: number;
  onClick: () => void;
  onOpenIssue: (issueKey: string) => void;
}) {
  const [hoverOpen, setHoverOpen] = useState(false);
  const [anchorPoint, setAnchorPoint] = useState<{ x: number; y: number } | null>(null);
  const openTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  const bandPct = Math.max(open > 0 ? 4 : 0, (open / maxOpen) * 100);
  const storiesPct = open > 0 ? (stories / open) * 100 : 0;
  const subtasksPct = open > 0 ? (subtasks / open) * 100 : 0;
  const bugsPct = open > 0 ? (bugs / open) * 100 : 0;

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
    if (todo > 0) parts.push(`${todo} to do`);
    if (inprogress > 0) parts.push(`${inprogress} in progress`);
    if (done > 0) parts.push(`${done} done`);
    if (!parts.length) parts.push('no items');
    return parts.join(' · ');
  }, [todo, inprogress, done]);

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
          // Update anchor while pointer drifts inside the row so card stays near cursor.
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
          {/* Top line: name · role  ——  open count + in-progress sub-metric */}
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
              <span>{open}</span>
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

          {/* Stats caption — ABOVE bar */}
          <div
            style={{
              ...SMALL,
              color: token('color.text.subtle', '#44546F'),
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {statsCaption}
          </div>

          {/* Bar — width relative to maxOpen across team; stacked type segments. */}
          <div
            style={{
              height: 10,
              borderRadius: 5,
              background: token('color.background.neutral', '#F1F2F4'),
              overflow: 'hidden',
              position: 'relative',
            }}
            aria-label={`${open} open items`}
          >
            <div
              style={{
                height: '100%',
                width: `${bandPct}%`,
                display: 'flex',
                transition: 'width 320ms cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              {stories > 0 && (
                <div style={{ width: `${storiesPct}%`, background: STORIES_FILL }} />
              )}
              {subtasks > 0 && (
                <div style={{ width: `${subtasksPct}%`, background: SUBTASKS_FILL }} />
              )}
              {bugs > 0 && (
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
      />
    </>
  );
}
