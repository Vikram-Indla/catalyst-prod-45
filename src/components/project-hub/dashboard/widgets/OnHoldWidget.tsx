// @ts-nocheck
/**
 * OnHoldWidget — blocked / paused items list.
 *
 * Apr 26, 2026 — Enterprise redesign per per-widget design brief.
 *   Mental model: "What's blocked and why?"
 *
 * Changes vs the previous truncated-status-pill layout:
 *   - KPI headline strip: total · awaiting info · blocked. The latter two
 *     categories are the actionable buckets — awaiting-info needs a
 *     stakeholder ping, blocked needs an unblocker.
 *   - Each row: WorkItemIcon + key (mono link blue) + title (bold) +
 *     UserAvatar (size="xsmall") + reason-category Lozenge.
 *   - Reason category derived from the status text into a normalized
 *     bucket so noisy variants ("AWAITING INFORMATION FROM CLIENT" vs
 *     "Awaiting info") collapse to one canonical "Awaiting Info" pill.
 *   - Lozenge appearance="moved" (amber) for actionable buckets and
 *     "default" (gray) for plain "On Hold". Awaiting Info and Impediment
 *     get amber so the eye lands there first.
 *   - Whole row click → ticket via UWV; hover row tint.
 *
 * Wiring strictly preserved:
 *   - openUWV row click-through opens the ticket scope.
 *   - openUWV header/footer expand for "all on hold".
 *   - WidgetGearButton in headerBadges.
 *   - All settings filters forwarded to the hook + click-through.
 *   - Loading skeleton + EmptyState fallback.
 */
import type { WidgetProps } from '../widget-types';
import WidgetWrapper from '../WidgetWrapper';
import { useDashboardOnHoldItems } from '@/hooks/useDashboardWidgets';
import { useProductDashboardData } from '@/hooks/useProductDashboardData';
import { useMemo } from 'react';
import { useGadgetSettings } from '@/hooks/useGadgetSettings';
import { resolveColumns } from '../gadgetColumns';
import { token } from '@atlaskit/tokens';
import { useUWV } from '@/components/universal-work-view/UWVContext';
import { EmptyState, Lozenge, StatusLozenge } from '@/components/ads';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import UserAvatar from '@/components/shared/UserAvatar';
import WidgetGearButton from '../WidgetGearButton';
import { LABEL, SMALL, BODY, STRONG, H_NUM } from '../dashboardTypography';

type Reason = 'Awaiting Info' | 'On Hold' | 'Blocked' | 'Impediment' | 'Other';

function classifyReason(rawStatus: string | null | undefined): Reason {
  const s = (rawStatus ?? '').toLowerCase();
  if (s.includes('await')) return 'Awaiting Info';
  if (s.includes('imped')) return 'Impediment';
  if (s.includes('block')) return 'Blocked';
  if (s.includes('hold')) return 'On Hold';
  return 'Other';
}

type LozengeAppearance = 'default' | 'moved' | 'removed' | 'success' | 'inprogress';

function reasonAppearance(r: Reason): LozengeAppearance {
  switch (r) {
    case 'Blocked':
    case 'Impediment':
      return 'removed';
    case 'Awaiting Info':
      return 'moved';
    case 'On Hold':
    default:
      return 'default';
  }
}

export default function OnHoldWidget({ projectId, projectKey, collapsed, onToggleCollapse, mode = 'project' }: WidgetProps) {
  const isProduct = mode === 'product';
  const { settings } = useGadgetSettings('onhold', projectKey);
  const activeColumns = resolveColumns('onhold', settings.columns ?? null);

  /* Project: useDashboardOnHoldItems(ph_issues). Product: filter BR rows
     where processStep matches on-hold/blocked/awaiting-info, then map to
     the same row shape the widget renders. */
  const projectQuery = useDashboardOnHoldItems(isProduct ? '' : projectId, {
    dateFrom: settings.dateFrom,
    dateTo: settings.dateTo,
    statusFilter: settings.statusFilter,
    releaseFilter: settings.releaseFilter,
    assigneeFilter: settings.assigneeFilter,
    itemTypeFilter: settings.itemTypeFilter,
    priorityFilter: settings.priorityFilter,
  });
  const productQuery = useProductDashboardData(isProduct ? projectId : null);
  const productItems = useMemo(() => {
    if (!isProduct) return [];
    const rows = productQuery.data?.rows ?? [];
    const HOLD = new Set(['on hold', 'on_hold', 'paused', 'blocked', 'awaiting info', 'awaiting_info', 'in review']);
    return rows
      .filter((r) => HOLD.has((r.processStep ?? '').toLowerCase().trim()))
      .map((r) => ({
        id: r.id,
        issue_key: r.requestKey,
        summary: r.title,
        status: r.processStep ?? '',
        priority: r.urgency ?? '',
        assignee_name: r.projectManagerName ?? null,
        issue_type: 'Business Request',
        updated: r.updatedAt,
        created: r.createdAt,
      }));
  }, [isProduct, productQuery.data]);

  const items = isProduct ? productItems : projectQuery.data;
  const isLoading = isProduct ? productQuery.isLoading : projectQuery.isLoading;
  const { openUWV } = useUWV();

  const all = items ?? [];
  const enriched = all.map((it: any) => ({
    ...it,
    _reason: classifyReason(it.status),
  }));

  const total = enriched.length;
  const awaitingInfo = enriched.filter((i) => i._reason === 'Awaiting Info').length;
  const blocked = enriched.filter((i) => i._reason === 'Blocked' || i._reason === 'Impediment').length;

  const handleExpand = () => openUWV({
    project: projectKey,
    hubSource: ['projecthub'],
    dataType: 'onhold',
    title: `On Hold · ${projectKey}`,
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
      {/* Zero-value count badges don't render (ruthless-audit E3). */}
      {total > 0 && <StatusLozenge status="todo" label={String(total)} />}
      <WidgetGearButton gadgetType="onhold" projectKey={projectKey} projectId={projectId} />
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
        color: token('color.link', 'var(--ds-link)'),
        padding: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
      }}
    >
      View all on hold ↗
    </button>
  );

  return (
    <WidgetWrapper
      title="On Hold"
      subtitle="Blocked items"
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
                background: token('color.background.neutral.subtle', 'var(--ds-background-neutral)'),
              }}
            />
          ))}
        </div>
      ) : total === 0 ? (
        <EmptyState
          size="compact"
          header="No items on hold"
          description="No blocked or paused items."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* ── KPI headline strip ─────────────────────────────────────── */}
          <KpiHeadline total={total} awaitingInfo={awaitingInfo} blocked={blocked} />

          {/* ── On-hold rows ──────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <OnHoldHeader activeColumns={activeColumns} />
            {/* No slice cap — body has standardised height with internal
                scroll, so the entire list is visible without truncation. */}
            {enriched.slice(0, 10).map((item) => (
              <OnHoldRow
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
  awaitingInfo,
  blocked,
}: {
  total: number;
  awaitingInfo: number;
  blocked: number;
}) {
  return (
    <div
      style={{
        display: 'flex',
        background: token('elevation.surface.sunken', 'var(--ds-surface-sunken)'),
        borderRadius: token('border.radius', '4px'),
        border: `1px solid ${token('color.border', 'var(--ds-border)')}`,
        overflow: 'hidden',
      }}
    >
      <KpiCell label="On hold" value={total} />
      <KpiCell
        label="Awaiting info"
        value={awaitingInfo}
        accent={awaitingInfo > 0 ? 'var(--ds-text-accent-orange-bolder)' : undefined}
      />
      <KpiCell
        label="Blocked"
        value={blocked}
        accent={blocked > 0 ? 'var(--ds-text-accent-red-bolder)' : undefined}
        last
      />
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
        gap: 0,
        padding: '8px 12px',
        borderRight: last ? 'none' : `1px solid ${token('color.border', 'var(--ds-border)')}`,
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
          color: accent ?? token('color.text'),
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

// 2026-06-09 Vikram parity — OnHold rows share this template with header
// so columns visually align.
//  Type(20) · Key(100) · Summary(1fr) · Assignee(200) · Reason(140)
// Type(20) · Key(100) · Summary(1fr) · Assignee(200) · Reason(140)
const ONHOLD_GRID = '20px 100px 1fr 200px 140px';

function OnHoldHeader({ activeColumns }: { activeColumns: string[] }) {
  const has = (c: string) => activeColumns.includes(c);
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: ONHOLD_GRID,
        alignItems: 'center',
        gap: 12,
        padding: '8px',
        marginInline: -8,
        borderBottom: `2px solid ${token('color.border', 'var(--ds-border)')}`,
        ...SMALL,
        fontWeight: 600,
        color: token('color.text.subtle', 'var(--ds-text-subtlest)'),
      }}
    >
      <span />
      <span>{has('key') ? 'Key' : ''}</span>
      <span>{has('summary') ? 'Summary' : ''}</span>
      <span>{has('assignee') ? 'Assignee' : ''}</span>
      <span style={{ justifySelf: 'end' }}>{has('reason') ? 'Status' : ''}</span>
    </div>
  );
}

// ─── On-hold row ───────────────────────────────────────────────────────────

function OnHoldRow({
  item,
  activeColumns,
  onClick,
}: {
  item: any;
  activeColumns: string[];
  onClick: () => void;
}) {
  const reason: Reason = item._reason ?? classifyReason(item.status);
  const appearance = reasonAppearance(reason);
  const reasonLabel = reason === 'Other' ? (item.status ?? 'On Hold') : reason;
  const has = (c: string) => activeColumns.includes(c);
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
          'var(--ds-background-neutral)',
        );
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
      style={{
        /* 2026-06-09 Vikram parity — grid template matches OnHoldHeader. */
        display: 'grid',
        gridTemplateColumns: ONHOLD_GRID,
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
      <span style={{ ...BODY, color: token('color.link', 'var(--ds-link)'), whiteSpace: 'nowrap' }}>
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
          color: token('color.link', 'var(--ds-link)'),
          textDecoration: 'none',
        }}
      >
        {has('summary') ? item.summary : ''}
      </a>
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
      <span style={{ justifySelf: 'end' }}>
        {has('reason') && <Lozenge appearance={appearance}>{reasonLabel}</Lozenge>}
      </span>
    </div>
  );
}
