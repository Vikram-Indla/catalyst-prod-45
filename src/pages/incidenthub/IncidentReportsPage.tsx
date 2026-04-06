/**
 * IncidentReportsPage — V12 Reports view
 */

import { useState } from 'react';
import { FileText } from 'lucide-react';
import { useIncidentListView } from '@/hooks/useIncidentHub';
import { Skeleton } from '@/components/ui/skeleton';

const TABS = ['SLA Breach', 'Incident Aging', 'Conversion Funnel', 'Severity vs Priority'];

export default function IncidentReportsPage() {
  const { data: incidents, isLoading } = useIncidentListView();
  const [activeTab, setActiveTab] = useState(0);

  const breachedCount = incidents?.filter(i => i.resolution_breached).length || 0;
  const avgAge = incidents?.length
    ? Math.round(incidents.reduce((sum, i) => {
        const created = i.created_at ? new Date(i.created_at).getTime() : Date.now();
        return sum + ((Date.now() - created) / (1000 * 60 * 60 * 24));
      }, 0) / incidents.length)
    : 0;

  if (isLoading) {
    return <div className="flex-1 p-6" style={{ backgroundColor: 'var(--bg-app, #FFFFFF)' }}><Skeleton className="h-8 w-48 mb-6" /></div>;
  }

  return (
    <div className="flex-1 overflow-auto" style={{ backgroundColor: 'var(--bg-app, #FFFFFF)' }}>
      <div className="px-6 pt-6 pb-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center rounded-md" style={{ width: 32, height: 32, backgroundColor: 'var(--tint-blue, #EFF6FF)' }}>
            <FileText size={18} style={{ color: '#2563EB' }} />
          </div>
          <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 700, color: 'var(--fg-1, #0F172A)' }}>Incident Reports</h1>
        </div>

        {/* Tab Bar */}
        <div className="flex items-center gap-1 mb-6" style={{ borderBottom: '0.75px solid rgba(15,23,42,0.06)' }}>
          {TABS.map((tab, i) => (
            <button
              key={tab}
              role="tab"
              onClick={() => setActiveTab(i)}
              className="px-3 py-2"
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 12,
                fontWeight: activeTab === i ? 650 : 400,
                color: activeTab === i ? '#2563EB' : '#64748B',
                borderBottom: activeTab === i ? '2px solid #2563EB' : '2px solid transparent',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 0 && (
          <div>
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="p-3" style={{ border: '1px solid rgba(15,23,42,0.12)', borderRadius: 6 }}>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#64748B', marginBottom: 4 }}>Total Breaches</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 22, fontWeight: 700, color: '#DC2626' }}>{breachedCount}</div>
              </div>
              <div className="p-3" style={{ border: '1px solid rgba(15,23,42,0.12)', borderRadius: 6 }}>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#64748B', marginBottom: 4 }}>Breach Rate</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 22, fontWeight: 700, color: '#D97706' }}>
                  {incidents?.length ? `${Math.round((breachedCount / incidents.length) * 100)}%` : '0%'}
                </div>
              </div>
              <div className="p-3" style={{ border: '1px solid rgba(15,23,42,0.12)', borderRadius: 6 }}>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#64748B', marginBottom: 4 }}>Avg Age (days)</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 22, fontWeight: 700, color: 'var(--fg-1, #0F172A)' }}>{avgAge}</div>
              </div>
            </div>
            <div className="p-8 flex items-center justify-center" style={{ border: '1px solid rgba(15,23,42,0.12)', borderRadius: 6, backgroundColor: var(--bg-2, '#F1F5F9') }}>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#64748B' }}>[Chart] SLA Breach trend over time</p>
            </div>
          </div>
        )}

        {activeTab === 1 && (
          <div className="p-8 flex items-center justify-center" style={{ border: '1px solid rgba(15,23,42,0.12)', borderRadius: 6, backgroundColor: var(--bg-2, '#F1F5F9') }}>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#64748B' }}>[Chart] Incident aging distribution by severity</p>
          </div>
        )}

        {activeTab === 2 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              {[
                { label: 'Open', color: '#DC2626', count: incidents?.filter(i => i.status === 'open').length || 0 },
                { label: 'Triage', color: '#D97706', count: incidents?.filter(i => i.status === 'triage').length || 0 },
                { label: 'In Progress', color: '#2563EB', count: incidents?.filter(i => i.status === 'in_progress').length || 0 },
                { label: 'Resolved', color: '#16A34A', count: incidents?.filter(i => i.status === 'resolved').length || 0 },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-2 p-3 flex-1" style={{ border: '1px solid rgba(15,23,42,0.12)', borderRadius: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: s.color }} />
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#64748B' }}>{s.label}</span>
                  <span className="ml-auto" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 700, color: s.color }}>{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 3 && (
          <div className="p-8 flex items-center justify-center" style={{ border: '1px solid rgba(15,23,42,0.12)', borderRadius: 6, backgroundColor: var(--bg-2, '#F1F5F9') }}>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#64748B' }}>[Chart] Severity vs Priority heatmap</p>
          </div>
        )}
      </div>
    </div>
  );
}
