import React from 'react';
import Lozenge from '@atlaskit/lozenge';
import Button from '@atlaskit/button/new';
import type { ProductMilestoneWithProgress } from '@/types/product-milestone';

export interface MilestoneCardProps {
  milestone: ProductMilestoneWithProgress;
  onClick?: (milestoneId: string) => void;
  onEdit?: (milestoneId: string) => void;
  onDelete?: (milestoneId: string) => void;
}

const HEALTH_APPEARANCE = {
  on_track: 'success',
  at_risk: 'moved',
  off_track: 'removed',
} as const;

const HEALTH_LABEL = {
  on_track: 'On track',
  at_risk: 'At risk',
  off_track: 'Off track',
} as const;

const STATUS_APPEARANCE: Record<string, string> = {
  planned: 'default',
  in_progress: 'inprogress',
  at_risk: 'moved',
  completed: 'success',
  delivered: 'success',
  cancelled: 'removed',
};

function fmt(d: string | null | undefined): string {
  if (!d) return 'TBD';
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function MilestoneCard({ milestone, onClick, onEdit, onDelete }: MilestoneCardProps) {
  const healthAppearance = HEALTH_APPEARANCE[milestone.healthStatus] ?? 'default';
  const statusAppearance = STATUS_APPEARANCE[milestone.status] ?? 'default';

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={() => onClick?.(milestone.id)}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.(milestone.id)}
      style={{
        border: '1px solid var(--ds-border)',
        borderRadius: 6,
        padding: '14px 16px',
        background: 'var(--ds-surface-raised)',
        cursor: onClick ? 'pointer' : 'default',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ds-text)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {milestone.title}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ds-text-subtlest)' }}>{milestone.key}</div>
        </div>
        {milestone.quarter && (
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ds-text-subtle)', background: 'var(--ds-background-neutral)', border: '1px solid var(--ds-border)', borderRadius: 3, padding: '2px 6px', flexShrink: 0 }}>
            {milestone.quarter}
          </span>
        )}
      </div>

      {/* Status + health */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <Lozenge appearance={statusAppearance as any}>{milestone.status ?? '—'}</Lozenge>
        <Lozenge appearance={healthAppearance}>{HEALTH_LABEL[milestone.healthStatus] ?? milestone.healthStatus}</Lozenge>
      </div>

      {/* Dates */}
      <div style={{ fontSize: 12, color: 'var(--ds-text-subtle)' }}>
        {fmt(milestone.startDate)} → {fmt(milestone.targetDate)}
      </div>

      {/* Progress bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ds-text-subtle)' }}>Progress</span>
          <span style={{ fontSize: 11, color: 'var(--ds-text-subtle)' }}>{milestone.progressPercent}%</span>
        </div>
        <div style={{ height: 4, borderRadius: 2, background: 'var(--ds-background-neutral)', overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 2, background: 'var(--ds-background-brand-bold)', width: `${milestone.progressPercent}%`, transition: 'width .3s' }} />
        </div>
      </div>

      {/* Linked items */}
      <div style={{ fontSize: 12, color: 'var(--ds-text-subtle)', display: 'flex', gap: 12 }}>
        <span>{milestone.linkedBRCount} BR{milestone.linkedBRCount !== 1 ? 's' : ''}</span>
        <span>{milestone.linkedFeatures.length} Feature{milestone.linkedFeatures.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Actions */}
      {(onEdit || onDelete) && (
        <div style={{ display: 'flex', gap: 6, borderTop: '1px solid var(--ds-border)', paddingTop: 10 }}>
          {onEdit && (
            <Button
              appearance="subtle"
              spacing="compact"
              onClick={(e) => { e.stopPropagation(); onEdit(milestone.id); }}
            >
              Edit
            </Button>
          )}
          {onDelete && (
            <Button
              appearance="subtle"
              spacing="compact"
              onClick={(e) => { e.stopPropagation(); onDelete(milestone.id); }}
            >
              Archive
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
