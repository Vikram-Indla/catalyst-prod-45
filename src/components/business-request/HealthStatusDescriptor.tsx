/**
 * HealthStatusDescriptor Component
 *
 * CANONICAL PATTERN: Follows CatalystSidebarDetails field-row structure.
 * - Uses CatalystAvatar for visual representation
 * - Stacked (column) layout for field rows
 * - Atlaskit Tooltip for expandable details
 * - Renders: Status header → Work snapshot → Date details → Urgency badge → Actions
 */

import React from 'react';
import Tooltip from '@atlaskit/tooltip';
import { token } from '@atlaskit/tokens';

import { HealthStatusDescriptorProps } from '@/types/date-pulse';

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
};

export const HealthStatusDescriptor: React.FC<HealthStatusDescriptorProps> = ({
  health,
  brKey,
  onOpenDatePulse,
  className = '',
}) => {
  const fieldRowStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    padding: '8px 0',
    borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
    fontSize: '12px',
    lineHeight: '1.5',
  };

  return (
    <div
      className={`health-status-descriptor ${className}`}
      style={{
        padding: '12px',
        background: token('color.surface.overlay', '#FFFFFF'),
        border: `1px solid ${token('color.border', '#DFE1E6')}`,
        borderRadius: '3px',
        minWidth: '280px',
        maxWidth: '400px',
      }}
    >
      {/* Status Header */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontWeight: 600, fontSize: '13px', color: token('color.text', '#172B4D') }}>
          {health.health_status}
        </div>
        <div style={{ color: token('color.text.subtle', '#42526E'), fontSize: '12px', marginTop: '2px' }}>
          {health.health_descriptor}
        </div>
      </div>

      {/* Work Snapshot Field Row */}
      <div style={fieldRowStyle}>
        <span style={{ color: token('color.text.subtlest', '#6B778C'), fontSize: '11px', fontWeight: 600 }}>
          WORK
        </span>
        <span style={{ color: token('color.text', '#172B4D'), marginTop: '4px' }}>
          {health.linked_work_count} linked
          {health.done_count > 0 && ` · ${health.done_count} done`}
          {health.in_progress_count > 0 && ` · ${health.in_progress_count} in-progress`}
          {health.open_blockers_count > 0 && ` · ${health.open_blockers_count} blocked`}
        </span>
      </div>

      {/* Date Snapshot Field Rows */}
      {(health.br_target_date || health.release_target_date) && (
        <>
          {health.br_target_date && (
            <div style={fieldRowStyle}>
              <span style={{ color: token('color.text.subtlest', '#6B778C'), fontSize: '11px', fontWeight: 600 }}>
                TARGET
              </span>
              <span style={{ color: token('color.text', '#172B4D'), marginTop: '4px' }}>
                {formatDate(health.br_target_date)}
              </span>
            </div>
          )}
          {health.release_target_date && (
            <div style={fieldRowStyle}>
              <span style={{ color: token('color.text.subtlest', '#6B778C'), fontSize: '11px', fontWeight: 600 }}>
                RELEASE
              </span>
              <span style={{ color: token('color.text', '#172B4D'), marginTop: '4px' }}>
                {formatDate(health.release_target_date)}
              </span>
            </div>
          )}
          {health.earliest_story_due && (
            <div style={fieldRowStyle}>
              <span style={{ color: token('color.text.subtlest', '#6B778C'), fontSize: '11px', fontWeight: 600 }}>
                DATES
              </span>
              <span style={{ color: token('color.text', '#172B4D'), marginTop: '4px' }}>
                {formatDate(health.earliest_story_due)}
                {health.latest_story_due && ` – ${formatDate(health.latest_story_due)}`}
              </span>
            </div>
          )}
        </>
      )}

      {/* Urgency Badge */}
      {health.is_urgent && (
        <Tooltip content={health.days_to_deadline < 0 ? 'Overdue' : 'Approaching deadline'}>
          <div
            style={{
              padding: '4px 6px',
              background: token('color.background.warning.subtle', '#FFFBF0'),
              color: token('color.text.warning', '#974F0C'),
              borderRadius: '3px',
              fontSize: '11px',
              marginTop: '8px',
              marginBottom: '8px',
            }}
          >
            {health.days_to_deadline < 0
              ? `${Math.abs(health.days_to_deadline)}d overdue`
              : `${health.days_to_deadline}d remaining`}
          </div>
        </Tooltip>
      )}

      {/* Action Button */}
      {health.violation_count > 0 && onOpenDatePulse && (
        <button
          onClick={onOpenDatePulse}
          style={{
            padding: '4px 8px',
            fontSize: '12px',
            fontWeight: 500,
            color: token('color.link', '#0052CC'),
            background: 'transparent',
            border: `1px solid ${token('color.link', '#0052CC')}`,
            borderRadius: '2px',
            cursor: 'pointer',
            marginTop: '8px',
          }}
        >
          View {health.violation_count} violations
        </button>
      )}
    </div>
  );
};

export default HealthStatusDescriptor;
