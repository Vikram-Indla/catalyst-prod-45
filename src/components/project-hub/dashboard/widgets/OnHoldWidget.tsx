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
import type { WidgetProps } from '../widget-registry';
import WidgetWrapper from '../WidgetWrapper';
import { useDashboardOnHoldItems } from '@/hooks/useDashboardWidgets';
import { useGadgetSettings } from '@/hooks/useGadgetSettings';
import { token } from '@atlaskit/tokens';
import { useUWV } from '@/components/universal-work-view/UWVContext';
import { EmptyState, Lozenge, StatusLozenge } from '@/components/ads';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import UserAvatar from '@/components/shared/UserAvatar';
import WidgetGearButton from '../WidgetGearButton';

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

export default function OnHoldWidget({ projectId, projectKey, collapsed, onToggleCollapse }: WidgetProps) {
  const { settings } = useGadgetSettings('onhold', projectKey);
  const { data: items, isLoading } = useDashboardOnHoldItems(projectId, {
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
      <StatusLozenge status="todo">{String(total)}</StatusLozenge>
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
        fontSize: 12,
        color: token('color.link', '#0C66E4'),
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
                background: token('color.background.neutral.subtle', '#F1F5F9'),
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* No slice cap — body has standardised height with internal
                scroll, so the entire list is visible without truncation. */}
            {enriched.map((item) => (
              <OnHoldRow
                key={item.id}
                item={item}
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
        background: token('elevation.surface.sunken', '#F7F8F9'),
        borderRadius: token('border.radius', '4px'),
        border: `1px solid ${token('color.border', '#DFE1E6')}`,
        overflow: 'hidden',
      }}
    >
      <KpiCell label="On hold" value={total} />
      <KpiCell
        label="Awaiting info"
        value={awaitingInfo}
        accent={awaitingInfo > 0 ? 'var(--ds-text-accent-orange-bolder, #974F0C)' : undefined}
      />
      <KpiCell
        label="Blocked"
        value={blocked}
        accent={blocked > 0 ? 'var(--ds-text-accent-red-bolder, #AE2A19)' : undefined}
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
          color: accent ?? token('color.text', '#292A2E'),
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ─── On-hold row ───────────────────────────────────────────────────────────

function OnHoldRow({
  item,
  onClick,
}: {
  item: any;
  onClick: () => void;
}) {
  const reason: Reason = item._reason ?? classifyReason(item.status);
  const appearance = reasonAppearance(reason);
  const reasonLabel = reason === 'Other' ? (item.status ?? 'On Hold') : reason;
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
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px',
        marginInline: -8,
        borderRadius: token('border.radius', '4px'),
        cursor: 'pointer',
        transition: 'background 80ms ease',
        minHeight: 36,
      }}
    >
      <span style={{ display: 'inline-flex', flexShrink: 0 }}>
        <JiraIssueTypeIcon type={(item as any).issue_type ?? 'Task'} size={16} />
      </span>
      <span
        style={{
          color: token('color.link', '#0C66E4'),
          fontWeight: 500,
          fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
          fontSize: 12,
          flexShrink: 0,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {item.issue_key}
      </span>
      <span
        style={{
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          color: token('color.text', '#292A2E'),
          fontSize: 13,
          fontWeight: 500,
        }}
      >
        {item.summary}
      </span>
      {item.assignee_display_name && (
        <span style={{ flexShrink: 0 }}>
          <UserAvatar
            size="small"
            name={item.assignee_display_name}
            src={(item as any).assignee_avatar_url}
          />
        </span>
      )}
      <span style={{ flexShrink: 0 }}>
        <Lozenge appearance={appearance}>{reasonLabel}</Lozenge>
      </span>
    </div>
  );
}
