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
 *     rgba(37,99,235,0.20) + #2563EB hex). Stories blue-bolder, bugs
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
import type { WidgetProps } from '../widget-registry';
import WidgetWrapper from '../WidgetWrapper';
import { useDashboardTeamWorkload, YEAR_2026_START } from '@/hooks/useDashboardWidgets';
import { useGadgetSettings } from '@/hooks/useGadgetSettings';
import { useQuery } from '@tanstack/react-query';
import { typedQuery } from '@/integrations/supabase/client';
import { token } from '@atlaskit/tokens';
import { EmptyState } from '@/components/ads';
import UserAvatar from '@/components/shared/UserAvatar';
import { useUWV } from '@/components/universal-work-view/UWVContext';
import WidgetGearButton from '../WidgetGearButton';

// Atlaskit canonical bolder palette — same blues / reds / teals used by
// the StatusLozenge + WorkItemIcon families. Subtler variants washed out
// at thicker heights. Teal for subtasks matches Jira's canonical subtask
// icon colour, so the bar's three segments stay legible at a glance:
//   Stories blue · Subtasks teal · Bugs red.
const STORIES_FILL = 'var(--ds-background-accent-blue-bolder, #0C66E4)';
const SUBTASKS_FILL = 'var(--ds-background-accent-teal-bolder, #206A83)';
const BUGS_FILL = 'var(--ds-background-accent-red-bolder, #C9372C)';

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
  const totalOpen = sorted.reduce((s, w) => s + w.total, 0);
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

  return (
    <WidgetWrapper
      title="Team Workload"
      subtitle="Open items · 2026 fiscal"
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
                height: 56,
                borderRadius: token('border.radius', '4px'),
                background: token('color.background.neutral.subtle', '#F1F5F9'),
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
            assignees={sorted.length}
            totalOpen={totalOpen}
            topName={top?.assignee ?? '—'}
            topCount={top?.total ?? 0}
          />

          {/* ── Workload rows ─────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {sorted.map((w) => (
              <WorkloadRow
                key={w.assignee}
                assignee={w.assignee}
                total={w.total}
                stories={w.stories}
                subtasks={(w as any).subtasks ?? 0}
                bugs={w.bugs}
                maxCount={maxCount}
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
            ))}
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
  assignees,
  totalOpen,
  topName,
  topCount,
}: {
  assignees: number;
  totalOpen: number;
  topName: string;
  topCount: number;
}) {
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
      <KpiCell label="Assignees" value={assignees} />
      <KpiCell label="Open Work" value={totalOpen} />
      <KpiCell
        label="Most Loaded"
        value={
          <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8 }}>
            <span
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: token('color.text.subtle', '#44546F'),
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: 140,
              }}
            >
              {topName}
            </span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{topCount}</span>
          </span>
        }
        last
      />
    </div>
  );
}

function KpiCell({
  label,
  value,
  last,
}: {
  label: string;
  value: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        padding: '10px 12px',
        borderRight: last ? 'none' : `1px solid ${token('color.border', '#DFE1E6')}`,
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          color: token('color.text.subtlest', '#626F86'),
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 24,
          fontWeight: 600,
          lineHeight: 1.1,
          color: token('color.text', '#292A2E'),
          fontVariantNumeric: 'tabular-nums',
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
  assignee,
  total,
  stories,
  subtasks,
  bugs,
  maxCount,
  onClick,
}: {
  assignee: string;
  total: number;
  stories: number;
  subtasks: number;
  bugs: number;
  maxCount: number;
  onClick: () => void;
}) {
  // Width of the entire data band (relative to the most-loaded teammate).
  // We never let it drop below 6% so even a single-item assignee shows a
  // visible nub.
  const bandPct = Math.max(6, (total / maxCount) * 100);
  // Within the band, what fraction is stories vs subtasks vs bugs.
  const storiesPct = total > 0 ? (stories / total) * 100 : 0;
  const subtasksPct = total > 0 ? (subtasks / total) * 100 : 0;
  const bugsPct = total > 0 ? (bugs / total) * 100 : 0;

  return (
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
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 8px',
        marginInline: -8,
        borderRadius: token('border.radius', '4px'),
        cursor: 'pointer',
        transition: 'background 80ms ease',
      }}
    >
      {/* Avatar column — bigger so it anchors the row visually */}
      <div style={{ flexShrink: 0 }}>
        <UserAvatar size="medium" name={assignee} />
      </div>

      {/* Right-side data column — name+count on top, bar+meta below */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Top line: name + count */}
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
              fontSize: 14,
              fontWeight: 600,
              color: token('color.text', '#292A2E'),
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
              letterSpacing: '-0.005em',
            }}
          >
            {assignee}
          </span>
          <span
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: token('color.text', '#292A2E'),
              fontVariantNumeric: 'tabular-nums',
              flexShrink: 0,
            }}
          >
            {total}
          </span>
        </div>

        {/* Bottom line: stacked bar + meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Bar track — 14px tall rounded, fills proportional to maxCount.
              Inside, two segments side-by-side: stories blue, bugs red. */}
          <div
            style={{
              flex: 1,
              height: 14,
              borderRadius: 7,
              background: token('color.background.neutral', '#F1F2F4'),
              overflow: 'hidden',
              position: 'relative',
            }}
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
                <div
                  style={{
                    width: `${storiesPct}%`,
                    background: STORIES_FILL,
                  }}
                  aria-label={`${stories} stories`}
                />
              )}
              {subtasks > 0 && (
                <div
                  style={{
                    width: `${subtasksPct}%`,
                    background: SUBTASKS_FILL,
                  }}
                  aria-label={`${subtasks} subtasks`}
                />
              )}
              {bugs > 0 && (
                <div
                  style={{
                    width: `${bugsPct}%`,
                    background: BUGS_FILL,
                  }}
                  aria-label={`${bugs} bugs`}
                />
              )}
            </div>
          </div>
          {/* Meta — stories (blue), subtasks (teal), bugs (red). Order
              matches the bar segment order so the eye can map dot → segment
              left to right. */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              fontSize: 12,
              color: token('color.text.subtle', '#44546F'),
              fontVariantNumeric: 'tabular-nums',
              flexShrink: 0,
              minWidth: 220,
              justifyContent: 'flex-end',
            }}
          >
            <MetaPill colour={STORIES_FILL} label="stories" count={stories} />
            <MetaPill colour={SUBTASKS_FILL} label="subtasks" count={subtasks} />
            <MetaPill colour={BUGS_FILL} label="bugs" count={bugs} />
          </div>
        </div>
      </div>
    </div>
  );
}

function MetaPill({
  colour,
  label,
  count,
}: {
  colour: string;
  label: string;
  count: number;
}) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span
        aria-hidden
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: colour,
          display: 'inline-block',
          flexShrink: 0,
        }}
      />
      <span style={{ fontWeight: 600, color: token('color.text', '#292A2E') }}>
        {count}
      </span>
      <span>{label}</span>
    </span>
  );
}
