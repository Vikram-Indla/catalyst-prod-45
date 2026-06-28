/**
 * IncidentAnalyticsPage — V12 Redesigned Analytics
 */

import { useTheme } from '@/hooks/useTheme';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useIncidentListView, useIncidentStats } from '@/hooks/useIncidentHub';
import { useMemo } from 'react';

export default function IncidentAnalyticsPage() {
  const { data: incidents, isLoading } = useIncidentListView();
  const stats = useIncidentStats();
  const { isDark } = useTheme();

  const analytics = useMemo(() => {
    if (!incidents) return { bySeverity: [], byStatus: [], byProject: [], byAssignee: [] };
    
    const bySeverity: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byProject: Record<string, number> = {};
    const byAssignee: Record<string, number> = {};
    
    incidents.forEach(i => {
      bySeverity[i.severity || 'Unknown'] = (bySeverity[i.severity || 'Unknown'] || 0) + 1;
      byStatus[i.status || 'Unknown'] = (byStatus[i.status || 'Unknown'] || 0) + 1;
      byAssignee[i.assignee_name || 'Unassigned'] = (byAssignee[i.assignee_name || 'Unassigned'] || 0) + 1;
    });
    
    return {
      bySeverity: Object.entries(bySeverity).sort((a, b) => b[1] - a[1]),
      byStatus: Object.entries(byStatus).sort((a, b) => b[1] - a[1]),
      byProject: Object.entries(byProject).sort((a, b) => b[1] - a[1]),
      byAssignee: Object.entries(byAssignee).sort((a, b) => b[1] - a[1]),
    };
  }, [incidents]);

  const maxCount = (arr: [string, number][]) => Math.max(...arr.map(a => a[1]), 1);

  const SEV_BAR_COLORS: Record<string, string> = {
    SEV1: 'var(--ds-text-danger, var(--cp-danger))', SEV2: 'var(--ds-text-warning, var(--cp-warning))', SEV3: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', SEV4: 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))',
  };

  const STATUS_BAR_COLORS: Record<string, string> = {
    open: 'var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral)))', triage: 'var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral)))', in_progress: 'var(--ds-link)', to_committee: 'var(--ds-link)',
    in_review: 'var(--ds-link)', resolved: 'var(--cp-lozenge-green-bg)', closed: 'var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral)))', converted: 'var(--cp-lozenge-green-bg)',
  };

  if (isLoading) {
    return <div className="flex-1 p-6" style={{ backgroundColor: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))' }}><Skeleton className="h-8 w-48 mb-6" /><Skeleton className="h-64 w-full" /></div>;
  }

  return (
    <div className="flex-1 overflow-auto" style={{ backgroundColor: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))' }}>
      <ProjectPageHeader projectKey="INCIDENTS" hubType="incident" />
      <div className="px-6 pt-2 pb-4">
        {/* Stat Cards */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Avg Resolution', value: '\u2014', accent: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' },
            { label: 'SLA Breach Rate', value: incidents ? `${Math.round((incidents.filter(i => i.resolution_breached).length / Math.max(incidents.length, 1)) * 100)}%` : '0%', accent: 'var(--ds-text-danger, var(--cp-danger))' },
            { label: 'Total Incidents', value: stats.total, accent: 'var(--ds-text, var(--cp-ink-1, var(--cp-ink-1)))' },
            { label: 'MTTR', value: '\u2014', accent: 'var(--ds-text-success, var(--cp-success))' },
          ].map(s => (
            <div key={s.label} className="p-3" style={{ backgroundColor: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))', border: isDark ? '1px solid var(--ds-text)' : '1px solid var(--ds-shadow-overlay, rgba(15,23,42,0.12))', borderRadius: 6 }}>
              <div style={{ fontFamily: 'var(--cp-font-body)', fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 'var(--ds-font-size-700)', fontWeight: 700, color: s.accent }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* 2x2 Chart Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* By Severity */}
          <div className="p-4" style={{ border: '1px solid var(--ds-shadow-overlay, rgba(15,23,42,0.12))', borderRadius: 6 }}>
            <h3 style={{ fontFamily: 'var(--cp-font-body)', fontSize: 'var(--ds-font-size-300)', fontWeight: 700, color: 'var(--ds-text, var(--cp-ink-1, var(--cp-ink-1)))', marginBottom: 12 }}>Incidents by Severity</h3>
            <div className="space-y-2">
              {analytics.bySeverity.map(([sev, count]) => (
                <div key={sev} className="flex items-center gap-2">
                  <span style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', width: 40 }}>{sev}</span>
                  <div className="flex-1" style={{ height: 16, backgroundColor: 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(count / maxCount(analytics.bySeverity)) * 100}%`, backgroundColor: SEV_BAR_COLORS[sev] || 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', borderRadius: 2 }} />
                  </div>
                  <span style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text, var(--cp-ink-1, var(--cp-ink-1)))', width: 24, textAlign: 'right' }}>{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* By Status */}
          <div className="p-4" style={{ border: '1px solid var(--ds-shadow-overlay, rgba(15,23,42,0.12))', borderRadius: 6 }}>
            <h3 style={{ fontFamily: 'var(--cp-font-body)', fontSize: 'var(--ds-font-size-300)', fontWeight: 700, color: 'var(--ds-text, var(--cp-ink-1, var(--cp-ink-1)))', marginBottom: 12 }}>Status Distribution</h3>
            <div className="space-y-2">
              {analytics.byStatus.map(([status, count]) => (
                <div key={status} className="flex items-center gap-2">
                  <span style={{ fontFamily: 'var(--cp-font-body)', fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', width: 80, textTransform: 'capitalize' }}>{status.replace(/_/g, ' ')}</span>
                  <div className="flex-1" style={{ height: 16, backgroundColor: 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(count / maxCount(analytics.byStatus)) * 100}%`, backgroundColor: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', borderRadius: 2 }} />
                  </div>
                  <span style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text, var(--cp-ink-1, var(--cp-ink-1)))', width: 24, textAlign: 'right' }}>{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* By Assignee */}
          <div className="p-4" style={{ border: '1px solid var(--ds-shadow-overlay, rgba(15,23,42,0.12))', borderRadius: 6 }}>
            <h3 style={{ fontFamily: 'var(--cp-font-body)', fontSize: 'var(--ds-font-size-300)', fontWeight: 700, color: 'var(--ds-text, var(--cp-ink-1, var(--cp-ink-1)))', marginBottom: 12 }}>Assignee Workload</h3>
            <div className="space-y-2">
              {analytics.byAssignee.slice(0, 8).map(([name, count]) => (
                <div key={name} className="flex items-center gap-2">
                  <span style={{ fontFamily: 'var(--cp-font-body)', fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', width: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                  <div className="flex-1" style={{ height: 16, backgroundColor: 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(count / maxCount(analytics.byAssignee)) * 100}%`, backgroundColor: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', borderRadius: 2 }} />
                  </div>
                  <span style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text, var(--cp-ink-1, var(--cp-ink-1)))', width: 24, textAlign: 'right' }}>{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Resolution Trend Placeholder */}
          <div className="p-4 flex items-center justify-center" style={{ border: '1px solid var(--ds-shadow-overlay, rgba(15,23,42,0.12))', borderRadius: 6, minHeight: 180 }}>
            <div className="text-center" style={{ backgroundColor: 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))', borderRadius: 6, padding: '24px 32px', border: '1px solid var(--ds-shadow-overlay, rgba(15,23,42,0.08))' }}>
              <p style={{ fontFamily: 'var(--cp-font-body)', fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))' }}>[Chart] Resolution Trend over time</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
