/**
 * CommitteeQueuePage — V12 Committee Queue
 */

import { Plus } from '@/lib/atlaskit-icons';
import { useTheme } from '@/hooks/useTheme';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCommitteeQueueView } from '@/hooks/useIncidentHub';
import { SeverityChip } from './components/SeverityChip';
import { StatusLozenge } from '@/components/ui/StatusLozenge';

export default function CommitteeQueuePage() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const { data: queue, isLoading } = useCommitteeQueueView();

  if (isLoading) {
    return <div className="flex-1 p-6" style={{ backgroundColor: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))' }}><Skeleton className="h-8 w-48 mb-6" /><Skeleton className="h-64 w-full" /></div>;
  }

  return (
    <div className="flex-1 overflow-auto" style={{ backgroundColor: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))' }}>
      <ProjectPageHeader projectKey="INCIDENTS" hubType="incident" />
      <div className="px-6 pt-2 pb-4">
        <div className="flex items-center justify-end mb-4">
          <Button size="sm" className="gap-1.5" style={{ backgroundColor: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary, #2563EB))', borderRadius: 6 }}>
            <Plus size={14} /> New Committee
          </Button>
        </div>

        {/* Table */}
        <div style={{ border: isDark ? '1px solid var(--ds-background-neutral, #F1F2F4)' : '1px solid var(--ds-shadow-overlay, rgba(15,23,42,0.12))', borderRadius: 6, overflow: 'hidden' }}>
          {/* Header */}
          <div className="grid items-center" style={{
            gridTemplateColumns: '120px 1fr 70px 100px 80px 160px 80px 100px',
            backgroundColor: 'var(--cp-bg-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken, #F1F5F9)))',
            height: 50,
            borderBottom: isDark ? '0.75px solid var(--ds-text, #172B4D)' : '0.75px solid var(--ds-shadow-overlay, rgba(15,23,42,0.06))',
          }}>
            {['KEY', 'INCIDENT', 'SEV', 'STATUS', 'AGE', 'APPROVAL', 'TYPE', 'ACTIONS'].map(h => (
              <div key={h} className="px-3" style={{
                fontFamily: 'var(--cp-font-body)', fontSize: 'var(--ds-font-size-100)', fontWeight: 700,
                textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'var(--cp-text-tertiary, var(--cp-ink-3, var(--cp-text-secondary, #64748B)))',
              }}>{h}</div>
            ))}
          </div>

          {/* Empty */}
          {(!queue || queue.length === 0) && (
            <div className="flex items-center justify-center py-12">
              <p style={{ fontFamily: 'var(--cp-font-body)', fontSize: 'var(--ds-font-size-200)', color: 'var(--cp-text-muted, var(--cp-ink-4, var(--cp-border-neutral-light, #94A3B8)))' }}>No committee members assigned.</p>
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
                  borderBottom: isDark ? '0.75px solid var(--ds-text, #172B4D)' : '0.75px solid var(--ds-shadow-overlay, rgba(15,23,42,0.06))',
                  backgroundColor: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))',
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = isDark ? 'var(--cp-bg-surface, var(--cp-ink-1, #242528))' : 'var(--ds-shadow-overlay, rgba(15,23,42,0.04))')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))')}
                onClick={() => navigate(`/incident-hub/view/${item.incident_id}`)}
              >
                <div className="px-3">
                  <span style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary, #2563EB))', backgroundColor: 'var(--cp-primary-light, #EFF6FF)', padding: '0 4px', borderRadius: 3 }}>
                    {item.incident_key}
                  </span>
                </div>
                <div className="px-3 truncate" style={{ fontFamily: 'var(--cp-font-body)', fontSize: 'var(--ds-font-size-200)', fontWeight: 650, color: 'var(--cp-text-primary, var(--cp-ink-1, var(--cp-ink-1, #0F172A)))' }}>
                  {item.title}
                </div>
                <div className="px-3"><SeverityChip severity={item.severity || 'SEV4'} /></div>
                <div className="px-3"><StatusLozenge status={item.committee_status || 'pending'} /></div>
                <div className="px-3" style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 'var(--ds-font-size-100)', color: 'var(--cp-text-tertiary, var(--cp-ink-3, var(--cp-text-secondary, #64748B)))' }}>
                  {item.age_hours ? `${Math.round(item.age_hours)}h` : '\u2014'}
                </div>
                <div className="px-3 flex items-center gap-2">
                  <div style={{ flex: 1, height: 6, borderRadius: 4, backgroundColor: 'var(--cp-bg-sunken, var(--cp-border, var(--cp-bg-sunken, #E2E8F0)))', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${progress * 100}%`,
                      backgroundColor: progress >= 0.6 ? 'var(--ds-text-success, var(--cp-success, #16A34A))' : 'var(--ds-text-warning, var(--cp-warning, #D97706))',
                      borderRadius: 4,
                      transition: 'width 400ms ease',
                    }} />
                  </div>
                  <span style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 'var(--ds-font-size-50)', color: 'var(--cp-text-tertiary, var(--cp-ink-3, var(--cp-text-secondary, #64748B)))', whiteSpace: 'nowrap' }}>
                    {approved}/{total}
                  </span>
                </div>
                <div className="px-3">
                  {isMajor && (
                    <span className="inline-flex items-center gap-1" style={{ fontSize: 'var(--ds-font-size-50)', fontWeight: 700, color: 'var(--ds-text-danger, var(--cp-danger, #DC2626))' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--ds-text-danger, var(--cp-danger, #DC2626))', display: 'inline-block' }} />
                      MAJ
                    </span>
                  )}
                </div>
                <div className="px-3">
                  <Button variant="ghost" size="sm" style={{ fontSize: 'var(--ds-font-size-100)', borderRadius: 4, height: 24 }}>Review</Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
