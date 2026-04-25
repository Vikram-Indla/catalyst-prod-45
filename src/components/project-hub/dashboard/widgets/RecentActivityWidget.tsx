// @ts-nocheck
/**
 * RecentActivityWidget — latest changes stream.
 *
 * Rewritten Apr 19, 2026 per docs/design/BAU-Dashboard-Atlaskit-Conversion.md §5 Commit 6.
 *   - Bespoke empty-state → <EmptyState>
 *   - Per-row status pill → <StatusLozenge status={toStatusCategory(...)}>
 *   - var(--cp-*) → token()
 */
import type { WidgetProps } from '../widget-registry';
import WidgetWrapper from '../WidgetWrapper';
import { useDashboardRecentActivity } from '@/hooks/useDashboardWidgets';
import { useGadgetSettings } from '@/hooks/useGadgetSettings';
import { token } from '@atlaskit/tokens';
import { EmptyState, StatusLozenge, TruncateCell, toStatusCategory } from '@/components/ads';
import WidgetGearButton from '../WidgetGearButton';

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function RecentActivityWidget({ projectId, projectKey, collapsed, onToggleCollapse }: WidgetProps) {
  const { data: items, isLoading } = useDashboardRecentActivity(projectId);

  return (
    <WidgetWrapper
      title="Recent Activity"
      subtitle="Latest changes"
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      span={1}
      headerBadges={<WidgetGearButton gadgetType="activity" projectKey={projectKey} projectId={projectId} />}
    >
      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-4 rounded"
              style={{
                width: `${90 - i * 10}%`,
                background: token('color.background.neutral.subtle', '#F1F5F9'),
              }}
            />
          ))}
        </div>
      ) : !items?.length ? (
        <EmptyState
          size="compact"
          header="No recent activity"
          description="Activity appears when items are created, updated, or transitioned."
        />
      ) : (
        <div className="space-y-0">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-2 py-2"
              style={{ borderBottom: `0.75px solid ${token('color.border', '#E2E8F0')}` }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: token('color.text', '#172B4D'),
                    }}
                  >
                    {item.activity_label}
                  </span>
                  {item.issue_key && (
                    <span
                      style={{
                        color: token('color.link', '#0052CC'),
                        fontWeight: 500,
                        fontFamily: 'var(--cp-font-mono)',
                        fontSize: 11,
                      }}
                    >
                      {item.issue_key}
                    </span>
                  )}
                  {item.status && (
                    <StatusLozenge status={toStatusCategory(item.status)}>
                      {(item.status || '—').toUpperCase()}
                    </StatusLozenge>
                  )}
                </div>
                <div style={{ marginTop: 2 }}>
                  <TruncateCell
                    text={
                      item.summary ??
                      `${item.work_item_type} · ${(item.work_item_id || '').slice(0, 8)}`
                    }
                    style={{
                      fontSize: 12,
                      color: token('color.text.subtle', '#42526E'),
                    }}
                  />
                </div>
              </div>
              <span
                style={{
                  fontSize: 10,
                  color: token('color.text.subtlest', '#6B778C'),
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {timeAgo(item.occurred_at)}
              </span>
            </div>
          ))}
        </div>
      )}
    </WidgetWrapper>
  );
}
