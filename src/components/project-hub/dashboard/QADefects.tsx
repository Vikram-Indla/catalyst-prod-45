/**
 * QADefects widget
 */
import WidgetCard from './WidgetCard';
import PersonAvatar from './PersonAvatar';
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
  const { data, isLoading } = useDefects(projectId, selectedReleaseIds);
  const items = data ?? [];

  const crit = items.filter((i: any) => i.severity === 'critical').length;
  const high = items.filter((i: any) => i.severity === 'high').length;

  return (
    <WidgetCard
      title="QA Defects"
      leftBorder="#0284C7"
      maxHeight={320}
      headerRight={
        <div style={{ display: 'flex', gap: 4 }}>
          {crit > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: '#DC2626', background: '#FEF2F2', padding: '2px 6px', borderRadius: 6 }}>Critical: {crit}</span>}
          {high > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: '#D97706', background: '#FFFBEB', padding: '2px 6px', borderRadius: 6 }}>High: {high}</span>}
        </div>
      }
    >
      {isLoading ? (
        <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: '#94A3B8' }}>Loading...</div>
      ) : items.length === 0 ? (
        <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: '#94A3B8' }}>No defects ✓</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
              {['Rel', 'Key', 'Sev', 'Title', 'Open', 'Reported', 'Assigned'].map(h => (
                <th key={h} style={{ padding: '6px 6px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item: any) => {
              const ss = SEV_STYLE[item.severity] || SEV_STYLE.medium;
              return (
                <tr key={item.id} style={{ height: 44, borderBottom: '1px solid #F8FAFC' }} className="hover:bg-slate-50">
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
                  <td style={{ padding: '0 6px', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#334155' }}>
                    {item.title}
                  </td>
                  <td style={{ padding: '0 6px', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, color: '#334155' }}>
                    {item.days_open}d
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
      )}
    </WidgetCard>
  );
}
