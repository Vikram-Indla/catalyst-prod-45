/**
 * QualityGatesSection — release quality gates + computed readiness.
 *
 * Mounts the previously-unmounted gate/readiness RPC stack (tm_release_quality_gates,
 * tm_release_readiness) onto the live ph_releases detail page. Lift-not-rebuild: reuses
 * the existing useReleaseQualityGates/useReleaseReadiness hooks as-is (P2-S1 fixed the
 * RPCs underneath them; this section is the first live consumer of either hook).
 *
 * Header: title + gate count + chevron (expand/collapse), matches WorkItemsSection.
 */
import React, { useState } from 'react';
import Lozenge from '@atlaskit/lozenge';
import Button from '@atlaskit/button/new';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';
import {
  useReleaseQualityGates,
  useEvaluateQualityGates,
  type QualityGate,
} from '@/hooks/releases/useReleaseQualityGates';
import {
  useLatestReadiness,
  useCreateReadinessSnapshot,
} from '@/hooks/releases/useReleaseReadiness';

const TEXT = 'var(--ds-text)';
const SUBTLE = 'var(--ds-text-subtle)';
const SUBTLEST = 'var(--ds-text-subtlest)';
const BORDER = 'var(--ds-border)';

interface Props {
  releaseId: string;
}

const GATE_TYPE_LABEL: Record<QualityGate['gate_type'], string> = {
  pass_rate: 'Pass rate',
  execution_rate: 'Execution rate',
  defect_count: 'Open defects',
  blocker_count: 'Blocker/critical defects',
  coverage: 'Requirement coverage',
  custom: 'Custom',
};

function gateAppearance(status: QualityGate['status']): React.ComponentProps<typeof Lozenge>['appearance'] {
  switch (status) {
    case 'passed': return 'success';
    case 'failed': return 'removed';
    case 'waived': return 'moved';
    default: return 'default';
  }
}

function readinessAppearance(status: string | undefined): React.ComponentProps<typeof Lozenge>['appearance'] {
  switch (status) {
    case 'ready':
    case 'approved': return 'success';
    case 'at_risk': return 'inprogress';
    case 'not_ready': return 'removed';
    default: return 'default';
  }
}

export function QualityGatesSection({ releaseId }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const { data: gates = [], isPending: gatesPending, isError: gatesError } = useReleaseQualityGates(releaseId);
  const { data: readiness, isPending: readinessPending } = useLatestReadiness(releaseId);
  const evaluate = useEvaluateQualityGates();
  const createSnapshot = useCreateReadinessSnapshot();

  return (
    <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 16, marginTop: 16 }}>
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
        onClick={() => setCollapsed((v) => !v)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {collapsed ? <ChevronRightIcon label="" size="medium" /> : <ChevronDownIcon label="" size="medium" />}
          <span style={{ fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: TEXT }}>
            Quality gates
          </span>
          <span style={{ fontSize: 'var(--ds-font-size-200)', color: SUBTLEST }}>
            {gates.length}
          </span>
          {readiness && (
            <Lozenge appearance={readinessAppearance(readiness.overall_status)}>
              {readiness.overall_status.replace('_', ' ')}
            </Lozenge>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }} onClick={(e) => e.stopPropagation()}>
          <Button
            appearance="subtle"
            isDisabled={gates.length === 0 || evaluate.isPending}
            onClick={() => evaluate.mutate({ releaseId })}
          >
            Evaluate now
          </Button>
          <Button
            appearance="subtle"
            isDisabled={gates.length === 0 || createSnapshot.isPending}
            onClick={() => createSnapshot.mutate({ releaseId })}
          >
            Snapshot readiness
          </Button>
        </div>
      </div>

      {!collapsed && (
        <div style={{ marginTop: 12 }}>
          {readiness && (
            <div
              style={{
                display: 'flex',
                gap: 24,
                padding: '8px 12px',
                marginBottom: 12,
                background: 'var(--ds-surface-sunken)',
                borderRadius: 4,
                fontSize: 'var(--ds-font-size-200)',
                color: SUBTLE,
              }}
            >
              <span>Execution: <strong style={{ color: TEXT }}>{readiness.test_execution_pct}%</strong></span>
              <span>Pass rate: <strong style={{ color: TEXT }}>{readiness.test_pass_pct}%</strong></span>
              <span>Gates: <strong style={{ color: TEXT }}>{readiness.gates_passed}/{readiness.gates_total}</strong></span>
              <span>Blocking: <strong style={{ color: TEXT }}>{readiness.blocking_gates_passed}/{readiness.blocking_gates_total}</strong></span>
              {readiness.open_criticals > 0 && (
                <span>Open criticals: <strong style={{ color: 'var(--ds-text-danger)' }}>{readiness.open_criticals}</strong></span>
              )}
            </div>
          )}

          {gatesPending || readinessPending ? (
            <div style={{ fontSize: 'var(--ds-font-size-200)', color: SUBTLEST, padding: '8px 0' }}>Loading gates…</div>
          ) : gatesError ? (
            <div style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-danger)', padding: '8px 0' }}>
              Couldn't load quality gates.
            </div>
          ) : gates.length === 0 ? (
            <div style={{ fontSize: 'var(--ds-font-size-200)', color: SUBTLEST, padding: '8px 0' }}>
              No quality gates configured for this release.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {gates.map((gate) => (
                <div
                  key={gate.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    border: `1px solid ${BORDER}`,
                    borderRadius: 4,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 'var(--ds-font-size-200)', color: TEXT }}>
                      {gate.gate_name}
                      {gate.is_blocking && (
                        <span style={{ color: SUBTLEST }}> · blocking</span>
                      )}
                    </div>
                    <div style={{ fontSize: 'var(--ds-font-size-100)', color: SUBTLEST }}>
                      {GATE_TYPE_LABEL[gate.gate_type]} {gate.threshold_operator} {gate.threshold_value}
                      {gate.current_value !== null && ` · currently ${gate.current_value}`}
                    </div>
                  </div>
                  <Lozenge appearance={gateAppearance(gate.status)}>
                    {gate.status ?? 'pending'}
                  </Lozenge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
