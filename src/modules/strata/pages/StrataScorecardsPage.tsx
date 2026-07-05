/**
 * STRATA — Scorecard index (/strata/scorecards).
 * Models grid (governed config records) + instances list for the active cycle.
 * Every score/band shown here comes from useScorecardCalc (server RPC /
 * frozen snapshot) — the UI never computes rollups.
 *
 * D-012 executive lift (2026-07-05): page chrome, summary stat strip,
 * canonical JiraTable for instances, icon-anchored model cards.
 */
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CatalystTag, EmptyState, Lozenge, SectionMessage, Spinner } from '@/components/ads';
import { PageContainer } from '@/components/shared/PageContainer';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable';
import { Routes } from '@/lib/routes';
import { FileBarChart, PieChart, Scale } from '@/lib/atlaskit-icons';
import {
  useScorecardCalc, useScorecardInstances, useScorecardModels, useStrataContext,
} from '@/modules/strata/hooks/useStrata';
import {
  T, StrataBandLozenge, StrataDataStateLozenge, StrataPageChrome, StrataPanel,
  StrataStatStrip, type StrataStat,
} from '@/modules/strata/components/shared';
import { fmtScore, labelize } from '@/modules/strata/components/format';
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
  const appearance = GOVERNED_APPEARANCE[status as GovernedStatus] ?? 'default';
  return <Lozenge appearance={appearance}>{labelize(String(status))}</Lozenge>;
}

// ── Model card ───────────────────────────────────────────────────────────────
function ModelCard({ model }: { model: StrataScorecardModel }) {
  return (
    <div
      data-testid={`strata-model-card-${model.id}`}
      style={{
        background: T.raised, border: `1px solid ${T.border}`,
        borderRadius: 8, padding: 16, minWidth: 0,
        display: 'flex', flexDirection: 'column', gap: 8,
        boxShadow: 'var(--ds-shadow-raised)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span aria-hidden style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 28, height: 28, borderRadius: 6, background: T.selected, color: T.brandText, flexShrink: 0,
        }}>
          <Scale size={16} />
        </span>
        <span style={{
          fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: T.text,
          minWidth: 0, overflowWrap: 'anywhere', flex: '1 1 auto',
        }}>
          {model.name}
        </span>
        <span style={{ flexShrink: 0 }}><CatalystTag text={`v${model.version}`} /></span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <GovernedStatusLozenge status={model.status} />
        {model.owner_scope_type ? (
          <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtle }}>
            {labelize(model.owner_scope_type)}
          </span>
        ) : null}
      </div>
      <div style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>
        Rollup: {model.rollup_method ? labelize(model.rollup_method) : '—'}
        {' · '}
        Granularity: {model.period_granularity ? labelize(model.period_granularity) : '—'}
      </div>
    </div>
  );
}

// ── Score cell — server-computed only, zero-assumption ───────────────────────
function ScoreCell({ instance }: { instance: StrataScorecardInstance }) {
  const calc = useScorecardCalc(instance);
  if (calc.isLoading) {
    return <Spinner size="small" />;
  }
  if (calc.isError || !calc.data || !calc.data.has_data) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ color: T.text, fontWeight: 600 }}>—</span>
        <span style={{ fontSize: 'var(--ds-font-size-050)', color: T.subtlest }}>No data</span>
      </span>
    );
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span style={{
        color: T.text, fontWeight: 600, fontVariantNumeric: 'tabular-nums',
        fontSize: 'var(--ds-font-size-200)',
      }}>
        {fmtScore(calc.data.score)}
      </span>
      <StrataBandLozenge bandKey={calc.data.status_key} />
    </span>
  );
}

// ── Instance table row model ─────────────────────────────────────────────────
interface InstanceRowData extends StrataScorecardInstance {
  periodName: string | null;
  modelName: string | null;
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function StrataScorecardsPage() {
  const navigate = useNavigate();
  const { periods, activeCycle } = useStrataContext();
  const modelsQ = useScorecardModels();
  const instancesQ = useScorecardInstances(activeCycle?.id);

  const models = modelsQ.data ?? [];
  const instances = instancesQ.data ?? [];
  const modelNameById = useMemo(() => new Map(models.map((m) => [m.id, m.name])), [models]);
  const periodNameById = useMemo(() => new Map(periods.map((p) => [p.id, p.name])), [periods]);

  const rows: InstanceRowData[] = useMemo(
    () => instances.map((i) => ({
      ...i,
      periodName: i.period_id ? periodNameById.get(i.period_id) ?? null : null,
      modelName: modelNameById.get(i.model_id) ?? null,
    })),
    [instances, periodNameById, modelNameById],
  );

  // ── Summary strip — counts from already-loaded config queries only ────────
  const summaryReady = !modelsQ.isLoading && !instancesQ.isLoading && !modelsQ.isError && !instancesQ.isError;
  const summaryStats: StrataStat[] = [
    {
      key: 'models-approved',
      label: 'Models approved',
      value: models.filter((m) => m.status === 'approved').length,
      caption: 'Governed scorecard models in force',
      testId: 'strata-scorecards-stat-models',
    },
    {
      key: 'instances-live',
      label: 'Instances live',
      value: instances.filter((i) => i.status === 'live').length,
      caption: activeCycle ? `In ${activeCycle.name}` : 'No active cycle',
      testId: 'strata-scorecards-stat-live',
    },
    {
      key: 'instances-locked',
      label: 'Locked',
      value: instances.filter((i) => i.status === 'locked').length,
      caption: 'Frozen in snapshots',
      testId: 'strata-scorecards-stat-locked',
    },
  ];

  const columns: Column<InstanceRowData>[] = useMemo(() => [
    {
      id: 'name',
      label: 'Name',
      flex: true,
      cell: ({ row }) => (
        <span
          data-testid={`strata-instance-row-${row.id}`}
          style={{
            fontSize: 'var(--ds-font-size-200)', fontWeight: 600,
            color: row.slug ? T.brandText : T.text,
            minWidth: 0, overflowWrap: 'anywhere',
          }}
        >
          {row.name}
        </span>
      ),
    },
    {
      id: 'period',
      label: 'Period',
      width: 12,
      cell: ({ row }) => (
        <span style={{ fontSize: 'var(--ds-font-size-200)', color: T.subtle }}>{row.periodName ?? '—'}</span>
      ),
    },
    {
      id: 'model',
      label: 'Model',
      width: 18,
      cell: ({ row }) => (
        <span style={{ fontSize: 'var(--ds-font-size-200)', color: T.subtle, minWidth: 0, overflowWrap: 'anywhere' }}>
          {row.modelName ?? '—'}
        </span>
      ),
    },
    {
      id: 'state',
      label: 'State',
      width: 14,
      cell: ({ row }) => <StrataDataStateLozenge state={row.status} />,
    },
    {
      id: 'score',
      label: 'Latest score',
      width: 16,
      align: 'end',
      cell: ({ row }) => <ScoreCell instance={row} />,
    },
  ], []);

  return (
    <PageContainer variant="wide">
      <StrataPageChrome
        icon={<FileBarChart size={20} />}
        title="Scorecards"
        description="Governed scorecard models and their period instances — every score is server-calculated."
        testId="strata-scorecards-chrome"
      />

      {(modelsQ.isError || instancesQ.isError) ? (
        <div style={{ marginBottom: 16 }}>
          <SectionMessage appearance="error" title="Could not load scorecards">
            <p>{(modelsQ.error as Error)?.message ?? (instancesQ.error as Error)?.message ?? 'Unknown error.'}</p>
          </SectionMessage>
        </div>
      ) : null}

      {summaryReady ? <StrataStatStrip items={summaryStats} testId="strata-scorecards-summary" /> : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <StrataPanel
          title="Models"
          icon={<Scale size={16} />}
          count={modelsQ.isLoading ? null : models.length}
          testId="strata-scorecard-models-panel"
        >
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

        <StrataPanel
          title="Instances"
          icon={<PieChart size={16} />}
          count={instancesQ.isLoading ? null : instances.length}
          noPadding
          testId="strata-scorecard-instances-panel"
        >
          <JiraTable<InstanceRowData>
            columns={columns}
            data={rows}
            getRowId={(row) => row.id}
            onRowClick={(row) => { if (row.slug) navigate(Routes.strata.scorecard(row.slug)); }}
            isLoading={instancesQ.isLoading}
            emptyView={(
              <EmptyState
                size="compact"
                header="No scorecard instances"
                description="No scorecard instances exist for the selected cycle yet."
                testId="strata-instances-empty"
              />
            )}
            ariaLabel="Scorecard instances"
          />
        </StrataPanel>
      </div>
    </PageContainer>
  );
}
