/**
 * TeamWorkload widget (real data)
 */
import { WidgetCard } from './WidgetCard';
import PersonAvatar from './PersonAvatar';
import { WidgetSkeleton } from './WidgetSkeleton';
import EmptyState from './EmptyState';
import { useTeamWorkload } from '@/hooks/useProjectDashboard';
import { useDashboardStore } from './useDashboardStore';

interface Props { projectId: string | null; }

export default function TeamWorkload({ projectId }: Props) {
  const { data, isLoading, error, refetch } = useTeamWorkload(projectId);
  const { openWorkload } = useDashboardStore();
  const members = data ?? [];

  return (
    <WidgetCard title="Team Workload" subtitle="Click member for details" maxHeight={320} error={error ? error.message : null} onRetry={() => refetch()}>
      {isLoading ? (
        <WidgetSkeleton rows={4} type="list" />
      ) : members.length === 0 ? (
        <EmptyState message="No assigned items in active releases" icon="info" />
      ) : (
        <div>{members.map((m: any) => {
          const parts: string[] = [];
          if (m.story_count) parts.push(`${m.story_count} stories`);
          if (m.subtask_count) parts.push(`${m.subtask_count} subtasks`);
          if (m.bug_count) parts.push(`${m.bug_count} bugs`);
          return (
            <button
              key={m.user_id}
              onClick={() => openWorkload(m.user_id, m.name)}
              className="ph-focus-ring ph-table-row"
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', width: '100%', background: 'none', border: 'none', borderBottom: '1px solid #F8FAFC', cursor: 'pointer', textAlign: 'left', transition: 'background 120ms ease' }}
            >
              <PersonAvatar name={m.name} size={24} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', fontFamily: "'Inter', sans-serif", maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
                <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 1, fontFamily: "'Inter', sans-serif" }}>{parts.join(', ') || 'No items'}</div>
              </div>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 800, color: m.total_count > 8 ? '#EF4444' : '#2563EB' }}>{m.total_count}</span>
            </button>
          );
        })}</div>
      )}
    </WidgetCard>
  );
}
