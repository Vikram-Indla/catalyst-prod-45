/**
 * KeyMilestonesWidget — Skeleton
 */
import WidgetWrapper from '../WidgetWrapper';
import type { WidgetProps } from '../widget-registry';

export default function KeyMilestonesWidget({ projectId, projectKey, collapsed, onToggleCollapse }: WidgetProps) {
  return (
    <WidgetWrapper title="Key Milestones" subtitle="Configurable status gates" collapsed={collapsed} onToggleCollapse={onToggleCollapse}>
      <div style={{ fontSize: 12, color: 'var(--cp-t3)', textAlign: 'center', padding: 20 }}>
        Widget content coming in Stage B
      </div>
    </WidgetWrapper>
  );
}
