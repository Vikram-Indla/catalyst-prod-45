/**
 * ProductionIncidents widget
 */
import WidgetCard from './WidgetCard';
import PersonAvatar from './PersonAvatar';
import { useIncidents } from '@/hooks/useProjectDashboard';
import { useDashboardStore } from './useDashboardStore';
import { ExternalLink } from 'lucide-react';

interface Props {
  projectId: string | null;
  releaseMap: Record<string, string>;
}

const PRIORITY_STYLE: Record<string, { bg: string; text: string }> = {
  P1: { bg: '#FEF2F2', text: '#DC2626' },
  P2: { bg: '#FFFBEB', text: '#D97706' },
  P3: { bg: '#F1F5F9', text: '#64748B' },
};

export default function ProductionIncidents({ projectId, releaseMap }: Props) {
  const { selectedReleaseIds } = useDashboardStore();
  const { data, isLoading } = useIncidents(projectId, selectedReleaseIds);
  const items = data ?? [];

  const p1 = items.filter((i: any) => i.priority === 'P1').length;
  const p2 = items.filter((i: any) => i.priority === 'P2').length;
  const p3 = items.filter((i: any) => i.priority === 'P3').length;

  return (
    <WidgetCard
      title="Production Incidents"
      subtitle="from IncidentHub"
      leftBorder="#EF4444"
      maxHeight={320}
      headerRight={
        <div style={{ display: 'flex', gap: 4 }}>
          {p1 > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: '#DC2626', background: '#FEF2F2', padding: '2px 6px', borderRadius: 6 }}>P1: {p1}</span>}
          {p2 > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: '#D97706', background: '#FFFBEB', padding: '2px 6px', borderRadius: 6 }}>P2: {p2}</span>}
          {p3 > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: '#64748B', background: '#F1F5F9', padding: '2px 6px', borderRadius: 6 }}>P3: {p3}</span>}
        </div>
      }
    >
      {isLoading ? (
        <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: '#94A3B8' }}>Loading...</div>
      ) : items.length === 0 ? (
        <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: '#94A3B8' }}>No active incidents ✓</div>
      ) : (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                {['Rel', 'Key', 'Pri', 'Title', 'Open', 'Reported', 'Assigned'].map(h => (
                  <th key={h} style={{ padding: '6px 6px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item: any) => {
                const ps = PRIORITY_STYLE[item.priority] || PRIORITY_STYLE.P3;
                const resolved = item.status === 'resolved' || item.status === 'closed';
                return (
                  <tr key={item.id} style={{ height: 44, borderBottom: '1px solid #F8FAFC', opacity: resolved ? 0.6 : 1 }} className="hover:bg-slate-50">
                    <td style={{ padding: '0 6px', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#0D9488', fontWeight: 600 }}>
                      {releaseMap[item.release_id] || '—'}
                    </td>
                    <td style={{ padding: '0 6px', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#2563EB', fontWeight: 600 }}>
                      {item.key}
                    </td>
                    <td style={{ padding: '0 6px' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: ps.text, background: ps.bg, padding: '2px 6px', borderRadius: 4 }}>
                        {item.priority}
                      </span>
                    </td>
                    <td style={{ padding: '0 6px', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#334155' }}>
                      {item.title}
                    </td>
                    <td style={{ padding: '0 6px', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, color: resolved ? '#16A34A' : '#334155' }}>
                      {resolved ? '✓' : `${item.days_open}d`}
                    </td>
                    <td style={{ padding: '0 6px' }}>
                      {item.reported_by_name ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <PersonAvatar name={item.reported_by_name} size={16} />
                          <span style={{ fontSize: 10, color: '#334155' }}>{item.reported_by_name.split(' ')[0]}</span>
                        </div>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '0 6px' }}>
                      {item.assigned_to_name ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <PersonAvatar name={item.assigned_to_name} size={16} />
                          <span style={{ fontSize: 10, color: '#334155' }}>{item.assigned_to_name.split(' ')[0]}</span>
                        </div>
                      ) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ padding: '8px 16px', borderTop: '1px solid #F1F5F9' }}>
            <button style={{ fontSize: 11, fontWeight: 600, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              View All in IncidentHub <ExternalLink size={10} />
            </button>
          </div>
        </>
      )}
    </WidgetCard>
  );
}
