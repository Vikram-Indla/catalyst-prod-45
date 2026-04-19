// @ts-nocheck
/**
 * OverdueWidget — past-due items in active releases.
 *
 * Rewritten Apr 19, 2026 per docs/design/BAU-Dashboard-Atlaskit-Conversion.md §5 Commit 6.
 *   - Header count badge → <Lozenge appearance="success|removed">
 *   - Bespoke empty-state → <EmptyState>
 *   - Row list: var(--cp-*) → token()
 */
import type { WidgetProps } from '../widget-registry';
import WidgetWrapper from '../WidgetWrapper';
import { useDashboardOverdueItems } from '@/hooks/useDashboardWidgets';
import { token } from '@atlaskit/tokens';
import { EmptyState, Lozenge } from '@/components/ads';

export default function OverdueWidget({ projectId, projectKey, collapsed, onToggleCollapse }: WidgetProps) {
  const { data: items, isLoading } = useDashboardOverdueItems(projectId);
  const count = items?.length ?? 0;

  const badge = (
    <Lozenge appearance={count === 0 ? 'success' : 'removed'}>{count}</Lozenge>
  );

  return (
    <WidgetWrapper
      title="Overdue"
      subtitle="Past due date"
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
          header="All items on track"
          description="No overdue items across active releases."
        />
      ) : (
        <div className="space-y-0">
          {items!.slice(0, 8).map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2"
              style={{
                height: 36,
                padding: '0 4px',
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
              <span
                style={{
                  color: token('color.text.danger', '#AE2A19'),
                  fontFamily: 'var(--cp-font-mono)',
                  fontSize: 11,
                  flexShrink: 0,
                }}
              >
                {Math.ceil((Date.now() - new Date(item.due_date!).getTime()) / 86400000)}d
              </span>
            </div>
          ))}
        </div>
      )}
    </WidgetWrapper>
  );
}
