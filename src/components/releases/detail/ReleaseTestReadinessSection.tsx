/**
 * ReleaseTestReadinessSection — release as the highest quality gate
 * (CAT-TESTHUB-V2-SPRINT-RELEASE-20260706-001 slice G3).
 *
 * Sibling of QualityGatesSection on the canonical Release detail page
 * (entity-hub RELEASE_CONFIG → ph_releases). Shows execution health, failed/
 * blocked tests, blocking defects, evidence gaps, draft-case leaks and the
 * computed pass/warn/block readiness gate. A blocked gate can never silently
 * read as pass — reasons are always listed.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Lozenge from '@atlaskit/lozenge';
import Button from '@atlaskit/button/new';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';
import SectionMessage from '@atlaskit/section-message';
import { Routes } from '@/lib/routes';
import { GenerateTestCasesCTA } from '@/components/testhub/GenerateTestCasesCTA';
import { useReleaseTestGate, type ReleaseGateState } from '@/hooks/releases/useReleaseTestGate';

const TEXT = 'var(--ds-text)';
const SUBTLE = 'var(--ds-text-subtle)';
const SUBTLEST = 'var(--ds-text-subtlest)';

const GATE_APPEARANCE: Record<ReleaseGateState, 'success' | 'moved' | 'removed'> = {
  pass: 'success',
  warn: 'moved',
  block: 'removed',
};

function Stat({ label, value, danger }: { label: string; value: React.ReactNode; danger?: boolean }) {
  return (
    <div style={{ minWidth: 96 }}>
      <div style={{ fontSize: 'var(--ds-font-size-100)', color: SUBTLEST, marginBottom: 2 }}>{label}</div>
      <div style={{
        fontSize: 'var(--ds-font-size-400)',
        fontWeight: 600,
        color: danger ? 'var(--ds-text-danger)' : TEXT,
      }}>
        {value}
      </div>
    </div>
  );
}

export function ReleaseTestReadinessSection({ releaseId }: { releaseId: string }) {
  const [expanded, setExpanded] = useState(true);
  const navigate = useNavigate();
  const { data: gate, isPending, isError, error, refetch } = useReleaseTestGate(releaseId);
  const totals = gate?.totals;

  return (
    <section style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          {expanded
            ? <ChevronDownIcon label="Collapse test readiness" />
            : <ChevronRightIcon label="Expand test readiness" />}
        </button>
        <div role="heading" aria-level={3} style={{ margin: 0, fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: TEXT }}>
          Test readiness
        </div>
        {gate && (
          <Lozenge appearance={GATE_APPEARANCE[gate.gate]} isBold>
            {gate.gate === 'pass' ? 'Pass' : gate.gate === 'warn' ? 'Warn' : 'Block'}
          </Lozenge>
        )}
        <span style={{ flex: 1 }} />
        {/* G6: release-scoped AI generation entry (drafts only) */}
        <GenerateTestCasesCTA label="Generate test cases for this release" />
        <Button appearance="subtle" spacing="compact" onClick={() => refetch()}>
          Recompute
        </Button>
      </div>

      {expanded && (
        <div style={{
          border: '1px solid var(--ds-border)',
          borderRadius: 6,
          padding: 16,
          background: 'var(--ds-surface)',
        }}>
          {isError ? (
            <SectionMessage appearance="error" title="Couldn't compute release test readiness">
              <p style={{ margin: 0 }}>{(error as Error)?.message}</p>
              <Button appearance="subtle" spacing="compact" onClick={() => refetch()}>Try again</Button>
            </SectionMessage>
          ) : isPending || !totals ? (
            <span style={{ color: SUBTLEST, fontSize: 'var(--ds-font-size-300)' }}>Computing…</span>
          ) : (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
                <Stat label="Scope" value={totals.scope > 0 ? totals.scope : '—'} />
                <Stat label="Executed" value={totals.scope > 0 ? `${totals.executed}/${totals.scope}` : '—'} />
                <Stat label="Passed" value={totals.scope > 0 ? totals.passed : '—'} />
                <Stat label="Failed" value={totals.scope > 0 ? totals.failed : '—'} danger={totals.failed > 0} />
                <Stat label="Blocked" value={totals.scope > 0 ? totals.blocked : '—'} danger={totals.blocked > 0} />
                <Stat label="Blocking defects" value={totals.open_blocker_defects} danger={totals.open_blocker_defects > 0} />
                <Stat
                  label="Evidence gaps"
                  value={totals.failed_blocked_total > 0
                    ? totals.failed_blocked_total - totals.failed_blocked_with_evidence
                    : '—'}
                  danger={totals.failed_blocked_total > totals.failed_blocked_with_evidence}
                />
                <Stat label="Draft cases" value={totals.draft_cases} danger={totals.draft_cases > 0} />
                <Stat
                  label="Executions"
                  value={totals.executions > 0 ? `${totals.executions_completed}/${totals.executions}` : '—'}
                />
              </div>

              {gate!.reasons.length > 0 && (
                <ul style={{
                  margin: '12px 0 0',
                  paddingLeft: 20,
                  color: SUBTLE,
                  fontSize: 'var(--ds-font-size-300)',
                  lineHeight: 'var(--ds-line-height-body)',
                }}>
                  {gate!.reasons.map((r) => <li key={r}>{r}</li>)}
                </ul>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
                <Button appearance="subtle" spacing="compact" onClick={() => navigate(Routes.testHub.repository())}>
                  Open repository
                </Button>
                <Button appearance="subtle" spacing="compact" onClick={() => navigate(Routes.testHub.traceability())}>
                  Open traceability
                </Button>
                <span style={{ marginLeft: 'auto', color: SUBTLEST, fontSize: 'var(--ds-font-size-100)' }}>
                  Computed {gate ? new Date(gate.computed_at).toLocaleString() : ''}
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
