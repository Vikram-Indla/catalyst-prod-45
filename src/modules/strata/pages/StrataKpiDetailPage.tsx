/**
 * STRATA KPI Detail — /strata/kpis/:slug (CAT-STRATA-20260705-001).
 * Full lineage view: ownership (SoD), server-computed achievement, trend,
 * governed formula versions, upload-run lineage, commentary.
 * UI never computes achievement/RAG — values come from strata_calc_kpi_achievement
 * and strata_calculated_values verbatim. Unknowns render '—'.
 */
import React, { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Badge from '@atlaskit/badge';
import ArrowLeftIcon from '@atlaskit/icon/glyph/arrow-left';
import { Button, Lozenge, SectionMessage, Spinner } from '@/components/ads';
import {
  CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis,
} from 'recharts';
import { EmptyState } from '@/components/ads';
import { PageContainer } from '@/components/shared/PageContainer';
import { Routes } from '@/lib/routes';
import { kpiApi } from '@/modules/strata/domain';
import {
  useCalcValues, useKpiAchievement, useKpiBySlug, useKpiDetail, useStrataContext, useUploadRuns,
} from '@/modules/strata/hooks/useStrata';
import {
  StrataBandLozenge, StrataConfigContextBar, StrataMetricStat, StrataPanel, useEvidenceDrawer,
} from '@/modules/strata/components/shared';
import { StrataGovernedStatusLozenge } from '@/modules/strata/pages/StrataKpiLibraryPage';
import type {
  StrataKpi, StrataKpiActual, StrataKpiTarget, ValidationStatus,
} from '@/modules/strata/types';

const STALE = 30_000;

/** Shape returned by strata_calc_kpi_achievement — rendered verbatim, never recomputed. */
interface KpiAchievementPayload {
  achievement: number | null;
  actual: number | null;
  target: number | null;
  status_key: string | null;
  has_data?: boolean;
  confidence?: number | null;
}

/** Loose row shape for strata_commentary — fields rendered defensively. */
interface StrataCommentaryRow {
  id: string;
  body?: string | null;
  content?: string | null;
  author_id?: string | null;
  created_by?: string | null;
  created_at?: string | null;
}

const DIRECTION_LABEL: Record<StrataKpi['direction'], string> = {
  higher_better: 'Higher is better',
  lower_better: 'Lower is better',
  band: 'Band',
  manual: 'Manual',
};

const VALIDATION_LOZENGE: Record<ValidationStatus, { label: string; appearance: React.ComponentProps<typeof Lozenge>['appearance'] }> = {
  validated: { label: 'Validated', appearance: 'success' },
  pending: { label: 'Pending', appearance: 'moved' },
  rejected: { label: 'Rejected', appearance: 'removed' },
  quarantined: { label: 'Quarantined', appearance: 'default' },
};

function ValidationLozenge({ status }: { status: ValidationStatus | string | null | undefined }) {
  if (!status) return <Dash />;
  const cfg = VALIDATION_LOZENGE[status as ValidationStatus];
  if (!cfg) return <Lozenge appearance="default">{String(status)}</Lozenge>;
  return <Lozenge appearance={cfg.appearance}>{cfg.label}</Lozenge>;
}

const Dash = () => <span style={{ color: 'var(--ds-text-subtlest)' }}>—</span>;

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', padding: '4px 8px', borderRadius: 4,
        background: 'var(--ds-background-neutral)', color: 'var(--ds-text-subtle)',
        fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

/** Person cell: uuid first 8 chars w/ title attr — no profile join seeded; never invent names. */
function PersonRef({ id }: { id: string | null }) {
  if (!id) return <Dash />;
  return (
    <span title={id} style={{ fontFamily: 'var(--ds-font-family-code, monospace)', fontSize: 12, color: 'var(--ds-text)' }}>
      {id.slice(0, 8)}
    </span>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtle)',
  padding: '8px 8px', borderBottom: '2px solid var(--ds-border)', whiteSpace: 'nowrap',
};
const tdStyle: React.CSSProperties = {
  fontSize: 13, color: 'var(--ds-text)', padding: '8px 8px', borderBottom: '1px solid var(--ds-border)',
};

const OWNERSHIP_ROLES: Array<{ label: string; key: keyof Pick<StrataKpi,
  'accountable_owner_id' | 'data_owner_id' | 'reporter_id' | 'validator_id' | 'escalation_owner_id'> }> = [
  { label: 'Accountable owner', key: 'accountable_owner_id' },
  { label: 'Data owner', key: 'data_owner_id' },
  { label: 'Reporter', key: 'reporter_id' },
  { label: 'Validator', key: 'validator_id' },
  { label: 'Escalation owner', key: 'escalation_owner_id' },
];

export default function StrataKpiDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { periods, activePeriod } = useStrataContext();

  const kpiQ = useKpiBySlug(slug);
  const kpi = kpiQ.data ?? null;
  const detailQ = useKpiDetail(kpi?.id);
  const achievementQ = useKpiAchievement(kpi?.id, activePeriod?.id);
  const calcValuesQ = useCalcValues('kpi', kpi?.id);
  const uploadRunsQ = useUploadRuns();
  const evidence = useEvidenceDrawer();

  const commentaryQ = useQuery({
    queryKey: ['strata', 'commentary', 'kpi', kpi?.id],
    queryFn: () => kpiApi.commentary('kpi', kpi!.id),
    enabled: !!kpi?.id,
    staleTime: STALE,
  });

  const achievement = (achievementQ.data ?? null) as KpiAchievementPayload | null;
  const periodById = useMemo(() => new Map(periods.map((p) => [p.id, p])), [periods]);
  const runKeyById = useMemo(() => {
    const m = new Map<string, string>();
    (uploadRunsQ.data ?? []).forEach((r) => m.set(r.id, r.run_key));
    return m;
  }, [uploadRunsQ.data]);

  /** Trend rows: targets ⋈ actuals on period_id — raw values only, no math. */
  const trendRows = useMemo(() => {
    const targets = detailQ.data?.targets ?? [];
    const actuals = detailQ.data?.actuals ?? [];
    const targetByPeriod = new Map<string, StrataKpiTarget>();
    targets.forEach((t) => {
      const existing = targetByPeriod.get(t.period_id);
      if (!existing || (t.status === 'approved' && existing.status !== 'approved') ||
        (t.status === existing.status && t.version > existing.version)) {
        targetByPeriod.set(t.period_id, t);
      }
    });
    const actualByPeriod = new Map<string, StrataKpiActual>();
    // actuals arrive ordered by submitted_at desc — keep the latest per period.
    actuals.forEach((a) => { if (!actualByPeriod.has(a.period_id)) actualByPeriod.set(a.period_id, a); });
    const periodIds = new Set<string>([...targetByPeriod.keys(), ...actualByPeriod.keys()]);
    return [...periodIds]
      .map((pid) => ({
        periodId: pid,
        period: periodById.get(pid) ?? null,
        target: targetByPeriod.get(pid) ?? null,
        actual: actualByPeriod.get(pid) ?? null,
      }))
      .sort((a, b) => (a.period?.starts_on ?? '').localeCompare(b.period?.starts_on ?? ''));
  }, [detailQ.data?.targets, detailQ.data?.actuals, periodById]);

  const chartData = useMemo(() => trendRows.map((r) => ({
    name: r.period?.name ?? r.periodId.slice(0, 8),
    Target: r.target?.target ?? null,
    Actual: r.actual?.value ?? null,
  })), [trendRows]);

  // ── Loading / error / not-found states ────────────────────────────────────
  if (kpiQ.isLoading) {
    return (
      <PageContainer variant="wide">
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Spinner size="large" aria-label="Loading KPI" />
        </div>
      </PageContainer>
    );
  }
  if (kpiQ.isError) {
    return (
      <PageContainer variant="wide">
        <SectionMessage appearance="error" title="Failed to load KPI">
          <p>{(kpiQ.error as Error)?.message ?? 'Unknown error'}</p>
        </SectionMessage>
      </PageContainer>
    );
  }
  if (!kpi) {
    return (
      <PageContainer variant="wide">
        <EmptyState
          header="KPI not found"
          description={`No KPI exists with slug "${slug ?? ''}".`}
          primaryAction={<Button appearance="primary" onClick={() => navigate(Routes.strata.kpis())}>Back to KPI library</Button>}
        />
      </PageContainer>
    );
  }

  const actuals = detailQ.data?.actuals ?? [];
  const formulas = detailQ.data?.formulas ?? [];
  const lineageActuals = actuals.filter((a) => a.upload_run_id);
  const manualActuals = actuals.filter((a) => a.entry_method === 'manual');
  const commentary = (commentaryQ.data ?? []) as StrataCommentaryRow[];

  return (
    <PageContainer variant="wide">
      {/* (a) header */}
      <div style={{ marginBottom: 8 }}>
        <Button appearance="subtle" iconBefore={<ArrowLeftIcon label="" />} onClick={() => navigate(Routes.strata.kpis())}>
          KPI library
        </Button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 4 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--ds-text)', margin: 0 }}>{kpi.name}</h1>
        <StrataGovernedStatusLozenge status={kpi.status} />
        {kpi.unit ? <Chip>{kpi.unit}</Chip> : null}
        <Chip>{DIRECTION_LABEL[kpi.direction] ?? kpi.direction}</Chip>
        {kpi.frequency ? <Chip>{kpi.frequency}</Chip> : null}
      </div>
      {kpi.description ? (
        <p style={{ fontSize: 13, color: 'var(--ds-text-subtle)', margin: '0 0 8px', maxWidth: 720 }}>{kpi.description}</p>
      ) : null}
      <StrataConfigContextBar />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* (b) Ownership */}
        <StrataPanel title="Ownership" testId="strata-kpi-ownership">
          <div>
            {OWNERSHIP_ROLES.map(({ label, key }) => (
              <div key={key} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--ds-border)' }}>
                <span style={{ width: 160, flexShrink: 0, fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtle)' }}>{label}</span>
                <PersonRef id={kpi[key]} />
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: 'var(--ds-text-subtlest)', margin: '8px 0 0' }}>
            Roles are segregated: submitter ≠ validator enforced in the database
          </p>
        </StrataPanel>

        {/* (c) hero row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, alignItems: 'stretch' }}>
          <StrataMetricStat
            label={`Achievement · ${activePeriod?.name ?? '—'}`}
            value={achievement?.achievement != null ? `${achievement.achievement}%` : '—'}
            bandKey={achievement?.status_key ?? null}
            caption={
              achievement && (achievement.actual != null || achievement.target != null)
                ? `actual ${achievement.actual ?? '—'} vs target ${achievement.target ?? '—'}`
                : 'No achievement calculated for this period'
            }
            testId="strata-kpi-achievement-stat"
          />
          <StrataMetricStat
            label="Confidence"
            value={achievement?.confidence != null ? String(achievement.confidence) : '—'}
            caption="Reported by the calc engine"
            testId="strata-kpi-confidence-stat"
          />
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Button
              appearance="default"
              onClick={() => evidence.open(kpi.name, calcValuesQ.data ?? [])}
              isDisabled={calcValuesQ.isLoading}
            >
              ⓘ Evidence
            </Button>
          </div>
        </div>

        {/* (d) Trend */}
        <StrataPanel title="Trend" testId="strata-kpi-trend">
          {detailQ.isLoading ? (
            <Spinner size="medium" aria-label="Loading trend" />
          ) : detailQ.isError ? (
            <SectionMessage appearance="error" title="Failed to load trend data">
              <p>{(detailQ.error as Error)?.message ?? 'Unknown error'}</p>
            </SectionMessage>
          ) : trendRows.length === 0 ? (
            <EmptyState size="compact" header="No targets or actuals yet" description="Targets and validated actuals will chart here by period." />
          ) : (
            <>
              <div style={{ width: '100%', height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke="var(--ds-border)" strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fill: 'var(--ds-text-subtle)', fontSize: 12 }} stroke="var(--ds-border)" />
                    <YAxis tick={{ fill: 'var(--ds-text-subtle)', fontSize: 12 }} stroke="var(--ds-border)" />
                    <RechartsTooltip
                      contentStyle={{
                        background: 'var(--ds-surface-overlay)', border: '1px solid var(--ds-border)',
                        borderRadius: 4, color: 'var(--ds-text)', fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, color: 'var(--ds-text-subtle)' }} />
                    <Line type="monotone" dataKey="Target" stroke="var(--ds-text-subtlest)" strokeDasharray="4 4" dot={{ r: 3 }} connectNulls />
                    <Line type="monotone" dataKey="Actual" stroke="var(--ds-text-brand)" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Period</th>
                    <th style={thStyle}>Target</th>
                    <th style={thStyle}>Actual</th>
                    <th style={thStyle}>Validation</th>
                  </tr>
                </thead>
                <tbody>
                  {trendRows.map((r) => (
                    <tr key={r.periodId}>
                      <td style={tdStyle}>{r.period?.name ?? <Dash />}</td>
                      <td style={tdStyle}>{r.target ? r.target.target : <Dash />}</td>
                      <td style={tdStyle}>{r.actual ? r.actual.value : <Dash />}</td>
                      <td style={tdStyle}>{r.actual ? <ValidationLozenge status={r.actual.validation_status} /> : <Dash />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </StrataPanel>

        {/* (e) Formula versions */}
        <StrataPanel title="Formula versions" testId="strata-kpi-formulas">
          {detailQ.isLoading ? (
            <Spinner size="medium" aria-label="Loading formulas" />
          ) : formulas.length === 0 ? (
            <EmptyState size="compact" header="No formula versions" description="Governed formula versions will appear here once defined." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {formulas.map((f) => (
                <div key={f.id} style={{ border: '1px solid var(--ds-border)', borderRadius: 8, padding: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                    <Badge appearance="primary">{`v${f.version}`}</Badge>
                    <Chip>{f.formula_type}</Chip>
                    <StrataGovernedStatusLozenge status={f.status} />
                    <span style={{ fontSize: 12, color: 'var(--ds-text-subtlest)', marginLeft: 'auto' }}>
                      Effective from {f.effective_from ?? '—'} · Approved {f.approved_at ? new Date(f.approved_at).toLocaleDateString() : '—'}
                    </span>
                  </div>
                  <pre
                    style={{
                      margin: 0, padding: '8px 12px', background: 'var(--ds-surface-sunken)', borderRadius: 4,
                      fontFamily: 'var(--ds-font-family-code, monospace)', fontSize: 12, color: 'var(--ds-text)',
                      whiteSpace: 'pre-wrap', overflowWrap: 'anywhere',
                    }}
                  >
                    {f.expression}
                  </pre>
                </div>
              ))}
              <p style={{ fontSize: 12, color: 'var(--ds-text-subtlest)', margin: 0 }}>
                Formula changes create new versions; no silent changes
              </p>
            </div>
          )}
        </StrataPanel>

        {/* (f) Lineage */}
        <StrataPanel title="Lineage" testId="strata-kpi-lineage">
          {detailQ.isLoading ? (
            <Spinner size="medium" aria-label="Loading lineage" />
          ) : actuals.length === 0 ? (
            <EmptyState size="compact" header="No actuals recorded" description="Uploaded and manual actuals with full lineage will appear here." />
          ) : (
            <>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Period</th>
                    <th style={thStyle}>Value</th>
                    <th style={thStyle}>Entry</th>
                    <th style={thStyle}>Upload run</th>
                    <th style={thStyle}>Staging row</th>
                    <th style={thStyle}>Validated at</th>
                  </tr>
                </thead>
                <tbody>
                  {actuals.map((a) => {
                    const runKey = a.upload_run_id ? runKeyById.get(a.upload_run_id) ?? null : null;
                    return (
                      <tr key={a.id}>
                        <td style={tdStyle}>{periodById.get(a.period_id)?.name ?? <Dash />}</td>
                        <td style={tdStyle}>{a.value}</td>
                        <td style={tdStyle}><Chip>{a.entry_method}</Chip></td>
                        <td style={tdStyle}>
                          {runKey ? (
                            <Button appearance="subtle" spacing="compact" onClick={() => navigate(Routes.strata.run(runKey))}>
                              {runKey}
                            </Button>
                          ) : a.upload_run_id ? (
                            <span title={a.upload_run_id} style={{ color: 'var(--ds-text-subtle)' }}>{a.upload_run_id.slice(0, 8)}</span>
                          ) : (
                            <Dash />
                          )}
                        </td>
                        <td style={tdStyle}>
                          {a.staging_row_id
                            ? <span title={a.staging_row_id} style={{ fontFamily: 'var(--ds-font-family-code, monospace)', fontSize: 12 }}>{a.staging_row_id.slice(0, 8)}</span>
                            : <Dash />}
                        </td>
                        <td style={tdStyle}>{a.validated_at ? new Date(a.validated_at).toLocaleString() : <Dash />}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p style={{ fontSize: 12, color: 'var(--ds-text-subtlest)', margin: '8px 0 0' }}>
                {lineageActuals.length > 0 ? 'Uploaded values trace to a staging row inside their upload run. ' : ''}
                {manualActuals.length > 0 ? 'Manual entries carry submitter attestation' : ''}
              </p>
            </>
          )}
        </StrataPanel>

        {/* (g) Commentary */}
        <StrataPanel title="Commentary" testId="strata-kpi-commentary">
          {commentaryQ.isLoading ? (
            <Spinner size="medium" aria-label="Loading commentary" />
          ) : commentaryQ.isError ? (
            <SectionMessage appearance="error" title="Failed to load commentary">
              <p>{(commentaryQ.error as Error)?.message ?? 'Unknown error'}</p>
            </SectionMessage>
          ) : commentary.length === 0 ? (
            <EmptyState size="compact" header="No commentary yet" description="Narrative context recorded against this KPI will appear here." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {commentary.map((c) => (
                <div key={c.id} style={{ padding: '8px 12px', background: 'var(--ds-surface-sunken)', borderRadius: 4 }}>
                  <p style={{ fontSize: 13, color: 'var(--ds-text)', margin: 0, whiteSpace: 'pre-wrap' }}>
                    {c.body ?? c.content ?? '—'}
                  </p>
                  <span style={{ fontSize: 11, color: 'var(--ds-text-subtlest)' }}>
                    {(c.author_id ?? c.created_by) ? <PersonRef id={(c.author_id ?? c.created_by) as string} /> : '—'}
                    {' · '}
                    {c.created_at ? new Date(c.created_at).toLocaleString() : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </StrataPanel>
      </div>

      {evidence.drawer}
    </PageContainer>
  );
}
