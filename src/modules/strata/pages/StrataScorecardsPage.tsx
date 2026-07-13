/**
 * STRATA — Scorecards Index (/strata/scorecards) — anchor 12.
 *
 * A card-first "scope chooser, NOT a table" (anchor 12, D-9): one card per
 * scorecard instance in the active period — 64px score ring, band lozenge,
 * scope, Δ-vs-prior, coverage footnote — with the enterprise (CEO) card
 * carrying the accent border and sorting first. A composed judgment one-liner
 * frames the outlier. Every score/band is server-calculated (useScorecardCalcs
 * → strata_calc_* RPC / frozen snapshot); the UI only renders. Models are
 * managed in the Model Builder (anchor 05), not here.
 *
 * ADS tokens only. Zero-assumption: unknown score/scope/delta renders nothing.
 */
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, EmptyState, SectionMessage } from '@/components/ads';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable';
import { Routes } from '@/lib/routes';
import { Scale } from '@/lib/atlaskit-icons';
import {
  useScorecardInstances, useScorecardModels, useScorecardCalcs, useScorecardPlanVariances,
  useStrataContext, useStrataRoles, useBandResolver,
} from '@/modules/strata/hooks/useStrata';
import {
  T, StrataBandLozenge, StrataPageShell, StrataPanel, StrataScoreRing,
} from '@/modules/strata/components/shared';
import { fmtScore, labelize } from '@/modules/strata/components/format';
import type { ScorecardCalcResult, StrataScorecardInstance, StrataScorecardModel } from '@/modules/strata/types';

// Locked STRATA terminology (goal rule 6, REQ-012): enterprise scope = the
// CEO Scorecard; sector and function scopes are ONE combined concept.
const SCOPE_LABEL: Record<string, string> = {
  enterprise: 'CEO Scorecard',
  sector: 'Sector / CXO Scorecard',
  function: 'Sector / CXO Scorecard',
};

/** Layout-matched card skeleton: ring + two text lines (anchor 12 loading). */
function CardSkeleton() {
  return (
    <div aria-hidden style={{
      border: `1px solid ${T.border}`, borderRadius: 8, background: T.raised,
      padding: 'var(--ds-space-200)', display: 'flex', gap: 'var(--ds-space-200)', alignItems: 'center',
    }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: T.neutral, flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-100)' }}>
        <div style={{ height: 14, width: '60%', borderRadius: 4, background: T.neutral }} />
        <div style={{ height: 12, width: '40%', borderRadius: 4, background: T.neutral }} />
      </div>
    </div>
  );
}

/** One scorecard instance as an executive card. Calc is passed in (page-level
 *  useScorecardCalcs) so the card holds no data hooks — no rules-of-hooks risk. */
function InstanceCard({
  instance, model, calc, priorCalc, priorPeriodName, onOpen,
}: {
  instance: StrataScorecardInstance;
  model: StrataScorecardModel | undefined;
  calc: ScorecardCalcResult | null;
  priorCalc: ScorecardCalcResult | null;
  priorPeriodName: string | null;
  onOpen?: () => void;
}) {
  const isEnterprise = model?.owner_scope_type === 'enterprise';
  const scopeLabel = model?.owner_scope_type
    ? (SCOPE_LABEL[model.owner_scope_type] ?? labelize(model.owner_scope_type))
    : null;
  const hasData = !!calc?.has_data;
  const delta = hasData && priorCalc?.has_data ? calc!.score - priorCalc.score : null;
  const up = delta != null && delta > 0.05;
  const down = delta != null && delta < -0.05;
  const lines = calc?.lines ?? [];
  const withData = lines.filter((l) => l.has_data).length;
  const clickable = !!onOpen && !!instance.slug;

  return (
    <div
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? onOpen : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen?.(); } } : undefined}
      data-testid={`strata-scorecard-card-${instance.id}`}
      style={{
        // Enterprise (CEO) default carries the accent border (anchor 12).
        border: isEnterprise ? '2px solid var(--ds-background-discovery-bold)' : `1px solid ${T.border}`,
        borderRadius: 8, background: T.raised, boxShadow: 'var(--ds-shadow-raised)',
        padding: 'var(--ds-space-200)', minWidth: 0, cursor: clickable ? 'pointer' : 'default',
        display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-150)',
      }}
    >
      <div style={{ display: 'flex', gap: 'var(--ds-space-150)', alignItems: 'center', minWidth: 0 }}>
        <StrataScoreRing
          score={hasData ? calc!.score : null}
          bandKey={hasData ? calc!.status_key : null}
          size={64}
          strokeWidth={7}
          testId={`strata-scorecard-card-ring-${instance.id}`}
        />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 'var(--ds-font-size-300)', fontWeight: 653, color: T.text, minWidth: 0, overflowWrap: 'anywhere' }}>
              {instance.name}
            </span>
            <StrataBandLozenge bandKey={hasData ? calc!.status_key : null} />
          </div>
          {scopeLabel ? (
            <div style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtlest, marginTop: 'var(--ds-space-025)' }}>
              {scopeLabel}
            </div>
          ) : null}
          {delta != null ? (
            <div style={{ fontSize: 'var(--ds-font-size-100)', marginTop: 'var(--ds-space-075)' }}>
              <span style={{
                color: up ? 'var(--ds-text-success)' : down ? 'var(--ds-text-danger)' : T.subtlest,
                fontWeight: 600, fontVariantNumeric: 'tabular-nums',
              }}>
                {up || down ? `${up ? '▲' : '▼'} ${fmtScore(Math.abs(delta))}` : 'No change'}
              </span>
              {priorPeriodName ? <span style={{ color: T.subtlest }}>{` vs ${priorPeriodName}`}</span> : null}
            </div>
          ) : null}
        </div>
      </div>
      <div style={{
        fontSize: 'var(--ds-font-size-050)', color: T.subtlest,
        paddingTop: 'var(--ds-space-150)', borderTop: `1px solid ${T.border}`,
      }}>
        {hasData
          ? `${lines.length} ${lines.length === 1 ? 'input' : 'inputs'} · ${withData} with data`
          : 'No calculated score for this period'}
      </div>
    </div>
  );
}

/** Score movement vs prior period — direction glyph + word (color never alone, §14). */
function DeltaSpan({ delta, priorPeriodName }: { delta: number; priorPeriodName: string | null }) {
  const up = delta > 0.05;
  const down = delta < -0.05;
  return (
    <span style={{ fontSize: 'var(--ds-font-size-100)', whiteSpace: 'nowrap' }}>
      <span style={{
        color: up ? 'var(--ds-text-success)' : down ? 'var(--ds-text-danger)' : T.subtlest,
        fontWeight: 600, fontVariantNumeric: 'tabular-nums',
      }}>
        {up || down ? `${up ? '▲' : '▼'} ${fmtScore(Math.abs(delta))}` : 'No change'}
      </span>
      {priorPeriodName ? <span style={{ color: T.subtlest }}>{` vs ${priorPeriodName}`}</span> : null}
    </span>
  );
}

/** Ranked-panel row: active-period instances ranked by true vs-plan variance
 *  (strata_calc_scorecard_plan_variance, task_e44f1ba9 — supersedes the D-10
 *  interim worst-score basis). Null variance sorts last, zero-assumption. */
interface RankedRow {
  id: string;
  name: string;
  slug: string | null;
  score: number | null;
  statusKey: string | null;
  delta: number | null;
  priorPeriodName: string | null;
  /** Signed variance vs plan (plan_index − 100); null when underivable. */
  planVariance: number | null;
  /** "N of M lines" when plan coverage is partial; null when full/none. */
  planCoverage: string | null;
  /** Weakest perspective — the derivable "where attention pays" driver. */
  driver: string | null;
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function StrataScorecardsPage() {
  const navigate = useNavigate();
  const { periods, activeCycle, activePeriod } = useStrataContext();
  const modelsQ = useScorecardModels();
  const instancesQ = useScorecardInstances(activeCycle?.id);
  const rolesQ = useStrataRoles();
  const resolveBand = useBandResolver();

  const roles = rolesQ.data ?? [];
  const isAdmin = roles.includes('strata_admin');
  // Role-aware restricted (§17): no STRATA role → RLS denies; explain, never blank.
  const noStrataRole = !rolesQ.isLoading && roles.length === 0;

  const allInstances = instancesQ.data ?? [];
  const models = modelsQ.data ?? [];
  const modelById = useMemo(() => new Map(models.map((m) => [m.id, m])), [models]);
  const periodById = useMemo(() => new Map(periods.map((p) => [p.id, p])), [periods]);

  // Cards = instances for the ACTIVE period (one per scope, anchor 12).
  const cardInstances = useMemo(
    () => allInstances.filter((i) => activePeriod && i.period_id === activePeriod.id),
    [allInstances, activePeriod],
  );

  // Prior-period instance per model (same model, greatest starts_on < active) — Δ basis.
  const priorByInstanceId = useMemo(() => {
    const m = new Map<string, StrataScorecardInstance | null>();
    const activeStart = activePeriod ? periodById.get(activePeriod.id)?.starts_on ?? null : null;
    cardInstances.forEach((inst) => {
      if (!activeStart) { m.set(inst.id, null); return; }
      const prior = allInstances
        .filter((o) => o.model_id === inst.model_id && o.id !== inst.id)
        .map((o) => ({ o, start: periodById.get(o.period_id ?? '')?.starts_on ?? '' }))
        .filter((x) => x.start && x.start < activeStart)
        .sort((a, b) => (a.start < b.start ? 1 : -1))[0]?.o ?? null;
      m.set(inst.id, prior);
    });
    return m;
  }, [cardInstances, allInstances, activePeriod, periodById]);

  // Calc set = card instances + their priors, deduped + memoised (drives useQueries).
  const calcInstances = useMemo(() => {
    const seen = new Set<string>();
    const out: StrataScorecardInstance[] = [];
    const push = (inst: StrataScorecardInstance | null | undefined) => {
      if (inst && !seen.has(inst.id)) { seen.add(inst.id); out.push(inst); }
    };
    cardInstances.forEach(push);
    cardInstances.forEach((inst) => push(priorByInstanceId.get(inst.id)));
    return out;
  }, [cardInstances, priorByInstanceId]);
  const calcs = useScorecardCalcs(calcInstances);
  // True vs-plan variance (read-only RPC; null for locked/uncovered instances).
  const planVariances = useScorecardPlanVariances(cardInstances);

  // Enterprise (CEO) first, then worst-score first (role-scoped default order).
  const orderedCards = useMemo(() => [...cardInstances].sort((a, b) => {
    const aEnt = modelById.get(a.model_id)?.owner_scope_type === 'enterprise' ? 0 : 1;
    const bEnt = modelById.get(b.model_id)?.owner_scope_type === 'enterprise' ? 0 : 1;
    if (aEnt !== bEnt) return aEnt - bEnt;
    const as = calcs.byId.get(a.id)?.score ?? Infinity;
    const bs = calcs.byId.get(b.id)?.score ?? Infinity;
    return as - bs;
  }), [cardInstances, modelById, calcs.byId]);

  // Judgment one-liner — worst-scoring instance + on-track count (zero-assumption).
  const judgment = useMemo(() => {
    const scored = cardInstances
      .map((i) => ({ i, c: calcs.byId.get(i.id) }))
      .filter((x): x is { i: StrataScorecardInstance; c: ScorecardCalcResult } => !!x.c?.has_data);
    if (scored.length === 0) return null;
    const worst = scored.reduce((lo, x) => (x.c.score < lo.c.score ? x : lo));
    const onTrack = scored.filter((x) => resolveBand(x.c.status_key)?.appearance === 'success').length;
    return { worstName: worst.i.name, worstScore: worst.c.score, onTrack, total: scored.length };
  }, [cardInstances, calcs.byId, resolveBand]);

  // ── Ranked panel — furthest below plan first (true vs-plan RPC), then score ──
  const rankedRows: RankedRow[] = useMemo(() => cardInstances.map((inst) => {
    const c = calcs.byId.get(inst.id);
    const prior = priorByInstanceId.get(inst.id) ?? null;
    const pc = prior ? calcs.byId.get(prior.id) ?? null : null;
    const hasData = !!c?.has_data;
    const scored = (c?.perspectives ?? []).filter((p) => p.has_data && p.score != null);
    const worst = scored.length ? scored.reduce((lo, p) => (p.score < lo.score ? p : lo)) : null;
    const plan = planVariances.byId.get(inst.id) ?? null;
    return {
      id: inst.id,
      name: inst.name,
      slug: inst.slug,
      score: hasData ? c!.score : null,
      statusKey: hasData ? c!.status_key : null,
      delta: hasData && pc?.has_data ? c!.score - pc.score : null,
      priorPeriodName: prior?.period_id ? periodById.get(prior.period_id)?.name ?? null : null,
      planVariance: plan?.has_data ? plan.variance : null,
      planCoverage: plan?.has_data && plan.covered_lines < plan.total_lines
        ? `${plan.covered_lines} of ${plan.total_lines} lines`
        : null,
      driver: worst ? `${worst.name} ${fmtScore(worst.score)} — weakest perspective` : null,
    };
  }).sort((a, b) =>
    (a.planVariance ?? Infinity) - (b.planVariance ?? Infinity)
    || (a.score ?? Infinity) - (b.score ?? Infinity)),
  [cardInstances, calcs.byId, planVariances.byId, priorByInstanceId, periodById]);

  const rankedColumns: Column<RankedRow>[] = useMemo(() => [
    {
      id: 'name', label: 'Scorecard', flex: true,
      cell: ({ row }) => (
        <span style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: row.slug ? T.brandText : T.text, minWidth: 0, overflowWrap: 'anywhere' }}>
          {row.name}
        </span>
      ),
    },
    {
      id: 'score', label: 'Score', width: 18,
      cell: ({ row }) => (row.score == null ? (
        <span style={{ color: T.subtlest }}>—</span>
      ) : (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: T.text, fontSize: 'var(--ds-font-size-200)' }}>
            {fmtScore(row.score)}
          </span>
          <StrataBandLozenge bandKey={row.statusKey} />
        </span>
      )),
    },
    {
      id: 'plan', label: 'Vs plan', width: 16,
      cell: ({ row }) => {
        if (row.planVariance == null) {
          return <span style={{ color: T.subtlest, fontSize: 'var(--ds-font-size-100)' }}>—</span>;
        }
        const above = row.planVariance > 0.05;
        const below = row.planVariance < -0.05;
        return (
          <span style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-025)', fontSize: 'var(--ds-font-size-100)' }}>
            <span style={{
              color: above ? 'var(--ds-text-success)' : below ? 'var(--ds-text-danger)' : T.subtle,
              fontWeight: 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
            }}>
              {above || below
                ? `${above ? '+' : '−'}${fmtScore(Math.abs(row.planVariance))} vs plan`
                : 'On plan'}
            </span>
            {row.planCoverage ? (
              <span style={{ color: T.subtlest }}>{row.planCoverage}</span>
            ) : null}
          </span>
        );
      },
    },
    {
      id: 'delta', label: 'Since prior', width: 14,
      cell: ({ row }) => (row.delta == null
        ? <span style={{ color: T.subtlest, fontSize: 'var(--ds-font-size-100)' }}>—</span>
        : <DeltaSpan delta={row.delta} priorPeriodName={row.priorPeriodName} />),
    },
    {
      id: 'driver', label: 'Where attention pays', flex: true,
      cell: ({ row }) => (
        <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtle, minWidth: 0, overflowWrap: 'anywhere' }}>
          {row.driver ?? '—'}
        </span>
      ),
    },
  ], []);

  const isLoading = instancesQ.isLoading || rolesQ.isLoading || modelsQ.isLoading
    || (cardInstances.length > 0 && calcs.isLoading);

  return (
    <StrataPageShell docTitle="Scorecards" testId="strata-scorecards-chrome">
      {noStrataRole ? (
        <EmptyState
          size="default"
          header="You don't have access to Scorecards"
          description="Your account has no STRATA role, so scorecard data is restricted. Ask a STRATA administrator or the strategy office to grant a role, then reload this page."
          testId="strata-scorecards-restricted"
        />
      ) : isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {[0, 1, 2, 3].map((k) => <CardSkeleton key={k} />)}
        </div>
      ) : (instancesQ.isError || modelsQ.isError) ? (
        <SectionMessage appearance="error" title="Could not load scorecards">
          <p>{(instancesQ.error as Error)?.message ?? (modelsQ.error as Error)?.message ?? 'Unknown error.'}</p>
        </SectionMessage>
      ) : !activeCycle ? (
        <EmptyState
          size="default"
          header="No strategy cycle active"
          description="Select or create a strategy cycle to see its scorecards."
          testId="strata-scorecards-no-cycle"
        />
      ) : cardInstances.length === 0 ? (
        <EmptyState
          size="default"
          header={activePeriod ? `No scorecards for ${activePeriod.name}` : 'No scorecards for this period'}
          description={isAdmin
            ? 'Approve a scorecard model and generate its instances in STRATA admin to populate this period.'
            : 'Scorecard instances appear here once the strategy office generates them for this period.'}
          primaryAction={isAdmin ? (
            <Button appearance="primary" onClick={() => navigate(Routes.strata.admin())} testId="strata-scorecards-empty-cta">
              Open STRATA admin
            </Button>
          ) : undefined}
          testId="strata-scorecards-empty"
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {judgment ? (
            <p
              data-testid="strata-scorecards-judgment"
              style={{ margin: 0, fontSize: 'var(--ds-font-size-300)', lineHeight: 'var(--ds-line-height-body)', color: T.text, textWrap: 'pretty' }}
            >
              <strong style={{ fontWeight: 653 }}>{judgment.worstName}</strong>
              {` is the lowest at ${fmtScore(judgment.worstScore)}. ${judgment.onTrack} of ${judgment.total} ${judgment.total === 1 ? 'scorecard is' : 'scorecards are'} on track — all calculate under the same model, so scores are directly comparable.`}
            </p>
          ) : null}
          {calcs.isError ? (
            <SectionMessage appearance="warning" title="Some scores could not be calculated">
              <p>Cards without a score below could not reach the calc engine — retry shortly.</p>
            </SectionMessage>
          ) : null}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {orderedCards.map((inst) => {
              const prior = priorByInstanceId.get(inst.id) ?? null;
              return (
                <InstanceCard
                  key={inst.id}
                  instance={inst}
                  model={modelById.get(inst.model_id)}
                  calc={calcs.byId.get(inst.id) ?? null}
                  priorCalc={prior ? calcs.byId.get(prior.id) ?? null : null}
                  priorPeriodName={prior?.period_id ? periodById.get(prior.period_id)?.name ?? null : null}
                  onOpen={inst.slug ? () => navigate(Routes.strata.scorecard(inst.slug!)) : undefined}
                />
              );
            })}
          </div>

          {/* Ranked panel — the 80/20 "where attention pays" answer (anchor 12). */}
          <StrataPanel
            title="Where attention pays"
            icon={<Scale size={16} />}
            count={rankedRows.length}
            noPadding
            testId="strata-scorecards-ranked"
            actions={(
              <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>
                Furthest below plan first · same model &amp; thresholds, directly comparable
              </span>
            )}
          >
            <JiraTable<RankedRow>
              columns={rankedColumns}
              data={rankedRows}
              getRowId={(r) => r.id}
              onRowClick={(r) => { if (r.slug) navigate(Routes.strata.scorecard(r.slug)); }}
              showRowCount={false}
              ariaLabel="Scorecards ranked by score"
            />
          </StrataPanel>
        </div>
      )}
    </StrataPageShell>
  );
}
