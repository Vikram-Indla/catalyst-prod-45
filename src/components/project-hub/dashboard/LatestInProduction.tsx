/**
 * LatestInProduction — Recently deployed items
 */
import WidgetCard from './WidgetCard';
import StatusBadge from './StatusBadge';
import { useInProduction } from '@/hooks/useProjectDashboard';
import { useDashboardStore } from './useDashboardStore';
import { format } from 'date-fns';
import { CheckCircle } from 'lucide-react';

interface Props {
  projectId: string | null;
  releaseMap: Record<string, string>;
}

export default function LatestInProduction({ projectId, releaseMap }: Props) {
  const { selectedReleaseIds, openLifecycle } = useDashboardStore();
  const { data, isLoading } = useInProduction(projectId, selectedReleaseIds);
  const items = data ?? [];

  return (
    <WidgetCard
      title="Latest in Production"
      count={items.length}
      countColor="#16A34A"
      leftBorder="#16A34A"
      maxHeight={320}
    >
      {isLoading ? (
        <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: '#94A3B8' }}>Loading...</div>
      ) : items.length === 0 ? (
        <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: '#94A3B8' }}>No items in production</div>
      ) : (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                {['Release', 'Key', 'Type', 'Title', 'Deployed', 'Since'].map(h => (
                  <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item: any) => {
                const daysSince = item.updated_at
                  ? Math.ceil((Date.now() - new Date(item.updated_at).getTime()) / 86400000)
                  : 0;
                return (
                  <tr key={item.id} style={{ height: 44, borderBottom: '1px solid #F8FAFC' }} className="hover:bg-slate-50">
                    <td style={{ padding: '0 8px', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#0D9488', fontWeight: 600 }}>
                      {releaseMap[item.release_id] || '—'}
                    </td>
                    <td style={{ padding: '0 8px' }}>
                      <button onClick={() => openLifecycle(item.id)} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#2563EB', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
                        {item.item_key}
                      </button>
                    </td>
                    <td style={{ padding: '0 8px' }}>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: item.item_type === 'bug' ? '#FEF2F2' : '#EFF6FF', color: item.item_type === 'bug' ? '#DC2626' : '#2563EB' }}>
                        {item.item_type === 'bug' ? 'Bug' : 'Story'}
                      </span>
                    </td>
                    <td style={{ padding: '0 8px', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#334155' }}>
                      {item.displayTitle}
                    </td>
                    <td style={{ padding: '0 8px', fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: '#94A3B8' }}>
                      {item.updated_at ? format(new Date(item.updated_at), 'MMM d') : '—'}
                    </td>
                    <td style={{ padding: '0 8px', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, color: '#16A34A' }}>
                      {daysSince}d
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ padding: '8px 16px', fontSize: 11, color: '#16A34A', display: 'flex', alignItems: 'center', gap: 4, borderTop: '1px solid #F1F5F9' }}>
            <CheckCircle size={12} /> All deployments stable
          </div>
        </>
      )}
    </WidgetCard>
  );
}
