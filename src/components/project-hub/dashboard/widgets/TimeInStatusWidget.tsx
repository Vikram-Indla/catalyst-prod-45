import type { WidgetProps } from '../widget-registry';
import WidgetWrapper from '../WidgetWrapper';

export default function TimeInStatusWidget({ projectId, projectKey, collapsed, onToggleCollapse }: WidgetProps) {
  return (
    <WidgetWrapper title="Time in Status" subtitle="Per-ticket lifecycle" collapsed={collapsed} onToggleCollapse={onToggleCollapse} span={2}>
      <div className="flex flex-col items-center py-8 text-center">
        <div style={{ fontSize: 28, color: 'var(--cp-text-muted)', marginBottom: 8 }}>⏱</div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--cp-text-secondary)' }}>No lifecycle data available</div>
        <div style={{ fontSize: 12, color: 'var(--cp-text-tertiary)', maxWidth: 260, marginTop: 4 }}>
          Status transition timestamps are required. This widget will activate once in_progress_at and resolved_at fields are available.
        </div>
      </div>
    </WidgetWrapper>
  );
}
