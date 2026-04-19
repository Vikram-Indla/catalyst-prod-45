// @ts-nocheck
/**
 * TimeInStatusWidget — placeholder (activates when lifecycle timestamps exist).
 *
 * Rewritten Apr 19, 2026 per docs/design/BAU-Dashboard-Atlaskit-Conversion.md §5 Commit 6.
 *   - Bespoke empty-state → <EmptyState>
 */
import type { WidgetProps } from '../widget-registry';
import WidgetWrapper from '../WidgetWrapper';
import { EmptyState } from '@/components/ads';

export default function TimeInStatusWidget({ projectId, projectKey, collapsed, onToggleCollapse }: WidgetProps) {
  return (
    <WidgetWrapper
      title="Time in Status"
      subtitle="Per-ticket lifecycle"
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      span={2}
    >
      <EmptyState
        size="compact"
        header="No lifecycle data available"
        description="Status transition timestamps are required. This widget will activate once in_progress_at and resolved_at fields are available."
      />
    </WidgetWrapper>
  );
}
