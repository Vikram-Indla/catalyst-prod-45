/**
 * ResourceCard — Single resource utilization card
 * Phase 6: Resource 360
 */
import { AlertTriangle } from 'lucide-react';
import { AvatarChip } from '@/components/workhub/shared/AvatarChip';
import { DepartmentBadge } from '@/components/workhub/shared/DepartmentBadge';
import { UtilizationBar } from '@/components/workhub/shared/UtilizationBar';
import type { ResourceUtilization } from '@/types/workhub.types';

interface ResourceCardProps {
  resource: ResourceUtilization;
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
          <AvatarChip name={r.name} color={r.color} size={36} avatarUrl={r.avatar_url} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--wh-text-primary, #0f172a)' }}>
              {r.name}
            </div>
            <div style={{ fontSize: 13, color: 'var(--wh-text-secondary, #64748b)', marginTop: 1 }}>
              {r.role || 'Team Member'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <DepartmentBadge department={r.department || 'Engineering'} />
          <span style={{ fontSize: 12, color: 'var(--wh-text-tertiary, #94a3b8)', whiteSpace: 'nowrap' }}>
            {r.capacity_hours_per_week}h/wk
          </span>
        </div>
      </div>

      {/* Row 2: Utilization Bar */}
      <div style={{ marginBottom: 12 }}>
        <UtilizationBar percent={r.utilization_percent} height={10} />
      </div>

      {/* Row 3: Active/Done/Blocked + Next due */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
        <div style={{ color: 'var(--wh-text-secondary, #64748b)' }}>
          <span>{r.active_items} active</span>
          <span style={{ margin: '0 4px' }}>·</span>
          <span>{r.completed_items} done</span>
          <span style={{ margin: '0 4px' }}>·</span>
          <span style={{ color: r.blocked_items > 0 ? 'var(--wh-danger, #ef4444)' : undefined }}>
            {r.blocked_items} blocked
          </span>
        </div>
        <div style={{ color: 'var(--wh-text-secondary, #64748b)', fontSize: 12 }}>
          {nextDue ? `Next due: ${nextDue}` : 'No upcoming'}
        </div>
      </div>

      {/* Row 4: Releases/Themes + Hours */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--wh-text-tertiary, #94a3b8)' }}>
        <span>{r.release_count} releases · {r.theme_count} themes</span>
        <span>Est: {r.total_estimated_hours}h · Act: {r.total_actual_hours}h</span>
      </div>

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
