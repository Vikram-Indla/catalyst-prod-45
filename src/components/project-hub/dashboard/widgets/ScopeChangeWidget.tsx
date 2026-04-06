import type { WidgetProps } from '../widget-registry';
import WidgetWrapper from '../WidgetWrapper';
import { useDashboardScopeChange } from '@/hooks/useDashboardWidgets';

export default function ScopeChangeWidget({ projectId, projectKey, collapsed, onToggleCollapse }: WidgetProps) {
  const { data: scopes, isLoading } = useDashboardScopeChange(projectId);

  return (
    <WidgetWrapper title="Scope Change" subtitle="Items added after release start" collapsed={collapsed} onToggleCollapse={onToggleCollapse} span={1}>
      {isLoading ? (
        <div className="animate-pulse"><div className="h-12 rounded bg-[#1A1A1A] dark:bg-[#1A1A1A]" /></div>
      ) : !scopes?.length ? (
        <div className="flex flex-col items-center py-6 text-center">
          <div style={{ fontSize: 28, color: 'var(--cp-text-muted)', marginBottom: 8 }}>📐</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--cp-text-secondary)' }}>No scope data</div>
          <div style={{ fontSize: 12, color: 'var(--cp-text-tertiary)', maxWidth: 260, marginTop: 4 }}>Scope tracking requires active releases with start dates.</div>
        </div>
      ) : (
        <div className="space-y-3">
          {scopes.map((s, i) => {
            const origPct = s.totalItems > 0 ? Math.round(((s.totalItems - s.addedAfterStart) / s.totalItems) * 100) : 100;
            const addedPct = s.totalItems > 0 ? Math.round((s.addedAfterStart / s.totalItems) * 100) : 0;
            return (
              <div key={i} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--cp-text-primary)' }}>{s.releaseName}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, fontFamily: 'var(--cp-font-mono)',
                    color: s.deltaPercent > 0 ? 'var(--cp-danger-60)' : 'var(--cp-text-muted)',
                  }}>
                    {s.deltaPercent > 0 ? `+${s.deltaPercent}%` : '0%'}
                  </span>
                </div>
                {/* Scope bar */}
                <div className="flex" style={{ height: 18, borderRadius: 'var(--cp-radius-sm)', overflow: 'hidden' }}>
                  <div className="bg-[#2563EB]/20 dark:bg-[#2563EB]/20" style={{ width: `${origPct}%` }} />
                  {addedPct > 0 && (
                    <div className="bg-[#DC2626]/15 dark:bg-[#DC2626]/15" style={{ width: `${addedPct}%`, borderLeft: '2px solid var(--cp-danger-60)' }} />
                  )}
                </div>
              </div>
            );
          })}
          {/* Legend */}
          <div className="flex items-center gap-4" style={{ fontSize: 11, color: 'var(--cp-text-tertiary)' }}>
            <span className="flex items-center gap-1.5">
              <span className="inline-block bg-[#2563EB]/20" style={{ width: 8, height: 8, borderRadius: 2 }} />
              Original scope
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block bg-[#DC2626]/15" style={{ width: 8, height: 8, borderRadius: 4, border: '1px solid var(--cp-danger-60)' }} />
              Added after start
            </span>
          </div>
          <div style={{ fontSize: 10, color: 'var(--cp-text-muted)', fontFamily: 'var(--cp-font-mono)' }}>
            created_at &gt; release.start_date
          </div>
        </div>
      )}
    </WidgetWrapper>
  );
}
