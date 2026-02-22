/**
 * TeamWorkload widget (real data)
 */
import { WidgetCard } from './WidgetCard';
import PersonAvatar from './PersonAvatar';
import { useTeamWorkload } from '@/hooks/useProjectDashboard';
import { useDashboardStore } from './useDashboardStore';

interface Props { projectId: string | null; }

export default function TeamWorkload({ projectId }: Props) {
  const { data, isLoading } = useTeamWorkload(projectId);
  const { openWorkload } = useDashboardStore();
  const members = data ?? [];

  return (
    <WidgetCard title="Team Workload" subtitle="Click member for details" maxHeight={320}>
      {isLoading ? <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: '#94A3B8' }}>Loading...</div> : members.length === 0 ? <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: '#94A3B8' }}>No team data</div> : (
        <div>{members.map((m: any) => {
          const parts: string[] = [];
          if (m.story_count) parts.push(`${m.story_count} stories`);
          if (m.subtask_count) parts.push(`${m.subtask_count} subtasks`);
          if (m.bug_count) parts.push(`${m.bug_count} bugs`);
          return (
            <button key={m.user_id} onClick={() => openWorkload(m.user_id, m.name)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', width: '100%', background: 'none', border: 'none', borderBottom: '1px solid #F8FAFC', cursor: 'pointer', textAlign: 'left' }} className="hover:bg-blue-50">
              <PersonAvatar name={m.name} size={24} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>{m.name}</div>
                <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 1 }}>{parts.join(', ') || 'No items'}</div>
              </div>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 800, color: '#2563EB' }}>{m.total_count}</span>
            </button>
          );
        })}</div>
      )}
    </WidgetCard>
  );
}
