/**
 * STRATA Strategy Element Detail — /strata/strategy/elements/:slug
 * (CAT-STRATA-HIERARCHY-20260706-001).
 *
 * Slice 1 (CAT-STRATA-THEME-DETAIL-20260710-001): Edit and Charter are
 * authored directly from this page via shared modal components and
 * `strategyApi` mutations also used by the Strategy Room row menu — one
 * definition, two call sites. Audit renders business-readable labels
 * instead of raw RPC/INSERT/UPDATE strings.
 *
 * Slice 2: real Objectives list (was a bare "Children: N" count) with an Add
 * Objective action, and a unified OKR Performance panel — Objective Key
 * Results (rolled up from this Theme's objectives, or direct for an
 * Objective's own page) plus Linked KPIs, replacing the old standalone "KPI
 * links" card. All Theme-only sections gate on `isThemeElement()`, not a
 * bare `element_type === 'theme'` check, so legacy `'play'` rows (pre-
 * CAT-STRATA-HIERARCHY-20260706-001 data) behave identically — no new
 * `'play'` rows can be created (DB CHECK + `NewElementModal` both restrict
 * creation to `'theme'`/`'objective'`).
 *
 * Slice 3: Linked Project Cards (Theme-only) and an Execution Summary
 * rollup. Delivery health is read directly from the server-calculated
 * `calculated_health` field — never recomputed. Forecast End shows the
 * single canonical `final_forecast_end` resolved value (already computed
 * server-side) with a system/manual source indicator, not the three raw
 * forecast columns separately. Baseline End shows the approved
 * `baseline_end` (read-only, never overwritten) — not the internal
 * milestone-derived `calc_baseline_end`. Cycle-entry classification
 * (New/Continuing/Carry Forward) and baseline/version history are confirmed
 * schema gaps — reported as absent, not fabricated.
 *
 * Slice 4: Theme-scoped governance (Decisions/Actions), via a nullable
 * `strata_decisions.element_id` FK (migration
 * 20260710190000_strata_decision_element_linkage.sql) — additive, does not
 * touch `strata_actions` (actions inherit Theme scope transitively via
 * their parent decision) or `StrataReviewsPage.tsx`'s existing snapshot-
 * scoped governance flows. "Map edges" renamed to "Strategy relationships"
 * (UI copy only — table/column/enum names untouched).
 *
 * Deliberately out of scope: Strategic Investment summary (budget/spend).
 * See features/CAT-STRATA-THEME-DETAIL-20260710-001/ for the full slice plans.
 */
import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { Button, EmptyState, Lozenge, Spinner } from '@/components/ads';
import { Briefcase, ClipboardList, GitBranch, Network, Plus, Target } from '@/lib/atlaskit-icons';
import { Routes } from '@/lib/routes';
import {
  useActions, useBandResolver, useBenefitProjectCards, useBenefits, useDecisions, useElementKpis, useGateModels, useInvalidateStrata, useKpis, useMapEdges, useOkrs,
  ctxToken, usePerspectives, useProjectCards, useThemeCharters, useProfileNames, useStrataAudit, useStrataContext,
  useStrataRoles, useStrategyElementBySlug, useStrategyElements,
} from '@/modules/strata/hooks/useStrata';
import {
  computeCardRollup, forecastSource, OkrRow, StrataChainStrip, StrataExecutionHealthLozenge, StrataPageShell, StrataPanel, T,
} from '@/modules/strata/components/shared';
import type { StrataChainSegment } from '@/modules/strata/components/shared';
import {
  EditElementModal, gateModelSelectOptions, NewElementModal, perspectiveSelectOptions, StrataFormModal, str,
  themeParentOptions, ThemeCharterModal,
} from '@/modules/strata/components/authoring';
import { governanceApi, kpiApi } from '@/modules/strata/domain';
import { fmtDate, fmtDateTime, formatAuditAction, labelize } from '@/modules/strata/components/format';
import { isThemeElement } from '@/modules/strata/types';
import type { StrataDecision, StrataStrategyElement } from '@/modules/strata/types';

/** Roles allowed to author strategy structure — UI gate only; DB RPCs enforce (mirrors Strategy Room). */
const AUTHOR_ROLES = ['strategy_office', 'strata_admin'] as const;
/** Mirrors strata_create_decision/strata_create_action's actual role check exactly (admin bypass is internal to strata_has_role). */
const DECISION_AUTHOR_ROLES = ['strategy_office', 'vmo_validator', 'strata_admin'] as const;
const DECISION_STATUS_APPEARANCE: Record<StrataDecision['status'], React.ComponentProps<typeof Lozenge>['appearance']> = {
  open: 'inprogress', decided: 'success', closed: 'default',
};
const DECISION_TYPE_OPTIONS = ['governance', 'gate', 'escalation', 'action_only'].map((t) => ({ value: t, label: labelize(t) }));

type AuthoringState =
  | { kind: 'edit-element'; element: StrataStrategyElement }
  | { kind: 'charter'; element: StrataStrategyElement }
  | { kind: 'add-objective' }
  | { kind: 'record-decision' }
  | { kind: 'create-action'; decisionId: string; decisionTitle: string };

const STATUS_APPEARANCE: Record<string, React.ComponentProps<typeof Lozenge>['appearance']> = {
  draft: 'default',
  proposed: 'inprogress',
  active: 'success',
  on_hold: 'moved',
  retired: 'removed',
};

export default function StrataStrategyElementDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const elementQ = useStrategyElementBySlug(slug);
  const element = elementQ.data;

  const elementsQ = useStrategyElements(element?.cycle_id);
  const mapEdgesQ = useMapEdges(element?.cycle_id);
  const chartersQ = useThemeCharters();
  const elementKpisQ = useElementKpis();
  const kpisQ = useKpis();
  const perspectivesQ = usePerspectives();
  const gateModelsQ = useGateModels();
  const okrsQ = useOkrs();
  const projectCardsQ = useProjectCards();
  const decisionsQ = useDecisions();
  const actionsQ = useActions();
  const rolesQ = useStrataRoles();
  const auditQ = useStrataAudit('strata_strategy_elements');
  const benefitCardsQ = useBenefitProjectCards();
  const benefitsQ = useBenefits();
  const profiles = useProfileNames();
  const invalidate = useInvalidateStrata();
  const resolveBand = useBandResolver();
  const { cycles, activePeriod } = useStrataContext();

  const [authoring, setAuthoring] = useState<AuthoringState | null>(null);
  const [expandedOkrs, setExpandedOkrs] = useState<Set<string>>(new Set());
  const canAuthor = (rolesQ.data ?? []).some((r) => (AUTHOR_ROLES as readonly string[]).includes(r));
  const canGovern = (rolesQ.data ?? []).some((r) => (DECISION_AUTHOR_ROLES as readonly string[]).includes(r));
  const toggleOkr = (id: string) =>
    setExpandedOkrs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const elements = elementsQ.data ?? [];
  const elementById = new Map(elements.map((e) => [e.id, e]));
  const ownerName = (id: string | null) => (id ? profiles.data?.get(id)?.name ?? '—' : '—');
  const perspectiveName = (id: string | null) => {
    if (!id) return '—';
    return perspectivesQ.data?.find((p) => p.id === id)?.name ?? '—';
  };

  // Element health is DERIVED (P2-D5: no element-health calc exists) — roll up the
  // linked KPIs' governed achievement bands for the active period, worst-band wins.
  // Called before the early returns to satisfy the rules of hooks.
  const linkedKpiIdsForHealth = useMemo(
    () => (element ? [...new Set((elementKpisQ.data ?? []).filter((l) => l.element_id === element.id).map((l) => l.kpi_id))] : []),
    [element, elementKpisQ.data],
  );
  const achievementQueries = useQueries({
    queries: linkedKpiIdsForHealth.map((id) => ({
      queryKey: ['strata', 'kpi-achievement', id, activePeriod?.id],
      queryFn: () => kpiApi.achievement(id, activePeriod!.id),
      enabled: !!activePeriod?.id,
      staleTime: 30_000,
    })),
  });

  if (elementQ.isLoading) {
    return (
      <StrataPageShell trail={[{ text: 'Strategy Room', onClick: () => navigate(Routes.strata.strategy()) }]}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner size="large" /></div>
      </StrataPageShell>
    );
  }

  if (!element) {
    return (
      <StrataPageShell trail={[{ text: 'Strategy Room', onClick: () => navigate(Routes.strata.strategy()) }]}>
        <EmptyState header="Element not found" description={`No strategy element matches "${slug}".`} />
      </StrataPageShell>
    );
  }

  const isTheme = isThemeElement(element.element_type);

  const charter = isTheme
    ? chartersQ.data?.find((c) => c.element_id === element.id)
    : undefined;
  const charterComplete = !!(charter && charter.hypothesis && charter.value_thesis && charter.owner_id);

  const linkedKpis = (elementKpisQ.data ?? [])
    .filter((l) => l.element_id === element.id)
    .map((l) => ({ link: l, kpi: kpisQ.data?.find((k) => k.id === l.kpi_id) }))
    .filter((r) => !!r.kpi);

  const incomingEdges = (mapEdgesQ.data ?? []).filter((e) => e.to_element_id === element.id);
  const outgoingEdges = (mapEdgesQ.data ?? []).filter((e) => e.from_element_id === element.id);

  const auditRows = (auditQ.data ?? [])
    .filter((a: { entity_id: string | null }) => a.entity_id === element.id)
    .slice(0, 20);

  const parent = element.parent_id ? elementById.get(element.parent_id) : undefined;
  const children = elements.filter((e) => e.parent_id === element.id);

  // Objectives panel (Theme-equivalent only — 2-tier hierarchy has no grandchildren).
  const objectives = children.filter((c) => c.element_type === 'objective');
  const okrs = okrsQ.data ?? [];
  const okrCountByObjective = new Map<string, number>();
  okrs.forEach((o) => {
    if (!o.objective_element_id) return;
    okrCountByObjective.set(o.objective_element_id, (okrCountByObjective.get(o.objective_element_id) ?? 0) + 1);
  });

  // OKR Performance panel — rolled up from this Theme's objectives, or direct
  // for an Objective's own page. Absorbs the old standalone "KPI links" card.
  const relevantObjectiveIds = new Set(
    isTheme ? objectives.map((o) => o.id) : element.element_type === 'objective' ? [element.id] : [],
  );
  const themeOkrs = okrs.filter((o) => o.objective_element_id && relevantObjectiveIds.has(o.objective_element_id));
  const elementCycle = cycles.find((c) => c.id === element.cycle_id);
  // Carry the Theme's owning cycle to the Project Card detail route so refresh/copied
  // URL restores the correct cycle and Theme rather than the DB-active cycle (E2E-001).
  const cardCtxSuffix = elementCycle ? `?cycle=${ctxToken(elementCycle.name)}` : '';

  // Linked Project Cards + Execution Summary (Theme-equivalent only). Archived cards
  // are excluded from the Theme roll-up so they don't inflate active counts/averages
  // (V6-OPEN-030 — same rule as the Execution surface).
  const themeCards = (projectCardsQ.data ?? []).filter((c) => c.theme_id === element.id && c.stage !== 'archived');
  const cardRollup = computeCardRollup(themeCards, []);

  // Governance — Theme-scoped decisions (element_id) + their actions (decision_id).
  const themeDecisions = (decisionsQ.data ?? []).filter((d) => d.element_id === element.id);
  const themeDecisionIds = new Set(themeDecisions.map((d) => d.id));
  const themeActions = (actionsQ.data ?? []).filter((a) => a.decision_id && themeDecisionIds.has(a.decision_id));
  const openActionCountByDecision = new Map<string, number>();
  themeActions.forEach((a) => {
    if (a.status !== 'open' && a.status !== 'in_progress') return;
    openActionCountByDecision.set(a.decision_id!, (openActionCountByDecision.get(a.decision_id!) ?? 0) + 1);
  });
  const todayIso = new Date().toISOString().slice(0, 10);
  const openDecisionsCount = themeDecisions.filter((d) => d.status === 'open').length;
  const openActionsCount = themeActions.filter((a) => a.status === 'open' || a.status === 'in_progress').length;
  const overdueActionsCount = themeActions.filter((a) =>
    (a.status === 'open' || a.status === 'in_progress') && a.due_date != null && a.due_date < todayIso).length;

  // ── Derived health (P2-D5) — worst governed band across the linked measures ──
  const BAND_RANK: Record<string, number> = { removed: 3, moved: 2, inprogress: 1, new: 1, success: 1 };
  const bandRank = (k: string | null | undefined) => BAND_RANK[resolveBand(k ?? null)?.appearance ?? ''] ?? 0;
  const measureBandKeys = linkedKpiIdsForHealth
    .map((_, i) => (achievementQueries[i]?.data as { status_key?: string | null } | undefined)?.status_key)
    .filter(Boolean) as string[];
  const healthBandKey = measureBandKeys.length > 0
    ? measureBandKeys.reduce((worst, k) => (bandRank(k) > bandRank(worst) ? k : worst))
    : null;
  const healthBand = healthBandKey ? resolveBand(healthBandKey) : null;
  const belowMeasures = measureBandKeys.filter((k) => bandRank(k) >= 2).length;

  // ── Chain (anchor 14): Theme · Measures · Delivery · Value · Decisions ──
  const elementCards = element.element_type === 'objective'
    ? (projectCardsQ.data ?? []).filter((c) => c.objective_element_id === element.id && c.stage !== 'archived')
    : themeCards;
  const benefitsByCard = new Map<string, string[]>();
  (benefitCardsQ.data ?? []).forEach((b) => { const l = benefitsByCard.get(b.project_card_id) ?? []; l.push(b.benefit_id); benefitsByCard.set(b.project_card_id, l); });
  const benefitById = new Map((benefitsQ.data ?? []).map((b) => [b.id, b]));
  const elementBenefitIds = [...new Set(elementCards.flatMap((c) => benefitsByCard.get(c.id) ?? []))];
  const chainSegments: StrataChainSegment[] = [
    { icon: '↑', label: 'Theme', emptyText: 'Top-level theme',
      items: parent ? [{ name: parent.name, onNav: parent.slug ? () => navigate(Routes.strata.strategyElement(parent.slug!)) : undefined }] : [] },
    { icon: '◎', label: 'Measures', emptyText: 'No linked measures — add from the Strategy Room row menu',
      items: linkedKpis.map(({ kpi }) => ({ name: kpi!.name, onNav: kpi!.slug ? () => navigate(Routes.strata.kpi(kpi!.slug!)) : undefined })) },
    { icon: '▦', label: 'Delivery', emptyText: 'No linked Project Cards',
      items: elementCards.map((c) => ({ name: c.name, onNav: c.slug ? () => navigate(`${Routes.strata.projectCard(c.slug)}${cardCtxSuffix}`) : undefined })) },
    { icon: '◇', label: 'Value', emptyText: 'No linked benefits',
      items: elementBenefitIds.map((id) => ({ name: benefitById.get(id)?.name ?? '—' })) },
    { icon: '⚖', label: 'Decisions', emptyText: 'No linked decisions',
      items: themeDecisions.map((d) => ({ name: d.title })) },
  ];
  const healthVerdict = linkedKpis.length === 0
    ? 'Not yet measured — no measures are linked to this element.'
    : `Health is ${healthBand?.label.toLowerCase() ?? 'unresolved'} — derived from ${linkedKpis.length} linked measure${linkedKpis.length === 1 ? '' : 's'}${belowMeasures > 0 ? `, ${belowMeasures} below target` : ''}${elementCards.length > 0 ? `, across ${elementCards.length} delivery card${elementCards.length === 1 ? '' : 's'}` : ''}.`;

  return (
    <StrataPageShell
      trail={[{ text: 'Strategy Room', onClick: () => navigate(Routes.strata.strategy()) }]}
      title={element.name}
      docTitle={element.name}
      state={element.status}
      testId="strata-strategy-element-detail"
      headerActions={canAuthor ? (
        <span style={{ display: 'inline-flex', gap: 8 }}>
          <Button onClick={() => setAuthoring({ kind: 'edit-element', element })}>Edit</Button>
          {isTheme ? (
            <Button onClick={() => setAuthoring({ kind: 'charter', element })}>Charter</Button>
          ) : null}
          {isTheme ? (
            <Button iconBefore={<Plus size={14} />} onClick={() => setAuthoring({ kind: 'add-objective' })}>
              Add Objective
            </Button>
          ) : null}
        </span>
      ) : undefined}
    >
      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'minmax(0, 1fr) 360px', alignItems: 'start' }}>
        {/* Left analytical body (anchor 14 ViewBase anatomy) — health verdict leads */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          {/* Health verdict (derived) */}
          <section style={{ border: `1px solid ${T.border}`, borderRadius: 8, background: T.raised, boxShadow: 'var(--ds-shadow-raised)', padding: 'var(--ds-space-250) var(--ds-space-300)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ds-space-100)', marginBottom: 'var(--ds-space-100)', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 'var(--ds-font-size-050)', fontWeight: 600, letterSpacing: '0.04em', color: T.subtlest }}>
                {activePeriod?.name ? `${activePeriod.name} HEALTH` : 'HEALTH'}
              </span>
              {healthBand ? <Lozenge appearance={(healthBand.appearance as React.ComponentProps<typeof Lozenge>['appearance']) ?? 'default'}>{healthBand.label}</Lozenge> : <Lozenge appearance="default">Not measured</Lozenge>}
              <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>derived from linked measures</span>
            </div>
            <p style={{ margin: 0, fontSize: 'var(--ds-font-size-300)', lineHeight: 'var(--ds-line-height-body)', color: T.text }}>{healthVerdict}</p>
          </section>
          {/* In the chain */}
          <StrataChainStrip segments={chainSegments} testId="strata-element-detail-chain" />
        {isTheme ? (
          <StrataPanel
            title="Charter"
            icon={<GitBranch size={16} />}
            actions={!charterComplete ? <Lozenge appearance="moved">Incomplete</Lozenge> : undefined}
          >
            {charter ? (
              <div style={{ display: 'grid', gap: 8, fontSize: 'var(--ds-font-size-100)' }}>
                <div><span style={{ fontWeight: 600 }}>Hypothesis</span> {charter.hypothesis || '—'}</div>
                <div><span style={{ fontWeight: 600 }}>Scope</span> {charter.scope || '—'}</div>
                <div><span style={{ fontWeight: 600 }}>Value thesis</span> {charter.value_thesis || '—'}</div>
                <div><span style={{ fontWeight: 600 }}>Charter owner</span> {ownerName(charter.owner_id)}</div>
              </div>
            ) : (
              <EmptyState
                size="compact"
                header="No charter yet"
                description={canAuthor ? 'Author a charter for this Theme.' : 'No charter has been authored for this Theme yet.'}
                primaryAction={canAuthor ? (
                  <Button onClick={() => setAuthoring({ kind: 'charter', element })}>Author charter</Button>
                ) : undefined}
              />
            )}
          </StrataPanel>
        ) : null}

        {isTheme ? (
          <StrataPanel title="Objectives" icon={<Target size={16} />} count={objectives.length}>
            {objectives.length === 0 ? (
              <EmptyState
                size="compact"
                header="No Strategic Objectives yet"
                description={canAuthor ? 'Add the first Objective for this Theme.' : 'No Strategic Objectives have been created for this Theme yet.'}
                primaryAction={canAuthor ? (
                  <Button iconBefore={<Plus size={14} />} onClick={() => setAuthoring({ kind: 'add-objective' })}>
                    Add Objective
                  </Button>
                ) : undefined}
              />
            ) : (
              <div style={{ display: 'grid', gap: 6 }}>
                {objectives.map((obj) => (
                  <button
                    key={obj.id}
                    type="button"
                    onClick={() => obj.slug && navigate(Routes.strata.strategyElement(obj.slug))}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
                      background: 'none', border: 'none', padding: '6px 0', textAlign: 'left',
                      cursor: obj.slug ? 'pointer' : 'default', color: T.text, font: 'inherit',
                    }}
                  >
                    <span style={{ fontWeight: 600, flex: '1 1 auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {obj.name}
                    </span>
                    <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtle, whiteSpace: 'nowrap' }}>
                      {ownerName(obj.owner_id)}
                    </span>
                    <span style={{ fontSize: 'var(--ds-font-size-050)', color: T.subtlest, whiteSpace: 'nowrap' }}>
                      {okrCountByObjective.get(obj.id) ?? 0} OKR{(okrCountByObjective.get(obj.id) ?? 0) === 1 ? '' : 's'}
                    </span>
                    <Lozenge appearance={STATUS_APPEARANCE[obj.status] ?? 'default'}>{labelize(obj.status)}</Lozenge>
                  </button>
                ))}
              </div>
            )}
          </StrataPanel>
        ) : null}

        <StrataPanel
          title="OKR Performance"
          icon={<Target size={16} />}
          count={themeOkrs.length + linkedKpis.length}
        >
          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 'var(--ds-font-size-100)', color: T.subtle, marginBottom: 4 }}>
                Objective Key Results
              </div>
              {themeOkrs.length === 0 ? (
                <EmptyState
                  size="compact"
                  header="No OKRs yet"
                  description={isTheme
                    ? "OKRs linked to this Theme's Objectives will appear here."
                    : 'OKRs linked to this Objective will appear here.'}
                />
              ) : (
                <div>
                  {themeOkrs.map((okr) => (
                    <OkrRow
                      key={okr.id}
                      okr={okr}
                      objectiveName={okr.objective_element_id ? (elementById.get(okr.objective_element_id)?.name ?? null) : null}
                      isOpen={expandedOkrs.has(okr.id)}
                      onToggle={() => toggleOkr(okr.id)}
                    />
                  ))}
                </div>
              )}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 'var(--ds-font-size-100)', color: T.subtle, marginBottom: 4 }}>
                Linked KPIs
              </div>
              {linkedKpis.length === 0 ? (
                <EmptyState size="compact" header="No KPIs linked" description="Link a KPI from the Strategy Room row menu." />
              ) : (
                <div style={{ display: 'grid', gap: 6 }}>
                  {linkedKpis.map(({ link, kpi }) => (
                    <button
                      key={link.kpi_id}
                      type="button"
                      onClick={() => kpi?.slug && navigate(Routes.strata.kpi(kpi.slug))}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        background: 'none', border: 'none', padding: '4px 0', textAlign: 'left',
                        cursor: kpi?.slug ? 'pointer' : 'default', color: T.text, font: 'inherit',
                      }}
                    >
                      <span>{kpi?.name ?? '—'}</span>
                      {link.weight != null ? <span style={{ color: T.subtlest, fontSize: 'var(--ds-font-size-050)' }}>weight {link.weight}</span> : null}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </StrataPanel>

        {isTheme ? (
          <StrataPanel title="Linked Project Cards" icon={<Briefcase size={16} />} count={themeCards.length}>
            {themeCards.length === 0 ? (
              <EmptyState size="compact" header="No Project Cards linked" description="Project Cards are linked to a Theme from the Execution workspace." />
            ) : (
              <div style={{ display: 'grid', gap: 10, minWidth: 0 }}>
                {themeCards.map((card) => {
                  const linkedObjective = card.objective_element_id ? elementById.get(card.objective_element_id) : undefined;
                  const source = forecastSource(card);
                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => card.slug && navigate(`${Routes.strata.projectCard(card.slug)}${cardCtxSuffix}`)}
                      style={{
                        display: 'grid', gap: 2, width: '100%', minWidth: 0,
                        background: 'none', border: 'none', padding: '6px 0', textAlign: 'left',
                        cursor: card.slug ? 'pointer' : 'default', color: T.text, font: 'inherit',
                        borderBottom: `1px solid ${T.border}`,
                      }}
                    >
                      <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        <span style={{ fontWeight: 600, flex: '1 1 auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {card.name}
                        </span>
                        <StrataExecutionHealthLozenge health={card.calculated_health} />
                      </span>
                      <span style={{ fontSize: 'var(--ds-font-size-050)', color: T.subtlest, minWidth: 0, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                        {card.lead_business_unit ?? '—'} · {ownerName(card.pm_id)}
                        {' · Baseline end '}{card.baseline_end ? fmtDate(card.baseline_end) : '—'}
                        {' · Forecast end '}{card.final_forecast_end ? fmtDate(card.final_forecast_end) : '—'}
                        {source ? ` (${source === 'system' ? 'System' : 'Manual override'})` : ''}
                        {' · '}{card.actual_progress != null ? `${card.actual_progress}% progress` : 'progress —'}
                        {linkedObjective ? ` · Objective: ${linkedObjective.name}` : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </StrataPanel>
        ) : null}

        {isTheme ? (
          <StrataPanel title="Execution Summary" icon={<Briefcase size={16} />} count={cardRollup.total}>
            {cardRollup.total === 0 ? (
              <EmptyState size="compact" header="No execution data" description="Link Project Cards to this Theme to see execution health here." />
            ) : (
              <div style={{ display: 'grid', gap: 8, fontSize: 'var(--ds-font-size-100)' }}>
                <div><span style={{ fontWeight: 600 }}>Total linked</span> {cardRollup.total}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><StrataExecutionHealthLozenge health="on_track" /> {cardRollup.onTrack}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><StrataExecutionHealthLozenge health="minor_delay" /> {cardRollup.minorDelay}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><StrataExecutionHealthLozenge health="major_delay" /> {cardRollup.majorDelay}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><StrataExecutionHealthLozenge health="on_hold" /> {cardRollup.onHold}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><StrataExecutionHealthLozenge health="not_started" /> {cardRollup.notStarted}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><StrataExecutionHealthLozenge health="not_available" /> {cardRollup.notAvailable}</div>
                <div>
                  <span style={{ fontWeight: 600 }}>Average progress</span>{' '}
                  {cardRollup.avgProgress != null ? `${Math.round(cardRollup.avgProgress * 100)}%` : '—'}
                </div>
              </div>
            )}
          </StrataPanel>
        ) : null}

        {isTheme ? (
          <StrataPanel
            title="Governance"
            icon={<ClipboardList size={16} />}
            count={themeDecisions.length}
            actions={canGovern ? (
              <Button
                spacing="compact"
                iconBefore={<Plus size={14} />}
                onClick={() => setAuthoring({ kind: 'record-decision' })}
              >
                Record Decision
              </Button>
            ) : undefined}
          >
            {themeDecisions.length === 0 ? (
              <EmptyState
                size="compact"
                header="No decisions recorded for this Theme yet."
                description={canGovern ? undefined : 'Decisions and actions for this Theme will appear here.'}
                primaryAction={canGovern ? (
                  <Button onClick={() => setAuthoring({ kind: 'record-decision' })}>Record Decision</Button>
                ) : undefined}
              />
            ) : (
              <div style={{ display: 'grid', gap: 16 }}>
                <div style={{ display: 'flex', gap: 16, fontSize: 'var(--ds-font-size-050)', color: T.subtlest }}>
                  <span><strong style={{ color: T.text }}>{openDecisionsCount}</strong> open decision{openDecisionsCount === 1 ? '' : 's'}</span>
                  <span><strong style={{ color: T.text }}>{openActionsCount}</strong> open action{openActionsCount === 1 ? '' : 's'}</span>
                  <span>
                    <strong style={{ color: overdueActionsCount > 0 ? 'var(--ds-text-danger)' : T.text }}>{overdueActionsCount}</strong> overdue
                  </span>
                </div>
                <div style={{ display: 'grid', gap: 6, minWidth: 0 }}>
                  {themeDecisions.map((d) => (
                    <div
                      key={d.id}
                      style={{
                        display: 'grid', gap: 4, padding: '6px 0', borderBottom: `1px solid ${T.border}`, minWidth: 0,
                      }}
                    >
                      <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        <span style={{ fontWeight: 600, flex: '1 1 auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {d.title}
                        </span>
                        <Lozenge appearance={DECISION_STATUS_APPEARANCE[d.status] ?? 'default'}>{labelize(d.status)}</Lozenge>
                      </span>
                      <span style={{ fontSize: 'var(--ds-font-size-050)', color: T.subtlest, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                        {d.decision_key} · {labelize(d.decision_type)}
                        {d.due_date ? ` · Due ${fmtDate(d.due_date)}` : ''}
                        {' · '}{openActionCountByDecision.get(d.id) ?? 0} open action{(openActionCountByDecision.get(d.id) ?? 0) === 1 ? '' : 's'}
                        {canGovern ? (
                          <>
                            {' · '}
                            <button
                              type="button"
                              onClick={() => setAuthoring({ kind: 'create-action', decisionId: d.id, decisionTitle: d.title })}
                              style={{ background: 'none', border: 'none', padding: 0, color: T.brand, cursor: 'pointer', font: 'inherit' }}
                            >
                              + Action
                            </button>
                          </>
                        ) : null}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </StrataPanel>
        ) : null}

        <StrataPanel title="Strategy relationships" icon={<Network size={16} />} count={incomingEdges.length + outgoingEdges.length}>
          {incomingEdges.length === 0 && outgoingEdges.length === 0 ? (
            <EmptyState size="compact" header="No strategy relationships" description="Create relationships on the Strategy Map." />
          ) : (
            <div style={{ display: 'grid', gap: 10, fontSize: 'var(--ds-font-size-100)' }}>
              {incomingEdges.length > 0 ? (
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Incoming</div>
                  {incomingEdges.map((e) => (
                    <div key={e.id} style={{ color: T.subtle }}>
                      {elementById.get(e.from_element_id)?.name ?? '—'}
                      <span style={{ color: T.subtlest }}>
                        {' '}· {labelize(e.relationship_type)}
                        {e.confidence != null ? ` · confidence ${Math.round(e.confidence * 100)}%` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
              {outgoingEdges.length > 0 ? (
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Outgoing</div>
                  {outgoingEdges.map((e) => (
                    <div key={e.id} style={{ color: T.subtle }}>
                      {elementById.get(e.to_element_id)?.name ?? '—'}
                      <span style={{ color: T.subtlest }}>
                        {' '}· {labelize(e.relationship_type)}
                        {e.confidence != null ? ` · confidence ${Math.round(e.confidence * 100)}%` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </StrataPanel>

        </div>

        {/* Right rail (anchor 14): Details field rows + History (360px, sticky) */}
        <aside style={{ position: 'sticky', top: 16, display: 'flex', flexDirection: 'column', gap: 16, alignSelf: 'start' }}>
          <StrataPanel title="Details" icon={<Target size={16} />}>
            <div style={{ display: 'grid', gridTemplateColumns: '110px minmax(0,1fr)', rowGap: 'var(--ds-space-150)', columnGap: 'var(--ds-space-100)', fontSize: 'var(--ds-font-size-100)', alignItems: 'center' }}>
              <span style={{ color: T.subtlest }}>Type</span>
              <span style={{ color: T.text, fontWeight: 500 }}>{labelize(element.element_type)}</span>
              <span style={{ color: T.subtlest }}>Lifecycle</span>
              <span><Lozenge appearance={STATUS_APPEARANCE[element.status] ?? 'default'}>{labelize(element.status)}</Lozenge></span>
              <span style={{ color: T.subtlest }}>Owner</span>
              <span style={{ color: T.text, fontWeight: 500 }}>{ownerName(element.owner_id)}</span>
              <span style={{ color: T.subtlest }}>Perspective</span>
              <span style={{ color: T.text, fontWeight: 500 }}>{perspectiveName(element.perspective_id)}</span>
              <span style={{ color: T.subtlest }}>Parent</span>
              <span>
                {parent ? (
                  <button
                    type="button"
                    onClick={() => parent.slug && navigate(Routes.strata.strategyElement(parent.slug))}
                    style={{ color: T.brand, background: 'none', border: 'none', padding: 0, cursor: parent.slug ? 'pointer' : 'default', font: 'inherit', fontWeight: 500, textAlign: 'left' }}
                    disabled={!parent.slug}
                  >
                    {parent.name}
                  </button>
                ) : <span style={{ color: T.subtlest }}>Root-level</span>}
              </span>
              {isTheme ? (
                <>
                  <span style={{ color: T.subtlest }}>Charter</span>
                  <span>{charter ? <Lozenge appearance={charterComplete ? 'success' : 'moved'}>{charterComplete ? 'Complete' : 'Incomplete'}</Lozenge> : <span style={{ color: T.subtlest }}>None</span>}</span>
                </>
              ) : null}
            </div>
          </StrataPanel>

          <StrataPanel title="History" icon={<GitBranch size={16} />} count={auditRows.length}>
            {auditRows.length === 0 ? (
              <EmptyState size="compact" header="No history yet" description="Changes to this element will appear here." />
            ) : (
              <div style={{ display: 'grid', gap: 'var(--ds-space-100)', fontSize: 'var(--ds-font-size-050)' }}>
                {auditRows.map((a: { action: string | null; created_at: string; actor_id: string | null }, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, color: T.subtle }}>
                    <span>{formatAuditAction(a.action)}</span>
                    <span style={{ color: T.subtlest, whiteSpace: 'nowrap' }}>{fmtDateTime(a.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </StrataPanel>
        </aside>
      </div>

      {authoring?.kind === 'edit-element' ? (
        <EditElementModal
          element={authoring.element}
          perspectiveOptions={perspectiveSelectOptions(perspectivesQ.data ?? [], authoring.element.perspective_id)}
          parentOptions={themeParentOptions(elements, authoring.element.id)}
          onClose={() => setAuthoring(null)}
          onSaved={invalidate}
        />
      ) : null}

      {authoring?.kind === 'charter' ? (
        <ThemeCharterModal
          element={authoring.element}
          charter={chartersQ.data?.find((c) => c.element_id === authoring.element.id)}
          gateModelOptions={gateModelSelectOptions(
            gateModelsQ.data ?? [],
            chartersQ.data?.find((c) => c.element_id === authoring.element.id)?.gate_model_id,
          )}
          onClose={() => setAuthoring(null)}
          onSaved={invalidate}
        />
      ) : null}

      {authoring?.kind === 'add-objective' ? (
        <NewElementModal
          cycleId={element.cycle_id}
          cycleName={elementCycle?.name ?? '—'}
          themeOptions={[{ value: element.id, label: element.name }]}
          perspectiveOptions={perspectiveSelectOptions(perspectivesQ.data ?? [], null)}
          lockElementType="objective"
          lockParentId={element.id}
          onClose={() => setAuthoring(null)}
          onCreated={invalidate}
        />
      ) : null}

      {authoring?.kind === 'record-decision' ? (
        <StrataFormModal
          open
          onClose={() => setAuthoring(null)}
          title="Record decision"
          description={<>Decision for <strong>{element.name}</strong>.</>}
          fields={[
            { key: 'title', label: 'Title', kind: 'text', required: true },
            { key: 'decisionType', label: 'Type', kind: 'select', options: DECISION_TYPE_OPTIONS },
            { key: 'forum', label: 'Forum', kind: 'text' },
            { key: 'description', label: 'Description', kind: 'textarea' },
            { key: 'ownerId', label: 'Owner', kind: 'user' },
            { key: 'dueDate', label: 'Due date', kind: 'date' },
          ]}
          initial={{ decisionType: 'governance' }}
          submitLabel="Record decision"
          testId="strata-record-decision-modal"
          onSubmit={async (v) => {
            await governanceApi.createDecision({
              title: String(v.title),
              decisionType: (str(v.decisionType) as 'governance' | 'gate' | 'escalation' | 'action_only' | undefined) ?? 'governance',
              forum: str(v.forum), description: str(v.description),
              ownerId: str(v.ownerId), dueDate: str(v.dueDate),
              elementId: element.id,
            });
            invalidate();
          }}
        />
      ) : null}

      {authoring?.kind === 'create-action' ? (
        <StrataFormModal
          open
          onClose={() => setAuthoring(null)}
          title="Create action"
          description={<>Action for decision <strong>{authoring.decisionTitle}</strong>.</>}
          fields={[
            { key: 'title', label: 'Title', kind: 'text', required: true },
            { key: 'ownerId', label: 'Owner', kind: 'user' },
            { key: 'dueDate', label: 'Due date', kind: 'date' },
            { key: 'note', label: 'Note', kind: 'textarea' },
          ]}
          submitLabel="Create action"
          testId="strata-create-action-modal"
          onSubmit={async (v) => {
            await governanceApi.createAction({
              decisionId: authoring.decisionId, title: String(v.title),
              ownerId: str(v.ownerId), dueDate: str(v.dueDate), note: str(v.note),
            });
            invalidate();
          }}
        />
      ) : null}
    </StrataPageShell>
  );
}
