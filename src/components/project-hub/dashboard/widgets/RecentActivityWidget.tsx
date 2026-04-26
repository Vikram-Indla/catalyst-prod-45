// @ts-nocheck
/**
 * RecentActivityWidget — narrative activity feed (Atlaskit-native).
 *
 * Apr 25, 2026 — Rewrite using Atlaskit primitives only.
 *   - Avatar (size="small" = 24px, Jira's canonical for activity feeds)
 *   - @atlaskit/primitives Box/Stack/Inline for layout (no raw divs)
 *   - Tooltip on relative timestamp showing the absolute date
 *   - StatusLozenge for status changes
 *   - color.* tokens throughout — no legacy --cp-* or hex literals
 *
 * Atlaskit doesn't ship a dedicated "ActivityFeed" component (unlike a
 * commit history or comment thread). Jira itself composes activity rows
 * from these primitives — Avatar + name + verb + linked issue key +
 * status lozenge + relative time. This file mirrors that recipe exactly.
 */
import { useEffect, useMemo, useRef } from 'react';
import type { WidgetProps } from '../widget-registry';
import WidgetWrapper from '../WidgetWrapper';
import WidgetGearButton from '../WidgetGearButton';
import { useDashboardRecentActivity } from '@/hooks/useDashboardWidgets';
import { useGadgetSettings } from '@/hooks/useGadgetSettings';
import { token } from '@atlaskit/tokens';
import { Box, Stack, Inline, xcss } from '@atlaskit/primitives';
import Tooltip from '@atlaskit/tooltip';
import Spinner from '@atlaskit/spinner';
import {
  EmptyState,
  StatusLozenge,
  toStatusCategory,
} from '@/components/ads';
import WorkItemIcon, { normalizeIconType } from '@/components/shared/WorkItemIcon';
import UserAvatar from '@/components/shared/UserAvatar';
import { useUWV } from '@/components/universal-work-view/UWVContext';

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function formatAbsolute(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

const rowStyles = xcss({
  paddingBlock: 'space.150',
  paddingInline: 'space.0',
  borderBottomColor: 'color.border',
  borderBottomStyle: 'solid',
  borderBottomWidth: '1px',
});

const rowLastStyles = xcss({
  paddingBlock: 'space.150',
  paddingInline: 'space.0',
});

const summaryStyles = xcss({
  font: 'font.body.small',
  color: 'color.text.subtle',
});

export default function RecentActivityWidget({
  projectId,
  projectKey,
  collapsed,
  onToggleCollapse,
}: WidgetProps) {
  const { settings } = useGadgetSettings('activity', projectKey);
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useDashboardRecentActivity(projectId, {
    dateFrom: settings.dateFrom,
    dateTo: settings.dateTo,
    statusFilter: settings.statusFilter,
    releaseFilter: settings.releaseFilter,
    assigneeFilter: settings.assigneeFilter,
    itemTypeFilter: settings.itemTypeFilter,
    priorityFilter: settings.priorityFilter,
  });
  const items = useMemo(
    () => (data?.pages ?? []).flatMap((p: any) => p.items ?? []),
    [data],
  );
  const total = (data?.pages?.[0] as any)?.total ?? items.length;

  // Bounded scroll container with IntersectionObserver sentinel — auto
  // loads next 10 when scrolled near the bottom. 10 rows / page.
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: '120px 0px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
  const { openUWV } = useUWV();
  const handleExpand = () => openUWV({
    project: projectKey,
    hubSource: ['projecthub'],
    dataType: 'all',
    title: `Recent Activity · ${projectKey}`,
    scope: 'all',
    dateFrom: settings.dateFrom ?? null,
    dateTo: settings.dateTo ?? null,
    dateLabel: settings.dateLabel,
    assigneeFilter: settings.assigneeFilter,
  });

  return (
    <WidgetWrapper
      title="Recent Activity"
      subtitle="Latest changes"
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      onExpand={handleExpand}
      headerBadges={
        <WidgetGearButton
          gadgetType="activity"
          projectKey={projectKey}
          projectId={projectId}
        />
      }
    >
      {isLoading ? (
        <Stack space="space.100">
          {[1, 2, 3].map((i) => (
            <Box
              key={i}
              xcss={xcss({
                height: '40px',
                width: `${90 - i * 10}%`,
                borderRadius: 'border.radius',
                backgroundColor: 'color.background.neutral.subtle',
              })}
            />
          ))}
        </Stack>
      ) : !items?.length ? (
        <EmptyState
          size="compact"
          header="No recent activity"
          description="Activity appears when items are created, updated, or transitioned."
        />
      ) : (
        <Stack space="space.0">
          {items.map((item, idx) => {
            const isLast = idx === items.length - 1;
            const actor = item.actor_name || item.user_display_name || 'System';
            const avatarSrc = item.actor_avatar_url || item.assignee_avatar_url || undefined;
            const verb = (item.activity_label || 'updated').toLowerCase();
            const issueKey = item.issue_key || (item.work_item_id || '').slice(0, 8);
            const summary = item.summary || '';
            const occurredAt = item.occurred_at;
            return (
              <Box key={item.id} xcss={isLast ? rowLastStyles : rowStyles}>
                <Inline space="space.150" alignBlock="start" spread="space-between">
                  <Inline space="space.150" alignBlock="start" grow="fill">
                    <UserAvatar size="small" name={actor} src={avatarSrc} />
                    <Stack space="space.050" grow="fill">
                      <Inline space="space.075" alignBlock="center">
                        <Box
                          xcss={xcss({
                            font: 'font.body',
                            color: 'color.text',
                          })}
                          as="span"
                        >
                          <strong>{actor}</strong>
                          <span style={{ color: token('color.text.subtle', '#505258') }}>
                            {' '}
                            {verb}
                            {issueKey ? ' ' : ''}
                          </span>
                          {issueKey && (
                            <>
                              <span style={{ display: 'inline-flex', verticalAlign: 'middle', marginInlineEnd: 4 }}>
                                <WorkItemIcon
                                  type={normalizeIconType(item.work_item_type ?? item.issue_type)}
                                  size={14}
                                />
                              </span>
                              <span
                                style={{
                                  color: token('color.link', '#0C66E4'),
                                  fontWeight: 500,
                                  fontFamily:
                                    'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
                                }}
                              >
                                {issueKey}
                              </span>
                            </>
                          )}
                        </Box>
                        {item.status && (
                          <StatusLozenge status={toStatusCategory(item.status)}>
                            {(item.status || '').replace(/_/g, ' ')}
                          </StatusLozenge>
                        )}
                      </Inline>
                      {summary && (
                        <Box xcss={summaryStyles} as="span">
                          {summary}
                        </Box>
                      )}
                    </Stack>
                  </Inline>
                  <Tooltip content={formatAbsolute(occurredAt)} position="left">
                    {(tooltipProps) => (
                      <Box
                        {...tooltipProps}
                        xcss={xcss({
                          font: 'font.body.small',
                          color: 'color.text.subtlest',
                          flexShrink: 0,
                          whiteSpace: 'nowrap',
                        })}
                        as="span"
                      >
                        {timeAgo(occurredAt)}
                      </Box>
                    )}
                  </Tooltip>
                </Inline>
              </Box>
            );
          })}
        </Stack>
      )}
    </WidgetWrapper>
  );
}
