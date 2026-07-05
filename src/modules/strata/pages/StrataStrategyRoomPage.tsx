/**
 * STRATA Strategy Room — /strata/strategy (CAT-STRATA-20260705-001).
 * Hierarchy tree, KPI coverage and cause & effect summary for the active cycle.
 * UI computes nothing: statuses/stages/charters come straight from the DB;
 * promotion control is enforced server-side (strata_promote_element).
 */
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button, CatalystTag, EmptyState, IconButton,
  Lozenge, Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle, SectionMessage, Spinner,
} from '@/components/ads';
import { PageContainer } from '@/components/shared/PageContainer';
import { Routes } from '@/lib/routes';
import {
  ChevronDown, ChevronRight, Flag, Gem, GitBranch, Layers, MoveRight, Network, Target, X,
} from '@/lib/atlaskit-icons';
import {
  useElementKpis, useInvalidateStrata, useKpis, useMapEdges, usePerspectives,
  usePlayCharters, useProfileNames, useStrataContext, useStrategyElements,
} from '@/modules/strata/hooks/useStrata';
import { strategyApi } from '@/modules/strata/domain';
import { StrataChipMenu, StrataPageChrome, StrataPanel, T } from '@/modules/strata/components/shared';
import type { StrataMenuOption } from '@/modules/strata/components/shared';
import { fmtRatioPct, labelize } from '@/modules/strata/components/format';
import type { StrataStrategyElement } from '@/modules/strata/types';

type LozengeAppearance = React.ComponentProps<typeof Lozenge>['appearance'];

/** SYSTEM element states (DB CHECK on strata_strategy_elements.status). */
const STATUS_APPEARANCE: Record<StrataStrategyElement['status'], LozengeAppearance> = {
  draft: 'default',
  proposed: 'default',
  active: 'inprogress',
  on_hold: 'moved',
  retired: 'removed',
};

/** Per-type visual identity — element types are SYSTEM values (DB CHECK). */
const TYPE_META: Record<string, { icon: React.ComponentType<{ size?: number }>; bg: string; fg: string }> = {
  theme: { icon: Gem, bg: 'var(--ds-background-selected)', fg: 'var(--ds-text-brand)' },
  play: { icon: Flag, bg: 'var(--ds-background-warning)', fg: 'var(--ds-text-warning)' },
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

/** Hover states need real :hover — inline styles cannot express them. Tokens only. */
const TREE_CSS = `
.strata-tree-row { transition: background 80ms ease; }
.strata-tree-row:hover { background: var(--ds-surface-sunken); }
.strata-row-actions { opacity: 0; transition: opacity 80ms ease; }
.strata-tree-row:hover .strata-row-actions,
.strata-tree-row:focus-within .strata-row-actions { opacity: 1; }
`;


export default function StrataStrategyRoomPage() {
  const navigate = useNavigate();
  const { activeCycle, isLoading: contextLoading } = useStrataContext();
  const elementsQ = useStrategyElements(activeCycle?.id);
  const edgesQ = useMapEdges(activeCycle?.id);
  const chartersQ = usePlayCharters();
  const elementKpisQ = useElementKpis();
  const kpisQ = useKpis();
  const perspectivesQ = usePerspectives();
  const profilesQ = useProfileNames();
  const invalidate = useInvalidateStrata();

  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [perspectiveFilter, setPerspectiveFilter] = useState<string | null>(null);
  const [promoteError, setPromoteError] = useState<string | null>(null);
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [promoteTarget, setPromoteTarget] = useState<StrataStrategyElement | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const elements = useMemo(() => elementsQ.data ?? [], [elementsQ.data]);
  const perspectives = perspectivesQ.data ?? [];
  const charters = chartersQ.data ?? [];
  const elementKpis = elementKpisQ.data ?? [];
  const kpis = kpisQ.data ?? [];
  const edges = edgesQ.data ?? [];
  const profiles = profilesQ.data;

  const elementById = useMemo(() => new Map(elements.map((e) => [e.id, e])), [elements]);
  const charterByElement = useMemo(() => new Map(charters.map((c) => [c.element_id, c])), [charters]);
  const kpiById = useMemo(() => new Map(kpis.map((k) => [k.id, k])), [kpis]);
  const perspectiveName = (id: string | null): string =>
    (id ? perspectives.find((p) => p.id === id)?.name : null) ?? '—';
  const ownerName = (ownerId: string | null): string =>
    (ownerId ? profiles?.get(ownerId)?.name : null) ?? '—';

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

  const toggleCollapsed = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

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

  const renderNode = (el: StrataStrategyElement, depth: number): React.ReactNode => {
    const charter = el.element_type === 'play' ? charterByElement.get(el.id) : undefined;
    const charterComplete = !!(charter && charter.hypothesis && charter.value_thesis && charter.owner_id);
    const kids = childrenOf.get(el.id) ?? [];
    const isCollapsed = collapsed.has(el.id);
    return (
      <React.Fragment key={el.id}>
        <div
          data-testid={`strata-element-row-${el.id}`}
          className="strata-tree-row"
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            minHeight: 36, padding: '4px 12px',
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          {/* Depth rails */}
          {Array.from({ length: depth }).map((_, i) => (
            <span
              key={i}
              aria-hidden
              style={{ alignSelf: 'stretch', width: 20, flexShrink: 0, borderLeft: `1px solid ${T.border}` }}
            />
          ))}
          {/* Expand affordance */}
          {kids.length > 0 ? (
            <IconButton
              icon={isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
              appearance="subtle"
              spacing="compact"
              aria-label={isCollapsed ? `Expand ${el.name}` : `Collapse ${el.name}`}
              onClick={() => toggleCollapsed(el.id)}
            />
          ) : (
            <span aria-hidden style={{ width: 24, flexShrink: 0 }} />
          )}
          <TypeChip type={el.element_type} />
          <span
            style={{
              fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: T.text,
              flex: '1 1 auto', minWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
          >
            {el.name}
          </span>
          {el.stage ? (
            <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtlest, whiteSpace: 'nowrap' }}>
              <span style={{ fontWeight: 600 }}>Stage</span> {labelize(el.stage)}
            </span>
          ) : null}
          <Lozenge appearance={STATUS_APPEARANCE[el.status] ?? 'default'}>{labelize(el.status)}</Lozenge>
          <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtle, whiteSpace: 'nowrap' }}>
            {ownerName(el.owner_id)}
          </span>
          <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtlest, whiteSpace: 'nowrap' }}>
            {perspectiveName(el.perspective_id)}
          </span>
          {el.element_type === 'play' && !charterComplete ? (
            <Lozenge appearance="moved">Charter incomplete</Lozenge>
          ) : null}
          {el.element_type === 'play' && el.status !== 'active' ? (
            <span className="strata-row-actions">
              <Button
                spacing="compact"
                isLoading={promotingId === el.id}
                onClick={() => setPromoteTarget(el)}
              >
                Promote
              </Button>
            </span>
          ) : null}
        </div>
        {!isCollapsed ? kids.map((child) => renderNode(child, depth + 1)) : null}
      </React.Fragment>
    );
  };

  const objectives = useMemo(
    () => elements.filter((e) => e.element_type === 'objective'),
    [elements],
  );
  const kpiLinksByElement = useMemo(() => {
    const map = new Map<string, string[]>();
    elementKpis.forEach((link) => {
      const list = map.get(link.element_id) ?? [];
      list.push(link.kpi_id);
      map.set(link.element_id, list);
    });
    return map;
  }, [elementKpis]);

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

  return (
    <PageContainer variant="wide">
      <style>{TREE_CSS}</style>
      <StrataPageChrome
        icon={<Layers size={20} />}
        title="Strategy Room"
        description="Strategy hierarchy, KPI coverage and cause & effect for the active cycle"
        actions={
          <Button appearance="primary" onClick={() => navigate(Routes.strata.strategyMap())}>
            Open Strategy Map
          </Button>
        }
        testId="strata-strategy-room-chrome"
      />

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
          description="This cycle has no themes, plays or objectives. Draft the strategy structure in STRATA Configuration, then elements appear here."
          primaryAction={
            <Button onClick={() => navigate(Routes.strata.admin())}>Open Configuration</Button>
          }
        />
      ) : (
        <>
          {/* Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
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
          </div>

          {promoteError ? (
            <div style={{ marginBottom: 16 }}>
              <SectionMessage appearance="error" title="Promotion blocked">
                <p>{promoteError}</p>
              </SectionMessage>
            </div>
          ) : null}

          {/* Hierarchy */}
          <div style={{ marginBottom: 16 }}>
            <StrataPanel
              title="Strategy hierarchy"
              icon={<GitBranch size={16} />}
              count={filteredCount}
              testId="strata-hierarchy-panel"
              noPadding
            >
              {roots.length === 0 ? (
                <div style={{ padding: 16 }}>
                  <EmptyState size="compact" header="No elements match the filters" description="Clear a filter to see the hierarchy." />
                </div>
              ) : (
                <div>{roots.map((el) => renderNode(el, 0))}</div>
              )}
            </StrataPanel>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
            {/* KPI coverage */}
            <StrataPanel
              title="KPI coverage"
              icon={<Target size={16} />}
              count={objectives.length}
              testId="strata-kpi-coverage-panel"
            >
              {objectives.length === 0 ? (
                <EmptyState size="compact" header="No objectives in this cycle" />
              ) : (
                objectives.map((obj) => {
                  const linkedKpiIds = kpiLinksByElement.get(obj.id) ?? [];
                  return (
                    <div
                      key={obj.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                        padding: '8px 0', borderBottom: `1px solid ${T.border}`,
                      }}
                    >
                      <span style={{
                        fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: T.text,
                        flex: '1 1 auto', minWidth: 140,
                      }}>
                        {obj.name}
                      </span>
                      {linkedKpiIds.length === 0 ? (
                        <Lozenge appearance="moved">No KPIs</Lozenge>
                      ) : (
                        linkedKpiIds.map((kpiId) => {
                          const kpi = kpiById.get(kpiId);
                          if (!kpi) return <span key={kpiId} style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>—</span>;
                          return (
                            <Button
                              key={kpiId}
                              appearance="link"
                              spacing="compact"
                              isDisabled={!kpi.slug}
                              onClick={() => { if (kpi.slug) navigate(Routes.strata.kpi(kpi.slug)); }}
                            >
                              {kpi.name}
                            </Button>
                          );
                        })
                      )}
                    </div>
                  );
                })
              )}
            </StrataPanel>

            {/* Cause & effect */}
            <StrataPanel
              title="Cause & effect"
              icon={<Network size={16} />}
              count={edges.length}
              actions={
                <Button appearance="subtle" spacing="compact" onClick={() => navigate(Routes.strata.strategyMap())}>
                  Open map
                </Button>
              }
              testId="strata-cause-effect-panel"
            >
              {edges.length === 0 ? (
                <EmptyState size="compact" header="No cause & effect links" description="Draw links between elements on the strategy map." />
              ) : (
                edges.map((edge) => {
                  const from = elementById.get(edge.from_element_id);
                  const to = elementById.get(edge.to_element_id);
                  return (
                    <div
                      key={edge.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                        padding: '8px 0', borderBottom: `1px solid ${T.border}`,
                        fontSize: 'var(--ds-font-size-200)',
                      }}
                    >
                      <span style={{ color: T.text, fontWeight: 600 }}>{from?.name ?? '—'}</span>
                      <span aria-hidden style={{ display: 'inline-flex', color: T.subtlest }}><MoveRight size={14} /></span>
                      <span style={{ color: T.text, fontWeight: 600 }}>{to?.name ?? '—'}</span>
                      <CatalystTag text={labelize(edge.relationship_type)} />
                      <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtle, marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                        {edge.confidence != null ? `Confidence ${fmtRatioPct(edge.confidence)}` : '—'}
                      </span>
                    </div>
                  );
                })
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
              <ModalTitle>Promote play</ModalTitle>
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
    </PageContainer>
  );
}
