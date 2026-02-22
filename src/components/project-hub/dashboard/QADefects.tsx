/**
 * QADefects widget
 */
import WidgetCard from './WidgetCard';
import PersonAvatar from './PersonAvatar';
import { WidgetSkeleton } from './WidgetSkeleton';
import EmptyState from './EmptyState';
import { useDefects } from '@/hooks/useProjectDashboard';
import { useDashboardStore } from './useDashboardStore';

interface Props {
  projectId: string | null;
  releaseMap: Record<string, string>;
}

const SEV_STYLE: Record<string, { bg: string; text: string }> = {
  critical: { bg: '#FEF2F2', text: '#DC2626' },
  high: { bg: '#FFFBEB', text: '#D97706' },
  medium: { bg: '#F0F9FF', text: '#0284C7' },
  low: { bg: '#F0FDF4', text: '#16A34A' },
};

export default function QADefects({ projectId, releaseMap }: Props) {
  const { selectedReleaseIds } = useDashboardStore();
  const { data, isLoading, error, refetch } = useDefects(projectId, selectedReleaseIds);
  const items = data ?? [];

  const crit = items.filter((i: any) => i.severity === 'critical').length;
  const high = items.filter((i: any) => i.severity === 'high').length;
  const med = items.filter((i: any) => i.severity === 'medium').length;

  return (
    <WidgetCard
      title="QA Defects"
      leftBorder="#0284C7"
      maxHeight={320}
      error={error ? error.message : null}
      onRetry={() => refetch()}
      headerRight={
        <div style={{ display: 'flex', gap: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#DC2626', background: '#FEF2F2', padding: '2px 6px', borderRadius: 6 }}>Crit: {crit}</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#D97706', background: '#FFFBEB', padding: '2px 6px', borderRadius: 6 }}>High: {high}</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#0284C7', background: '#F0F9FF', padding: '2px 6px', borderRadius: 6 }}>Med: {med}</span>
        </div>
      }
    >
      {isLoading ? (
        <WidgetSkeleton rows={3} />
      ) : items.length === 0 ? (
        <EmptyState message="No QA defects in active releases ✓" icon="check" />
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
              {['Rel', 'Key', 'Sev', 'Title', 'Open', 'Reported', 'Assigned'].map(h => (
                <th key={h} style={{ padding: '6px 6px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.05em', fontFamily: "'Inter', sans-serif" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item: any, idx: number) => {
              const ss = SEV_STYLE[item.severity] || SEV_STYLE.medium;
              return (
                <tr key={item.id} style={{ height: 44, borderBottom: '1px solid #F8FAFC', background: idx % 2 === 1 ? '#FAFBFC' : undefined, transition: 'background 120ms ease' }} className="ph-table-row">
                  <td style={{ padding: '0 6px', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#0D9488', fontWeight: 600 }}>
                    {releaseMap[item.release_id] || '—'}
                  </td>
                  <td style={{ padding: '0 6px', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#2563EB', fontWeight: 600 }}>
                    {item.key}
                  </td>
                  <td style={{ padding: '0 6px' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: ss.text, background: ss.bg, padding: '2px 6px', borderRadius: 4, textTransform: 'capitalize' }}>
                      {item.severity}
                    </span>
                  </td>
                  <td style={{ padding: '0 6px', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#334155', fontFamily: "'Inter', sans-serif" }} title={item.title}>
                    {item.title}
                  </td>
                  <td style={{ padding: '0 6px', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, color: (item.days_open ?? 0) === 0 ? '#16A34A' : '#334155' }}>
                    {item.days_open ?? 0}d
                  </td>
                  <td style={{ padding: '0 6px' }}>
                    {item.reported_by_name ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <PersonAvatar name={item.reported_by_name} size={16} />
                        <span style={{ fontSize: 10, color: '#334155', maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>{item.reported_by_name.split(' ')[0]}</span>
                      </div>
                    ) : <span style={{ color: '#94A3B8', fontSize: 10, fontStyle: 'italic' }}>Unknown</span>}
                  </td>
                  <td style={{ padding: '0 6px' }}>
                    {item.assigned_to_name ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <PersonAvatar name={item.assigned_to_name} size={16} />
                        <span style={{ fontSize: 10, color: '#334155', maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>{item.assigned_to_name.split(' ')[0]}</span>
                      </div>
                    ) : <span style={{ color: '#94A3B8', fontSize: 10, fontStyle: 'italic' }}>Unassigned</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </WidgetCard>
  );
}
