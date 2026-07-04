/**
 * SprintEfficiencyCard (CAT-SPRINTS-NATIVE-20260702-002 Phase 3 Slice 4b).
 *
 * Renders D-008's weighted efficiency score (40% completion + 25%
 * flow-efficiency + 20% scope-stability + 15% approval-timeliness) via
 * useSprintEfficiency. Zero-assumption: the overall score only renders when
 * every component resolved — otherwise this shows which component(s) are
 * missing, never a fabricated/partial score.
 */
import React from 'react';
import { ProgressBar } from '@/components/ads/ProgressBar';
import { useSprintEfficiency } from '@/hooks/useSprintEfficiency';

const BORDER = 'var(--ds-border)';
const TEXT = 'var(--ds-text)';
const SUBTLE = 'var(--ds-text-subtle)';
const SUBTLEST = 'var(--ds-text-subtlest)';

const COMPONENT_LABELS: Record<string, string> = {
  completion: 'Completion',
  flow_efficiency: 'Flow efficiency',
  scope_stability: 'Scope stability',
  approval_timeliness: 'Approval timeliness',
};

function componentRow(label: string, value: number | null) {
  return (
    <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <span style={{ fontSize: 'var(--ds-font-size-300)', color: SUBTLE }}>{label}</span>
      <span style={{ fontSize: 'var(--ds-font-size-300)', color: value === null ? SUBTLEST : TEXT }}>
        {value === null ? '—' : `${Math.round(value)}%`}
      </span>
    </div>
  );
}

export function SprintEfficiencyCard({ sprintId }: { sprintId: string }) {
  const { data, isLoading } = useSprintEfficiency(sprintId);

  return (
    <div
      style={{
        border: `1px solid ${BORDER}`,
        borderRadius: 6,
        padding: 16,
        background: 'var(--ds-surface)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <span style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 700, color: TEXT }}>
        Sprint Efficiency
      </span>

      {isLoading || !data ? (
        <span style={{ fontSize: 'var(--ds-font-size-400)', color: SUBTLE }}>Loading…</span>
      ) : data.overall === null ? (
        <span style={{ fontSize: 'var(--ds-font-size-400)', color: SUBTLE }}>
          Not enough data yet — missing {data.missing.map((m) => COMPONENT_LABELS[m] ?? m).join(', ')}.
        </span>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <ProgressBar
                value={data.overall / 100}
                appearance={data.overall >= 70 ? 'success' : 'default'}
                aria-label="Sprint efficiency"
              />
            </div>
            <span style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 700, color: TEXT }}>
              {Math.round(data.overall)}%
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {componentRow(COMPONENT_LABELS.completion, data.completion)}
            {componentRow(COMPONENT_LABELS.flow_efficiency, data.flow_efficiency)}
            {componentRow(COMPONENT_LABELS.scope_stability, data.scope_stability)}
            {componentRow(COMPONENT_LABELS.approval_timeliness, data.approval_timeliness)}
          </div>
        </div>
      )}
    </div>
  );
}
