/**
 * DatePulseHoverCard Component
 *
 * CANONICAL PATTERN: Uses @atlaskit/lozenge for severity badges.
 * Uses @atlaskit/tokens for all colors. Violations show affected item key
 * with avatar + name when available (following Jira notification pattern).
 *
 * Displays:
 * - Violation count by severity via Lozenge
 * - Detailed violation list (affected item + description)
 * - Dates and context in header
 * - Action links (design TBD)
 */

import React from 'react';
import Lozenge from '@atlaskit/lozenge';
import { token } from '@atlaskit/tokens';

import { DatePulseHoverCardProps, DatePulseViolation, ViolationSeverity } from '@/types/date-pulse';

const severityConfig: Record<ViolationSeverity, { appearance: 'moved' | 'new' | 'removed' | 'inprogress' | 'default'; label: string }> = {
  critical: {
    appearance: 'removed', // red
    label: 'CRITICAL',
  },
  warning: {
    appearance: 'moved', // amber
    label: 'WARNING',
  },
  advisory: {
    appearance: 'default', // blue
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
    <div style={{ marginBottom: '16px' }}>
      <div style={{ marginBottom: '8px' }}>
        <Lozenge appearance={config.appearance} isBold>
          {config.label} ({violations.length})
        </Lozenge>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '4px' }}>
        {violations.map((v, idx) => (
          <div
            key={v.id || idx}
            style={{
              fontSize: '12px',
              lineHeight: '1.4',
            }}
          >
            <div style={{ fontWeight: 500, color: token('color.text', '#172B4D'), marginBottom: '2px' }}>
              {v.affected_item_key ? `${v.affected_item_key}: ${v.title}` : v.title}
            </div>
            <div style={{ color: token('color.text.subtle', '#42526E'), fontSize: '11px' }}>
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
          background: token('color.surface.overlay', '#FFFFFF'),
          border: `1px solid ${token('color.border', '#DFE1E6')}`,
          borderRadius: '3px',
          fontSize: '13px',
        }}
      >
        <div style={{ color: token('color.text.subtle', '#42526E') }}>
          ✓ No violations detected. All dates aligned.
        </div>
      </div>
    );
  }

  return (
    <div
      className={`date-pulse-hover-card ${className}`}
      style={{
        padding: '12px',
        background: token('color.surface.overlay', '#FFFFFF'),
        border: `1px solid ${token('color.border', '#DFE1E6')}`,
        borderRadius: '3px',
        minWidth: '320px',
        maxWidth: '500px',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 600, color: token('color.text', '#172B4D') }}>
          Date Pulse Violations
        </h3>
        <p style={{ margin: 0, fontSize: '12px', color: token('color.text.subtle', '#42526E') }}>
          {brKey} · Target: {formatDate(brTargetDate)} · Release: {formatDate(releaseDate)}
        </p>
      </div>

      {/* Violation groups */}
      <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: `1px solid ${token('color.border', '#DFE1E6')}` }}>
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
            color: token('color.link', '#0052CC'),
            background: 'transparent',
            border: `1px solid ${token('color.link', '#0052CC')}`,
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
