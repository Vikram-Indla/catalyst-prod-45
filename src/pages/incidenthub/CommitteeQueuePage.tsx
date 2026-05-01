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
    return <div className="flex-1 p-6" style={{ backgroundColor: 'var(--cp-bg-elevated, #FFFFFF)' }}><Skeleton className="h-8 w-48 mb-6" /><Skeleton className="h-64 w-full" /></div>;
  }

  return (
    <div className="flex-1 overflow-auto" style={{ backgroundColor: 'var(--cp-bg-elevated, #FFFFFF)' }}>
      <div className="px-6 pt-6 pb-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-md" style={{ width: 32, height: 32, backgroundColor: '#FEF3C7' }}>
              <Users size={18} style={{ color: 'var(--ds-text-warning, var(--ds-text-warning, #D97706))' }} />
            </div>
            <h1 style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 18, fontWeight: 700, color: 'var(--cp-text-primary, #0F172A)' }}>Committee Queue</h1>
          </div>
          <Button size="sm" className="gap-1.5" style={{ backgroundColor: 'var(--ds-text-brand, var(--ds-text-brand, #2563EB))', borderRadius: 6 }}>
            <Plus size={14} /> New Committee
          </Button>
        </div>

        {/* Table */}
        <div style={{ border: isDark ? '1px solid #2E2E2E' : '1px solid rgba(15,23,42,0.12)', borderRadius: 6, overflow: 'hidden' }}>
          {/* Header */}
          <div className="grid items-center" style={{
            gridTemplateColumns: '120px 1fr 70px 100px 80px 160px 80px 100px',
            backgroundColor: 'var(--cp-bg-sunken, #F1F5F9)',
            height: 50,
            borderBottom: isDark ? '0.75px solid #292929' : '0.75px solid rgba(15,23,42,0.06)',
          }}>
            {['KEY', 'INCIDENT', 'SEV', 'STATUS', 'AGE', 'APPROVAL', 'TYPE', 'ACTIONS'].map(h => (
              <div key={h} className="px-3" style={{
                fontFamily: 'var(--cp-font-body)', fontSize: 11, fontWeight: 700,
                textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'var(--cp-text-tertiary, #64748B)',
              }}>{h}</div>
            ))}
          </div>

          {/* Empty */}
          {(!queue || queue.length === 0) && (
            <div className="flex items-center justify-center py-12">
              <p style={{ fontFamily: 'var(--cp-font-body)', fontSize: 12, color: 'var(--cp-text-muted, #94A3B8)' }}>No committee members assigned.</p>
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
                  borderBottom: isDark ? '0.75px solid #292929' : '0.75px solid rgba(15,23,42,0.06)',
                  backgroundColor: 'var(--cp-bg-elevated, #FFFFFF)',
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = isDark ? 'var(--cp-bg-surface, #242528)' : 'rgba(15,23,42,0.04)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--cp-bg-elevated, #FFFFFF)')}
                onClick={() => navigate(`/incident-hub/view/${item.incident_id}`)}
              >
                <div className="px-3">
                  <span style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 12, color: 'var(--ds-text-brand, var(--ds-text-brand, #2563EB))', backgroundColor: 'var(--cp-primary-light, #EFF6FF)', padding: '0 4px', borderRadius: 3 }}>
                    {item.incident_key}
                  </span>
                </div>
                <div className="px-3 truncate" style={{ fontFamily: 'var(--cp-font-body)', fontSize: 12, fontWeight: 650, color: 'var(--cp-text-primary, #0F172A)' }}>
                  {item.title}
                </div>
                <div className="px-3"><SeverityChip severity={item.severity || 'SEV4'} /></div>
                <div className="px-3"><StatusLozenge status={item.committee_status || 'pending'} /></div>
                <div className="px-3" style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 11, color: 'var(--cp-text-tertiary, #64748B)' }}>
                  {item.age_hours ? `${Math.round(item.age_hours)}h` : '\u2014'}
                </div>
                <div className="px-3 flex items-center gap-2">
                  <div style={{ flex: 1, height: 6, borderRadius: 4, backgroundColor: 'var(--cp-bg-sunken, #E2E8F0)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${progress * 100}%`,
                      backgroundColor: progress >= 0.6 ? 'var(--ds-text-success, var(--ds-text-success, #16A34A))' : 'var(--ds-text-warning, var(--ds-text-warning, #D97706))',
                      borderRadius: 4,
                      transition: 'width 400ms ease',
                    }} />
                  </div>
                  <span style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 10, color: 'var(--cp-text-tertiary, #64748B)', whiteSpace: 'nowrap' }}>
                    {approved}/{total}
                  </span>
                </div>
                <div className="px-3">
                  {isMajor && (
                    <span className="inline-flex items-center gap-1" style={{ fontSize: 10, fontWeight: 700, color: 'var(--ds-text-danger, var(--ds-text-danger, #DC2626))' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--ds-text-danger, var(--ds-text-danger, #DC2626))', display: 'inline-block' }} />
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
