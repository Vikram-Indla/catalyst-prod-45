/**
 * ResourceCard — Single resource card showing subtask assignments
 * Data from profiles + subtasks of active stories
 */
import { AvatarChip } from '@/components/workhub/shared/AvatarChip';
import { DepartmentBadge } from '@/components/workhub/shared/DepartmentBadge';
import type { Resource360Person } from '@/hooks/workhub/useResource360Data';

interface ResourceCardProps {
  resource: Resource360Person;
  onClick: () => void;
}

export function ResourceCard({ resource, onClick }: ResourceCardProps) {
  const r = resource;
  const nextDue = r.next_due_date
    ? new Date(r.next_due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;

  return (
    <button
      onClick={onClick}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        background: 'var(--wh-surface, #fff)',
        border: '1px solid var(--wh-border, #e2e8f0)',
        borderRadius: 'var(--wh-radius-xl, 12px)',
        padding: 20,
        cursor: 'pointer',
        transition: 'box-shadow 150ms ease, border-color 150ms ease',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
      className="wh-resource-card"
    >
      {/* Row 1: Avatar + Name + Department */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <AvatarChip name={r.full_name} size={36} avatarUrl={r.avatar_url} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--wh-text-primary, #0f172a)' }}>
              {r.full_name}
            </div>
            <div style={{ fontSize: 13, color: 'var(--wh-text-secondary, #64748b)', marginTop: 1 }}>
              {r.role || 'Team Member'}
            </div>
          </div>
        </div>
        {r.department_name && (
          <DepartmentBadge department={r.department_name} />
        )}
      </div>

      {/* Row 2: Active/Done counts */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
        <div style={{ color: 'var(--wh-text-secondary, #64748b)' }}>
          <span style={{ fontWeight: 600, color: 'var(--wh-text-primary, #0f172a)' }}>{r.active_subtasks}</span> active
          <span style={{ margin: '0 6px', color: 'var(--wh-border, #e2e8f0)' }}>·</span>
          <span style={{ fontWeight: 600, color: '#16a34a' }}>{r.done_subtasks}</span> done
          {r.blocked_items > 0 && (
            <>
              <span style={{ margin: '0 6px', color: 'var(--wh-border, #e2e8f0)' }}>·</span>
              <span style={{ fontWeight: 600, color: '#ef4444' }}>{r.blocked_items}</span> blocked
            </>
          )}
        </div>
        <div style={{ color: 'var(--wh-text-secondary, #64748b)', fontSize: 12 }}>
          {nextDue ? `Next due: ${nextDue}` : 'No upcoming'}
        </div>
      </div>

      {/* Row 3: Releases */}
      {r.release_names.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, fontSize: 11 }}>
          {r.release_names.map(name => (
            <span
              key={name}
              style={{
                padding: '2px 8px',
                borderRadius: 9999,
                background: 'rgba(37, 99, 235, 0.08)',
                color: '#2563eb',
                fontWeight: 500,
              }}
            >
              {name}
            </span>
          ))}
        </div>
      )}

      <style>{`
        .wh-resource-card:hover {
          box-shadow: 0 4px 12px -2px rgba(0,0,0,0.08) !important;
          border-color: var(--wh-border-hover, #cbd5e1) !important;
        }
        .wh-resource-card:focus-visible {
          outline: 2px solid var(--wh-primary, #2563eb);
          outline-offset: 2px;
        }
      `}</style>
    </button>
  );
}
