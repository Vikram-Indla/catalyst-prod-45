import type { WidgetProps } from '../widget-registry';
import WidgetWrapper from '../WidgetWrapper';
import { useDashboardStatusCounts } from '@/hooks/useDashboardWidgets';

export default function ItemsByStatusWidget({ projectId, projectKey, collapsed, onToggleCollapse }: WidgetProps) {
  const { data: counts, isLoading } = useDashboardStatusCounts(projectId);
  const { todo = 0, inProgress = 0, done = 0, total = 0 } = counts ?? {};

  return (
    <WidgetWrapper title="Items by Status" subtitle="Status distribution" collapsed={collapsed} onToggleCollapse={onToggleCollapse} span={1}>
      {isLoading ? (
        <div className="animate-pulse"><div className="h-7 rounded" style={{ background: 'var(--cp-bg-sunken)' }} /></div>
      ) : total === 0 ? (
        <div className="flex flex-col items-center py-6 text-center">
          <div style={{ fontSize: 28, color: 'var(--cp-text-muted)', marginBottom: 8 }}>📊</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--cp-text-secondary)' }}>No items found</div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Stacked bar */}
          <div className="flex" style={{ height: 28, borderRadius: 'var(--cp-radius-sm)', overflow: 'hidden' }}>
            {todo > 0 && (
              <div className="flex items-center justify-center" style={{
                width: `${(todo / total) * 100}%`, minWidth: todo > 0 ? 28 : 0,
                background: 'var(--cp-lozenge-grey-bg)', color: 'var(--cp-lozenge-grey-text)',
                fontSize: 11, fontWeight: 700,
              }}>{todo}</div>
            )}
            {inProgress > 0 && (
              <div className="flex items-center justify-center" style={{
                width: `${(inProgress / total) * 100}%`, minWidth: inProgress > 0 ? 28 : 0,
                background: 'var(--cp-lozenge-blue-bg)', color: 'var(--cp-lozenge-blue-text)',
                fontSize: 11, fontWeight: 700,
              }}>{inProgress}</div>
            )}
            {done > 0 && (
              <div className="flex items-center justify-center" style={{
                width: `${(done / total) * 100}%`, minWidth: done > 0 ? 28 : 0,
                background: 'var(--cp-lozenge-green-bg)', color: 'var(--cp-lozenge-green-text)',
                fontSize: 11, fontWeight: 700,
              }}>{done}</div>
            )}
          </div>
          {/* Legend */}
          <div className="flex items-center gap-4" style={{ fontSize: 11, color: 'var(--cp-text-tertiary)' }}>
            <span className="flex items-center gap-1.5">
              <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--cp-lozenge-grey-bg)', display: 'inline-block' }} />
              To Do {todo}
            </span>
            <span className="flex items-center gap-1.5">
              <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--cp-lozenge-blue-bg)', display: 'inline-block' }} />
              In Progress {inProgress}
            </span>
            <span className="flex items-center gap-1.5">
              <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--cp-lozenge-green-bg)', display: 'inline-block' }} />
              Done {done}
            </span>
          </div>
        </div>
      )}
    </WidgetWrapper>
  );
}
