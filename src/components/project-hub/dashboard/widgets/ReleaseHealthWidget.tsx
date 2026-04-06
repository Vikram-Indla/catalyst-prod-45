import type { WidgetProps } from '../widget-registry';
import WidgetWrapper from '../WidgetWrapper';
import { useDashboardReleaseHealth } from '@/hooks/useDashboardWidgets';
import { ExternalLink } from 'lucide-react';

export default function ReleaseHealthWidget({ projectId, projectKey, collapsed, onToggleCollapse }: WidgetProps) {
  const { data: releases, isLoading } = useDashboardReleaseHealth(projectId);
  const rel = releases?.[0];

  const footer = (
    <a href={`/release-hub?project=${projectKey}`} style={{ fontSize: 12, fontWeight: 500, color: 'var(--cp-primary-60)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
      View in ReleaseHub <ExternalLink size={11} />
    </a>
  );

  return (
    <WidgetWrapper title="Release Health" subtitle="Active release progress" collapsed={collapsed} onToggleCollapse={onToggleCollapse} span={1} footer={footer}>
      {isLoading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-4 rounded bg-[#F1F5F9] dark:bg-[#1A1A1A]" style={{ width: '60%' }} />
          <div className="h-2 rounded bg-[#F1F5F9] dark:bg-[#1A1A1A]" />
        </div>
      ) : !rel ? (
        <div className="flex flex-col items-center py-6 text-center">
          <div style={{ fontSize: 28, color: 'var(--cp-text-muted)', marginBottom: 8 }}>📦</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--cp-text-secondary)' }}>No active releases</div>
          <div style={{ fontSize: 12, color: 'var(--cp-text-tertiary)', maxWidth: 260, marginTop: 4 }}>Create a release to track delivery progress.</div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span style={{ fontSize: 13, fontWeight: 650, color: 'var(--cp-text-primary)', fontFamily: 'var(--cp-font-heading)' }}>{rel.name}</span>
            <span className="inline-flex items-center bg-[var(--status-info-bg, #DEEBFF)] dark:bg-[#1a3a5c] text-[#0747A6] dark:text-[#7bb0ff]" style={{
              height: 20, padding: '0 8px',
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em',
              borderRadius: 'var(--cp-radius-sm)',
            }}>IN PROGRESS</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--cp-text-tertiary)' }}>{rel.done} of {rel.total} items done</div>
          {/* Progress bar */}
          <div className="bg-[#F1F5F9] dark:bg-[#1A1A1A]" style={{ height: 6, borderRadius: 4, overflow: 'hidden' }}>
            <div className="bg-[#2563EB]" style={{ height: '100%', width: `${rel.completionPct}%`, borderRadius: 4, transition: 'width 300ms ease' }} />
          </div>
          <div className="flex items-center justify-between" style={{ fontSize: 11 }}>
            <span style={{ color: 'var(--cp-text-tertiary)' }}>{rel.completionPct}% complete</span>
            {rel.targetDate && (
              <span style={{ color: rel.atRisk ? 'var(--cp-warning-60)' : 'var(--cp-text-tertiary)' }}>
                {rel.atRisk ? '⚠ ' : ''}End: {new Date(rel.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
        </div>
      )}
    </WidgetWrapper>
  );
}
