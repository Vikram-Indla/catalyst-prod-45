/**
 * STRATA — Scorecard detail (/strata/scorecards/:slug).
 * Renders one scorecard instance: total score hero, perspective strip,
 * grouped lines, commentary. Every number here comes from useScorecardCalc
 * (server RPC; locked instances read the frozen snapshot) — never UI math.
 */
import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, EmptyState, SectionMessage, Spinner } from '@/components/ads';
import { PageContainer } from '@/components/shared/PageContainer';
import { Routes } from '@/lib/routes';
import { kpiApi, lineageApi, scorecardApi } from '@/modules/strata/domain';
import {
  useBenefits, useCalcValues, useInvalidateStrata, useKpis, usePerspectives,
  useScorecardCalc, useScorecardInstanceBySlug, useScorecardLines, useScorecardModels,
  useStrataContext, useStrategyElements,
} from '@/modules/strata/hooks/useStrata';
import {
  StrataBandLozenge, StrataConfigContextBar, StrataDataStateLozenge,
  StrataMetricStat, StrataPanel, useEvidenceDrawer,
} from '@/modules/strata/components/shared';
import type { ScorecardCalcResult, StrataScorecardLine } from '@/modules/strata/types';

const chipStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', padding: '4px 8px', borderRadius: 4,
  background: 'var(--ds-background-neutral)', color: 'var(--ds-text-subtle)',
  fontSize: 12, fontWeight: 500,
};

interface CommentaryRow {
  id: string;
  author_id?: string | null;
  created_by?: string | null;
  body?: string | null;
  content?: string | null;
  created_at: string;
}

type CalcLine = ScorecardCalcResult['lines'][number];

function asDisplay(v: unknown): string | null {
  if (typeof v === 'number' || typeof v === 'string') return String(v);
  return null;
}

// ── Line row ─────────────────────────────────────────────────────────────────
function LineRow({
  line, calcLine, refName, kpiSlug, onEvidence,
}: {
  line: StrataScorecardLine;
  calcLine: CalcLine | null;
  refName: string | null;
  kpiSlug: string | null;
  onEvidence: () => void;
}) {
  const navigate = useNavigate();
  const clickable = line.ref_type === 'kpi' && !!kpiSlug;
  const open = () => { if (kpiSlug) navigate(Routes.strata.kpi(kpiSlug)); };
  const detail = (calcLine?.detail ?? {}) as Record<string, unknown>;
  const actual = line.ref_type === 'kpi' ? asDisplay(detail.actual) : null;
  const target = line.ref_type === 'kpi' ? asDisplay(detail.target) : null;
  const hasScore = !!calcLine && calcLine.has_data;
  return (
    <div
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? open : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } } : undefined}
      data-testid={`strata-scorecard-line-${line.id}`}
      style={{
        display: 'grid',
        gridTemplateColumns: '90px minmax(180px, 2fr) 70px minmax(160px, 1.2fr) 110px 110px 40px',
        alignItems: 'center', gap: 12, padding: '8px 12px',
        borderBottom: '1px solid var(--ds-border)',
        cursor: clickable ? 'pointer' : 'default',
      }}
    >
      <span style={chipStyle}>{line.ref_type}</span>
      <span style={{ fontSize: 14, fontWeight: 500, color: clickable ? 'var(--ds-text-brand)' : 'var(--ds-text)', minWidth: 0, overflowWrap: 'anywhere' }}>
        {refName ?? '—'}
      </span>
      <span style={{ fontSize: 13, color: 'var(--ds-text-subtle)' }}>w {line.weight}</span>
      <span style={{ fontSize: 12, color: 'var(--ds-text-subtlest)' }}>
        {actual != null || target != null ? <>actual {actual ?? '—'} · target {target ?? '—'}</> : '—'}
      </span>
      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ds-text)', textAlign: 'right' }}>
        {hasScore ? calcLine!.score : (
          <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
            <span>—</span>
            <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--ds-text-subtlest)' }}>no data</span>
          </span>
        )}
      </span>
      <span><StrataBandLozenge bandKey={calcLine?.status_key} /></span>
      <span onClick={(e) => e.stopPropagation()}>
        <Button appearance="subtle" spacing="compact" onClick={onEvidence} aria-label="Evidence for this line">ⓘ</Button>
      </span>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function StrataScorecardDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { activeCycle } = useStrataContext();

  const instanceQ = useScorecardInstanceBySlug(slug);
  const instance = instanceQ.data ?? null;
  const modelsQ = useScorecardModels();
  const model = useMemo(
    () => (modelsQ.data ?? []).find((m) => m.id === instance?.model_id) ?? null,
    [modelsQ.data, instance?.model_id],
  );
  const calcQ = useScorecardCalc(instance);
  const calc = calcQ.data ?? null;
  const linesQ = useScorecardLines(instance?.id);
  const lines = linesQ.data ?? [];
  const kpisQ = useKpis();
  const elementsQ = useStrategyElements(activeCycle?.id);
  const benefitsQ = useBenefits();
  const perspectivesQ = usePerspectives();
  const instanceCalcValuesQ = useCalcValues(instance ? 'scorecard_instance' : undefined, instance?.id);
  const evidence = useEvidenceDrawer();
  const invalidate = useInvalidateStrata();
  const [recalculating, setRecalculating] = useState(false);
  const [recalcError, setRecalcError] = useState<string | null>(null);

  const commentaryQ = useQuery({
    queryKey: ['strata', 'commentary', 'scorecard_instance', instance?.id],
    queryFn: async (): Promise<CommentaryRow[]> =>
      (await kpiApi.commentary('scorecard_instance', instance!.id)) as CommentaryRow[],
    enabled: !!instance,
    staleTime: 30_000,
  });

  const kpiById = useMemo(() => new Map((kpisQ.data ?? []).map((k) => [k.id, k])), [kpisQ.data]);
  const elementById = useMemo(() => new Map((elementsQ.data ?? []).map((e) => [e.id, e])), [elementsQ.data]);
  const benefitById = useMemo(() => new Map((benefitsQ.data ?? []).map((b) => [b.id, b])), [benefitsQ.data]);
  const calcLineById = useMemo(() => new Map((calc?.lines ?? []).map((l) => [l.line_id, l])), [calc?.lines]);
  const perspectiveNameById = useMemo(() => {
    const m = new Map<string, string>();
    (perspectivesQ.data ?? []).forEach((p) => m.set(p.id, p.name));
    (calc?.perspectives ?? []).forEach((p) => m.set(p.perspective_id, p.name));
    return m;
  }, [perspectivesQ.data, calc?.perspectives]);

  const linesByPerspective = useMemo(() => {
    const groups = new Map<string, StrataScorecardLine[]>();
    lines.forEach((l) => {
      const arr = groups.get(l.perspective_id) ?? [];
      arr.push(l);
      groups.set(l.perspective_id, arr);
    });
    // calc perspective order first, then any ungrouped perspectives
    const ordered: Array<{ perspectiveId: string; lines: StrataScorecardLine[] }> = [];
    (calc?.perspectives ?? []).forEach((p) => {
      if (groups.has(p.perspective_id)) {
        ordered.push({ perspectiveId: p.perspective_id, lines: groups.get(p.perspective_id)! });
        groups.delete(p.perspective_id);
      }
    });
    groups.forEach((ls, pid) => ordered.push({ perspectiveId: pid, lines: ls }));
    return ordered;
  }, [lines, calc?.perspectives]);

  const refNameFor = (line: StrataScorecardLine): string | null => {
    if (line.ref_type === 'kpi') return line.kpi_id ? kpiById.get(line.kpi_id)?.name ?? null : null;
    if (line.ref_type === 'objective') return line.element_id ? elementById.get(line.element_id)?.name ?? null : null;
    if (line.ref_type === 'benefit') return line.benefit_id ? benefitById.get(line.benefit_id)?.name ?? null : null;
    return null;
  };

  const openLineEvidence = async (line: StrataScorecardLine) => {
    try {
      const values = await lineageApi.calcValues('scorecard_line', line.id);
      evidence.open(`Line: ${refNameFor(line) ?? line.ref_type}`, values);
    } catch {
      evidence.open(`Line: ${refNameFor(line) ?? line.ref_type}`, []);
    }
  };

  const recalculate = async () => {
    if (!instance || instance.status === 'locked') return;
    setRecalculating(true);
    setRecalcError(null);
    try {
      await scorecardApi.calcResult(instance);
      invalidate();
    } catch (e) {
      setRecalcError((e as Error).message);
    } finally {
      setRecalculating(false);
    }
  };

  // ── Loading / error / not-found states ────────────────────────────────────
  if (instanceQ.isLoading) {
    return (
      <PageContainer variant="wide">
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner size="large" /></div>
      </PageContainer>
    );
  }
  if (instanceQ.isError) {
    return (
      <PageContainer variant="wide">
        <SectionMessage appearance="error" title="Could not load scorecard">
          <p>{(instanceQ.error as Error)?.message ?? 'Unknown error.'}</p>
        </SectionMessage>
      </PageContainer>
    );
  }
  if (!instance) {
    return (
      <PageContainer variant="wide">
        <EmptyState
          header="Scorecard not found"
          description="No scorecard instance matches this address. It may have been renamed or removed."
          primaryAction={<Button appearance="primary" onClick={() => navigate(Routes.strata.scorecards())}>Back to scorecards</Button>}
          testId="strata-scorecard-not-found"
        />
      </PageContainer>
    );
  }

  const isLocked = instance.status === 'locked';

  return (
    <PageContainer variant="wide">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 4 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--ds-text)', margin: 0 }}>{instance.name}</h1>
        <StrataDataStateLozenge state={instance.status} />
        {!isLocked ? (
          <span style={{ marginLeft: 'auto' }}>
            <Button appearance="default" isDisabled={recalculating} onClick={recalculate}>
              {recalculating ? 'Recalculating…' : 'Recalculate'}
            </Button>
          </span>
        ) : null}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        <span style={chipStyle}>
          Model: <strong style={{ color: 'var(--ds-text)', marginLeft: 4 }}>{model ? `${model.name} v${instance.model_version}` : '—'}</strong>
        </span>
        <span style={{ fontSize: 12, color: 'var(--ds-text-subtlest)' }}>
          Rollup: {calc?.rollup_method ?? model?.rollup_method ?? '—'}
        </span>
        {isLocked ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--ds-text-subtle)' }}>Frozen in snapshot — numbers are immutable.</span>
            <Button appearance="subtle" spacing="compact" onClick={() => navigate(Routes.strata.reviews())}>View reviews</Button>
          </span>
        ) : null}
      </div>
      <StrataConfigContextBar
        modelLabel={model ? `${model.name} v${instance.model_version}` : null}
        state={instance.status}
      />

      {recalcError ? (
        <div style={{ marginBottom: 16 }}>
          <SectionMessage appearance="error" title="Recalculation failed"><p>{recalcError}</p></SectionMessage>
        </div>
      ) : null}
      {calcQ.isError ? (
        <div style={{ marginBottom: 16 }}>
          <SectionMessage appearance="warning" title="Score unavailable">
            <p>{(calcQ.error as Error)?.message ?? 'The calculation engine did not return a result.'}</p>
          </SectionMessage>
        </div>
      ) : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Hero: total score */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 1fr) auto', gap: 12, alignItems: 'start' }}>
          <StrataMetricStat
            label="Total score"
            value={calcQ.isLoading ? '…' : calc && calc.has_data ? calc.score : '—'}
            bandKey={calc?.status_key}
            caption={
              calc && !calc.has_data ? 'no data' :
              calc?.calculated_at ? `Calculated ${new Date(calc.calculated_at).toLocaleString()}` : undefined
            }
            testId="strata-scorecard-total"
          />
          <Button
            appearance="subtle"
            onClick={() => evidence.open(instance.name, instanceCalcValuesQ.data ?? [])}
          >
            ⓘ Evidence
          </Button>
        </div>

        {/* Perspective strip */}
        {calc && calc.perspectives.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            {calc.perspectives.map((p) => (
              <StrataMetricStat
                key={p.perspective_id}
                label={p.name}
                value={p.has_data ? p.score : '—'}
                bandKey={p.status_key}
                caption={p.has_data ? `w ${p.weight}` : `w ${p.weight} · no data`}
                testId={`strata-perspective-stat-${p.perspective_id}`}
              />
            ))}
          </div>
        ) : null}

        {/* Lines */}
        <StrataPanel title="Lines" testId="strata-scorecard-lines-panel">
          {linesQ.isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner size="medium" /></div>
          ) : lines.length === 0 ? (
            <EmptyState
              size="compact"
              header="No lines"
              description="This scorecard instance has no KPI, objective or benefit lines yet."
              testId="strata-lines-empty"
            />
          ) : (
            linesByPerspective.map(({ perspectiveId, lines: groupLines }) => (
              <div key={perspectiveId} style={{ marginBottom: 12 }}>
                <div style={{
                  fontSize: 12, fontWeight: 700, color: 'var(--ds-text-subtle)',
                  padding: '8px 12px', background: 'var(--ds-surface-sunken)', borderRadius: 4,
                }}>
                  {perspectiveNameById.get(perspectiveId) ?? '—'}
                </div>
                {groupLines.map((line) => (
                  <LineRow
                    key={line.id}
                    line={line}
                    calcLine={calcLineById.get(line.id) ?? null}
                    refName={refNameFor(line)}
                    kpiSlug={line.kpi_id ? kpiById.get(line.kpi_id)?.slug ?? null : null}
                    onEvidence={() => { void openLineEvidence(line); }}
                  />
                ))}
              </div>
            ))
          )}
        </StrataPanel>

        {/* Commentary */}
        <StrataPanel title="Commentary" testId="strata-scorecard-commentary-panel">
          {commentaryQ.isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner size="medium" /></div>
          ) : commentaryQ.isError ? (
            <SectionMessage appearance="error" title="Could not load commentary">
              <p>{(commentaryQ.error as Error)?.message ?? 'Unknown error.'}</p>
            </SectionMessage>
          ) : (commentaryQ.data ?? []).length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--ds-text-subtle)', margin: 0 }}>No commentary for this period.</p>
          ) : (
            (commentaryQ.data ?? []).map((c) => (
              <div key={c.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--ds-border)' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtle)' }}>
                    {c.author_id ?? c.created_by ?? '—'}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--ds-text-subtlest)' }}>
                    {c.created_at ? new Date(c.created_at).toLocaleString() : '—'}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--ds-text)', overflowWrap: 'anywhere' }}>
                  {c.body ?? c.content ?? '—'}
                </div>
              </div>
            ))
          )}
        </StrataPanel>
      </div>

      {evidence.drawer}
    </PageContainer>
  );
}
