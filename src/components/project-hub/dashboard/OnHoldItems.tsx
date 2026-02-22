/**
 * OnHoldItems widget
 */
import WidgetCard from './WidgetCard';
import { useOnHold } from '@/hooks/useProjectDashboard';
import { useDashboardStore } from './useDashboardStore';

interface Props {
  projectId: string | null;
  releaseMap: Record<string, string>;
}

export default function OnHoldItems({ projectId, releaseMap }: Props) {
  const { selectedReleaseIds, openLifecycle } = useDashboardStore();
  const { data, isLoading } = useOnHold(projectId, selectedReleaseIds);
  const items = data ?? [];

  return (
    <WidgetCard title="On Hold" count={items.length} countColor="#EF4444" maxHeight={280}>
      {isLoading ? (
        <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: '#94A3B8' }}>Loading...</div>
      ) : items.length === 0 ? (
        <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: '#94A3B8' }}>Nothing on hold ✓</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
              {['Release', 'Key', 'Title', 'Days', 'Reason'].map(h => (
                <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item: any) => (
              <tr key={item.id} style={{ height: 44, borderBottom: '1px solid #F8FAFC' }} className="hover:bg-slate-50">
                <td style={{ padding: '0 8px', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#0D9488', fontWeight: 600 }}>
                  {releaseMap[item.release_id] || '—'}
                </td>
                <td style={{ padding: '0 8px' }}>
                  <button onClick={() => openLifecycle(item.id)} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#2563EB', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
                    {item.item_key}
                  </button>
                </td>
                <td style={{ padding: '0 8px', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#334155' }}>
                  {item.displayTitle}
                </td>
                <td style={{ padding: '0 8px' }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, color: '#EF4444' }}>—</span>
                </td>
                <td style={{ padding: '0 8px', fontSize: 10, color: '#94A3B8' }}>Pending review</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </WidgetCard>
  );
}
