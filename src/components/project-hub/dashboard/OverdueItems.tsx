/**
 * OverdueItems widget (real data)
 */
import { WidgetCard } from './WidgetCard';
import PersonAvatar from './PersonAvatar';
import { useOverdue } from '@/hooks/useProjectDashboard';
import { useDashboardStore } from './useDashboardStore';
import { format } from 'date-fns';

interface Props { projectId: string | null; releaseMap: Record<string, string>; }

export default function OverdueItems({ projectId, releaseMap }: Props) {
  const { selectedReleaseIds, openLifecycle } = useDashboardStore();
  const { data, isLoading } = useOverdue(projectId, selectedReleaseIds);
  const items = data ?? [];

  return (
    <WidgetCard title="Overdue" subtitle="Past due date" count={items.length} countColor="#D97706" maxHeight={280}>
      {isLoading ? <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: '#94A3B8' }}>Loading...</div> : items.length === 0 ? <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: '#94A3B8' }}>No overdue items ✓</div> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead><tr style={{ borderBottom: '1px solid #F1F5F9' }}>{['Release', 'Key', 'Title', 'Due', 'Late', 'Assignee'].map(h => <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</th>)}</tr></thead>
          <tbody>{items.map((item: any) => (
            <tr key={item.id} style={{ height: 44, borderBottom: '1px solid #F8FAFC' }} className="hover:bg-slate-50">
              <td style={{ padding: '0 8px', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#0D9488', fontWeight: 600 }}>{releaseMap[item.release_id] || '—'}</td>
              <td style={{ padding: '0 8px' }}><button onClick={() => openLifecycle(item.id)} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#2563EB', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>{item.item_key}</button></td>
              <td style={{ padding: '0 8px', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#334155' }}>{item.displayTitle}</td>
              <td style={{ padding: '0 8px', fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: '#94A3B8' }}>{item.due_date ? format(new Date(item.due_date), 'MMM d') : '—'}</td>
              <td style={{ padding: '0 8px' }}><span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, color: '#EF4444', background: '#FEF2F2', padding: '2px 6px', borderRadius: 4 }}>{item.days_overdue}d</span></td>
              <td style={{ padding: '0 8px' }}>{item.assignee_name ? <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><PersonAvatar name={item.assignee_name} size={18} /><span style={{ fontSize: 11, color: '#334155' }}>{item.assignee_name.split(' ')[0]}</span></div> : <span style={{ color: '#94A3B8', fontSize: 11 }}>—</span>}</td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </WidgetCard>
  );
}
