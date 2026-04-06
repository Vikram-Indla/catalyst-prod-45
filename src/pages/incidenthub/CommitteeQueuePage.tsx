/**
 * CommitteeQueuePage — V12 Committee Queue
 */

import { useState } from 'react';
import { Users, Plus } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCommitteeQueueView } from '@/hooks/useIncidentHub';
import { SeverityChip } from './components/SeverityChip';
import { StatusLozenge } from './components/StatusLozenge';

export default function CommitteeQueuePage() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const { data: queue, isLoading } = useCommitteeQueueView();

  if (isLoading) {
    return <div className="flex-1 p-6" style={{ backgroundColor: isDark ? '#0A0A0A' : '#FFFFFF' }}><Skeleton className="h-8 w-48 mb-6" /><Skeleton className="h-64 w-full" /></div>;
  }

  return (
    <div className="flex-1 overflow-auto" style={{ backgroundColor: isDark ? '#0A0A0A' : '#FFFFFF' }}>
      <div className="px-6 pt-6 pb-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-md" style={{ width: 32, height: 32, backgroundColor: 'rgba(251,191,36,0.10)' }}>
              <Users size={18} style={{ color: '#D97706' }} />
            </div>
            <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 700, color: isDark ? '#EDEDED' : '#0F172A' }}>Committee Queue</h1>
          </div>
          <Button size="sm" className="gap-1.5" style={{ backgroundColor: '#2563EB', borderRadius: 6 }}>
            <Plus size={14} /> New Committee
          </Button>
        </div>

        {/* Table */}
        <div style={{ border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(15,23,42,0.12)', borderRadius: 6, overflow: 'hidden' }}>
          {/* Header */}
          <div className="grid items-center" style={{
            gridTemplateColumns: '120px 1fr 70px 100px 80px 160px 80px 100px',
            backgroundColor: isDark ? '#1A1A1A' : '#F1F5F9',
            height: 50,
            borderBottom: isDark ? '0.75px solid rgba(255,255,255,0.05)' : '0.75px solid rgba(15,23,42,0.06)',
          }}>
            {['KEY', 'INCIDENT', 'SEV', 'STATUS', 'AGE', 'APPROVAL', 'TYPE', 'ACTIONS'].map(h => (
              <div key={h} className="px-3" style={{
                fontFamily: 'Geist, -apple-system, sans-serif', fontSize: 11, fontWeight: 700,
                textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: isDark ? '#878787' : '#64748B',
              }}>{h}</div>
            ))}
          </div>

          {/* Empty */}
          {(!queue || queue.length === 0) && (
            <div className="flex items-center justify-center py-12">
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: isDark ? '#878787' : '#94A3B8' }}>No committee members assigned.</p>
            </div>
          )}

          {/* Rows */}
          {queue?.map((item: any) => {
            const approved = item.approved_count || 0;
            const total = item.total_members || 0;
            const progress = total > 0 ? approved / total : 0;
            const isMajor = item.is_major_incident;

            return (
              <div
                key={item.committee_id || item.incident_id}
                className="grid items-center cursor-pointer transition-colors"
                style={{
                  gridTemplateColumns: '120px 1fr 70px 100px 80px 160px 80px 100px',
                  height: 50,
                  borderBottom: isDark ? '0.75px solid rgba(255,255,255,0.05)' : '0.75px solid rgba(15,23,42,0.06)',
                  backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = isDark ? '#1A1A1A' : 'rgba(15,23,42,0.04)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = isDark ? '#1A1A1A' : '#FFFFFF')}
                onClick={() => navigate(`/incident-hub/view/${item.incident_id}`)}
              >
                <div className="px-3">
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#2563EB', backgroundColor: isDark ? 'rgba(37,99,235,0.12)' : '#EFF6FF', padding: '0 4px', borderRadius: 3 }}>
                    {item.incident_key}
                  </span>
                </div>
                <div className="px-3 truncate" style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 650, color: isDark ? '#EDEDED' : '#0F172A' }}>
                  {item.title}
                </div>
                <div className="px-3"><SeverityChip severity={item.severity || 'SEV4'} /></div>
                <div className="px-3"><StatusLozenge status={item.committee_status || 'pending'} /></div>
                <div className="px-3" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: isDark ? '#878787' : '#64748B' }}>
                  {item.age_hours ? `${Math.round(item.age_hours)}h` : '\u2014'}
                </div>
                <div className="px-3 flex items-center gap-2">
                  <div style={{ flex: 1, height: 6, borderRadius: 4, backgroundColor: isDark ? '#292929' : '#E2E8F0', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${progress * 100}%`,
                      backgroundColor: progress >= 0.6 ? '#16A34A' : '#D97706',
                      borderRadius: 4,
                      transition: 'width 400ms ease',
                    }} />
                  </div>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: isDark ? '#878787' : '#64748B', whiteSpace: 'nowrap' }}>
                    {approved}/{total}
                  </span>
                </div>
                <div className="px-3">
                  {isMajor && (
                    <span className="inline-flex items-center gap-1" style={{ fontSize: 10, fontWeight: 700, color: '#DC2626' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#DC2626', display: 'inline-block' }} />
                      MAJ
                    </span>
                  )}
                </div>
                <div className="px-3">
                  <Button variant="ghost" size="sm" style={{ fontSize: 11, borderRadius: 4, height: 24 }}>Review</Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
