import React from 'react';
import type { BusinessRequestHealth } from '@/types/date-pulse';

interface HealthStatusDescriptorProps {
  health: BusinessRequestHealth;
}

const STATUS_DESCRIPTIONS: Record<string, string> = {
  'Uncommitted': 'No linked work set. Delivery tracking unavailable.',
  'Committed': 'Dates set and work linked. No violations detected yet.',
  'On Track': 'All dates aligned, work progressing within committed window.',
  'Delayed': 'One or more date violations detected. Review required.',
  'At Risk': 'Critical date misalignments. Delivery at risk without intervention.',
  'Blocked': 'Blocked work items preventing progress. Immediate attention needed.',
  'Delivered': 'All linked work completed and delivered.',
};

export function HealthStatusDescriptor({ health }: HealthStatusDescriptorProps) {
  const baseDescription = STATUS_DESCRIPTIONS[health.health_status] || '';
  // When Uncommitted + target date set: the target-but-no-work copy always wins,
  // regardless of stale health_descriptor values in the DB.
  const description =
    (health.health_status === 'Uncommitted' && health.br_target_date)
      ? 'Target date set but no linked work items. Delivery tracking unavailable.'
      : (health.health_descriptor || baseDescription);

  return (
    <div style={{ marginBottom: health.violation_count > 0 ? '12px' : 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: 'var(--ds-text, #172B4D)' }}>
          {health.health_status}
        </span>
        {health.br_target_date && (
          <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest, #6B778C)' }}>
            Target: {new Date(health.br_target_date).toLocaleDateString('en-GB', {
              day: 'numeric', month: 'short', year: 'numeric',
            })}
          </span>
        )}
      </div>
      <p style={{ margin: 0, fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle, #42526E)', lineHeight: '16px' }}>
        {description}
      </p>
      {health.violation_count > 0 && (
        <div style={{ marginTop: 6, fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest, #6B778C)' }}>
          {health.violation_count} violation{health.violation_count !== 1 ? 's' : ''} detected
          {health.critical_violation_count > 0 && (
            <span style={{ color: 'var(--ds-text-danger, #AE2A19)', marginLeft: 4 }}>
              · {health.critical_violation_count} critical
            </span>
          )}
        </div>
      )}
    </div>
  );
}
