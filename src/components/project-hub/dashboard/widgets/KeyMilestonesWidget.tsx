import type { WidgetProps } from '../widget-registry';
import WidgetWrapper from '../WidgetWrapper';
import { Settings } from 'lucide-react';

export default function KeyMilestonesWidget({ projectId, projectKey, collapsed, onToggleCollapse }: WidgetProps) {
  return (
    <WidgetWrapper title="Key Milestones" subtitle="Configurable status gates" collapsed={collapsed} onToggleCollapse={onToggleCollapse} span={2}>
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div style={{ fontSize: 28, color: 'var(--cp-text-muted)', marginBottom: 8 }}>◎</div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--cp-text-secondary)', marginBottom: 4 }}>
          No milestones configured
        </div>
        <div style={{ fontSize: 12, color: 'var(--cp-text-tertiary)', maxWidth: 260, marginBottom: 12 }}>
          Set up status gates to track key delivery checkpoints across your project lifecycle.
        </div>
        <button
          className="flex items-center gap-1.5 px-3 py-1.5"
          style={{
            fontSize: 12, fontWeight: 600, color: 'var(--cp-text-inverse)',
            background: 'var(--cp-primary-60)', border: 'none', cursor: 'pointer',
            borderRadius: 'var(--cp-radius-default)',
          }}
        >
          <Settings size={12} />
          Configure Gates
        </button>
      </div>
    </WidgetWrapper>
  );
}
