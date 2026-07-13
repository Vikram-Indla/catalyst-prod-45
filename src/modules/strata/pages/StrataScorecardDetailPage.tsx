/**
 * STRATA — Scorecard detail (/strata/scorecards/:slug).
 * Renders one scorecard instance: total score hero, perspective strip,
 * grouped lines, commentary. Every number here comes from useScorecardCalc
 * (server RPC; locked instances read the frozen snapshot) — never UI math.
 *
 * D-012 executive lift (2026-07-05): back navigation, page chrome with
 * model label + header actions, score-ring hero, band-toned perspective
 * tiles, canonical JiraTable with perspective group headers, named
 * commentary authors.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Button, CatalystTag, EmptyState, IconButton, SectionMessage, Tooltip,
} from '@/components/ads';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column, RowGroup } from '@/components/shared/JiraTable';
import { Routes } from '@/lib/routes';
import { Info, Layers } from '@/lib/atlaskit-icons';
import { kpiApi, scorecardApi } from '@/modules/strata/domain';
import {
  useBenefits, useInvalidateStrata, useKpis, usePerspectives,
  useProfileNames, useScorecardCalc, useScorecardInstanceBySlug, useScorecardLines,
  useScorecardModels, useStrataContext, useStrataRoles, useStrategyElements,
} from '@/modules/strata/hooks/useStrata';
import {
  T, StrataBandBar, StrataBandLozenge, StrataMetricStat, StrataPageShell,
  StrataPanel, StrataScoreRing,
} from '@/modules/strata/components/shared';
import { fmtDateTime, fmtScore, fmtUnit, labelize } from '@/modules/strata/components/format';
import type { StrataScorecardLine } from '@/modules/strata/types';

interface CommentaryRow {
  id: string;
  author_id?: string | null;
  created_by?: string | null;
  body?: string | null;
  content?: string | null;
  created_at: string;
}

function asDisplay(v: unknown): string | null {
  if (typeof v === 'number' || typeof v === 'string') return String(v);
  return null;
}

/** Weight → percent for display. Line weights arrive as fractions (0.2);
 *  perspective weights may already be percent-scale (25). Display-only. */
function weightPct(w: number | null | undefined): number | null {
  if (w == null || !Number.isFinite(w)) return null;
  return w <= 1 ? w * 100 : w;
}

/** UI affordance gating only — the calc RPC persists provenance, so Recalculate
 *  is a write; executive_viewer is consume-only (same convention as the CC
 *  advisory gating, W2 20260710140000). The DB enforces the real rules. */
const RECALC_ROLES: readonly string[] = ['strategy_office', 'vmo_validator', 'strata_admin'];

/** Legacy UUID detector for the D-6 dual-mode route param. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Layout-matched page skeleton: hero ring row + perspective tiles + lines panel
 *  (anchor 13 "verdict skeleton + grouped-row skeletons"). */
function DetailSkeleton() {
  return (
    <div aria-hidden data-testid="strata-scorecard-loading" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16, padding: 16,
        border: `1px solid ${T.border}`, borderRadius: 8, background: T.raised,
      }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: T.neutral, flexShrink: 0 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-100)', flex: 1 }}>
          <div style={{ height: 12, width: '20%', borderRadius: 4, background: T.neutral }} />
          <div style={{ height: 16, width: '45%', borderRadius: 4, background: T.neutral }} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
        {[0, 1, 2, 3].map((k) => <div key={k} style={{ height: 96, borderRadius: 8, background: T.neutral }} />)}
      </div>
      <div style={{ height: 280, borderRadius: 8, background: T.neutral }} />
    </div>
  );
}

/** Grouped-row skeleton for the lines table (group header + rows, twice). */
function LinesSkeleton() {
  return (
    <div aria-hidden style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-100)', padding: 16 }}>
      {[0, 1].map((g) => (
        <React.Fragment key={g}>
          <div style={{ height: 20, width: '30%', borderRadius: 4, background: T.neutral }} />
          {[0, 1, 2].map((r) => <div key={r} style={{ height: 32, borderRadius: 4, background: T.neutral }} />)}
        </React.Fragment>
      ))}
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
  const profilesQ = useProfileNames();
  const rolesQ = useStrataRoles();
  const invalidate = useInvalidateStrata();
  const [recalculating, setRecalculating] = useState(false);
  const [recalcError, setRecalcError] = useState<string | null>(null);

  // Role-aware gating (§17): no STRATA role → explained restricted page;
  // Recalculate (a persisted write) hides for consume-only viewers.
  const noStrataRole = !rolesQ.isLoading && (rolesQ.data ?? []).length === 0;
  const canRecalculate = (rolesQ.data ?? []).some((r) => RECALC_ROLES.includes(r));

  // D-6 dual-mode: a legacy UUID param resolves (domain queries by id) and is
  // then replaced with the canonical slug URL — one-way, history-preserving.
  useEffect(() => {
    if (slug && UUID_RE.test(slug) && instance?.slug) {
      navigate(Routes.strata.scorecard(instance.slug), { replace: true });
    }
  }, [slug, instance?.slug, navigate]);

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
  const calcPerspectiveById = useMemo(
    () => new Map((calc?.perspectives ?? []).map((p) => [p.perspective_id, p])),
    [calc?.perspectives],
  );
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

  /** Line ⓘ → evidence. KPI lines open the KPI evidence page (full chain);
   *  other line types fall back to the scorecard evidence dossier. Both carry
   *  ?from=<this detail page> so Evidence renders "Back to Scorecard" (§5). */
  const originPath = instance?.slug ? Routes.strata.scorecard(instance.slug) : undefined;
  const openLineEvidence = (line: StrataScorecardLine) => {
    const kpiSlug = line.ref_type === 'kpi' && line.kpi_id ? kpiById.get(line.kpi_id)?.slug ?? null : null;
    if (kpiSlug) {
      navigate(Routes.strata.kpiEvidence(kpiSlug, originPath));
      return;
    }
    if (instance?.slug) navigate(Routes.strata.scorecardEvidence(instance.slug, originPath));
  };

  const recalculate = async () => {
    if (!instance || instance.status === 'locked') return;
    setRecalculating(true);
    setRecalcError(null);
    try {
      await scorecardApi.calcResult(instance);
      invalidate();
      // No success flag: non-destructive confirmations are suppressed
      // platform-wide (use-toast shim, Vikram 2026-06-16). Feedback is the
      // refreshed "Calculated <time>" line + scores via invalidate().
    } catch (e) {
      setRecalcError((e as Error).message);
    } finally {
      setRecalculating(false);
    }
  };

  // ── Lines table schema (canonical JiraTable, grouped by perspective) ──────
  const lineColumns: Column<StrataScorecardLine>[] = useMemo(() => [
    {
      id: 'line',
      label: 'Line',
      flex: true,
      cell: ({ row }) => {
        const name = refNameFor(row);
        const clickable = row.ref_type === 'kpi' && !!(row.kpi_id && kpiById.get(row.kpi_id)?.slug);
        return (
          <span
            data-testid={`strata-scorecard-line-${row.id}`}
            style={{
              fontSize: 'var(--ds-font-size-200)', fontWeight: 500,
              color: clickable ? T.brandText : T.text,
              minWidth: 0, overflowWrap: 'anywhere',
            }}
          >
            {name ?? '—'}
          </span>
        );
      },
    },
    {
      id: 'type',
      label: 'Type',
      width: 10,
      cell: ({ row }) => <CatalystTag text={labelize(row.ref_type)} />,
    },
    {
      id: 'weight',
      label: 'Weight',
      width: 14,
      cell: ({ row }) => {
        const pct = weightPct(row.weight);
        const calcLine = calcLineById.get(row.id) ?? null;
        return (
          <span style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 64 }}>
            <StrataBandBar value={pct} bandKey={calcLine?.status_key} height={4} />
            <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtle, fontVariantNumeric: 'tabular-nums' }}>
              {pct != null ? `${fmtScore(pct)}%` : '—'}
            </span>
          </span>
        );
      },
    },
    {
      id: 'performance',
      label: 'Performance',
      width: 18,
      cell: ({ row }) => {
        const calcLine = calcLineById.get(row.id) ?? null;
        const detail = (calcLine?.detail ?? {}) as Record<string, unknown>;
        const actual = row.ref_type === 'kpi' ? asDisplay(detail.actual) : null;
        const target = row.ref_type === 'kpi' ? asDisplay(detail.target) : null;
        const unit = row.kpi_id ? kpiById.get(row.kpi_id)?.unit ?? null : null;
        if (actual == null && target == null) {
          return <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>—</span>;
        }
        return (
          <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtle, fontVariantNumeric: 'tabular-nums' }}>
            Actual {actual != null ? fmtUnit(actual, unit) : '—'} · Target {target != null ? fmtUnit(target, unit) : '—'}
          </span>
        );
      },
    },
    {
      id: 'score',
      label: 'Score',
      width: 10,
      align: 'end',
      cell: ({ row }) => {
        const calcLine = calcLineById.get(row.id) ?? null;
        const hasScore = !!calcLine && calcLine.has_data;
        if (!hasScore) {
          return (
            <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontWeight: 600, color: T.text }}>—</span>
              <span style={{ fontSize: 'var(--ds-font-size-050)', color: T.subtlest }}>No data</span>
            </span>
          );
        }
        return (
          <span style={{
            fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: T.text,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {fmtScore(calcLine!.score)}
          </span>
        );
      },
    },
    {
      id: 'band',
      label: 'Band',
      width: 12,
      cell: ({ row }) => <StrataBandLozenge bandKey={calcLineById.get(row.id)?.status_key} />,
    },
    {
      id: 'evidence',
      label: '',
      width: 6,
      align: 'center',
      cell: ({ row }) => (instance?.slug ? (
        <span onClick={(e) => e.stopPropagation()}>
          <Tooltip content="View evidence">
            <IconButton
              icon={<Info size={16} />}
              appearance="subtle"
              spacing="compact"
              aria-label="View evidence"
              onClick={() => openLineEvidence(row)}
              testId={`strata-line-evidence-${row.id}`}
            />
          </Tooltip>
        </span>
      ) : null),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [calcLineById, kpiById, elementById, benefitById, instance?.slug]);

  const lineGroups: RowGroup<StrataScorecardLine>[] = useMemo(
    () => linesByPerspective.map(({ perspectiveId, lines: groupLines }) => {
      const p = calcPerspectiveById.get(perspectiveId);
      return {
        id: perspectiveId,
        label: perspectiveNameById.get(perspectiveId) ?? '—',
        rows: groupLines,
        labelNode: (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <span style={{ fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {perspectiveNameById.get(perspectiveId) ?? '—'}
            </span>
            {p ? (
              <>
                <span style={{ fontWeight: 600, color: T.text, fontVariantNumeric: 'tabular-nums' }}>
                  {p.has_data ? fmtScore(p.score) : '—'}
                </span>
                <StrataBandLozenge bandKey={p.has_data ? p.status_key : null} />
              </>
            ) : null}
          </span>
        ),
      };
    }),
    [linesByPerspective, calcPerspectiveById, perspectiveNameById],
  );

  // ── Restricted / loading / error / not-found states ───────────────────────
  const stateTrail = [{ text: 'Scorecards', href: Routes.strata.scorecards() }];
  if (instanceQ.isLoading || rolesQ.isLoading) {
    return (
      <StrataPageShell trail={stateTrail} testId="strata-scorecard-chrome">
        <DetailSkeleton />
      </StrataPageShell>
    );
  }
  if (noStrataRole) {
    return (
      <StrataPageShell trail={stateTrail} testId="strata-scorecard-chrome">
        <EmptyState
          size="default"
          header="You don't have access to this scorecard"
          description="Your account has no STRATA role, so scorecard data is restricted. Ask a STRATA administrator or the strategy office to grant a role, then reload this page."
          testId="strata-scorecard-restricted"
        />
      </StrataPageShell>
    );
  }
  if (instanceQ.isError) {
    return (
      <StrataPageShell trail={stateTrail} testId="strata-scorecard-chrome">
        <SectionMessage appearance="error" title="Could not load scorecard">
          <p>{(instanceQ.error as Error)?.message ?? 'Unknown error.'}</p>
        </SectionMessage>
      </StrataPageShell>
    );
  }
  if (!instance) {
    return (
      <StrataPageShell trail={stateTrail} testId="strata-scorecard-chrome">
        <EmptyState
          header="Scorecard not found"
          description="No scorecard instance matches this address. It may have been renamed or removed."
          primaryAction={<Button appearance="primary" onClick={() => navigate(Routes.strata.scorecards())}>Back to scorecards</Button>}
          testId="strata-scorecard-not-found"
        />
      </StrataPageShell>
    );
  }

  const isLocked = instance.status === 'locked';
  const rollup = calc?.rollup_method ?? model?.rollup_method ?? null;
  const profileById = profilesQ.data;

  return (
    <StrataPageShell
      trail={[{ text: 'Scorecards', href: Routes.strata.scorecards() }]}
      title={instance.name}
      docTitle={instance.name}
      modelLabel={model ? `${model.name} v${instance.model_version}` : null}
      state={instance.status}
      extra={rollup ? <CatalystTag text={`${labelize(rollup)} rollup`} /> : undefined}
      headerActions={(
        <>
          {instance.slug ? (
            <Button
              appearance="subtle"
              iconBefore={<Info size={16} />}
              onClick={() => navigate(Routes.strata.scorecardEvidence(instance.slug!, originPath))}
              testId="strata-scorecard-evidence"
            >
              Evidence
            </Button>
          ) : null}
          {!isLocked && canRecalculate ? (
            <Button appearance="default" isDisabled={recalculating} onClick={recalculate} testId="strata-scorecard-recalculate">
              {recalculating ? 'Recalculating…' : 'Recalculate'}
            </Button>
          ) : null}
        </>
      )}
      testId="strata-scorecard-chrome"
    >

      {isLocked ? (
        <div style={{ marginBottom: 16 }}>
          <SectionMessage appearance="information" title="Frozen in snapshot">
            <p>
              Numbers on this scorecard are immutable — they read from the governance snapshot.{' '}
              <Button appearance="link" spacing="none" onClick={() => navigate(Routes.strata.reviews())}>
                View reviews
              </Button>
            </p>
          </SectionMessage>
        </div>
      ) : null}

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
        {/* Hero: total score ring */}
        <div
          data-testid="strata-scorecard-total"
          style={{
            display: 'flex', alignItems: 'center', gap: 16, padding: '16px 16px',
            background: T.raised, border: `1px solid ${T.border}`, borderRadius: 8,
            boxShadow: 'var(--ds-shadow-raised)',
          }}
        >
          {calcQ.isLoading ? (
            <div aria-hidden style={{ width: 72, height: 72, borderRadius: '50%', background: T.neutral, flexShrink: 0 }} />
          ) : (
            <StrataScoreRing
              score={calc && calc.has_data ? calc.score : null}
              bandKey={calc?.has_data ? calc.status_key : null}
              size={72}
              strokeWidth={7}
              testId="strata-scorecard-total-ring"
            />
          )}
          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{
              fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.subtlest, letterSpacing: '0.04em',
            }}>
              Total score
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <StrataBandLozenge bandKey={calc?.has_data ? calc.status_key : null} />
              {calc && !calc.has_data ? (
                <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>No data</span>
              ) : null}
              {/* Explicit partial label (anchor 13 P2): never present a partial
                * rollup as complete — name how many lines actually carry data. */}
              {calc?.has_data && calc.lines.length > 0 && calc.lines.some((l) => !l.has_data) ? (
                <span
                  data-testid="strata-scorecard-partial"
                  style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-warning)' }}
                >
                  {`Partial — ${calc.lines.filter((l) => l.has_data).length} of ${calc.lines.length} lines have data`}
                </span>
              ) : null}
            </span>
            <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>
              {calcQ.isLoading
                ? 'Calculating…'
                : calc?.calculated_at ? `Calculated ${fmtDateTime(calc.calculated_at)}` : '—'}
            </span>
          </div>
        </div>

        {/* Perspective strip */}
        {calc && calc.perspectives.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            {calc.perspectives.map((p) => {
              const pct = weightPct(p.weight);
              return (
                <StrataMetricStat
                  key={p.perspective_id}
                  label={p.name}
                  value={p.has_data ? fmtScore(p.score) : '—'}
                  bandKey={p.has_data ? p.status_key : null}
                  caption={(
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <StrataBandBar value={p.has_data ? p.score : null} bandKey={p.has_data ? p.status_key : null} height={4} />
                      <span>
                        {pct != null ? `Weight ${fmtScore(pct)}%` : 'Weight —'}
                        {p.has_data ? '' : ' · No data'}
                      </span>
                    </span>
                  )}
                  testId={`strata-perspective-stat-${p.perspective_id}`}
                />
              );
            })}
          </div>
        ) : null}

        {/* Lines */}
        <StrataPanel
          title="Lines"
          icon={<Layers size={16} />}
          count={linesQ.isLoading ? null : lines.length}
          noPadding={!linesQ.isLoading && lines.length > 0}
          testId="strata-scorecard-lines-panel"
        >
          {linesQ.isLoading ? (
            <LinesSkeleton />
          ) : lines.length === 0 ? (
            <EmptyState
              size="compact"
              header="No lines"
              description="This scorecard instance has no KPI, objective or benefit lines yet."
              testId="strata-lines-empty"
            />
          ) : (
            <JiraTable<StrataScorecardLine>
              columns={lineColumns}
              groups={lineGroups}
              getRowId={(row) => row.id}
              onRowClick={(row) => {
                if (row.ref_type !== 'kpi' || !row.kpi_id) return;
                const kpiSlug = kpiById.get(row.kpi_id)?.slug;
                if (kpiSlug) navigate(Routes.strata.kpi(kpiSlug));
              }}
              ariaLabel="Scorecard lines by perspective"
            />
          )}
        </StrataPanel>

        {/* Commentary */}
        <StrataPanel title="Commentary" testId="strata-scorecard-commentary-panel">
          {commentaryQ.isLoading ? (
            <div aria-hidden style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-100)' }}>
              {[0, 1].map((k) => <div key={k} style={{ height: 40, borderRadius: 4, background: T.neutral }} />)}
            </div>
          ) : commentaryQ.isError ? (
            <SectionMessage appearance="error" title="Could not load commentary">
              <p>{(commentaryQ.error as Error)?.message ?? 'Unknown error.'}</p>
            </SectionMessage>
          ) : (commentaryQ.data ?? []).length === 0 ? (
            <EmptyState
              size="compact"
              header="No commentary"
              description="No commentary has been recorded for this period."
              testId="strata-commentary-empty"
            />
          ) : (
            (commentaryQ.data ?? []).map((c) => {
              const authorId = c.author_id ?? c.created_by ?? null;
              const authorName = authorId ? profileById?.get(authorId)?.name ?? null : null;
              return (
                <div key={c.id} style={{ padding: '8px 0', borderBottom: `1px solid ${T.border}` }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 4 }}>
                    <span style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.text }}>
                      {authorName ?? '—'}
                    </span>
                    <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>
                      {fmtDateTime(c.created_at)}
                    </span>
                  </div>
                  <div style={{ fontSize: 'var(--ds-font-size-200)', color: T.text, overflowWrap: 'anywhere' }}>
                    {c.body ?? c.content ?? '—'}
                  </div>
                </div>
              );
            })
          )}
        </StrataPanel>
      </div>
    </StrataPageShell>
  );
}
