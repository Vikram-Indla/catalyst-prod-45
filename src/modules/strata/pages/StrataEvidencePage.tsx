/**
 * STRATA Evidence page — lineage on every executive number (blueprint §19).
 * One page, three routes (entity kind derived from the pathname):
 *   /strata/kpis/:slug/evidence        → kpi
 *   /strata/scorecards/:slug/evidence  → scorecard_instance
 *   /strata/portfolio/:slug/evidence   → portfolio
 *
 * Replaces the former StrataEvidenceDrawer. Every number renders verbatim
 * from strata_calculated_values (calc engine provenance) — nothing is
 * computed in the UI; unknowns render '—' (zero-assumption).
 */
import React, { useMemo } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis,
} from 'recharts';
import { Button, EmptyState, Lozenge, SectionMessage, Spinner } from '@/components/ads';
import { Activity, FileText, Layers } from '@/lib/atlaskit-icons';
import { Routes } from '@/lib/routes';
import { LABEL, SMALL } from '@/components/project-hub/dashboard/dashboardTypography';
import {
  useCalcValues, useKpiBySlug, useKpiEvidenceChain, usePerspectives, usePortfolioBySlug,
  useProfileNames, useScorecardInstanceBySlug, useSnapshots, useStrataContext, useUploadRuns,
} from '@/modules/strata/hooks/useStrata';
import {
  StrataBandLozenge, StrataExecutionHealthLozenge, StrataPageShell, StrataPanel, StrataScoreRing, T,
} from '@/modules/strata/components/shared';
import {
  EvidenceConfigContext, EvidenceInputs, EvidenceRow, shortId,
} from '@/modules/strata/components/evidence';
import { fmtDate, fmtDateTime, fmtPct, fmtRatioPct, fmtScore, fmtUnit, labelize } from '@/modules/strata/components/format';
import type { StrataCalculatedValue } from '@/modules/strata/types';

type EvidenceKind = 'kpi' | 'scorecard' | 'portfolio';

const KIND_META: Record<EvidenceKind, {
  entityType: string;
  indexLabel: string;
  indexHref: string;
  detailHref: (slug: string) => string;
}> = {
  kpi: {
    entityType: 'kpi',
    indexLabel: 'KPI library',
    indexHref: Routes.strata.kpis(),
    detailHref: (slug) => Routes.strata.kpi(slug),
  },
  scorecard: {
    entityType: 'scorecard_instance',
    indexLabel: 'Scorecards',
    indexHref: Routes.strata.scorecards(),
    detailHref: (slug) => Routes.strata.scorecard(slug),
  },
  portfolio: {
    entityType: 'portfolio',
    indexLabel: 'Portfolio & VMO',
    indexHref: Routes.strata.portfolio(),
    // No per-slug portfolio detail route — the index surface is the detail.
    detailHref: () => Routes.strata.portfolio(),
  },
};

/** Confidence/progress arrive either as ratio (0–1) or percent — format by scale. */
const fmtConfidence = (v: number | null | undefined): string | null => {
  if (v == null) return null;
  return Number(v) <= 1 ? fmtRatioPct(v) : fmtPct(v);
};

// ── KPI evidence chain (strata_kpi_evidence_chain jsonb — honest nulls/[]) ───
interface EvidenceChainPayload {
  kpi?: { id: string; name: string; unit: string | null } | null;
  formula_version?: { version?: number | null; expression?: string | null; formula_type?: string | null } | null;
  target?: { target?: number | null; baseline?: number | null; target_type?: string | null; version?: number | null } | null;
  actual?: {
    value?: number | null; validation_status?: string | null; entry_method?: string | null;
    submitted_by?: string | null; submitted_at?: string | null; validated_by?: string | null;
  } | null;
  lineage?: Array<{
    id: string; upload_run_id: string | null; run_key: string | null; written_at?: string | null;
  }> | null;
  elements?: Array<{
    id: string; name: string; element_type?: string | null; owner_id: string | null;
    perspective_id: string | null; weight?: number | null;
  }> | null;
  initiatives?: Array<{
    id: string; name: string; stage: string | null; status: string | null; owner_id: string | null;
  }> | null;
  projects?: Array<{
    id: string; name: string; source_system: string | null; execution_health: string | null;
    actual_progress: number | null; milestones: number | null; blocked_dependencies: number | null;
  }> | null;
  benefits?: Array<{
    id: string; name: string; lifecycle_stage: string | null; confidence: number | null;
  }> | null;
  snapshots?: Array<{ snapshot_id: string }> | null;
}

/** Validation status → lozenge (same convention as KPI detail / VMO pages). */
const VALIDATION_LOZENGE: Record<string, { label: string; appearance: React.ComponentProps<typeof Lozenge>['appearance'] }> = {
  validated: { label: 'Validated', appearance: 'success' },
  pending: { label: 'Pending', appearance: 'moved' },
  rejected: { label: 'Rejected', appearance: 'removed' },
  quarantined: { label: 'Quarantined', appearance: 'moved' },
};

/** Honest empty line for a chain section — never invented data. */
function ChainEmpty({ text }: { text: string }) {
  return <span style={{ color: T.subtlest }}>{text}</span>;
}

/** One linked entity line inside a chain section. */
function ChainItem({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0 }}>
      {children}
    </span>
  );
}

const chainMetaStyle: React.CSSProperties = {
  fontSize: 'var(--ds-font-size-100)', color: T.subtlest, whiteSpace: 'nowrap',
};
const chainListStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 6,
};

export default function StrataEvidencePage() {
  const { slug } = useParams<{ slug: string }>();
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const kind: EvidenceKind = pathname.startsWith('/strata/kpis/')
    ? 'kpi'
    : pathname.startsWith('/strata/scorecards/') ? 'scorecard' : 'portfolio';
  const meta = KIND_META[kind];

  // Hooks run unconditionally (rules of hooks); `enabled` gates the fetches.
  const kpiQ = useKpiBySlug(kind === 'kpi' ? slug : undefined);
  const instanceQ = useScorecardInstanceBySlug(kind === 'scorecard' ? slug : undefined);
  const portfolioQ = usePortfolioBySlug(kind === 'portfolio' ? slug : undefined);
  const entityQ = kind === 'kpi' ? kpiQ : kind === 'scorecard' ? instanceQ : portfolioQ;
  const entity = (entityQ.data ?? null) as { id: string; name: string } | null;

  const calcQ = useCalcValues(entity ? meta.entityType : undefined, entity?.id);
  const uploadRunsQ = useUploadRuns();

  // Full KPI evidence chain (F-REP-005) — KPI routes only, for the active period.
  const { activePeriod } = useStrataContext();
  const chainQ = useKpiEvidenceChain(
    kind === 'kpi' ? entity?.id : undefined,
    kind === 'kpi' ? activePeriod?.id : undefined,
  );
  const chain = (chainQ.data ?? null) as EvidenceChainPayload | null;
  const profilesQ = useProfileNames();
  const perspectivesQ = usePerspectives();
  const perspectiveNameById = useMemo(
    () => new Map((perspectivesQ.data ?? []).map((p) => [p.id, p.name])),
    [perspectivesQ.data],
  );
  const nameOf = (id?: string | null): string | null =>
    (id ? profilesQ.data?.get(id)?.name ?? null : null);
  const runKeyById = useMemo(() => {
    const m = new Map<string, string>();
    (uploadRunsQ.data ?? []).forEach((r) => m.set(r.id, r.run_key));
    return m;
  }, [uploadRunsQ.data]);
  // Snapshot deep links: resolve snapshot_id → snapshot_key (route-first canon — no UUID URLs).
  const snapshotsQ = useSnapshots();
  const snapshotKeyById = useMemo(
    () => new Map((snapshotsQ.data ?? []).map((s) => [s.id, s.snapshot_key])),
    [snapshotsQ.data],
  );

  // Hook returns newest-first (calculated_at desc).
  const values: StrataCalculatedValue[] = calcQ.data ?? [];
  const latest = values[0] ?? null;

  // History series: same metric as the latest calc, oldest → newest.
  // Mixing metric_keys on one line would lie (zero-assumption).
  const history = useMemo(() => {
    if (!latest) return [];
    return values
      .filter((v) => v.metric_key === latest.metric_key && v.value != null)
      .slice()
      .sort((a, b) => a.calculated_at.localeCompare(b.calculated_at))
      .map((v) => ({ name: fmtDate(v.calculated_at), value: Number(v.value) }));
  }, [values, latest]);

  const lineParam = kind === 'scorecard' ? searchParams.get('line') : null;
  const confidenceText = fmtConfidence(latest?.confidence);

  const trail = entity && slug
    ? [
        { text: meta.indexLabel, href: meta.indexHref },
        { text: entity.name, href: meta.detailHref(slug) },
        { text: 'Evidence' },
      ]
    : [{ text: meta.indexLabel, href: meta.indexHref }];

  return (
    <StrataPageShell
      trail={trail}
      title={entity ? `${entity.name} — Evidence` : 'Evidence'}
      docTitle={entity ? `${entity.name} — Evidence` : undefined}
      testId="strata-evidence-page"
    >
      {entityQ.isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Spinner size="large" aria-label="Loading evidence" />
        </div>
      ) : entityQ.isError ? (
        <SectionMessage appearance="error" title="Could not load evidence">
          <p>{(entityQ.error as Error | null)?.message ?? 'Unknown error.'}</p>
        </SectionMessage>
      ) : !entity ? (
        <EmptyState
          header="Not found"
          description="Nothing matches this address. It may have been renamed or removed."
          primaryAction={<Button appearance="primary" onClick={() => navigate(meta.indexHref)}>{`Back to ${meta.indexLabel}`}</Button>}
          testId="strata-evidence-not-found"
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ margin: 0, fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>
            Every number traces to source, formula version, validation and snapshot. Nothing here is computed in the UI.
          </p>

          {lineParam ? (
            <SectionMessage appearance="information" title="Opened from a scorecard line">
              <p>
                You arrived from line “{lineParam}”. Line-level inputs appear inside each calculation’s
                Inputs section below.
              </p>
            </SectionMessage>
          ) : null}

          {calcQ.isError ? (
            <SectionMessage appearance="error" title="Could not load calculated values">
              <p>{(calcQ.error as Error | null)?.message ?? 'Unknown error.'}</p>
            </SectionMessage>
          ) : null}

          {/* Hero — latest calculated value with provenance summary */}
          {latest ? (
            <div
              data-testid="strata-evidence-hero"
              style={{
                display: 'flex', alignItems: 'center', gap: 16, padding: '16px 16px',
                background: T.raised, border: `1px solid ${T.border}`, borderRadius: 8,
                boxShadow: 'var(--ds-shadow-raised)',
              }}
            >
              <StrataScoreRing
                score={latest.score ?? latest.value}
                bandKey={latest.status_key}
                size={72}
                strokeWidth={7}
                testId="strata-evidence-hero-ring"
              />
              <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.subtlest, letterSpacing: '0.04em' }}>
                  {labelize(latest.metric_key)}
                </span>
                <span style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{
                    fontFamily: T.fontDisplay, fontSize: 24, fontWeight: 700, color: T.text,
                    lineHeight: 1.1, fontVariantNumeric: 'tabular-nums',
                  }}>
                    {fmtScore(latest.value)}
                  </span>
                  <StrataBandLozenge bandKey={latest.status_key} />
                </span>
                <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>
                  {[
                    latest.formula_version ? `Formula ${latest.formula_version}` : null,
                    `Calculated ${fmtDateTime(latest.calculated_at)}`,
                    confidenceText ? `Confidence ${confidenceText}` : null,
                  ].filter(Boolean).join(' · ')}
                </span>
              </div>
            </div>
          ) : null}

          {/* Full evidence chain (KPI routes only): strategy → execution → value → source */}
          {kind === 'kpi' ? (
            <StrataPanel
              title={activePeriod ? `Evidence chain · ${activePeriod.name}` : 'Evidence chain'}
              icon={<Layers size={16} />}
              testId="strata-evidence-chain"
            >
              {!activePeriod ? (
                <EmptyState
                  size="compact"
                  header="No active period"
                  description="Select a period to trace this KPI's evidence chain."
                  testId="strata-evidence-chain-no-period"
                />
              ) : chainQ.isLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner size="medium" /></div>
              ) : chainQ.isError ? (
                <SectionMessage appearance="error" title="Could not load the evidence chain">
                  <p>{(chainQ.error as Error | null)?.message ?? 'Unknown error.'}</p>
                </SectionMessage>
              ) : chain ? (
                <>
                  <EvidenceRow k="Strategy">
                    {chain.elements?.length ? (
                      <span style={chainListStyle}>
                        {chain.elements.map((el) => (
                          <ChainItem key={el.id}>
                            <strong style={{ color: T.text, fontWeight: 600 }}>{el.name}</strong>
                            {el.element_type ? <Lozenge appearance="default">{labelize(el.element_type)}</Lozenge> : null}
                            <span style={chainMetaStyle}>
                              {[
                                el.perspective_id ? perspectiveNameById.get(el.perspective_id) ?? null : null,
                                nameOf(el.owner_id) ? `Owner ${nameOf(el.owner_id)}` : null,
                                el.weight != null ? `Weight ${fmtScore(el.weight)}` : null,
                              ].filter(Boolean).join(' · ') || '—'}
                            </span>
                          </ChainItem>
                        ))}
                      </span>
                    ) : <ChainEmpty text="No linked strategy elements yet" />}
                  </EvidenceRow>
                  <EvidenceRow k="Initiatives">
                    {chain.initiatives?.length ? (
                      <span style={chainListStyle}>
                        {chain.initiatives.map((ini) => (
                          <ChainItem key={ini.id}>
                            <strong style={{ color: T.text, fontWeight: 600 }}>{ini.name}</strong>
                            {ini.stage ? <Lozenge appearance="default">{labelize(ini.stage)}</Lozenge> : null}
                            {ini.status ? <Lozenge appearance={ini.status === 'active' ? 'inprogress' : 'default'}>{labelize(ini.status)}</Lozenge> : null}
                            <span style={chainMetaStyle}>{nameOf(ini.owner_id) ? `Owner ${nameOf(ini.owner_id)}` : '—'}</span>
                          </ChainItem>
                        ))}
                      </span>
                    ) : <ChainEmpty text="No linked initiatives yet" />}
                  </EvidenceRow>
                  <EvidenceRow k="Projects">
                    {chain.projects?.length ? (
                      <span style={chainListStyle}>
                        {chain.projects.map((p) => (
                          <ChainItem key={p.id}>
                            <strong style={{ color: T.text, fontWeight: 600 }}>{p.name}</strong>
                            {p.source_system ? <Lozenge appearance="default">{labelize(p.source_system)}</Lozenge> : null}
                            <StrataExecutionHealthLozenge health={p.execution_health} />
                            <span style={chainMetaStyle}>
                              {[
                                p.actual_progress != null ? `Progress ${fmtConfidence(p.actual_progress)}` : null,
                                p.milestones != null ? `${p.milestones} milestone${p.milestones === 1 ? '' : 's'}` : null,
                              ].filter(Boolean).join(' · ') || '—'}
                            </span>
                            {p.blocked_dependencies ? (
                              <span style={{ ...chainMetaStyle, color: 'var(--ds-text-danger)', fontWeight: 600 }}>
                                {p.blocked_dependencies} blocked
                              </span>
                            ) : null}
                          </ChainItem>
                        ))}
                      </span>
                    ) : <ChainEmpty text="No linked projects yet" />}
                  </EvidenceRow>
                  <EvidenceRow k="Benefits">
                    {chain.benefits?.length ? (
                      <span style={chainListStyle}>
                        {chain.benefits.map((b) => (
                          <ChainItem key={b.id}>
                            <strong style={{ color: T.text, fontWeight: 600 }}>{b.name}</strong>
                            {b.lifecycle_stage ? <Lozenge appearance="default">{labelize(b.lifecycle_stage)}</Lozenge> : null}
                            <span style={chainMetaStyle}>
                              {fmtConfidence(b.confidence) ? `Confidence ${fmtConfidence(b.confidence)}` : '—'}
                            </span>
                          </ChainItem>
                        ))}
                      </span>
                    ) : <ChainEmpty text="No linked benefits yet" />}
                  </EvidenceRow>
                  <EvidenceRow k="Source lineage">
                    {chain.lineage?.length ? (
                      <span style={chainListStyle}>
                        {chain.lineage.map((l) => (
                          <ChainItem key={l.id}>
                            {l.run_key ? (
                              <Button appearance="subtle" spacing="compact" onClick={() => navigate(Routes.strata.run(l.run_key!))}>
                                {l.run_key}
                              </Button>
                            ) : (
                              <span style={{ color: T.text }}>Manual channel</span>
                            )}
                            <span style={chainMetaStyle}>{l.written_at ? `Written ${fmtDateTime(l.written_at)}` : '—'}</span>
                          </ChainItem>
                        ))}
                      </span>
                    ) : <ChainEmpty text="No lineage recorded yet" />}
                  </EvidenceRow>
                  <EvidenceRow k="Formula version">
                    {chain.formula_version ? (
                      <ChainItem>
                        <strong style={{ color: T.text, fontWeight: 600 }}>
                          {chain.formula_version.version != null ? `v${chain.formula_version.version}` : '—'}
                        </strong>
                        <span style={{ color: T.subtle }}>{chain.formula_version.expression ?? '—'}</span>
                      </ChainItem>
                    ) : <ChainEmpty text="No approved formula yet" />}
                  </EvidenceRow>
                  <EvidenceRow k="Target">
                    {chain.target ? (
                      <ChainItem>
                        <strong style={{ color: T.text, fontWeight: 600 }}>
                          {fmtUnit(chain.target.target, chain.kpi?.unit)}
                        </strong>
                        <span style={chainMetaStyle}>
                          {chain.target.baseline != null ? `Baseline ${fmtUnit(chain.target.baseline, chain.kpi?.unit)}` : 'Baseline —'}
                        </span>
                      </ChainItem>
                    ) : <ChainEmpty text="No approved target for this period" />}
                  </EvidenceRow>
                  <EvidenceRow k="Actual">
                    {chain.actual ? (
                      <ChainItem>
                        <strong style={{ color: T.text, fontWeight: 600 }}>
                          {fmtUnit(chain.actual.value, chain.kpi?.unit)}
                        </strong>
                        {chain.actual.validation_status && VALIDATION_LOZENGE[chain.actual.validation_status] ? (
                          <Lozenge appearance={VALIDATION_LOZENGE[chain.actual.validation_status].appearance}>
                            {VALIDATION_LOZENGE[chain.actual.validation_status].label}
                          </Lozenge>
                        ) : chain.actual.validation_status ? (
                          <Lozenge appearance="default">{labelize(chain.actual.validation_status)}</Lozenge>
                        ) : null}
                        <span style={chainMetaStyle}>
                          {[
                            nameOf(chain.actual.submitted_by) ? `Submitted by ${nameOf(chain.actual.submitted_by)}` : null,
                            nameOf(chain.actual.validated_by) ? `Validated by ${nameOf(chain.actual.validated_by)}` : null,
                          ].filter(Boolean).join(' · ') || '—'}
                        </span>
                      </ChainItem>
                    ) : <ChainEmpty text="No actual submitted for this period" />}
                  </EvidenceRow>
                  <EvidenceRow k="Snapshots">
                    {chain.snapshots?.length ? (
                      <span style={chainListStyle}>
                        {chain.snapshots.map((s) => {
                          const key = snapshotKeyById.get(s.snapshot_id) ?? null;
                          return (
                            <ChainItem key={s.snapshot_id}>
                              <Button
                                appearance="subtle"
                                spacing="compact"
                                onClick={() => navigate(key ? Routes.strata.review(key) : Routes.strata.reviews())}
                              >
                                {key ?? shortId(s.snapshot_id)}
                              </Button>
                              <span style={chainMetaStyle}>Frozen in governance snapshot</span>
                            </ChainItem>
                          );
                        })}
                      </span>
                    ) : <ChainEmpty text="Not yet frozen in any snapshot" />}
                  </EvidenceRow>
                </>
              ) : null}
            </StrataPanel>
          ) : null}

          {/* History — calc-value trend, oldest → newest */}
          <StrataPanel
            title={latest ? `History · ${labelize(latest.metric_key)}` : 'History'}
            icon={<Activity size={16} />}
            count={calcQ.isLoading ? null : history.length || null}
            testId="strata-evidence-history"
          >
            {calcQ.isLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner size="medium" /></div>
            ) : history.length < 2 ? (
              <EmptyState
                size="compact"
                header="Not enough history to chart"
                description="A trend appears once at least two calculations have been recorded."
                testId="strata-evidence-history-empty"
              />
            ) : (
              <div style={{ width: '100%', height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
                    <CartesianGrid stroke="var(--ds-border)" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: LABEL.fontSize as number, fill: String(LABEL.color) }}
                      stroke="var(--ds-border)"
                    />
                    <YAxis
                      tick={{ fontSize: SMALL.fontSize as number, fill: String(LABEL.color) }}
                      stroke="var(--ds-border)"
                    />
                    <RechartsTooltip
                      contentStyle={{
                        background: 'var(--ds-surface-overlay)', border: '1px solid var(--ds-border)',
                        borderRadius: 4, color: 'var(--ds-text)', fontSize: SMALL.fontSize as number,
                      }}
                      formatter={(v: number | string) => fmtScore(typeof v === 'number' ? v : Number(v))}
                    />
                    <Line type="monotone" dataKey="value" stroke="var(--ds-text-brand)" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </StrataPanel>

          {/* Dossier — every calculation newest-first, full provenance */}
          <StrataPanel
            title="Calculations"
            icon={<FileText size={16} />}
            count={calcQ.isLoading ? null : values.length || null}
            testId="strata-evidence-dossier"
          >
            {calcQ.isLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner size="medium" /></div>
            ) : values.length === 0 ? (
              <EmptyState
                size="compact"
                header="No calculated values recorded yet"
                description="Calc-engine results with full provenance will appear here."
                testId="strata-evidence-dossier-empty"
              />
            ) : (
              values.map((cv) => (
                <div key={cv.id} style={{ marginBottom: 16, padding: 12, background: T.sunken, borderRadius: 8 }} data-testid={`strata-evidence-calc-${cv.id}`}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <strong style={{ color: T.text, fontSize: 'var(--ds-font-size-200)' }}>{labelize(cv.metric_key)}</strong>
                    <StrataBandLozenge bandKey={cv.status_key} />
                  </div>
                  <EvidenceRow k="Value / score">
                    {fmtScore(cv.value)}{cv.score != null && cv.score !== cv.value ? ` · score ${fmtScore(cv.score)}` : ''}
                  </EvidenceRow>
                  <EvidenceRow k="Formula version">{cv.formula_version ?? '—'}</EvidenceRow>
                  <EvidenceRow k="Inputs"><EvidenceInputs inputs={cv.inputs} /></EvidenceRow>
                  <EvidenceRow k="Source runs">
                    {cv.source_run_ids?.length
                      ? cv.source_run_ids.map((rid) => {
                          const key = runKeyById.get(rid);
                          return key ? (
                            <Button key={rid} appearance="subtle" spacing="compact" onClick={() => navigate(Routes.strata.run(key))}>
                              {key}
                            </Button>
                          ) : (<span key={rid}>{shortId(rid)} </span>);
                        })
                      : '—'}
                  </EvidenceRow>
                  <EvidenceRow k="Config context"><EvidenceConfigContext ctx={cv.config_context} /></EvidenceRow>
                  <EvidenceRow k="Confidence">{fmtConfidence(cv.confidence) ?? '—'}</EvidenceRow>
                  <EvidenceRow k="Calculated at">{fmtDateTime(cv.calculated_at)}</EvidenceRow>
                  <EvidenceRow k="Snapshot">
                    {cv.snapshot_id ? (() => {
                      const key = snapshotKeyById.get(cv.snapshot_id!) ?? null;
                      return key ? (
                        <Button appearance="subtle" spacing="compact" onClick={() => navigate(Routes.strata.review(key))}>
                          {key}
                        </Button>
                      ) : 'Frozen in snapshot';
                    })() : 'Live (not yet snapshotted)'}
                  </EvidenceRow>
                </div>
              ))
            )}
          </StrataPanel>
        </div>
      )}
    </StrataPageShell>
  );
}
