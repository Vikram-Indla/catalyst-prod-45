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
import { Button, EmptyState, SectionMessage, Spinner } from '@/components/ads';
import { Activity, FileText } from '@/lib/atlaskit-icons';
import { Routes } from '@/lib/routes';
import { LABEL, SMALL } from '@/components/project-hub/dashboard/dashboardTypography';
import {
  useCalcValues, useKpiBySlug, usePortfolioBySlug, useScorecardInstanceBySlug, useUploadRuns,
} from '@/modules/strata/hooks/useStrata';
import {
  StrataBandLozenge, StrataPageShell, StrataPanel, StrataScoreRing, T,
} from '@/modules/strata/components/shared';
import {
  EvidenceConfigContext, EvidenceInputs, EvidenceRow, shortId,
} from '@/modules/strata/components/evidence';
import { fmtDate, fmtDateTime, fmtPct, fmtRatioPct, fmtScore, labelize } from '@/modules/strata/components/format';
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

/** Confidence arrives either as ratio (0–1) or percent — format by scale. */
const fmtConfidence = (v: number | null | undefined): string | null => {
  if (v == null) return null;
  return Number(v) <= 1 ? fmtRatioPct(v) : fmtPct(v);
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
  const runKeyById = useMemo(() => {
    const m = new Map<string, string>();
    (uploadRunsQ.data ?? []).forEach((r) => m.set(r.id, r.run_key));
    return m;
  }, [uploadRunsQ.data]);

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
                  <EvidenceRow k="Snapshot">{cv.snapshot_id ? 'Frozen in snapshot' : 'Live (not yet snapshotted)'}</EvidenceRow>
                </div>
              ))
            )}
          </StrataPanel>
        </div>
      )}
    </StrataPageShell>
  );
}
