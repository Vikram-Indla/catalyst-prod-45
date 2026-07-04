/**
 * STRATA — Scorecard index (/strata/scorecards).
 * Models grid (governed config records) + instances list for the active cycle.
 * Every score/band shown here comes from useScorecardCalc (server RPC /
 * frozen snapshot) — the UI never computes rollups.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Badge from '@atlaskit/badge';
import { EmptyState, Lozenge, SectionMessage, Spinner } from '@/components/ads';
import { PageContainer } from '@/components/shared/PageContainer';
import { Routes } from '@/lib/routes';
import {
  useScorecardCalc, useScorecardInstances, useScorecardModels, useStrataContext,
} from '@/modules/strata/hooks/useStrata';
import {
  StrataBandLozenge, StrataConfigContextBar, StrataDataStateLozenge, StrataPanel,
} from '@/modules/strata/components/shared';
import type { GovernedStatus, StrataScorecardInstance, StrataScorecardModel } from '@/modules/strata/types';

// ── Governed-status lozenge (SYSTEM governance states — DB CHECKs) ──────────
const GOVERNED_APPEARANCE: Record<GovernedStatus, React.ComponentProps<typeof Lozenge>['appearance']> = {
  approved: 'success',
  draft: 'default',
  pending_approval: 'moved',
  retired: 'removed',
  superseded: 'removed',
};

function GovernedStatusLozenge({ status }: { status: GovernedStatus | string | null | undefined }) {
  if (!status) return null;
  const appearance = GOVERNED_APPEARANCE[status as GovernedStatus];
  if (!appearance) return <Lozenge appearance="default">{String(status).replace(/_/g, ' ')}</Lozenge>;
  return <Lozenge appearance={appearance}>{String(status).replace(/_/g, ' ')}</Lozenge>;
}

const chipStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', padding: '4px 8px', borderRadius: 4,
  background: 'var(--ds-background-neutral)', color: 'var(--ds-text-subtle)',
  fontSize: 12, fontWeight: 500,
};

// ── Model card ───────────────────────────────────────────────────────────────
function ModelCard({ model }: { model: StrataScorecardModel }) {
  return (
    <div
      data-testid={`strata-model-card-${model.id}`}
      style={{
        background: 'var(--ds-surface-raised)', border: '1px solid var(--ds-border)',
        borderRadius: 8, padding: 16, minWidth: 0,
        display: 'flex', flexDirection: 'column', gap: 8,
        boxShadow: 'var(--ds-shadow-raised)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ds-text)', minWidth: 0, overflowWrap: 'anywhere' }}>
          {model.name}
        </span>
        <span style={{ flexShrink: 0 }}><Badge appearance="default">{`v${model.version}`}</Badge></span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <GovernedStatusLozenge status={model.status} />
        {model.owner_scope_type ? <span style={chipStyle}>{model.owner_scope_type}</span> : null}
      </div>
      <div style={{ fontSize: 12, color: 'var(--ds-text-subtlest)' }}>
        Rollup: {model.rollup_method ?? '—'} · Granularity: {model.period_granularity ?? '—'}
      </div>
    </div>
  );
}

// ── Score cell — server-computed only, zero-assumption ───────────────────────
function ScoreCell({ instance }: { instance: StrataScorecardInstance }) {
  const calc = useScorecardCalc(instance);
  if (calc.isLoading) {
    return <span style={{ color: 'var(--ds-text-subtlest)', fontSize: 12 }}>…</span>;
  }
  if (calc.isError || !calc.data || !calc.data.has_data) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ color: 'var(--ds-text)', fontWeight: 600 }}>—</span>
        <span style={{ fontSize: 11, color: 'var(--ds-text-subtlest)' }}>no data</span>
      </span>
    );
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span style={{ color: 'var(--ds-text)', fontWeight: 600 }}>{calc.data.score}</span>
      <StrataBandLozenge bandKey={calc.data.status_key} />
    </span>
  );
}

// ── Instance row ─────────────────────────────────────────────────────────────
function InstanceRow({
  instance, periodName, modelName,
}: { instance: StrataScorecardInstance; periodName: string | null; modelName: string | null }) {
  const navigate = useNavigate();
  const clickable = !!instance.slug;
  const open = () => { if (instance.slug) navigate(Routes.strata.scorecard(instance.slug)); };
  return (
    <div
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={open}
      onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } } : undefined}
      data-testid={`strata-instance-row-${instance.id}`}
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(180px, 2fr) minmax(100px, 1fr) minmax(140px, 1.5fr) 140px minmax(140px, 1fr)',
        alignItems: 'center', gap: 12, padding: '8px 12px',
        borderBottom: '1px solid var(--ds-border)',
        cursor: clickable ? 'pointer' : 'default',
        background: 'var(--ds-surface-raised)',
      }}
    >
      <span style={{ fontSize: 14, fontWeight: 600, color: clickable ? 'var(--ds-text-brand)' : 'var(--ds-text)', minWidth: 0, overflowWrap: 'anywhere' }}>
        {instance.name}
      </span>
      <span style={{ fontSize: 13, color: 'var(--ds-text-subtle)' }}>{periodName ?? '—'}</span>
      <span style={{ fontSize: 13, color: 'var(--ds-text-subtle)', minWidth: 0, overflowWrap: 'anywhere' }}>{modelName ?? '—'}</span>
      <span><StrataDataStateLozenge state={instance.status} /></span>
      <span style={{ textAlign: 'right' }}><ScoreCell instance={instance} /></span>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function StrataScorecardsPage() {
  const { periods, activeCycle } = useStrataContext();
  const modelsQ = useScorecardModels();
  const instancesQ = useScorecardInstances(activeCycle?.id);

  const models = modelsQ.data ?? [];
  const instances = instancesQ.data ?? [];
  const modelNameById = new Map(models.map((m) => [m.id, m.name]));
  const periodNameById = new Map(periods.map((p) => [p.id, p.name]));

  const headerCell: React.CSSProperties = {
    fontSize: 11, fontWeight: 700,
    color: 'var(--ds-text-subtlest)',
  };

  return (
    <PageContainer variant="wide">
      <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--ds-text)', margin: '0 0 8px' }}>Scorecards</h1>
      <StrataConfigContextBar />

      {(modelsQ.isError || instancesQ.isError) ? (
        <div style={{ marginBottom: 16 }}>
          <SectionMessage appearance="error" title="Could not load scorecards">
            <p>{(modelsQ.error as Error)?.message ?? (instancesQ.error as Error)?.message ?? 'Unknown error.'}</p>
          </SectionMessage>
        </div>
      ) : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <StrataPanel title="Models" testId="strata-scorecard-models-panel">
          {modelsQ.isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner size="medium" /></div>
          ) : models.length === 0 ? (
            <EmptyState
              size="compact"
              header="No scorecard models"
              description="Governed scorecard models appear here once configured and approved."
              testId="strata-models-empty"
            />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {models.map((m) => <ModelCard key={m.id} model={m} />)}
            </div>
          )}
        </StrataPanel>

        <StrataPanel title="Instances" testId="strata-scorecard-instances-panel">
          {instancesQ.isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner size="medium" /></div>
          ) : instances.length === 0 ? (
            <EmptyState
              size="compact"
              header="No scorecard instances"
              description="No scorecard instances exist for the selected cycle yet."
              testId="strata-instances-empty"
            />
          ) : (
            <div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(180px, 2fr) minmax(100px, 1fr) minmax(140px, 1.5fr) 140px minmax(140px, 1fr)',
                  gap: 12, padding: '8px 12px', borderBottom: '2px solid var(--ds-border)',
                }}
              >
                <span style={headerCell}>Name</span>
                <span style={headerCell}>Period</span>
                <span style={headerCell}>Model</span>
                <span style={headerCell}>State</span>
                <span style={{ ...headerCell, textAlign: 'right' }}>Latest score</span>
              </div>
              {instances.map((i) => (
                <InstanceRow
                  key={i.id}
                  instance={i}
                  periodName={i.period_id ? periodNameById.get(i.period_id) ?? null : null}
                  modelName={modelNameById.get(i.model_id) ?? null}
                />
              ))}
            </div>
          )}
        </StrataPanel>
      </div>
    </PageContainer>
  );
}
