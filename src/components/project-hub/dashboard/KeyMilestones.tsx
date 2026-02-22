/**
 * KeyMilestones — Configurable status gates widget
 */
import { Settings } from 'lucide-react';
import WidgetCard from './WidgetCard';
import StatusBadge from './StatusBadge';
import { useKeyMilestones } from '@/hooks/useProjectDashboard';
import { useDashboardStore } from './useDashboardStore';
import { format } from 'date-fns';

interface Props {
  projectId: string | null;
  onConfigOpen: () => void;
  releaseMap: Record<string, string>;
}

export default function KeyMilestones({ projectId, onConfigOpen, releaseMap }: Props) {
  const { selectedReleaseIds, openLifecycle } = useDashboardStore();
  const { data, isLoading } = useKeyMilestones(projectId, selectedReleaseIds);

  const items = data ?? [];

  return (
    <WidgetCard
      title="Key Milestones"
      subtitle="Configurable status gates"
      count={items.length}
      countColor="#2563EB"
      maxHeight={320}
      headerRight={
        <button onClick={onConfigOpen} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <Settings size={14} color="#94A3B8" />
        </button>
      }
    >
      {isLoading ? (
        <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: '#94A3B8' }}>Loading...</div>
      ) : items.length === 0 ? (
        <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: '#94A3B8' }}>No milestone items</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
              {['Release', 'Key', 'Type', 'Title', 'Status', 'Date', 'Days'].map(h => (
                <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item: any) => {
              const daysInStatus = item.due_date
                ? Math.ceil((Date.now() - new Date(item.due_date).getTime()) / 86400000)
                : null;
              return (
                <tr key={item.id} style={{ height: 44, borderBottom: '1px solid #F8FAFC' }} className="hover:bg-slate-50">
                  <td style={{ padding: '0 8px', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#0D9488', fontWeight: 600 }}>
                    {releaseMap[item.release_id] || '—'}
                  </td>
                  <td style={{ padding: '0 8px' }}>
                    <button
                      onClick={() => openLifecycle(item.id)}
                      style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#2563EB', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'none' }}
                    >
                      {item.item_key}
                    </button>
                  </td>
                  <td style={{ padding: '0 8px' }}>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4,
                      background: item.item_type === 'bug' ? '#FEF2F2' : '#EFF6FF',
                      color: item.item_type === 'bug' ? '#DC2626' : '#2563EB',
                    }}>
                      {item.item_type === 'bug' ? 'Bug' : 'Story'}
                    </span>
                  </td>
                  <td style={{ padding: '0 8px', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#334155' }}>
                    {item.displayTitle}
                  </td>
                  <td style={{ padding: '0 8px' }}><StatusBadge status={item.status} /></td>
                  <td style={{ padding: '0 8px', fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: '#94A3B8' }}>
                    {item.due_date ? format(new Date(item.due_date), 'MMM d') : '—'}
                  </td>
                  <td style={{ padding: '0 8px', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: daysInStatus === null ? '#94A3B8' : daysInStatus > 5 ? '#EF4444' : daysInStatus > 2 ? '#D97706' : '#16A34A' }}>
                    {daysInStatus !== null ? `${Math.abs(daysInStatus)}d` : '—'}
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
