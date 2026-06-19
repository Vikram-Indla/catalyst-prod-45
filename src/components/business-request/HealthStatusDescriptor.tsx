/**
 * HealthStatusDescriptor Component
 *
 * Hover card showing detailed health status
 * Triggered on badge click/hover
 *
 * Shows:
 * - Status + descriptor (1-2 lines)
 * - Work snapshot (linked count, done count, in-progress)
 * - Date snapshot (target, release, earliest/latest due)
 * - Urgency info (days to deadline, overdue status)
 * - Action buttons (View Violations, More Details)
 */

import React from 'react';

import { HealthStatusDescriptorProps } from '@/types/date-pulse';

export const HealthStatusDescriptor: React.FC<HealthStatusDescriptorProps> = ({
  health,
  brKey,
  onOpenDatePulse,
  className = '',
}) => {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div
      className={`health-status-descriptor ${className}`}
      style={{
        padding: '12px',
        background: 'var(--ds-surface-overlay, #FFFFFF)',
        border: '1px solid var(--ds-border, #DFE1E6)',
        borderRadius: '3px',
        fontSize: '13px',
        lineHeight: '1.5',
        minWidth: '280px',
        maxWidth: '400px',
      }}
    >
      {/* Status + Descriptor */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ fontWeight: 600, marginBottom: '2px' }}>{health.health_status}</div>
        <div style={{ color: 'var(--ds-text-subtle, #42526E)', fontSize: '12px' }}>
          {health.health_descriptor}
        </div>
      </div>

      {/* Work Snapshot */}
      <div
        style={{
          padding: '8px 0',
          borderBottom: '1px solid var(--ds-border, #DFE1E6)',
          marginBottom: '8px',
          fontSize: '12px',
        }}
      >
        <div style={{ color: 'var(--ds-text-subtlest, #6B778C)' }}>
          {health.linked_work_count} work linked
          {health.done_count > 0 && ` · ${health.done_count} done`}
          {health.in_progress_count > 0 && ` · ${health.in_progress_count} in progress`}
          {health.open_blockers_count > 0 && ` · ${health.open_blockers_count} blocked`}
        </div>
      </div>

      {/* Date Snapshot */}
      {(health.br_target_date || health.release_target_date) && (
        <div style={{ marginBottom: '8px', fontSize: '12px' }}>
          {health.br_target_date && (
            <div style={{ color: 'var(--ds-text-subtle, #42526E)' }}>
              Target: {formatDate(health.br_target_date)}
            </div>
          )}
          {health.release_target_date && (
            <div style={{ color: 'var(--ds-text-subtle, #42526E)' }}>
              Release: {formatDate(health.release_target_date)}
            </div>
          )}
          {health.earliest_story_due && (
            <div style={{ color: 'var(--ds-text-subtle, #42526E)' }}>
              Earliest: {formatDate(health.earliest_story_due)}
              {health.latest_story_due && ` · Latest: ${formatDate(health.latest_story_due)}`}
            </div>
          )}
        </div>
      )}

      {/* Urgency */}
      {health.is_urgent && (
        <div
          style={{
            padding: '4px 6px',
            background: 'var(--ds-background-warning-subtle, #FFFBF0)',
            color: 'var(--ds-text-warning, #974F0C)',
            borderRadius: '2px',
            fontSize: '11px',
            marginBottom: '8px',
          }}
        >
          {health.days_to_deadline < 0 ? `${Math.abs(health.days_to_deadline)} days overdue` : `${health.days_to_deadline} days remaining`}
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-start' }}>
        {health.violation_count > 0 && onOpenDatePulse && (
          <button
            onClick={onOpenDatePulse}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--ds-link, #0052CC)',
              background: 'transparent',
              border: '1px solid var(--ds-link, #0052CC)',
              borderRadius: '2px',
              cursor: 'pointer',
            }}
          >
            View {health.critical_violation_count} violations
          </button>
        )}
      </div>
    </div>
  );
};

export default HealthStatusDescriptor;
