// @ts-nocheck
/**
 * TimeInStatusWidget — placeholder (activates when lifecycle timestamps exist).
 */
import type { WidgetProps } from '../widget-registry';
import WidgetWrapper from '../WidgetWrapper';
import { EmptyState } from '@/components/ads';
import WidgetGearButton from '../WidgetGearButton';

export default function TimeInStatusWidget({ projectId, projectKey, collapsed, onToggleCollapse }: WidgetProps) {
  return (
    <WidgetWrapper
      title="Time in Status"
      subtitle="Per-ticket lifecycle"
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      span={2}
      headerBadges={<WidgetGearButton gadgetType="workload" projectKey={projectKey} projectId={projectId} />}
    >
      <EmptyState
        size="compact"
        header="No lifecycle data available"
        description="Status transition timestamps are required. This widget will activate once in_progress_at and resolved_at fields are available."
      />
    </WidgetWrapper>
  );
}
