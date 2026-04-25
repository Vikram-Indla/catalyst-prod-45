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
        background: 'var(--cp-float)',
        border: '1px solid var(--divider)',
        borderRadius: 'var(--wh-radius-xl, 12px)',
        padding: 20,
        cursor: 'pointer',
        transition: 'box-shadow 150ms ease, border-color 150ms ease',
        fontFamily: 'var(--ds-font-family-body)',
      }}
      className="wh-resource-card"
    >
      {/* Row 1: Avatar + Name + Department */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <AvatarChip name={r.full_name} size={36} avatarUrl={r.avatar_url} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--fg-1)' }}>
              {r.full_name}
            </div>
            <div style={{ fontSize: 13, color: 'var(--fg-3)', marginTop: 1 }}>
              {r.role || 'Team Member'}
              {r.assignment_type && (
                <span style={{ marginLeft: 6, fontSize: 11, padding: '1px 6px', borderRadius: 4, background: 'rgba(100,116,139,0.1)', color: 'var(--fg-2)', fontWeight: 500 }}>
                  {r.assignment_type}
                </span>
              )}
            </div>
          </div>
        </div>
        {r.department_name && (
          <DepartmentBadge department={r.department_name} />
        )}
      </div>

      {/* Row 2: Active/Done counts */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
        <div style={{ color: 'var(--fg-3)' }}>
          <span style={{ fontWeight: 600, color: 'var(--fg-1)' }}>{r.active_subtasks}</span> active
          <span style={{ margin: '0 6px', color: 'var(--divider)' }}>·</span>
          <span style={{ fontWeight: 600, color: 'var(--sem-success)' }}>{r.done_subtasks}</span> done
          {r.blocked_items > 0 && (
            <>
              <span style={{ margin: '0 6px', color: 'var(--divider)' }}>·</span>
              <span style={{ fontWeight: 600, color: 'var(--sem-danger)' }}>{r.blocked_items}</span> blocked
            </>
          )}
        </div>
        <div style={{ color: 'var(--fg-3)', fontSize: 12 }}>
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
                color: 'var(--cp-blue)',
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
          border-color: var(--divider) !important;
        }
        .wh-resource-card:focus-visible {
          outline: 2px solid var(--cp-blue);
          outline-offset: 2px;
        }
      `}</style>
    </button>
  );
}
