/**
 * SprintTestHealthSection — sprint as a first-class quality control plane
 * (CAT-TESTHUB-V2-SPRINT-RELEASE-20260706-001 slice G1).
 *
 * Mounts on SprintDetailPage (ReleaseDetailPage + SPRINT_CONFIG) as a sibling
 * of QualityGatesSection. Consumes tm_compute_sprint_test_health via
 * useSprintTestHealth/useComputeSprintTestHealth: story coverage, execution
 * progress, failed/blocked, open blocker defects, draft cases → pass/warn/block
 * gate. Zero-assumption: never computed → honest empty state, no fabricated
 * numbers.
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
import {
  useSprintTestHealth,
  useComputeSprintTestHealth,
  type SprintGateState,
} from '@/hooks/test-management/useSprintTestHealth';

const TEXT = 'var(--ds-text)';
const SUBTLE = 'var(--ds-text-subtle)';
const SUBTLEST = 'var(--ds-text-subtlest)';

const GATE_APPEARANCE: Record<SprintGateState, 'success' | 'moved' | 'removed'> = {
  pass: 'success',
  warn: 'moved',
  block: 'removed',
};

const GATE_LABEL: Record<SprintGateState, string> = {
  pass: 'Pass',
  warn: 'Warn',
  block: 'Block',
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

export function SprintTestHealthSection({ sprintId }: { sprintId: string }) {
  const [expanded, setExpanded] = useState(true);
  const navigate = useNavigate();
  const { data: health, isPending, isError, error, refetch } = useSprintTestHealth(sprintId);
  const compute = useComputeSprintTestHealth();

  const totals = health?.totals;
  const coverage =
    totals && totals.stories > 0
      ? `${totals.covered_stories}/${totals.stories}`
      : null;
  const execution =
    totals && totals.scope > 0
      ? `${totals.executed}/${totals.scope}`
      : null;

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
            ? <ChevronDownIcon label="Collapse test health" />
            : <ChevronRightIcon label="Expand test health" />}
        </button>
        <h3 style={{ margin: 0, fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: TEXT }}>
          Test health
        </h3>
        {health && (
          <Lozenge appearance={GATE_APPEARANCE[health.gate]} isBold>
            {GATE_LABEL[health.gate]}
          </Lozenge>
        )}
        <span style={{ flex: 1 }} />
        {/* G6: sprint-scoped AI generation entry (drafts only) */}
        <GenerateTestCasesCTA label="Generate test cases for this sprint" />
        <Button
          appearance="subtle"
          spacing="compact"
          isLoading={compute.isPending}
          onClick={() => compute.mutate(sprintId)}
        >
          {health ? 'Recompute' : 'Compute health'}
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
            <SectionMessage appearance="error" title="Couldn't load sprint test health">
              <p style={{ margin: 0 }}>{(error as Error)?.message}</p>
              <Button appearance="subtle" spacing="compact" onClick={() => refetch()}>Try again</Button>
            </SectionMessage>
          ) : isPending ? (
            <span style={{ color: SUBTLEST, fontSize: 'var(--ds-font-size-300)' }}>Loading…</span>
          ) : !health ? (
            <div style={{ color: SUBTLE, fontSize: 'var(--ds-font-size-300)' }}>
              Test health has not been computed for this sprint yet.
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
                <Stat label="Story coverage" value={coverage ?? '—'} />
                <Stat label="Executed" value={execution ?? '—'} />
                <Stat label="Passed" value={totals!.scope > 0 ? totals!.passed : '—'} />
                <Stat label="Failed" value={totals!.failed > 0 ? totals!.failed : totals!.scope > 0 ? 0 : '—'} danger={totals!.failed > 0} />
                <Stat label="Blocked" value={totals!.blocked > 0 ? totals!.blocked : totals!.scope > 0 ? 0 : '—'} danger={totals!.blocked > 0} />
                <Stat label="Blocker defects" value={totals!.open_blocker_defects > 0 ? totals!.open_blocker_defects : 0} danger={totals!.open_blocker_defects > 0} />
                <Stat label="Draft cases" value={totals!.draft_cases > 0 ? totals!.draft_cases : 0} danger={totals!.draft_cases > 0} />
              </div>

              {health.reasons.length > 0 && (
                <ul style={{
                  margin: '12px 0 0',
                  paddingLeft: 20,
                  color: SUBTLE,
                  fontSize: 'var(--ds-font-size-300)',
                  lineHeight: 'var(--ds-line-height-body)',
                }}>
                  {health.reasons.map((r) => <li key={r}>{r}</li>)}
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
                  Computed {new Date(health.computed_at).toLocaleString()}
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
