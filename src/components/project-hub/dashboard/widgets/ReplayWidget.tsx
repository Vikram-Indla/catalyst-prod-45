import type { WidgetProps } from '../widget-types';
import WidgetWrapper from '../WidgetWrapper';
import { ReplayDashboardWidget } from '@/components/replay/theatre/ReplayDashboardWidget';

export default function ReplayWidget({ projectKey, collapsed, onToggleCollapse, mode }: WidgetProps) {
  const dashboardMode = mode === 'product' ? 'product' : 'project';

  return (
    <WidgetWrapper
      title="Replay"
      subtitle="Lifecycle theatre for this work item tree"
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
    >
      {!collapsed && (
        <div style={{ padding: '0 0 4px' }}>
          <ReplayDashboardWidget
            mode={dashboardMode}
            projectKey={projectKey}
            productKey={projectKey}
          />
        </div>
      )}
    </WidgetWrapper>
  );
}
