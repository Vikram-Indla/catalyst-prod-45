/**
 * ProductionIncidents widget — solid priority badges
 */
import WidgetCard from './WidgetCard';
import PersonAvatar from './PersonAvatar';
import { WidgetSkeleton } from './WidgetSkeleton';
import EmptyState from './EmptyState';
import { useIncidents } from '@/hooks/useProjectDashboard';
import { useDashboardStore } from './useDashboardStore';
import { ExternalLink } from 'lucide-react';

interface Props {
  projectId: string | null;
  releaseMap: Record<string, string>;
}

const PRIORITY_BADGE: Record<string, { bg: string; text: string }> = {
  P1: { bg: 'var(--sem-danger)', text: '#FFFFFF' },
  P2: { bg: '#F59E0B', text: '#FFFFFF' },
  P3: { bg: 'var(--fg-3)', text: '#FFFFFF' },
};

export default function ProductionIncidents({ projectId, releaseMap }: Props) {
  const { selectedReleaseIds } = useDashboardStore();
  const { data, isLoading, error, refetch } = useIncidents(projectId, selectedReleaseIds);
  const items = data ?? [];

  const p1 = items.filter((i: any) => i.priority === 'P1').length;
  const p2 = items.filter((i: any) => i.priority === 'P2').length;
  const p3 = items.filter((i: any) => i.priority === 'P3').length;

  return (
    <WidgetCard
      title="Production Incidents"
      subtitle={<span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>from IncidentHub <ExternalLink size={9} style={{ opacity: 0.6 }} /></span>}
      leftBorder="var(--sem-danger)"
      maxHeight={320}
      error={error ? error.message : null}
      onRetry={() => refetch()}
      headerRight={
        <div style={{ display: 'flex', gap: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: '#FFFFFF', background: 'var(--sem-danger)', padding: '2px 8px', borderRadius: 9999, minWidth: 28, textAlign: 'center' }}>P1: {p1}</span>
          <span style={{ fontSize: 10, fontWeight: 800, color: '#FFFFFF', background: 'var(--sem-warning)', padding: '2px 8px', borderRadius: 9999, minWidth: 28, textAlign: 'center' }}>P2: {p2}</span>
          <span style={{ fontSize: 10, fontWeight: 800, color: '#FFFFFF', background: 'var(--fg-3)', padding: '2px 8px', borderRadius: 9999, minWidth: 28, textAlign: 'center' }}>P3: {p3}</span>
        </div>
      }
    >
      {isLoading ? (
        <WidgetSkeleton rows={3} />
      ) : items.length === 0 ? (
        <EmptyState message="No production incidents in active releases ✓" icon="check" />
      ) : (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--divider)' }}>
                {['Rel', 'Key', 'Pri', 'Title', 'Open', 'Reported', 'Assigned'].map(h => (
                  <th key={h} style={{ padding: '6px 6px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--fg-2)', textTransform: 'uppercase', letterSpacing: '.08em', fontFamily: "'Inter', sans-serif" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item: any, idx: number) => {
                const ps = PRIORITY_BADGE[item.priority] || PRIORITY_BADGE.P3;
                const resolved = item.status === 'resolved' || item.status === 'closed';
                return (
                  <tr key={item.id} style={{ height: 44, borderBottom: '1px solid var(--cp-bd-zone)', opacity: resolved ? 0.6 : 1, background: idx % 2 === 1 ? 'var(--bg-1)' : undefined }} className="ph-table-row">
                    <td style={{ padding: '0 6px' }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, fontWeight: 600, color: 'var(--sem-success-fg)', background: 'var(--sem-success-bg)', padding: '2px 7px', borderRadius: 4, border: '1px solid var(--sem-success-accent)' }}>
                        {releaseMap[item.release_id] || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '0 6px', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--cp-primary-70)', fontWeight: 700, cursor: 'pointer' }}>
                      {item.key}
                    </td>
                    <td style={{ padding: '0 6px' }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: ps.text, background: ps.bg, padding: '2px 8px', borderRadius: 9999, minWidth: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                        {item.priority}
                      </span>
                    </td>
                    <td style={{ padding: '0 6px', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--fg-1)', fontWeight: 500, fontFamily: "'Inter', sans-serif" }} title={item.title}>
                      {item.title}
                    </td>
                    <td style={{ padding: '0 6px', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: resolved ? 'var(--sem-success)' : 'var(--fg-1)' }}>
                      {resolved ? '✓' : `${item.days_open ?? 0}d`}
                    </td>
                    <td style={{ padding: '0 6px' }}>
                      {item.reported_by_name ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <PersonAvatar name={item.reported_by_name} size={16} />
                          <span style={{ fontSize: 10, color: 'var(--fg-1)', fontWeight: 500, maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>{item.reported_by_name.split(' ')[0]}</span>
                        </div>
                      ) : <span style={{ color: 'var(--fg-4)', fontSize: 10, fontStyle: 'italic' }}>Unknown</span>}
                    </td>
                    <td style={{ padding: '0 6px' }}>
                      {item.assigned_to_name ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <PersonAvatar name={item.assigned_to_name} size={16} />
                          <span style={{ fontSize: 10, color: 'var(--fg-1)', fontWeight: 500, maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>{item.assigned_to_name.split(' ')[0]}</span>
                        </div>
                      ) : <span style={{ color: 'var(--fg-4)', fontSize: 10, fontStyle: 'italic' }}>Unassigned</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ padding: '8px 16px', borderTop: '1px solid var(--sem-danger-bg)', background: 'var(--sem-danger-bg)' }}>
            <button className="ph-focus-ring" style={{ fontSize: 11, fontWeight: 700, color: 'var(--sem-danger)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              View All in IncidentHub <ExternalLink size={10} />
            </button>
          </div>
        </>
      )}
    </WidgetCard>
  );
}
