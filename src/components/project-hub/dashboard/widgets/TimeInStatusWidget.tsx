import WidgetWrapper from '../WidgetWrapper';
import type { WidgetProps } from '../widget-registry';

export default function TimeInStatusWidget({ projectId, projectKey, collapsed, onToggleCollapse }: WidgetProps) {
  return (
    <WidgetWrapper title="Time in Status" subtitle="Per-ticket lifecycle" collapsed={collapsed} onToggleCollapse={onToggleCollapse}>
      <div style={{ fontSize: 12, color: 'var(--cp-t3)', textAlign: 'center', padding: 20 }}>
        Widget content coming in Stage B
      </div>
    </WidgetWrapper>
  );
}
