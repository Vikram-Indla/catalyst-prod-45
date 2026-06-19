/**
 * DatePulseHoverCard Component
 *
 * Full violations list panel
 * Shows all violations sorted by severity (critical → warning → advisory)
 *
 * Displays:
 * - Violation count by severity
 * - Detailed violation list with affected items
 * - Action buttons (Learn More, Update Dates, Close)
 */

import React from 'react';

import { DatePulseHoverCardProps, DatePulseViolation, ViolationSeverity } from '@/types/date-pulse';

const severityConfig: Record<ViolationSeverity, { icon: string; color: string; label: string }> = {
  critical: {
    icon: '🔴',
    color: 'var(--ds-background-danger, #AE2A19)',
    label: 'CRITICAL',
  },
  warning: {
    icon: '🟡',
    color: 'var(--ds-background-warning, #974F0C)',
    label: 'WARNING',
  },
  advisory: {
    icon: 'ℹ️',
    color: 'var(--ds-background-information, #0052CC)',
    label: 'ADVISORY',
  },
};

const ViolationGroup: React.FC<{
  severity: ViolationSeverity;
  violations: DatePulseViolation[];
}> = ({ severity, violations }) => {
  if (violations.length === 0) return null;

  const config = severityConfig[severity];

  return (
    <div style={{ marginBottom: '12px' }}>
      <div
        style={{
          fontSize: '12px',
          fontWeight: 600,
          color: config.color,
          marginBottom: '6px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <span>{config.icon}</span>
        <span>
          {config.label} ({violations.length})
        </span>
      </div>

      <div style={{ paddingLeft: '20px' }}>
        {violations.map((v, idx) => (
          <div
            key={v.id || idx}
            style={{
              fontSize: '12px',
              marginBottom: '6px',
              color: 'var(--ds-text, #172B4D)',
            }}
          >
            <div style={{ fontWeight: 500, marginBottom: '2px' }}>
              {v.affected_item_key ? `${v.affected_item_key}: ${v.title}` : v.title}
            </div>
            <div style={{ color: 'var(--ds-text-subtle, #42526E)', fontSize: '11px' }}>
              {v.description}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const DatePulseHoverCard: React.FC<DatePulseHoverCardProps> = ({
  violations,
  brKey,
  brTargetDate,
  releaseDate,
  className = '',
}) => {
  const criticalViolations = violations.filter(v => v.severity === 'critical');
  const warningViolations = violations.filter(v => v.severity === 'warning');
  const advisoryViolations = violations.filter(v => v.severity === 'advisory');

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  if (violations.length === 0) {
    return (
      <div
        className={`date-pulse-hover-card ${className}`}
        style={{
          padding: '12px',
          background: 'var(--ds-surface-overlay, #FFFFFF)',
          border: '1px solid var(--ds-border, #DFE1E6)',
          borderRadius: '3px',
          fontSize: '13px',
        }}
      >
        <div style={{ color: 'var(--ds-text-subtle, #42526E)' }}>✓ No violations detected. All dates aligned.</div>
      </div>
    );
  }

  return (
    <div
      className={`date-pulse-hover-card ${className}`}
      style={{
        padding: '12px',
        background: 'var(--ds-surface-overlay, #FFFFFF)',
        border: '1px solid var(--ds-border, #DFE1E6)',
        borderRadius: '3px',
        minWidth: '320px',
        maxWidth: '500px',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '12px' }}>
        <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 600 }}>
          Date Pulse Violations ({violations.length})
        </h3>
        <p style={{ margin: 0, fontSize: '12px', color: 'var(--ds-text-subtle, #42526E)' }}>
          {brKey} · Target: {formatDate(brTargetDate)} · Release: {formatDate(releaseDate)}
        </p>
      </div>

      {/* Violation groups */}
      <div style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--ds-border, #DFE1E6)' }}>
        <ViolationGroup severity="critical" violations={criticalViolations} />
        <ViolationGroup severity="warning" violations={warningViolations} />
        <ViolationGroup severity="advisory" violations={advisoryViolations} />
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-start', flexWrap: 'wrap' }}>
        <button
          style={{
            padding: '4px 8px',
            fontSize: '12px',
            color: 'var(--ds-link, #0052CC)',
            background: 'transparent',
            border: '1px solid var(--ds-link, #0052CC)',
            borderRadius: '2px',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          Learn More
        </button>
        <button
          style={{
            padding: '4px 8px',
            fontSize: '12px',
            color: 'var(--ds-link, #0052CC)',
            background: 'transparent',
            border: '1px solid var(--ds-link, #0052CC)',
            borderRadius: '2px',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          Update Dates
        </button>
      </div>
    </div>
  );
};

export default DatePulseHoverCard;
