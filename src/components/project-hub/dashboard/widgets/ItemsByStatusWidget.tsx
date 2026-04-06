import type { WidgetProps } from '../widget-registry';
import WidgetWrapper from '../WidgetWrapper';
import { useDashboardStatusCounts } from '@/hooks/useDashboardWidgets';

export default function ItemsByStatusWidget({ projectId, projectKey, collapsed, onToggleCollapse }: WidgetProps) {
  const { data: counts, isLoading } = useDashboardStatusCounts(projectId);
  const { todo = 0, inProgress = 0, done = 0, total = 0 } = counts ?? {};

  return (
    <WidgetWrapper title="Items by Status" subtitle="Status distribution" collapsed={collapsed} onToggleCollapse={onToggleCollapse} span={1}>
      {isLoading ? (
        <div className="animate-pulse"><div className="h-7 rounded bg-[#1A1A1A] dark:bg-[#1A1A1A]" /></div>
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
              <div className="flex items-center justify-center bg-[#DFE1E6] dark:bg-[#292929] text-[#253858] dark:text-[#A1A1A1]" style={{
                width: `${(todo / total) * 100}%`, minWidth: todo > 0 ? 28 : 0,
                fontSize: 11, fontWeight: 700,
              }}>{todo}</div>
            )}
            {inProgress > 0 && (
              <div className="flex items-center justify-center bg-[rgba(59,130,246,0.10)] dark:bg-[#1a3a5c] text-[#0747A6] dark:text-[#7bb0ff]" style={{
                width: `${(inProgress / total) * 100}%`, minWidth: inProgress > 0 ? 28 : 0,
                fontSize: 11, fontWeight: 700,
              }}>{inProgress}</div>
            )}
            {done > 0 && (
              <div className="flex items-center justify-center bg-[rgba(74,222,128,0.10)] dark:bg-[#1a3a2a] text-[#006644] dark:text-[#57d9a3]" style={{
                width: `${(done / total) * 100}%`, minWidth: done > 0 ? 28 : 0,
                fontSize: 11, fontWeight: 700,
              }}>{done}</div>
            )}
          </div>
          {/* Legend */}
          <div className="flex items-center gap-4" style={{ fontSize: 11, color: 'var(--cp-text-tertiary)' }}>
            <span className="flex items-center gap-1.5">
              <span className="inline-block bg-[#DFE1E6] dark:bg-[#292929]" style={{ width: 8, height: 8, borderRadius: 2 }} />
              To Do {todo}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block bg-[rgba(59,130,246,0.10)] dark:bg-[#1a3a5c]" style={{ width: 8, height: 8, borderRadius: 2 }} />
              In Progress {inProgress}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block bg-[rgba(74,222,128,0.10)] dark:bg-[#1a3a2a]" style={{ width: 8, height: 8, borderRadius: 2 }} />
              Done {done}
            </span>
          </div>
        </div>
      )}
    </WidgetWrapper>
  );
}
