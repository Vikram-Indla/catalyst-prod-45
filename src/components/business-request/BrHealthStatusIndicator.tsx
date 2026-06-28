import React from 'react';
import Tooltip from '@atlaskit/tooltip';
import Lozenge from '@atlaskit/lozenge';
import { token } from '@atlaskit/tokens';
import type { BusinessRequestHealth } from '@/types/date-pulse';

type LozengeAppearance = 'default' | 'inprogress' | 'moved' | 'new' | 'removed' | 'success';

const HEALTH_APPEARANCE: Record<string, LozengeAppearance> = {
  Delivered:    'success',
  'On Track':   'inprogress',
  Committed:    'inprogress',
  Delayed:      'moved',
  'At Risk':    'removed',
  Blocked:      'removed',
  Uncommitted:  'default',
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

interface Props {
  health: BusinessRequestHealth;
}

function TooltipBody({ health }: Props) {
  const description = HEALTH_DESCRIPTIONS[health.health_status] ?? '';
  return (
    <div style={{ maxWidth: 260, padding: '2px 0' }}>
      <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 'var(--ds-font-size-200)' }}>
        {health.health_status}
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
          {health.violation_count} violation
          {health.violation_count !== 1 ? 's' : ''}
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

export function BrHealthStatusIndicator({ health }: Props) {
  const appearance = HEALTH_APPEARANCE[health.health_status] ?? 'default';

  return (
    <div
      data-cv-section="br-health-status-indicator"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
      }}
    >
      <span
        style={{
          fontSize: 'var(--ds-font-size-400)',
          fontWeight: 500,
          color: token('color.text.subtle', 'var(--ds-text-subtle)'),
          whiteSpace: 'nowrap',
        }}
      >
        Health Status
      </span>
      <Tooltip content={<TooltipBody health={health} />} position="bottom-start">
        <span
          style={{ cursor: 'default', display: 'inline-flex', alignItems: 'center' }}
          tabIndex={0}
          aria-label={`Health Status: ${health.health_status}`}
        >
          <Lozenge appearance={appearance} isBold>
            {health.health_status}
          </Lozenge>
        </span>
      </Tooltip>
    </div>
  );
}
