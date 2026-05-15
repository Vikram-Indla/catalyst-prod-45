// @ts-nocheck
import type { WidgetProps } from '../widget-registry';
import WidgetWrapper from '../WidgetWrapper';
import { Settings } from '@/lib/atlaskit-icons';
import { Button, EmptyState } from '@/components/ads';

export default function KeyMilestonesWidget({ projectId, projectKey, collapsed, onToggleCollapse }: WidgetProps) {
  return (
    <WidgetWrapper
      title="Key Milestones"
      subtitle="Configurable status gates"
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      span={2}
    >
      <EmptyState
        size="compact"
        header="No milestones configured"
        description="Set up status gates to track key delivery checkpoints across your project lifecycle."
        primaryAction={
          <Button appearance="primary" iconBefore={<Settings size={14} >{null}</Button>}>
            Configure Gates
          </Button>
        }
      />
    </WidgetWrapper>
  );
}
