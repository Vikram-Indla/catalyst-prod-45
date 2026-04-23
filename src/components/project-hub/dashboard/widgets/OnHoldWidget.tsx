// @ts-nocheck
/**
 * OnHoldWidget — blocked / paused items list.
 *
 * Rewritten Apr 19, 2026 per docs/design/BAU-Dashboard-Atlaskit-Conversion.md §5 Commit 6.
 *   - Header count badge + per-row ON HOLD pill → <StatusLozenge status="todo">
 *   - Bespoke empty-state → <EmptyState>
 *   - var(--cp-*) → token()
 */
import type { WidgetProps } from '../widget-registry';
import WidgetWrapper from '../WidgetWrapper';
import { useDashboardOnHoldItems } from '@/hooks/useDashboardWidgets';
import { token } from '@atlaskit/tokens';
import { EmptyState, StatusLozenge } from '@/components/ads';

export default function OnHoldWidget({ projectId, projectKey, collapsed, onToggleCollapse }: WidgetProps) {
  const { data: items, isLoading } = useDashboardOnHoldItems(projectId);
  const count = items?.length ?? 0;

  const badge = <StatusLozenge status="todo">{String(count)}</StatusLozenge>;

  return (
    <WidgetWrapper
      title="On Hold"
      subtitle="Blocked items"
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      span={1}
      headerBadges={badge}
    >
      {isLoading ? (
        <div className="animate-pulse">
          <div
            className="h-12 rounded"
            style={{ background: token('color.background.neutral.subtle', '#F1F5F9') }}
          />
        </div>
      ) : count === 0 ? (
        <EmptyState
          size="compact"
          header="No items on hold"
          description="No blocked or paused items."
        />
      ) : (
        <div className="space-y-0">
          {items!.slice(0, 8).map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2"
              style={{
                height: 36,
                borderBottom: `0.75px solid ${token('color.border', '#E2E8F0')}`,
                fontSize: 12,
              }}
            >
              <span
                style={{
                  color: token('color.link', '#0052CC'),
                  fontWeight: 500,
                  fontFamily: 'var(--cp-font-mono)',
                  fontSize: 11,
                  flexShrink: 0,
                }}
              >
                {item.issue_key}
              </span>
              <span
                className="truncate flex-1"
                style={{ color: token('color.text.subtle', '#42526E') }}
              >
                {item.summary}
              </span>
              <StatusLozenge status="todo">ON HOLD</StatusLozenge>
            </div>
          ))}
        </div>
      )}
    </WidgetWrapper>
  );
}
