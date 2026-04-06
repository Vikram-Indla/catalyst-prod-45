/**
 * IncidentAnalyticsPage — V12 Redesigned Analytics
 */

import { BarChart3, Loader2 } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
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
    SEV1: '#DC2626', SEV2: '#D97706', SEV3: '#2563EB', SEV4: '#94A3B8',
  };

  const STATUS_BAR_COLORS: Record<string, string> = {
    open: '#DFE1E6', triage: '#DFE1E6', in_progress: '#0C66E4', to_committee: '#0C66E4',
    in_review: '#0C66E4', resolved: '#1B7F37', closed: '#DFE1E6', converted: '#1B7F37',
  };

  if (isLoading) {
    return <div className="flex-1 p-6" style={{ backgroundColor: isDark ? '#0A0A0A' : '#FFFFFF' }}><Skeleton className="h-8 w-48 mb-6" /><Skeleton className="h-64 w-full" /></div>;
  }

  return (
    <div className="flex-1 overflow-auto" style={{ backgroundColor: isDark ? '#0A0A0A' : '#FFFFFF' }}>
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center rounded-md" style={{ width: 32, height: 32, backgroundColor: '#EFF6FF' }}>
            <BarChart3 size={18} style={{ color: '#2563EB' }} />
          </div>
          <div>
            <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 700, color: '#0F172A' }}>Analytics</h1>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#64748B' }}>Incident management metrics and trends</p>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Avg Resolution', value: '\u2014', accent: '#2563EB' },
            { label: 'SLA Breach Rate', value: incidents ? `${Math.round((incidents.filter(i => i.resolution_breached).length / Math.max(incidents.length, 1)) * 100)}%` : '0%', accent: '#DC2626' },
            { label: 'Total Incidents', value: stats.total, accent: '#0F172A' },
            { label: 'MTTR', value: '\u2014', accent: '#16A34A' },
          ].map(s => (
            <div key={s.label} className="p-3" style={{ backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF', border: isDark ? '1px solid #2E2E2E' : '1px solid rgba(15,23,42,0.12)', borderRadius: 6 }}>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#64748B', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 22, fontWeight: 700, color: s.accent }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* 2x2 Chart Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* By Severity */}
          <div className="p-4" style={{ border: '1px solid rgba(15,23,42,0.12)', borderRadius: 6 }}>
            <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 12 }}>Incidents by Severity</h3>
            <div className="space-y-2">
              {analytics.bySeverity.map(([sev, count]) => (
                <div key={sev} className="flex items-center gap-2">
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#64748B', width: 40 }}>{sev}</span>
                  <div className="flex-1" style={{ height: 16, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(count / maxCount(analytics.bySeverity)) * 100}%`, backgroundColor: SEV_BAR_COLORS[sev] || '#2563EB', borderRadius: 2 }} />
                  </div>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#0F172A', width: 24, textAlign: 'right' }}>{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* By Status */}
          <div className="p-4" style={{ border: '1px solid rgba(15,23,42,0.12)', borderRadius: 6 }}>
            <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 12 }}>Status Distribution</h3>
            <div className="space-y-2">
              {analytics.byStatus.map(([status, count]) => (
                <div key={status} className="flex items-center gap-2">
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#64748B', width: 80, textTransform: 'capitalize' }}>{status.replace(/_/g, ' ')}</span>
                  <div className="flex-1" style={{ height: 16, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(count / maxCount(analytics.byStatus)) * 100}%`, backgroundColor: '#2563EB', borderRadius: 2 }} />
                  </div>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#0F172A', width: 24, textAlign: 'right' }}>{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* By Assignee */}
          <div className="p-4" style={{ border: '1px solid rgba(15,23,42,0.12)', borderRadius: 6 }}>
            <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 12 }}>Assignee Workload</h3>
            <div className="space-y-2">
              {analytics.byAssignee.slice(0, 8).map(([name, count]) => (
                <div key={name} className="flex items-center gap-2">
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#64748B', width: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                  <div className="flex-1" style={{ height: 16, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(count / maxCount(analytics.byAssignee)) * 100}%`, backgroundColor: '#2563EB', borderRadius: 2 }} />
                  </div>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#0F172A', width: 24, textAlign: 'right' }}>{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Resolution Trend Placeholder */}
          <div className="p-4 flex items-center justify-center" style={{ border: '1px solid rgba(15,23,42,0.12)', borderRadius: 6, minHeight: 180 }}>
            <div className="text-center" style={{ backgroundColor: '#F1F5F9', borderRadius: 6, padding: '24px 32px', border: '1px solid rgba(15,23,42,0.08)' }}>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#64748B' }}>[Chart] Resolution Trend over time</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
