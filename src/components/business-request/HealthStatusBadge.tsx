/**
 * HealthStatusBadge Component
 *
 * Glanceable health status indicator (3 sizes)
 * - sm: 10px dot only (hover shows text)
 * - md: dot + status text
 * - lg: dot + status text + brief descriptor
 *
 * Colors use ADS tokens:
 * Uncommitted: grey, Committed: blue, On Track: green,
 * Delayed: amber, At Risk: red, Blocked: red, Delivered: green
 */

import React from 'react';

import { BusinessRequestHealth, HealthStatusBadgeProps } from '@/types/date-pulse';

// ADS token color mapping
const healthColorMap: Record<string, string> = {
  Uncommitted: 'var(--ds-text-subtlest, #6B778C)', // grey
  Committed: 'var(--ds-background-information, #0052CC)', // blue
  'On Track': 'var(--ds-background-success, #216E4E)', // green
  Delayed: 'var(--ds-background-warning, #974F0C)', // amber
  'At Risk': 'var(--ds-background-danger, #AE2A19)', // red
  Blocked: 'var(--ds-background-danger, #AE2A19)', // red
  Delivered: 'var(--ds-background-success, #216E4E)', // green
};

const healthLabelMap: Record<string, string> = {
  Uncommitted: 'Uncommitted',
  Committed: 'Committed',
  'On Track': 'On Track',
  Delayed: 'Delayed',
  'At Risk': 'At Risk',
  Blocked: 'Blocked',
  Delivered: 'Delivered',
};

export const HealthStatusBadge: React.FC<HealthStatusBadgeProps> = ({
  health,
  size = 'md',
  showText = false,
  onClick,
  className = '',
  'data-testid': testId,
}) => {
  const color = healthColorMap[health.health_status] || healthColorMap.Uncommitted;
  const label = healthLabelMap[health.health_status];

  if (size === 'sm') {
    return (
      <button
        onClick={onClick}
        className={`health-badge health-badge--sm ${className}`}
        data-testid={testId || 'health-status-badge'}
        title={health.health_summary}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: onClick ? 'pointer' : 'default',
          padding: '2px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          className="health-badge__dot"
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: color,
            display: 'inline-block',
          }}
          aria-hidden="true"
        />
      </button>
    );
  }

  if (size === 'md') {
    return (
      <button
        onClick={onClick}
        className={`health-badge health-badge--md ${className}`}
        data-testid={testId || 'health-status-badge'}
        title={health.health_descriptor}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: onClick ? 'pointer' : 'default',
          padding: '2px 4px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '13px',
          fontWeight: 500,
          color: 'var(--ds-text, #172B4D)',
        }}
      >
        <span
          className="health-badge__dot"
          style={{
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            background: color,
            display: 'inline-block',
            flexShrink: 0,
          }}
          aria-hidden="true"
        />
        {showText && <span className="health-badge__text">{label}</span>}
      </button>
    );
  }

  // lg
  return (
    <div
      className={`health-badge health-badge--lg ${className}`}
      data-testid={testId || 'health-status-badge'}
      style={{
        padding: '8px',
        background: 'var(--ds-surface, #FFFFFF)',
        border: '1px solid var(--ds-border, #DFE1E6)',
        borderRadius: '3px',
        fontSize: '13px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
        <span
          className="health-badge__dot"
          style={{
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            background: color,
            display: 'inline-block',
            flexShrink: 0,
          }}
          aria-hidden="true"
        />
        <span className="health-badge__label" style={{ fontWeight: 600 }}>
          {label}
        </span>
      </div>
      <div className="health-badge__descriptor" style={{ color: 'var(--ds-text-subtle, #42526E)', fontSize: '12px' }}>
        {health.health_descriptor}
      </div>
    </div>
  );
};

export default HealthStatusBadge;
