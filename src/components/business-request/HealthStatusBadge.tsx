import React from 'react';
import Tooltip from '@atlaskit/tooltip';
import { token } from '@atlaskit/tokens';
import type { BusinessRequestHealth } from '@/types/date-pulse';

interface HealthStatusBadgeProps {
  health: BusinessRequestHealth;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

const DOT_COLORS: Record<string, string> = {
  Uncommitted:    token('color.icon.disabled',     'var(--ds-text-disabled)'),
  Committed:      token('color.icon.information',  'var(--ds-link)'),
  'On Track':     token('color.icon.success',      'var(--ds-background-success-bold)'),
  Delayed:        token('color.icon.warning',      '#CF9F02'),
  'At Risk':      token('color.icon.danger',       'var(--ds-background-danger-bold)'),
  Blocked:        token('color.icon.danger',       'var(--ds-background-danger-bold)'),
  Delivered:      token('color.icon.success',      'var(--ds-background-success-bold)'),
};

const LABEL_COLORS: Record<string, string> = {
  Uncommitted:    token('color.text.subtlest',    'var(--ds-icon-subtle)'),
  Committed:      token('color.text.information', 'var(--ds-link)'),
  'On Track':     token('color.text.success',     'var(--ds-text-success)'),
  Delayed:        token('color.text.warning',     'var(--ds-text-warning)'),
  'At Risk':      token('color.text.danger',      'var(--ds-text-danger)'),
  Blocked:        token('color.text.danger',      'var(--ds-text-danger)'),
  Delivered:      token('color.text.success',     'var(--ds-text-success)'),
};

const FRIENDLY_LABELS: Record<string, string> = {
  Uncommitted:    'Not planned',
  Committed:      'Plan in place',
  'On Track':     'On schedule',
  Delayed:        'Behind schedule',
  'At Risk':      'At risk',
  Blocked:        'Blocked',
  Delivered:      'Delivered',
};

const SUBTITLES: Record<string, string> = {
  Uncommitted:    'Link work items to begin delivery tracking',
  Committed:      'Work linked · dates set · no violations',
  'On Track':     'All dates aligned · delivery window clear',
  Delayed:        'Date violations detected · review required',
  'At Risk':      'Deadline approaching · no active work',
  Blocked:        'Critical blocker preventing progress',
  Delivered:      'All linked work complete',
};

const HEALTH_DESCRIPTIONS: Record<string, string> = {
  Uncommitted:
    'No linked epics or stories yet. Delivery tracking is unavailable until work items are connected to this request.',
  Committed:
    'A target date is set and linked work exists. No delivery violations have been detected.',
  'On Track':
    'All linked work items are progressing within the committed delivery window. No interventions needed.',
  Delayed:
    'One or more linked items have missed or are past their planned dates. Review and replan required.',
  'At Risk':
    'Critical date misalignments detected across linked work. Without immediate intervention, this request is unlikely to deliver on time.',
  Blocked:
    'One or more linked work items are blocked and preventing progress. Immediate action is required.',
  Delivered:
    'All linked work has been completed and successfully delivered.',
};

function DeliveryTooltipBody({ health }: { health: BusinessRequestHealth }) {
  const description = HEALTH_DESCRIPTIONS[health.health_status] ?? '';
  return (
    <div style={{ maxWidth: 260, padding: '2px 0' }}>
      <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 'var(--ds-font-size-200)' }}>
        Delivery · {FRIENDLY_LABELS[health.health_status] ?? health.health_status}
      </div>
      <div style={{ fontSize: 'var(--ds-font-size-200)', lineHeight: '16px' }}>{description}</div>
      {health.br_target_date && (
        <div style={{ marginTop: 6, fontSize: 'var(--ds-font-size-100)', opacity: 0.8 }}>
          Target:{' '}
          {new Date(health.br_target_date).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </div>
      )}
      {health.violation_count > 0 && (
        <div style={{ marginTop: 4, fontSize: 'var(--ds-font-size-100)' }}>
          {health.violation_count} violation{health.violation_count !== 1 ? 's' : ''}
          {health.critical_violation_count > 0 && (
            <span style={{ marginLeft: 4, color: 'var(--ds-background-danger-bold)' }}>
              · {health.critical_violation_count} critical
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function HealthStatusBadge({ health }: HealthStatusBadgeProps) {
  const status = health.health_status;
  const dotColor   = DOT_COLORS[status]   ?? token('color.icon.disabled',  'var(--ds-text-disabled)');
  const labelColor = LABEL_COLORS[status] ?? token('color.text.subtlest',  'var(--ds-icon-subtle)');
  const label      = FRIENDLY_LABELS[status] ?? status;
  const subtitle   = SUBTITLES[status] ?? '';

  return (
    <Tooltip content={<DeliveryTooltipBody health={health} />} position="bottom-start">
      <div
        role="button"
        tabIndex={0}
        aria-label={`Delivery: ${label}`}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') e.preventDefault(); }}
        style={{ display: 'flex', flexDirection: 'column', gap: 2, cursor: 'default', border: 'none', background: 'transparent', padding: 0 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div
            aria-hidden="true"
            style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }}
          />
          <span style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 500, color: labelColor, lineHeight: '20px' }}>
            {label}
          </span>
        </div>
        <span
          style={{
            fontSize: 'var(--ds-font-size-100)',
            color: token('color.text.subtlest', 'var(--ds-icon-subtle)'),
            lineHeight: '14px',
            paddingLeft: 15,
          }}
        >
          {subtitle}
        </span>
      </div>
    </Tooltip>
  );
}
