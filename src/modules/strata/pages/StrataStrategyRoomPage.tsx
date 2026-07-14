/**
 * STRATA Strategy Room — /strata/strategy (CAT-STRATA-20260705-001).
 * Hierarchy tree, KPI coverage and cause & effect summary for the active cycle.
 * UI computes nothing: statuses/stages/charters come straight from the DB;
 * promotion control is enforced server-side (strata_promote_element).
 * Authoring (Lane A recovery): cycle/element/charter/KPI-link/gate writes go
 * through server-validated RPCs, gated on strategy_office / strata_admin.
 */
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import {
  Button, EmptyState, IconButton,
  Lozenge, Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle, SectionMessage, Select, Spinner, Textfield, Tooltip,
} from '@/components/ads';
import type { SelectOption } from '@/components/ads';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable';
import { Routes } from '@/lib/routes';
import {
  ChevronDown, ChevronRight, Gem, GitBranch, Target, X,
} from '@/lib/atlaskit-icons';
import {
  useBandResolver, useBenefitProjectCards, useElementKpis, useGateModels, useInvalidateStrata, useKpis, usePerspectives,
  useProjectCards, useThemeCharters, useProfileNames, useStrataContext, useStrataRoles, useStrategyElements,
} from '@/modules/strata/hooks/useStrata';
import { kpiApi, strategyApi } from '@/modules/strata/domain';
import { StrataChipMenu, StrataPageShell, StrataPanel, T } from '@/modules/strata/components/shared';
import type { StrataMenuOption } from '@/modules/strata/components/shared';
import {
  EditElementModal, gateModelSelectOptions, NewElementModal, perspectiveSelectOptions, StrataFormModal,
  str, themeParentOptions, ThemeCharterModal,
} from '@/modules/strata/components/authoring';
import { labelize } from '@/modules/strata/components/format';
import type { StrataKpi, StrataStrategyElement } from '@/modules/strata/types';

type LozengeAppearance = React.ComponentProps<typeof Lozenge>['appearance'];

/** SYSTEM element states (DB CHECK on strata_strategy_elements.status). */
const STATUS_APPEARANCE: Record<StrataStrategyElement['status'], LozengeAppearance> = {
  draft: 'default',
  proposed: 'default',
  active: 'inprogress',
  on_hold: 'moved',
  retired: 'removed',
};

/**
 * Per-type visual identity — element types are SYSTEM values (DB CHECK).
 * the legacy tier-2 term was consolidated into 'theme' (CAT-STRATA-HIERARCHY-20260706-001):
 * both tiers were the same business concept, so legacy rows were
 * relabeled to 'theme' and no longer need a distinct entry here.
 */
const TYPE_META: Record<string, { icon: React.ComponentType<{ size?: number }>; bg: string; fg: string }> = {
  theme: { icon: Gem, bg: 'var(--ds-background-selected)', fg: 'var(--ds-text-brand)' },
  objective: { icon: Target, bg: 'var(--ds-background-success)', fg: 'var(--ds-text-success)' },
};

function TypeChip({ type }: { type: string }) {
  const meta = TYPE_META[type];
  const Icon = meta?.icon;
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0,
        padding: '4px 8px', borderRadius: 4,
        background: meta?.bg ?? T.neutral, color: meta?.fg ?? T.subtle,
        fontSize: 'var(--ds-font-size-050)', fontWeight: 600, whiteSpace: 'nowrap',
      }}
    >
      {Icon ? <Icon size={13} /> : null}
      {labelize(type)}
    </span>
  );
}

/** Roles allowed to author strategy structure — UI gate only; DB RPCs enforce. */
const AUTHOR_ROLES = ['strategy_office', 'strata_admin'] as const;
/** SYSTEM granularities (DB CHECK on strata_cycles.period_granularity). */
const GRANULARITIES = ['month', 'quarter', 'half', 'year'] as const;

/** One authoring surface open at a time — row menus and header actions feed this. */
type AuthoringState =
  | { kind: 'create-cycle' }
  | { kind: 'create-element' }
  | { kind: 'edit-element'; element: StrataStrategyElement }
  | { kind: 'retire-element'; element: StrataStrategyElement }
  | { kind: 'charter'; element: StrataStrategyElement }
  | { kind: 'kpi-links'; element: StrataStrategyElement };

function AuthoringFieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 4, fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.subtle }}>
      {children}
    </div>
  );
}

/**
 * KPI set linking for one element — link approved KPIs, unlink existing.
 * Needs in-place unlink actions, so it composes ads primitives directly
 * (StrataFormModal only submits once and closes).
 */
function KpiLinksModal({
  element, links, kpis, onClose, onChanged,
}: {
  element: StrataStrategyElement;
  links: Array<{ element_id: string; kpi_id: string; weight: number | null }>;
  kpis: StrataKpi[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [kpiId, setKpiId] = useState<string | null>(null);
  const [weight, setWeight] = useState('');
  const [contribution, setContribution] = useState<'direct' | 'supporting'>('direct');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const kpiById = useMemo(() => new Map(kpis.map((k) => [k.id, k])), [kpis]);
  const linkedIds = new Set(links.map((l) => l.kpi_id));
  const kpiOptions: SelectOption<string>[] = kpis
    .filter((k) => k.status === 'approved' && !linkedIds.has(k.id))
    .map((k) => ({ value: k.id, label: k.name }));
  const contributionOptions: SelectOption<string>[] = [
    { value: 'direct', label: 'Direct' },
    { value: 'supporting', label: 'Supporting' },
  ];

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      onChanged();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const link = async () => {
    if (!kpiId) { setError('Required: KPI'); return; }
    const w = weight === '' ? null : Number(weight);
    if (w != null && (Number.isNaN(w) || w < 0 || w > 100)) {
      setError('Weight must be between 0 and 100.');
      return;
    }
    const ok = await run(() => strategyApi.linkElementKpi(element.id, kpiId, w ?? undefined, contribution));
    if (ok) { setKpiId(null); setWeight(''); }
  };

  return (
    <Modal isOpen onClose={busy ? () => {} : onClose} width="medium" testId="strata-kpi-links-modal">
      <ModalHeader><ModalTitle>KPI links — {element.name}</ModalTitle></ModalHeader>
      <ModalBody>
        {links.length === 0 ? (
          <p style={{ margin: '0 0 12px', fontSize: 'var(--ds-font-size-200)', color: T.subtle }}>
            No KPIs linked to this element yet.
          </p>
        ) : (
          <div style={{ marginBottom: 12 }}>
            {links.map((l) => (
              <div
                key={l.kpi_id}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: `1px solid ${T.border}` }}
              >
                <span style={{ flex: 1, fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: T.text }}>
                  {kpiById.get(l.kpi_id)?.name ?? '—'}
                </span>
                <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtle, whiteSpace: 'nowrap' }}>
                  {l.weight != null ? `Weight ${l.weight}` : '—'}
                </span>
                <Button
                  spacing="compact"
                  appearance="subtle"
                  isDisabled={busy}
                  onClick={() => run(() => strategyApi.unlinkElementKpi(element.id, l.kpi_id))}
                >
                  Unlink
                </Button>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <AuthoringFieldLabel>KPI (approved)</AuthoringFieldLabel>
            <Select
              options={kpiOptions}
              value={kpiOptions.find((o) => o.value === kpiId) ?? null}
              onChange={(next) => setKpiId(next?.value ?? null)}
              placeholder="Select KPI…"
              isSearchable
              usePortal
              aria-label="KPI"
            />
          </div>
          <div>
            <AuthoringFieldLabel>Weight (0–100)</AuthoringFieldLabel>
            <Textfield
              type="number"
              value={weight}
              onChange={(e) => setWeight((e.target as HTMLInputElement).value)}
              aria-label="Weight"
            />
          </div>
          <div>
            <AuthoringFieldLabel>Contribution</AuthoringFieldLabel>
            <Select
              options={contributionOptions}
              value={contributionOptions.find((o) => o.value === contribution) ?? null}
              onChange={(next) => setContribution((next?.value as 'direct' | 'supporting') ?? 'direct')}
              usePortal
              aria-label="Contribution"
            />
          </div>
        </div>
        {error ? (
          <div style={{ marginTop: 12 }}>
            <SectionMessage appearance="error" title="Action rejected">
              <p style={{ whiteSpace: 'pre-wrap' }}>{error}</p>
            </SectionMessage>
          </div>
        ) : null}
      </ModalBody>
      <ModalFooter>
        <Button appearance="subtle" onClick={onClose} isDisabled={busy}>Close</Button>
        <Button appearance="primary" onClick={link} isDisabled={busy}>
          {busy ? 'Working…' : 'Link KPI'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

/** Direction-readiness band (anchor 02) — 4 coverage tiles. Color never alone:
 *  each gap carries a worded badge ("N GAPS" / "DRAFT"). */
interface ReadinessTile {
  key: string; label: string; value: string; gaps: number;
  tone: 'warning' | 'danger' | 'neutral'; caption: string; isDraft?: boolean;
}
const READINESS_TONE: Record<ReadinessTile['tone'], { bg: string; fg: string }> = {
  warning: { bg: 'var(--ds-background-warning)', fg: 'var(--ds-text-warning)' },
  danger: { bg: 'var(--ds-background-danger)', fg: 'var(--ds-text-danger)' },
  neutral: { bg: 'var(--ds-background-neutral)', fg: 'var(--ds-text-subtle)' },
};
function ReadinessBand({ tiles }: { tiles: ReadinessTile[] }) {
  return (
    <div
      data-testid="strata-direction-readiness"
      style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        border: `1px solid ${T.border}`, borderRadius: 8, background: T.raised,
        overflow: 'hidden', marginBottom: 'var(--ds-space-200)',
      }}
    >
      {tiles.map((t, i) => {
        const badge = t.isDraft ? 'DRAFT' : t.gaps > 0 ? `${t.gaps} GAP${t.gaps > 1 ? 'S' : ''}` : null;
        const tone = READINESS_TONE[t.tone];
        return (
          <div key={t.key} style={{ padding: 'var(--ds-space-200)', borderRight: i < tiles.length - 1 ? `1px solid ${T.border}` : undefined, minWidth: 0 }}>
            <div style={{ fontSize: 'var(--ds-font-size-050)', fontWeight: 600, letterSpacing: '0.04em', color: T.subtlest, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {t.label}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--ds-space-100)', margin: 'var(--ds-space-075) 0 var(--ds-space-025)' }}>
              <span style={{ fontSize: 'var(--ds-font-size-500)', fontWeight: 700, color: T.text, fontVariantNumeric: 'tabular-nums' }}>{t.value}</span>
              {badge ? (
                <span style={{ fontSize: 'var(--ds-font-size-050)', fontWeight: 700, borderRadius: 3, padding: 'var(--ds-space-025) var(--ds-space-075)', background: tone.bg, color: tone.fg }}>{badge}</span>
              ) : null}
            </div>
            <div style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtle }}>{t.caption}</div>
          </div>
        );
      })}
    </div>
  );
}

/** Structure / Map / Narrative segmented toggle (anchor 02). Map navigates to the
 *  protected canvas; the component is never imported here — the toggle only routes to it. */
function ViewToggle({ mode, onStructure, onNarrative, onMap }: {
  mode: 'structure' | 'narrative'; onStructure: () => void; onNarrative: () => void; onMap: () => void;
}) {
  const seg = (active: boolean, borderLeft: boolean): React.CSSProperties => ({
    padding: 'var(--ds-space-075) var(--ds-space-200)', fontSize: 'var(--ds-font-size-100)', cursor: 'pointer',
    background: active ? 'var(--ds-background-selected)' : 'transparent',
    color: active ? T.brandText : T.subtle, fontWeight: active ? 600 : 400,
    border: 'none', borderLeft: borderLeft ? `1px solid ${T.border}` : 'none', font: 'inherit',
  });
  return (
    <span role="tablist" aria-label="Strategy Room view" style={{ display: 'inline-flex', border: `1px solid ${T.border}`, borderRadius: 6, overflow: 'hidden' }}>
      <button type="button" role="tab" aria-selected={mode === 'structure'} style={seg(mode === 'structure', false)} onClick={onStructure}>Structure</button>
      <button type="button" role="tab" aria-selected={false} style={seg(false, true)} onClick={onMap}>Map</button>
      <button type="button" role="tab" aria-selected={mode === 'narrative'} style={seg(mode === 'narrative', true)} onClick={onNarrative}>Narrative</button>
    </span>
  );
}

export default function StrataStrategyRoomPage() {
  const navigate = useNavigate();
  const { activeCycle, activePeriod, isLoading: contextLoading } = useStrataContext();
  const resolveBand = useBandResolver();
  const elementsQ = useStrategyElements(activeCycle?.id);
  const chartersQ = useThemeCharters();
  const elementKpisQ = useElementKpis();
  const kpisQ = useKpis();
  const perspectivesQ = usePerspectives();
  const profilesQ = useProfileNames();
  const gateModelsQ = useGateModels();
  const rolesQ = useStrataRoles();
  const projectCardsQ = useProjectCards();
  const benefitCardsQ = useBenefitProjectCards();
  const invalidate = useInvalidateStrata();

  // Anchor-02 view toggle. Structure = this authoring surface; Map navigates to the
  // protected canvas (never imported); Narrative = companion prose view (body: slice 2D-4).
  const [viewMode, setViewMode] = useState<'structure' | 'narrative'>('structure');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [perspectiveFilter, setPerspectiveFilter] = useState<string | null>(null);
  const [gapsOnly, setGapsOnly] = useState(false);
  const [promoteError, setPromoteError] = useState<string | null>(null);
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [promoteTarget, setPromoteTarget] = useState<StrataStrategyElement | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [authoring, setAuthoring] = useState<AuthoringState | null>(null);

  const canAuthor = (rolesQ.data ?? []).some((r) => (AUTHOR_ROLES as readonly string[]).includes(r));
  const closeAuthoring = () => setAuthoring(null);

  const elements = useMemo(() => elementsQ.data ?? [], [elementsQ.data]);
  const perspectives = perspectivesQ.data ?? [];
  const charters = chartersQ.data ?? [];
  const elementKpis = elementKpisQ.data ?? [];
  const kpis = kpisQ.data ?? [];
  const profiles = profilesQ.data;

  const elementById = useMemo(() => new Map(elements.map((e) => [e.id, e])), [elements]);
  const charterByElement = useMemo(() => new Map(charters.map((c) => [c.element_id, c])), [charters]);
  const perspectiveName = (id: string | null): string =>
    (id ? perspectives.find((p) => p.id === id)?.name : null) ?? '—';
  const ownerName = (ownerId: string | null): string =>
    (ownerId ? profiles?.get(ownerId)?.name : null) ?? '—';

  // Direction-readiness band (anchor 02) — coverage diagnostics as the judgment band.
  // All client-derived from already-loaded data; zero fabrication.
  const readiness = useMemo(() => {
    const objectives = elements.filter((e) => e.element_type === 'objective' && e.context === 'theme');
    const total = objectives.length;
    const kpiLinked = new Set(elementKpis.map((l) => l.element_id));
    const cardObjectiveIds = new Set(
      (projectCardsQ.data ?? []).map((c) => c.objective_element_id).filter(Boolean) as string[],
    );
    const withMeasures = objectives.filter((o) => kpiLinked.has(o.id)).length;
    const withOwners = objectives.filter((o) => !!o.owner_id).length;
    const withExecution = objectives.filter((o) => cardObjectiveIds.has(o.id)).length;
    const draftCount = elements.filter((e) => e.status === 'draft').length;
    const gapTone = (gaps: number, danger = false): 'warning' | 'danger' | 'neutral' =>
      gaps === 0 ? 'neutral' : danger ? 'danger' : 'warning';
    return [
      {
        key: 'measures', label: 'OBJECTIVES WITH MEASURES', value: `${withMeasures} / ${total}`,
        gaps: total - withMeasures, tone: gapTone(total - withMeasures),
        caption: total - withMeasures > 0 ? `${total - withMeasures} without a linked KPI` : 'All objectives measured',
      },
      {
        key: 'owners', label: 'OBJECTIVES WITH OWNERS', value: `${withOwners} / ${total}`,
        gaps: total - withOwners, tone: gapTone(total - withOwners),
        caption: total - withOwners > 0 ? `${total - withOwners} with no accountable owner` : 'All objectives owned',
      },
      {
        key: 'execution', label: 'EXECUTION COVERAGE', value: `${withExecution} / ${total}`,
        gaps: total - withExecution, tone: gapTone(total - withExecution, true),
        caption: total - withExecution > 0 ? `${total - withExecution} with no linked Project Card` : 'All objectives in delivery',
      },
      {
        key: 'draft', label: 'DRAFT ELEMENTS', value: String(draftCount),
        gaps: draftCount, tone: 'neutral' as const, isDraft: true,
        caption: draftCount > 0 ? 'Not yet promoted into active governance' : 'No pending drafts',
      },
    ];
  }, [elements, elementKpis, projectCardsQ.data]);

  const distinctTypes = useMemo(
    () => Array.from(new Set(elements.map((e) => e.element_type))),
    [elements],
  );
  const distinctStatuses = useMemo(
    () => Array.from(new Set(elements.map((e) => e.status))),
    [elements],
  );

  // Filtered flat set; children of hidden parents surface as roots.
  const { roots, childrenOf, filteredCount } = useMemo(() => {
    const filtered = elements.filter((el) =>
      (typeFilter === null || el.element_type === typeFilter) &&
      (statusFilter === null || el.status === statusFilter) &&
      (perspectiveFilter === null || el.perspective_id === perspectiveFilter));
    const visibleIds = new Set(filtered.map((e) => e.id));
    const children = new Map<string, StrataStrategyElement[]>();
    const rootList: StrataStrategyElement[] = [];
    filtered.forEach((el) => {
      if (el.parent_id && visibleIds.has(el.parent_id)) {
        const list = children.get(el.parent_id) ?? [];
        list.push(el);
        children.set(el.parent_id, list);
      } else {
        rootList.push(el);
      }
    });
    const byOrder = (a: StrataStrategyElement, b: StrataStrategyElement) => a.order_index - b.order_index;
    rootList.sort(byOrder);
    children.forEach((list) => list.sort(byOrder));
    return { roots: rootList, childrenOf: children, filteredCount: filtered.length };
  }, [elements, typeFilter, statusFilter, perspectiveFilter]);

  // ── Structure-tree coverage columns (anchor 02) ───────────────────────────
  // KPIs = linked measures; Cards = Project Cards by objective_element_id
  // (a theme rolls up its descendant objectives' cards). All from loaded data.
  const kpiCountByElement = useMemo(() => {
    const m = new Map<string, number>();
    elementKpis.forEach((l) => m.set(l.element_id, (m.get(l.element_id) ?? 0) + 1));
    return m;
  }, [elementKpis]);
  const directCardCount = useMemo(() => {
    const m = new Map<string, number>();
    (projectCardsQ.data ?? []).forEach((c) => {
      if (c.objective_element_id) m.set(c.objective_element_id, (m.get(c.objective_element_id) ?? 0) + 1);
    });
    return m;
  }, [projectCardsQ.data]);
  const descendantsOf = (id: string): StrataStrategyElement[] => {
    const out: StrataStrategyElement[] = [];
    const walk = (pid: string) => (childrenOf.get(pid) ?? []).forEach((c) => { out.push(c); walk(c.id); });
    walk(id);
    return out;
  };
  const cardCountFor = (el: StrataStrategyElement): number =>
    el.element_type === 'theme'
      ? descendantsOf(el.id).reduce((n, d) => n + (directCardCount.get(d.id) ?? 0), 0) + (directCardCount.get(el.id) ?? 0)
      : (directCardCount.get(el.id) ?? 0);

  // ── Benefits (multi-hop, anchor 02): element → Project Cards (objective_element_id)
  //    → benefit↔card links → distinct benefits. Themes roll up their descendants.
  const cardIdsByObjective = useMemo(() => {
    const m = new Map<string, string[]>();
    (projectCardsQ.data ?? []).forEach((c) => {
      if (c.objective_element_id) { const l = m.get(c.objective_element_id) ?? []; l.push(c.id); m.set(c.objective_element_id, l); }
    });
    return m;
  }, [projectCardsQ.data]);
  const benefitsByCard = useMemo(() => {
    const m = new Map<string, string[]>();
    (benefitCardsQ.data ?? []).forEach((b) => { const l = m.get(b.project_card_id) ?? []; l.push(b.benefit_id); m.set(b.project_card_id, l); });
    return m;
  }, [benefitCardsQ.data]);
  const benefitCountFor = (el: StrataStrategyElement): number => {
    const targets = el.element_type === 'theme' ? [el, ...descendantsOf(el.id)] : [el];
    const benefitIds = new Set<string>();
    targets.forEach((t) => (cardIdsByObjective.get(t.id) ?? []).forEach((cid) => (benefitsByCard.get(cid) ?? []).forEach((bid) => benefitIds.add(bid))));
    return benefitIds.size;
  };

  // ── Health (derived, P2-D5): no element-health calc exists, so roll up the
  //    linked KPIs' governed achievement bands. objective = worst band of its
  //    measures; theme = worst of its objectives. No measures → null (—).
  const kpiIdsByElement = useMemo(() => {
    const m = new Map<string, string[]>();
    elementKpis.forEach((l) => { const list = m.get(l.element_id) ?? []; list.push(l.kpi_id); m.set(l.element_id, list); });
    return m;
  }, [elementKpis]);
  const linkedKpiIds = useMemo(() => [...new Set(elementKpis.map((l) => l.kpi_id))], [elementKpis]);
  const achievementQueries = useQueries({
    queries: linkedKpiIds.map((id) => ({
      queryKey: ['strata', 'kpi-achievement', id, activePeriod?.id],
      queryFn: () => kpiApi.achievement(id, activePeriod!.id),
      enabled: !!activePeriod?.id,
      staleTime: 30_000,
    })),
  });
  const bandKeyByKpiId = useMemo(() => {
    const m = new Map<string, string>();
    linkedKpiIds.forEach((id, i) => {
      const d = achievementQueries[i]?.data as { status_key?: string | null } | undefined;
      if (d?.status_key) m.set(id, d.status_key);
    });
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedKpiIds, activePeriod?.id, achievementQueries.map((q) => (q.data ? 1 : 0)).join('')]);
  // Worst-band picker — danger beats warning beats everything else.
  const BAND_RANK: Record<string, number> = { removed: 3, moved: 2, inprogress: 1, new: 1, success: 1 };
  const healthKeyFor = (el: StrataStrategyElement): string | null => {
    const keys: string[] = el.element_type === 'theme'
      ? descendantsOf(el.id).filter((d) => d.element_type === 'objective').flatMap((o) => (kpiIdsByElement.get(o.id) ?? []).map((k) => bandKeyByKpiId.get(k)).filter(Boolean) as string[])
      : ((kpiIdsByElement.get(el.id) ?? []).map((k) => bandKeyByKpiId.get(k)).filter(Boolean) as string[]);
    if (keys.length === 0) return null;
    return keys.reduce((worst, k) => {
      const rank = (kk: string) => BAND_RANK[resolveBand(kk)?.appearance ?? ''] ?? 0;
      return rank(k) > rank(worst) ? k : worst;
    });
  };

  // Coverage gaps flagged on objective rows only (measures / owner), anchor 02.
  const gapOf = (el: StrataStrategyElement): 'NO MEASURES' | 'NO OWNER' | null => {
    if (el.element_type !== 'objective') return null;
    if ((kpiCountByElement.get(el.id) ?? 0) === 0) return 'NO MEASURES';
    if (!el.owner_id) return 'NO OWNER';
    return null;
  };

  // Flat hierarchy-ordered rows (respecting collapse + "gaps only") for JiraTable
  // with getRowDepth. "Gaps only" keeps gap rows and their ancestors.
  const { flatRows, depthOf, hasChildrenMap } = useMemo(() => {
    const gapIds = new Set<string>();
    if (gapsOnly) {
      elements.forEach((el) => { if (gapOf(el)) gapIds.add(el.id); });
      // include ancestors so the tree path to each gap stays visible
      [...gapIds].forEach((id) => {
        let cur = elementById.get(id)?.parent_id ?? null;
        while (cur) { gapIds.add(cur); cur = elementById.get(cur)?.parent_id ?? null; }
      });
    }
    const flat: StrataStrategyElement[] = [];
    const depth = new Map<string, number>();
    const kids = new Map<string, boolean>();
    const walk = (el: StrataStrategyElement, d: number) => {
      if (gapsOnly && !gapIds.has(el.id)) return;
      flat.push(el);
      depth.set(el.id, d);
      const children = childrenOf.get(el.id) ?? [];
      const visibleKids = gapsOnly ? children.filter((c) => gapIds.has(c.id)) : children;
      kids.set(el.id, visibleKids.length > 0);
      if (!collapsed.has(el.id)) visibleKids.forEach((c) => walk(c, d + 1));
    };
    roots.forEach((r) => walk(r, 0));
    return { flatRows: flat, depthOf: depth, hasChildrenMap: kids };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roots, childrenOf, collapsed, gapsOnly, elements, elementById, kpiCountByElement]);

  const toggleCollapsed = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // ── Authoring option builders — approved-only, current value kept selectable.
  //    Shared with the detail pages via components/authoring.tsx so both call
  //    sites derive options identically (CAT-STRATA-THEME-DETAIL-20260710-001). ──
  const approvedPerspectiveOptions = (currentId?: string | null) => perspectiveSelectOptions(perspectives, currentId);
  const parentOptions = (excludeId?: string) => themeParentOptions(elements, excludeId);
  const gateModelOptions = (currentId?: string | null) => gateModelSelectOptions(gateModelsQ.data ?? [], currentId);

  /** Authoring row menu — every mutation is RPC-validated server-side.
   *  Promote is folded in (draft/proposed) so the tree needs no wide actions column. */
  const rowActions = (el: StrataStrategyElement): StrataMenuOption[] => [
    ...(el.status === 'draft' || el.status === 'proposed'
      ? [{ key: 'promote', label: 'Promote…', onClick: () => setPromoteTarget(el) }]
      : []),
    { key: 'edit', label: 'Edit', onClick: () => setAuthoring({ kind: 'edit-element', element: el }) },
    ...(el.element_type === 'theme'
      ? [{ key: 'charter', label: 'Charter', onClick: () => setAuthoring({ kind: 'charter', element: el }) }]
      : []),
    { key: 'kpis', label: 'KPI links', onClick: () => setAuthoring({ kind: 'kpi-links', element: el }) },
    ...(el.status !== 'retired'
      ? [{ key: 'retire', label: 'Retire…', onClick: () => setAuthoring({ kind: 'retire-element', element: el }) }]
      : []),
  ];

  const handlePromote = async (elementId: string) => {
    setPromoteError(null);
    setPromotingId(elementId);
    try {
      await strategyApi.promoteElement(elementId);
      invalidate();
      setPromoteTarget(null);
    } catch (e) {
      setPromoteError(e instanceof Error ? e.message : String(e));
      setPromoteTarget(null);
    } finally {
      setPromotingId(null);
    }
  };

  // ── Strategic-structure JiraTable columns (anchor 02) ─────────────────────
  //    Element (indented via getRowDepth) · Owner · KPIs · Cards · Actions.
  //    Health + Benefits columns land in slice 2D-2b.
  const gapCountCell = (n: number, isGap: boolean) => (
    <span style={{
      fontVariantNumeric: 'tabular-nums', color: isGap ? 'var(--ds-text-warning)' : T.subtle,
      fontWeight: isGap ? 700 : 400,
    }}>{n}</span>
  );
  const structureColumns: Column<StrataStrategyElement>[] = [
    {
      id: 'name', label: 'Element', flex: true, alwaysVisible: true,
      cell: ({ row }) => {
        const gap = gapOf(row);
        const canExpand = hasChildrenMap.get(row.id);
        const isCol = collapsed.has(row.id);
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            {canExpand ? (
              <IconButton
                icon={isCol ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                appearance="subtle" spacing="compact"
                aria-label={isCol ? `Expand ${row.name}` : `Collapse ${row.name}`}
                onClick={(e) => { e.stopPropagation(); toggleCollapsed(row.id); }}
              />
            ) : <span aria-hidden style={{ width: 24, flexShrink: 0 }} />}
            <TypeChip type={row.element_type} />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); if (row.slug) navigate(Routes.strata.strategyElement(row.slug)); }}
              disabled={!row.slug}
              style={{
                fontSize: 'var(--ds-font-size-200)', fontWeight: row.element_type === 'theme' ? 653 : 500, color: T.text,
                minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                background: 'none', border: 'none', padding: 0, textAlign: 'left',
                cursor: row.slug ? 'pointer' : 'default', font: 'inherit',
              }}
            >
              {row.name}
            </button>
            {row.status === 'draft' ? <Lozenge appearance="default">Draft</Lozenge> : null}
            {gap ? <Lozenge appearance="moved">{gap}</Lozenge> : null}
          </span>
        );
      },
    },
    {
      id: 'owner', label: 'Owner', width: 15,
      cell: ({ row }) => <span style={{ color: T.subtle, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ownerName(row.owner_id)}</span>,
    },
    {
      id: 'health', label: 'Health', width: 11,
      cell: ({ row }) => {
        const key = healthKeyFor(row);
        if (!key) return <span style={{ color: T.subtlest }}>—</span>;
        const band = resolveBand(key);
        return (
          <Tooltip content="Health derived from the worst band of this element’s linked measures">
            <span><Lozenge appearance={(band?.appearance as LozengeAppearance) ?? 'default'}>{band?.label ?? key}</Lozenge></span>
          </Tooltip>
        );
      },
    },
    {
      id: 'kpis', label: 'KPIs', width: 8, align: 'end',
      cell: ({ row }) => {
        const n = kpiCountByElement.get(row.id) ?? 0;
        return gapCountCell(n, row.element_type === 'objective' && n === 0);
      },
    },
    {
      id: 'cards', label: 'Cards', width: 8, align: 'end',
      cell: ({ row }) => gapCountCell(cardCountFor(row), false),
    },
    {
      id: 'benefits', label: 'Benefits', width: 9, align: 'end',
      cell: ({ row }) => gapCountCell(benefitCountFor(row), false),
    },
    {
      id: 'actions', label: '', width: 9, align: 'end',
      cell: ({ row }) => (canAuthor ? (
        <span style={{ display: 'inline-flex', justifyContent: 'flex-end' }}>
          <StrataChipMenu value="Actions" aria-label={`Actions for ${row.name}`} options={rowActions(row)} />
        </span>
      ) : null),
    },
  ];

  const isLoading = contextLoading || elementsQ.isLoading;

  const filterControl = (
    label: string,
    value: string | null,
    display: string | null,
    onClear: () => void,
    options: StrataMenuOption[],
  ) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      <StrataChipMenu
        label={label}
        value={display ?? 'All'}
        active={value !== null}
        options={options}
        aria-label={`Filter by ${label.toLowerCase()}`}
      />
      {value !== null ? (
        <IconButton
          icon={<X size={14} />}
          appearance="subtle"
          spacing="compact"
          aria-label={`Clear ${label.toLowerCase()} filter`}
          onClick={onClear}
        />
      ) : null}
    </span>
  );

  const showData = !isLoading && !elementsQ.isError && !!activeCycle && elements.length > 0;

  const filters = (
    <>
      {filterControl(
        'Type',
        typeFilter,
        typeFilter ? labelize(typeFilter) : null,
        () => setTypeFilter(null),
        [
          { key: 'all', label: 'All', isSelected: typeFilter === null, onClick: () => setTypeFilter(null) },
          ...distinctTypes.map((t) => ({
            key: t, label: labelize(t), isSelected: typeFilter === t, onClick: () => setTypeFilter(t),
          })),
        ],
      )}
      {filterControl(
        'Status',
        statusFilter,
        statusFilter ? labelize(statusFilter) : null,
        () => setStatusFilter(null),
        [
          { key: 'all', label: 'All', isSelected: statusFilter === null, onClick: () => setStatusFilter(null) },
          ...distinctStatuses.map((s) => ({
            key: s, label: labelize(s), isSelected: statusFilter === s, onClick: () => setStatusFilter(s),
          })),
        ],
      )}
      {filterControl(
        'Perspective',
        perspectiveFilter,
        perspectiveFilter ? perspectiveName(perspectiveFilter) : null,
        () => setPerspectiveFilter(null),
        [
          { key: 'all', label: 'All', isSelected: perspectiveFilter === null, onClick: () => setPerspectiveFilter(null) },
          ...perspectives.map((p) => ({
            key: p.id, label: p.name, isSelected: perspectiveFilter === p.id, onClick: () => setPerspectiveFilter(p.id),
          })),
        ],
      )}
    </>
  );

  return (
    <StrataPageShell
      headerActions={
        <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
          <ViewToggle
            mode={viewMode}
            onStructure={() => setViewMode('structure')}
            onNarrative={() => setViewMode('narrative')}
            onMap={() => navigate(Routes.strata.strategyMap())}
          />
          {canAuthor ? (
            <Button onClick={() => setAuthoring({ kind: 'create-cycle' })}>New cycle</Button>
          ) : null}
          {canAuthor ? (
            <Button isDisabled={!activeCycle} onClick={() => setAuthoring({ kind: 'create-element' })}>
              New element
            </Button>
          ) : null}
        </span>
      }
      toolbarActions={showData && viewMode === 'structure' ? filters : undefined}
      testId="strata-strategy-room-chrome"
    >

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
          <Spinner size="large" aria-label="Loading strategy" />
        </div>
      ) : elementsQ.isError ? (
        <SectionMessage appearance="error" title="Could not load strategy elements">
          <p>{elementsQ.error instanceof Error ? elementsQ.error.message : 'Unknown error'}</p>
        </SectionMessage>
      ) : !activeCycle || elements.length === 0 ? (
        <EmptyState
          header="No strategy elements yet"
          description="This cycle has no themes or objectives. Draft the strategy structure in STRATA Configuration, then elements appear here."
          primaryAction={
            <Button onClick={() => navigate(Routes.strata.admin())}>Open Configuration</Button>
          }
        />
      ) : viewMode === 'narrative' ? (
        <>
          <ReadinessBand tiles={readiness} />
          <StrataPanel title="Narrative" icon={<GitBranch size={16} />} testId="strata-narrative-panel">
            <EmptyState
              size="compact"
              header="Narrative view — coming soon"
              description="An executive narrative of this cycle’s themes and objectives is on the way. For now, use Structure to author the hierarchy or Map for the cause-and-effect canvas."
            />
          </StrataPanel>
        </>
      ) : (
        <>
          {promoteError ? (
            <div style={{ marginBottom: 16 }}>
              <SectionMessage appearance="error" title="Promotion blocked">
                <p>{promoteError}</p>
              </SectionMessage>
            </div>
          ) : null}

          <ReadinessBand tiles={readiness} />

          {/* Strategic structure (anchor 02) — JiraTable grouped/indented tree */}
          <div style={{ marginBottom: 16 }}>
            <StrataPanel
              title="Strategic structure"
              icon={<GitBranch size={16} />}
              count={filteredCount}
              testId="strata-hierarchy-panel"
              noPadding
              actions={
                <Button
                  appearance="subtle"
                  spacing="compact"
                  isSelected={gapsOnly}
                  onClick={() => setGapsOnly((v) => !v)}
                  testId="strata-gaps-only-toggle"
                >
                  Show coverage gaps only
                </Button>
              }
            >
              {flatRows.length === 0 ? (
                <div style={{ padding: 16 }}>
                  <EmptyState
                    size="compact"
                    header={gapsOnly ? 'No coverage gaps' : 'No elements match the filters'}
                    description={gapsOnly ? 'Every objective has a measure and an owner.' : 'Clear a filter to see the hierarchy.'}
                  />
                </div>
              ) : (
                <JiraTable<StrataStrategyElement>
                  columns={structureColumns}
                  data={flatRows}
                  getRowId={(row) => row.id}
                  getRowDepth={(row) => depthOf.get(row.id) ?? 0}
                  onRowClick={(row) => { if (row.slug) navigate(Routes.strata.strategyElement(row.slug)); }}
                  density="compact"
                  ariaLabel="Strategic structure"
                />
              )}
            </StrataPanel>
          </div>

          {/* Promote confirmation */}
          <Modal
            isOpen={promoteTarget !== null}
            onClose={() => { if (!promotingId) setPromoteTarget(null); }}
            width="small"
          >
            <ModalHeader>
              <ModalTitle>Promote element</ModalTitle>
            </ModalHeader>
            <ModalBody>
              <p style={{ margin: 0, fontSize: 'var(--ds-font-size-200)', color: T.text }}>
                Promote <strong>{promoteTarget?.name ?? '—'}</strong> to active?
              </p>
              <p style={{ margin: '8px 0 0', fontSize: 'var(--ds-font-size-100)', color: T.subtle }}>
                Promotion is enforced server-side and is blocked if charter or gate requirements are not met.
              </p>
            </ModalBody>
            <ModalFooter>
              <Button appearance="subtle" isDisabled={!!promotingId} onClick={() => setPromoteTarget(null)}>
                Cancel
              </Button>
              <Button
                appearance="primary"
                isLoading={promotingId !== null && promotingId === promoteTarget?.id}
                onClick={() => { if (promoteTarget) handlePromote(promoteTarget.id); }}
              >
                Promote
              </Button>
            </ModalFooter>
          </Modal>
        </>
      )}

      {/* ── Authoring modals (Lane A) — all writes are server-validated RPCs; ──
          rejections surface verbatim inside each modal. Rendered outside the
          data branch so cycle/element creation works from the empty state. */}
      {authoring?.kind === 'create-cycle' ? (
        <StrataFormModal
          open
          onClose={closeAuthoring}
          title="New cycle"
          fields={[
            { key: 'name', label: 'Name', kind: 'text', required: true },
            { key: 'startsOn', label: 'Starts on', kind: 'date', required: true },
            { key: 'endsOn', label: 'Ends on', kind: 'date', required: true },
            {
              key: 'granularity', label: 'Period granularity', kind: 'select', required: true,
              options: GRANULARITIES.map((g) => ({ value: g, label: labelize(g) })),
            },
            { key: 'description', label: 'Description', kind: 'textarea' },
            { key: 'generatePeriods', label: 'Generate periods', kind: 'checkbox', placeholder: 'Generate periods for this cycle after creation' },
          ]}
          initial={{ granularity: 'quarter', generatePeriods: true }}
          submitLabel="Create cycle"
          testId="strata-create-cycle-modal"
          onSubmit={async (v) => {
            const cycleId = await strategyApi.createCycle({
              name: String(v.name), startsOn: String(v.startsOn), endsOn: String(v.endsOn),
              granularity: str(v.granularity), description: str(v.description),
            });
            if (v.generatePeriods) await strategyApi.generatePeriods(cycleId);
            invalidate();
          }}
        />
      ) : null}

      {authoring?.kind === 'create-element' && activeCycle ? (
        <NewElementModal
          cycleId={activeCycle.id}
          cycleName={activeCycle.name}
          themeOptions={parentOptions()}
          perspectiveOptions={approvedPerspectiveOptions()}
          onClose={closeAuthoring}
          onCreated={invalidate}
        />
      ) : null}

      {authoring?.kind === 'edit-element' ? (
        <EditElementModal
          element={authoring.element}
          perspectiveOptions={approvedPerspectiveOptions(authoring.element.perspective_id)}
          parentOptions={parentOptions(authoring.element.id)}
          onClose={closeAuthoring}
          onSaved={invalidate}
        />
      ) : null}

      {authoring?.kind === 'retire-element' ? (
        <StrataFormModal
          open
          onClose={closeAuthoring}
          title="Retire element"
          description={<>Retire <strong>{authoring.element.name}</strong>? A reason is required for the audit trail.</>}
          fields={[{ key: 'reason', label: 'Reason', kind: 'textarea', required: true }]}
          submitLabel="Retire"
          testId="strata-retire-element-modal"
          onSubmit={async (v) => {
            await strategyApi.retireElement(authoring.element.id, String(v.reason));
            invalidate();
          }}
        />
      ) : null}

      {authoring?.kind === 'charter' ? (
        <ThemeCharterModal
          element={authoring.element}
          charter={charterByElement.get(authoring.element.id)}
          gateModelOptions={gateModelOptions(charterByElement.get(authoring.element.id)?.gate_model_id)}
          onClose={closeAuthoring}
          onSaved={invalidate}
        />
      ) : null}

      {authoring?.kind === 'kpi-links' ? (
        <KpiLinksModal
          element={authoring.element}
          links={elementKpis.filter((l) => l.element_id === authoring.element.id)}
          kpis={kpis}
          onClose={closeAuthoring}
          onChanged={invalidate}
        />
      ) : null}
    </StrataPageShell>
  );
}
