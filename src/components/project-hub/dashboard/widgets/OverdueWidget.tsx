// @ts-nocheck
/**
 * OverdueWidget — past-due items in active releases.
 *
 * Apr 26, 2026 — Enterprise redesign per per-widget design brief.
 *   Mental model: "What's slipping the most?"
 *
 * Changes vs the previous flat-list layout:
 *   - KPI headline strip: total · critical (>30d) · due this week.
 *     Critical cell turns red when non-zero so the eye lands there first.
 *   - Each row: WorkItemIcon + key (mono link blue) + title (bold) +
 *     UserAvatar (size="xsmall") + severity-graded days-overdue Lozenge.
 *   - Lozenge severity grading:
 *         < 7 days   → appearance="default" (gray)
 *         7–30 days  → appearance="moved" (amber)
 *         > 30 days  → appearance="removed" (red)
 *     Replaces the previous always-red `Nd` text — the new pattern shows
 *     at a glance how many tickets are *just* late vs *deeply* late.
 *   - Whole row is the click target (opens the ticket in UWV); hover row
 *     tint via Atlaskit subtle.hovered token.
 *   - Tabular-num for both the d-overdue lozenge and KPI cells so the
 *     vertical edges line up.
 *
 * Wiring strictly preserved:
 *   - openUWV row click-through opens the ticket scope.
 *   - openUWV header/footer expand for "all overdue".
 *   - WidgetGearButton in headerBadges.
 *   - All settings filters forwarded to the hook + click-through.
 *   - Loading skeleton + EmptyState fallback.
 */
import type { WidgetProps } from '../widget-types';
import WidgetWrapper from '../WidgetWrapper';
import { useDashboardOverdueItems } from '@/hooks/useDashboardWidgets';
import { useGadgetSettings } from '@/hooks/useGadgetSettings';
import { resolveColumns } from '../gadgetColumns';
import { token } from '@atlaskit/tokens';
import { useUWV } from '@/components/universal-work-view/UWVContext';
import { EmptyState, Lozenge } from '@/components/ads';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import UserAvatar from '@/components/shared/UserAvatar';
import WidgetGearButton from '../WidgetGearButton';
import { LABEL, SMALL, BODY, STRONG, H_NUM } from '../dashboardTypography';

const MS_PER_DAY = 86_400_000;

function daysOverdue(dueIso: string | null | undefined): number {
  if (!dueIso) return 0;
  const t = new Date(dueIso).getTime();
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.ceil((Date.now() - t) / MS_PER_DAY));
}

type LozengeAppearance = 'default' | 'moved' | 'removed';

function severityAppearance(days: number): LozengeAppearance {
  if (days > 30) return 'removed';
  if (days >= 7) return 'moved';
  return 'default';
}

export default function OverdueWidget({ projectId, projectKey, collapsed, onToggleCollapse }: WidgetProps) {
  const { settings } = useGadgetSettings('overdue', projectKey);
  const activeColumns = resolveColumns('overdue', settings.columns ?? null);
  const { data: items, isLoading } = useDashboardOverdueItems(projectId, {
    dateFrom: settings.dateFrom,
    dateTo: settings.dateTo,
    statusFilter: settings.statusFilter,
    releaseFilter: settings.releaseFilter,
    assigneeFilter: settings.assigneeFilter,
    itemTypeFilter: settings.itemTypeFilter,
    priorityFilter: settings.priorityFilter,
  });
  const { openUWV } = useUWV();

  const all = items ?? [];
  const enriched = all.map((it: any) => ({
    ...it,
    _days: daysOverdue(it.effective_due_date ?? it.due_date),
  }));
  // Sort by most overdue at the top — exec scan order.
  enriched.sort((a, b) => b._days - a._days);

  const total = enriched.length;
  const critical = enriched.filter((i) => i._days > 30).length;
  const thisWeek = enriched.filter((i) => i._days < 7).length;

  const handleExpand = () => openUWV({
    project: projectKey,
    hubSource: ['projecthub'],
    dataType: 'overdue',
    title: `Overdue Items · ${projectKey}`,
    scope: settings.dateFrom ? 'custom' : 'all',
    dateFrom: settings.dateFrom ?? null,
    dateTo: settings.dateTo ?? null,
    dateLabel: settings.dateLabel,
    statusFilter: settings.statusFilter,
    assigneeFilter: settings.assigneeFilter,
    itemTypeFilter: settings.itemTypeFilter,
    priorityFilter: settings.priorityFilter,
    releaseFilter: settings.releaseFilter,
    columnIds: activeColumns,
  });

  const handleRowClick = (item: any) => openUWV({
    project: projectKey,
    hubSource: ['projecthub'],
    dataType: 'issue',
    title: `${item.issue_key} · ${item.summary ?? ''}`,
    issueKey: item.issue_key,
  });

  const badge = (
    <>
      <Lozenge appearance={total === 0 ? 'success' : 'removed'}>{total}</Lozenge>
      <WidgetGearButton gadgetType="overdue" projectKey={projectKey} projectId={projectId} />
    </>
  );

  const footer = (
    <button
      type="button"
      onClick={handleExpand}
      style={{
        background: 'transparent',
        border: 0,
        cursor: 'pointer',
        ...SMALL,
        color: token('color.link', '#0C66E4'),
        padding: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
      }}
    >
      View all overdue ↗
    </button>
  );

  return (
    <WidgetWrapper
      title="Overdue"
      subtitle="Past due date"
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      headerBadges={badge}
      footer={footer}
      onExpand={handleExpand}
      empty={!isLoading && total === 0}
    >
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse"
              style={{
                height: 36,
                borderRadius: token('border.radius', '4px'),
                background: token('color.background.neutral.subtle', '#F1F2F4'),
              }}
            />
          ))}
        </div>
      ) : total === 0 ? (
        <EmptyState
          size="compact"
          header="All items on track"
          description="No overdue items across active releases."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* ── KPI headline strip ─────────────────────────────────────── */}
          <KpiHeadline total={total} critical={critical} thisWeek={thisWeek} />

          {/* ── Overdue rows ──────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <OverdueHeader activeColumns={activeColumns} />
            {/* No slice cap — body has standardised height with internal
                scroll, so the entire list is visible without truncation. */}
            {enriched.slice(0, 10).map((item) => (
              <OverdueRow
                key={item.id}
                item={item}
                activeColumns={activeColumns}
                onClick={() => handleRowClick(item)}
              />
            ))}
          </div>
        </div>
      )}
    </WidgetWrapper>
  );
}

// ─── KPI headline ──────────────────────────────────────────────────────────

function KpiHeadline({
  total,
  critical,
  thisWeek,
}: {
  total: number;
  critical: number;
  thisWeek: number;
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
      <KpiCell label="Overdue" value={total} />
      <KpiCell
        label="Critical >30d"
        value={critical}
        accent={
          critical > 0
            ? 'var(--ds-text-accent-red-bolder, #AE2A19)'
            : undefined
        }
      />
      <KpiCell label="This week" value={thisWeek} last />
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
  value: number;
  accent?: string;
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
          ...LABEL,
          textTransform: 'none',
          letterSpacing: '0.04em',
        }}
      >
        {label}
      </span>
      <span
        style={{
          ...H_NUM,
          lineHeight: 1.1,
          color: accent ?? token('color.text', '#292A2E'),
        }}
      >
        {value}
      </span>
    </div>
  );
}

// 2026-06-09 Vikram parity — status lozenge appearance per ADS category.
function statusAppearance(
  statusCategory?: string | null,
  status?: string | null,
): 'default' | 'success' | 'inprogress' | 'moved' {
  if (status && ['on hold', 'blocked', 'awaiting info'].includes(status.toLowerCase())) return 'moved';
  const cat = (statusCategory || '').toLowerCase();
  if (cat === 'done') return 'success';
  if (cat === 'in progress') return 'inprogress';
  return 'default';
}

// ─── Grid template + Header ───────────────────────────────────────────────

// 2026-06-09 Vikram parity — Overdue rows now share this template with
// OverdueHeader so columns visually align.
//  Type(20) · Key(100) · Summary(1fr) · Due(80) · Assignee(200) · Days(110)
// Type(20) · Key(100) · Summary(1fr) · Status(120) · Due(80) · Assignee(200) · Days(110)
const OVERDUE_GRID = '20px 100px 1fr 120px 80px 200px 110px';

function OverdueHeader({ activeColumns }: { activeColumns: string[] }) {
  const has = (c: string) => activeColumns.includes(c);
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: OVERDUE_GRID,
        alignItems: 'center',
        gap: 12,
        padding: '8px',
        marginInline: -8,
        borderBottom: `2px solid ${token('color.border', '#DFE1E6')}`,
        ...SMALL,
        fontWeight: 600,
        color: token('color.text.subtle', '#6B778C'),
      }}
    >
      <span />
      <span>{has('key') ? 'Key' : ''}</span>
      <span>{has('summary') ? 'Summary' : ''}</span>
      <span>{has('status') ? 'Status' : ''}</span>
      <span>{has('dueDate') ? 'Due' : ''}</span>
      <span>{has('assignee') ? 'Assignee' : ''}</span>
      <span style={{ justifySelf: 'end' }}>{has('days') ? 'Days' : ''}</span>
    </div>
  );
}

// ─── Overdue row ───────────────────────────────────────────────────────────

function OverdueRow({
  item,
  activeColumns,
  onClick,
}: {
  item: any;
  activeColumns: string[];
  onClick: () => void;
}) {
  const has = (c: string) => activeColumns.includes(c);
  const days = item._days ?? daysOverdue(item.effective_due_date ?? item.due_date);
  const appearance = severityAppearance(days);
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
        e.currentTarget.style.background = token(
          'color.background.neutral.subtle.hovered',
          '#F1F2F4',
        );
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
      style={{
        /* 2026-06-09 Vikram parity — grid layout matching Epic Progress
           so OverdueHeader columns align. Was flex with gap. */
        display: 'grid',
        gridTemplateColumns: OVERDUE_GRID,
        alignItems: 'center',
        gap: 12,
        padding: '8px',
        marginInline: -8,
        borderRadius: token('border.radius', '4px'),
        cursor: 'pointer',
        transition: 'background 80ms ease',
        minHeight: 36,
      }}
    >
      <span style={{ display: 'inline-flex', justifyContent: 'center' }}>
        {has('type') && <JiraIssueTypeIcon type={(item as any).issue_type ?? 'Task'} size={16} />}
      </span>
      <span style={{ ...BODY, color: token('color.link', '#0C66E4'), whiteSpace: 'nowrap' }}>
        {has('key') ? item.issue_key : ''}
      </span>
      <a
        href={`/project-hub/${item.project_key ?? ''}/allwork?issue=${item.issue_key ?? ''}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          ...BODY,
          color: token('color.link', '#0C66E4'),
          textDecoration: 'none',
        }}
      >
        {has('summary') ? item.summary : ''}
      </a>
      {has('status') && item.status && (
          <Lozenge appearance={statusAppearance(item.status_category, item.status)}>
            {item.status}
          </Lozenge>
        )}
      <span style={{ ...SMALL, color: token('color.text.subtle', '#42526E'), whiteSpace: 'nowrap' }}>
        {has('dueDate') && (item.effective_due_date ?? item.due_date)
          ? new Date(item.effective_due_date ?? item.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
          : ''}
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        {has('assignee') && item.assignee_display_name && (
          <>
            <UserAvatar
              size="small"
              name={item.assignee_display_name}
              src={(item as any).assignee_avatar_url}
            />
            <span style={{ ...BODY, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {item.assignee_display_name}
            </span>
          </>
        )}
      </span>
      <span style={{ fontVariantNumeric: 'tabular-nums', justifySelf: 'end' }}>
        {has('days') && (
          <Lozenge appearance={appearance}>
            {days}d overdue
          </Lozenge>
        )}
      </span>
    </div>
  );
}
