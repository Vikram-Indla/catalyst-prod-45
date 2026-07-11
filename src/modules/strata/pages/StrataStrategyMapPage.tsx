/**
 * STRATA Strategy Map Canvas — /strata/strategy/map (CAT-STRATA-20260705-001).
 * Cause-and-effect canvas over strata_strategy_elements/strata_map_edges via
 * @xyflow/react. Positions persist server-side (strategyApi.updateMapPosition);
 * edge creation goes through strategyApi.createEdge. UI computes nothing.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Background, BackgroundVariant, Controls, ReactFlow,
  useEdgesState, useNodesState, useReactFlow,
} from '@xyflow/react';
import type { Connection, Edge, FitViewOptions, Node } from '@xyflow/react';
// ads-scanner:ignore-next-line — @xyflow canvas library stylesheet, third-party requirement (no ADS equivalent, probed 2026-07-05)
import '@xyflow/react/dist/style.css';
import {
  Button, DropdownItem, DropdownItemGroup, DropdownMenu, EmptyState,
  Heading, IconButton, Lozenge, SectionMessage, Spinner,
} from '@/components/ads';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Routes } from '@/lib/routes';
import { Gem, Target, X } from '@/lib/atlaskit-icons';
import {
  useElementKpis, useInvalidateStrata, useKpis, useMapEdges, usePerspectives,
  useThemeCharters, useProfileNames, useStrataContext, useStrategyElements,
} from '@/modules/strata/hooks/useStrata';
import { strategyApi } from '@/modules/strata/domain';
import { StrataPageShell, T } from '@/modules/strata/components/shared';
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

const ANIMATED_CONFIDENCE = 0.85;

/** Fallback grid tiers when an element has no persisted map_position. */
const TIER_Y: Record<string, number> = { theme: 0, objective: 400 };

/** Per-type visual identity — element types are SYSTEM values (DB CHECK). */
const TYPE_META: Record<string, { icon: React.ComponentType<{ size?: number }>; fg: string }> = {
  theme: { icon: Gem, fg: 'var(--ds-text-brand)' },
  objective: { icon: Target, fg: 'var(--ds-text-success)' },
};

/**
 * xyflow chrome ships hard-coded greys; retint Controls/MiniMap/edges with ADS
 * tokens under a scoped class. Tokens only — no bare colors.
 */
const FLOW_CSS = `
.strata-flow .react-flow__controls {
  background: var(--ds-surface-raised);
  border: 1px solid var(--ds-border);
  border-radius: 6px;
  box-shadow: var(--ds-shadow-raised);
  overflow: hidden;
}
.strata-flow .react-flow__controls-button {
  background: var(--ds-surface-raised);
  border-bottom: 1px solid var(--ds-border);
}
.strata-flow .react-flow__controls-button:hover { background: var(--ds-surface-sunken); }
.strata-flow .react-flow__controls-button svg { fill: var(--ds-icon); }
.strata-flow .react-flow__edge-path { stroke: var(--ds-text-subtlest); }
.strata-flow .react-flow__edge-text { fill: var(--ds-text-subtle); }
.strata-flow .react-flow__edge-textbg { fill: var(--ds-surface-raised); }
.strata-flow .react-flow__attribution { background: transparent; color: var(--ds-text-subtlest); }
`;

function NodeCard({
  el, ownerName,
}: { el: StrataStrategyElement; ownerName: string | null }) {
  const meta = TYPE_META[el.element_type];
  const Icon = meta?.icon;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start', textAlign: 'left' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        {Icon ? <span aria-hidden style={{ display: 'inline-flex', color: meta.fg }}><Icon size={14} /></span> : null}
        <span style={{
          fontSize: 'var(--ds-font-size-050)', fontWeight: 600, color: T.subtlest,
          letterSpacing: '0.04em',
        }}>
          {labelize(el.element_type)}
        </span>
      </span>
      <span style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: T.text }}>{el.name}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Lozenge appearance={STATUS_APPEARANCE[el.status] ?? 'default'}>{labelize(el.status)}</Lozenge>
        {ownerName ? (
          <span style={{ fontSize: 'var(--ds-font-size-050)', color: T.subtle }}>{ownerName}</span>
        ) : null}
      </span>
    </div>
  );
}

function InspectorRow({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 8, padding: '8px 0', borderBottom: `1px solid ${T.border}` }}>
      <span style={{
        width: 110, flexShrink: 0, fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.subtlest,
      }}>
        {k}
      </span>
      <span style={{ fontSize: 'var(--ds-font-size-200)', color: T.text, minWidth: 0, overflowWrap: 'anywhere' }}>
        {children}
      </span>
    </div>
  );
}

const FIT_VIEW_OPTIONS: FitViewOptions = { duration: 200, padding: 0.15 };

/**
 * Renders nothing; lives inside <ReactFlow> so useReactFlow() has context.
 * Re-fits the canvas when the docked inspector opens/closes and exposes
 * fitView via ref so the panel's onResize can re-fit during drag resizes.
 */
function FlowFitter({
  fitViewRef, inspectorOpen,
}: { fitViewRef: React.MutableRefObject<((opts?: FitViewOptions) => void) | null>; inspectorOpen: boolean }) {
  const { fitView } = useReactFlow();
  useEffect(() => {
    fitViewRef.current = (opts) => { void fitView(opts); };
    return () => { fitViewRef.current = null; };
  }, [fitView, fitViewRef]);
  useEffect(() => {
    // Wait a frame so the panel layout has settled before measuring.
    const id = requestAnimationFrame(() => { void fitView(FIT_VIEW_OPTIONS); });
    return () => cancelAnimationFrame(id);
  }, [inspectorOpen, fitView]);
  return null;
}

/** Legend swatch drawn with the same stroke the edges use. */
function EdgeSwatch({ dashed }: { dashed?: boolean }) {
  return (
    <svg width={24} height={8} aria-hidden style={{ flexShrink: 0 }}>
      <line
        x1={0} y1={4} x2={24} y2={4}
        stroke="var(--ds-text-subtlest)" strokeWidth={1.5}
        strokeDasharray={dashed ? '4 3' : undefined}
      />
    </svg>
  );
}

export default function StrataStrategyMapPage() {
  const navigate = useNavigate();
  const { activeCycle, isLoading: contextLoading } = useStrataContext();
  const elementsQ = useStrategyElements(activeCycle?.id);
  const edgesQ = useMapEdges(activeCycle?.id);
  const chartersQ = useThemeCharters();
  const elementKpisQ = useElementKpis();
  const kpisQ = useKpis();
  const perspectivesQ = usePerspectives();
  const profilesQ = useProfileNames();
  const invalidate = useInvalidateStrata();

  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set());
  const [perspectiveFilter, setPerspectiveFilter] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [failedPosition, setFailedPosition] = useState<{ id: string; x: number; y: number } | null>(null);
  const [edgeError, setEdgeError] = useState<string | null>(null);
  const [linkCreated, setLinkCreated] = useState(false);

  // Re-fit the canvas when the docked inspector opens/closes or is drag-resized.
  const fitViewRef = useRef<((opts?: FitViewOptions) => void) | null>(null);
  const fitTimerRef = useRef<number | null>(null);
  const requestFit = useCallback(() => {
    if (fitTimerRef.current != null) window.clearTimeout(fitTimerRef.current);
    fitTimerRef.current = window.setTimeout(() => {
      fitTimerRef.current = null;
      fitViewRef.current?.(FIT_VIEW_OPTIONS);
    }, 150);
  }, []);
  useEffect(() => () => {
    if (fitTimerRef.current != null) window.clearTimeout(fitTimerRef.current);
  }, []);

  const elements = useMemo(() => elementsQ.data ?? [], [elementsQ.data]);
  const mapEdges = useMemo(() => edgesQ.data ?? [], [edgesQ.data]);
  const perspectives = useMemo(() => perspectivesQ.data ?? [], [perspectivesQ.data]);
  const charters = chartersQ.data ?? [];
  const elementKpis = elementKpisQ.data ?? [];
  const kpis = kpisQ.data ?? [];
  const profiles = profilesQ.data;

  const elementById = useMemo(() => new Map(elements.map((e) => [e.id, e])), [elements]);
  const kpiById = useMemo(() => new Map(kpis.map((k) => [k.id, k])), [kpis]);
  const perspectiveName = (id: string | null): string =>
    (id ? perspectives.find((p) => p.id === id)?.name : null) ?? '—';
  const ownerName = (ownerId: string | null): string | null =>
    (ownerId ? profiles?.get(ownerId)?.name : null) ?? null;

  /** Stable per-perspective categorical color, assigned by governed order_index — never by name. */
  const perspectiveTone = useMemo(() => {
    const sorted = [...perspectives].sort((a, b) => a.order_index - b.order_index);
    const m = new Map<string, string>();
    sorted.forEach((p, i) => m.set(p.id, `var(--ds-chart-categorical-${(i % 8) + 1})`));
    return m;
  }, [perspectives]);

  const distinctTypes = useMemo(
    () => Array.from(new Set(elements.map((e) => e.element_type))),
    [elements],
  );
  const relationshipTypes = useMemo(
    () => Array.from(new Set(mapEdges.map((e) => e.relationship_type))),
    [mapEdges],
  );
  const usedPerspectiveIds = useMemo(
    () => new Set(elements.map((e) => e.perspective_id).filter((id): id is string => id != null)),
    [elements],
  );
  const legendPerspectives = useMemo(
    () => [...perspectives]
      .filter((p) => usedPerspectiveIds.has(p.id))
      .sort((a, b) => a.order_index - b.order_index),
    [perspectives, usedPerspectiveIds],
  );

  const visibleElements = useMemo(
    () => elements.filter((el) =>
      !hiddenTypes.has(el.element_type) &&
      (perspectiveFilter === null || el.perspective_id === perspectiveFilter)),
    [elements, hiddenTypes, perspectiveFilter],
  );

  const derivedNodes = useMemo<Node[]>(() => {
    const tierCounts: Record<string, number> = {};
    return visibleElements.map((el) => {
      const idx = tierCounts[el.element_type] ?? 0;
      tierCounts[el.element_type] = idx + 1;
      const position = el.map_position ?? {
        x: 40 + idx * 220,
        y: 40 + (TIER_Y[el.element_type] ?? 600),
      };
      const tone = el.perspective_id ? perspectiveTone.get(el.perspective_id) : undefined;
      return {
        id: el.id,
        position,
        data: { label: <NodeCard el={el} ownerName={ownerName(el.owner_id)} /> },
        style: {
          background: 'var(--ds-surface-raised)',
          border: `1px solid ${T.border}`,
          borderLeft: `3px solid ${tone ?? T.border}`,
          borderRadius: 8,
          boxShadow: 'var(--ds-shadow-raised)',
          padding: 12,
          minWidth: 180,
          width: 'auto',
        },
      } satisfies Node;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleElements, perspectiveTone, profiles]);

  const derivedEdges = useMemo<Edge[]>(() => {
    const visibleIds = new Set(visibleElements.map((e) => e.id));
    return mapEdges
      .filter((e) => visibleIds.has(e.from_element_id) && visibleIds.has(e.to_element_id))
      .map((e) => ({
        id: e.id,
        source: e.from_element_id,
        target: e.to_element_id,
        label: labelize(e.relationship_type),
        animated: (e.confidence ?? 0) >= ANIMATED_CONFIDENCE,
      }));
  }, [mapEdges, visibleElements]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  useEffect(() => { setNodes(derivedNodes); }, [derivedNodes, setNodes]);
  useEffect(() => { setEdges(derivedEdges); }, [derivedEdges, setEdges]);

  const onNodeDragStop = useCallback((_event: unknown, node: Node) => {
    // Fire-and-forget persistence; the DB stays the source of truth.
    const pos = { id: node.id, x: Math.round(node.position.x), y: Math.round(node.position.y) };
    strategyApi
      .updateMapPosition(pos.id, { x: pos.x, y: pos.y })
      .catch(() => setFailedPosition(pos));
  }, []);

  const retryFailedPosition = useCallback(() => {
    if (!failedPosition) return;
    strategyApi
      .updateMapPosition(failedPosition.id, { x: failedPosition.x, y: failedPosition.y })
      .then(() => setFailedPosition(null))
      .catch(() => { /* keep the banner; user can retry or dismiss */ });
  }, [failedPosition]);

  const onConnect = useCallback((connection: Connection) => {
    if (!activeCycle || !connection.source || !connection.target) return;
    setEdgeError(null);
    setLinkCreated(false);
    strategyApi
      .createEdge({
        cycle_id: activeCycle.id,
        from_element_id: connection.source,
        to_element_id: connection.target,
        relationship_type: 'drives',
      })
      .then(() => { invalidate(); setLinkCreated(true); })
      .catch((e: unknown) => setEdgeError(e instanceof Error ? e.message : String(e)));
  }, [activeCycle, invalidate]);

  const onNodeClick = useCallback((_event: unknown, node: Node) => setSelectedId(node.id), []);

  const toggleType = (t: string) => {
    setHiddenTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t); else next.add(t);
      return next;
    });
  };

  const selected = selectedId ? elementById.get(selectedId) ?? null : null;
  const selectedCharter = selected && selected.element_type === 'theme'
    ? charters.find((c) => c.element_id === selected.id) ?? null
    : null;
  const selectedKpiIds = selected
    ? elementKpis.filter((l) => l.element_id === selected.id).map((l) => l.kpi_id)
    : [];
  const incomingEdges = selected ? mapEdges.filter((e) => e.to_element_id === selected.id) : [];
  const outgoingEdges = selected ? mapEdges.filter((e) => e.from_element_id === selected.id) : [];
  const selectedMeta = selected ? TYPE_META[selected.element_type] : undefined;
  const SelectedIcon = selectedMeta?.icon;

  const isLoading = contextLoading || elementsQ.isLoading || edgesQ.isLoading;

  return (
    <StrataPageShell
      trail={[{ text: 'Strategy room', href: Routes.strata.strategy() }, { text: 'Map' }]}
      title="Strategy Map"
      docTitle="Strategy Map"
      testId="strata-strategy-map-chrome"
    >
      <style>{FLOW_CSS}</style>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
          <Spinner size="large" aria-label="Loading strategy map" />
        </div>
      ) : elementsQ.isError || edgesQ.isError ? (
        <SectionMessage appearance="error" title="Could not load the strategy map">
          <p>
            {(elementsQ.error instanceof Error && elementsQ.error.message) ||
              (edgesQ.error instanceof Error && edgesQ.error.message) ||
              'Unknown error'}
          </p>
        </SectionMessage>
      ) : !activeCycle || elements.length === 0 ? (
        <EmptyState
          header="Nothing to map yet"
          description="This cycle has no strategy elements. Draft themes and objectives in the Strategy Room first."
          primaryAction={<Button appearance="primary" onClick={() => navigate(Routes.strata.strategy())}>Open Strategy Room</Button>}
        />
      ) : (
        <>
          {failedPosition ? (
            <div style={{ marginBottom: 12 }}>
              <SectionMessage
                appearance="warning"
                title="Layout not saved"
                actions={[
                  { key: 'retry', text: 'Retry', onClick: retryFailedPosition },
                  { key: 'dismiss', text: 'Dismiss', onClick: () => setFailedPosition(null) },
                ]}
              >
                <p>The last position change could not be saved — it is local to this session until it saves.</p>
              </SectionMessage>
            </div>
          ) : null}
          {edgeError ? (
            <div style={{ marginBottom: 12 }}>
              <SectionMessage
                appearance="error"
                title="Could not create link"
                actions={[{ key: 'dismiss', text: 'Dismiss', onClick: () => setEdgeError(null) }]}
              >
                <p>{edgeError}</p>
              </SectionMessage>
            </div>
          ) : null}
          {linkCreated ? (
            <div style={{ marginBottom: 12 }}>
              <SectionMessage
                appearance="success"
                title="Link created"
                actions={[{ key: 'dismiss', text: 'Dismiss', onClick: () => setLinkCreated(false) }]}
              >
                <p>Relationship defaulted to Drives. Edit it in the inspector.</p>
              </SectionMessage>
            </div>
          ) : null}

          {/* Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {distinctTypes.map((t) => {
              const active = !hiddenTypes.has(t);
              const meta = TYPE_META[t];
              const Icon = meta?.icon;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleType(t)}
                  aria-pressed={active}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '4px 12px', borderRadius: 4, border: 'none', cursor: 'pointer',
                    background: active ? T.selected : T.neutral,
                    color: active ? 'var(--ds-text-selected)' : T.subtle,
                    fontSize: 'var(--ds-font-size-050)', fontWeight: 600, whiteSpace: 'nowrap',
                  }}
                >
                  {Icon ? <Icon size={12} /> : null}
                  {labelize(t)}
                </button>
              );
            })}
            <DropdownMenu
              trigger={`Perspective: ${perspectiveFilter ? perspectiveName(perspectiveFilter) : 'All'}`}
              shouldRenderToParent
            >
              <DropdownItemGroup>
                <DropdownItem isSelected={perspectiveFilter === null} onClick={() => setPerspectiveFilter(null)}>All</DropdownItem>
                {perspectives.map((p) => (
                  <DropdownItem key={p.id} isSelected={perspectiveFilter === p.id} onClick={() => setPerspectiveFilter(p.id)}>
                    {p.name}
                  </DropdownItem>
                ))}
              </DropdownItemGroup>
            </DropdownMenu>
          </div>

          {/* Canvas + docked inspector split.
              Height offset re-derived for StrataPageShell chrome: breadcrumb header
              (~52) + shell title row (~40) + context toolbar block (~65) + filters
              row (~40) + legend (~36) + page bottom padding (~24) ≈ 260. */}
          <div style={{ height: 'calc(100vh - 260px)', minHeight: 480 }}>
          <ResizablePanelGroup direction="horizontal">
          <ResizablePanel id="strata-map-canvas-panel" order={1} defaultSize={74} minSize={40} onResize={requestFit}>
          <div
            data-testid="strata-map-canvas"
            className="strata-flow"
            style={{
              position: 'relative',
              height: '100%',
              background: T.sunken,
              border: `1px solid ${T.border}`,
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeDragStop={onNodeDragStop}
              onNodeClick={onNodeClick}
              onConnect={onConnect}
              onPaneClick={() => setSelectedId(null)}
              fitView
            >
              <Background variant={BackgroundVariant.Dots} />
              <Controls />
              {/* MiniMap removed (CAT-STRATA-ADS-UPLIFT-20260706-001): custom
                * node types render it as a blank white panel that overlapped the
                * rightmost node card; a single-digit-node map needs no minimap. */}
              <FlowFitter fitViewRef={fitViewRef} inspectorOpen={selected != null} />
            </ReactFlow>
            {visibleElements.length === 0 ? (
              <div style={{
                position: 'absolute', inset: 0, zIndex: 5,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <EmptyState
                  size="compact"
                  header="No elements match the filters"
                  description="Clear a type or perspective filter to see the map."
                />
              </div>
            ) : null}
          </div>
          </ResizablePanel>

          {/* Inspector — docked resizable panel; renders only with a selection
              (no selection = canvas full width, no empty dock) */}
          {selected ? (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel id="strata-map-inspector-panel" order={2} defaultSize={26} minSize={22}>
              <div
                data-testid="strata-map-inspector"
                role="complementary"
                aria-label={`Inspector: ${selected.name}`}
                style={{
                  height: '100%', overflowY: 'auto', marginLeft: 8, padding: 16,
                  background: T.raised, border: `1px solid ${T.border}`, borderRadius: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, minWidth: 0 }}>
                    {SelectedIcon ? (
                      <span aria-hidden style={{ display: 'inline-flex', color: selectedMeta?.fg, marginTop: 4 }}>
                        <SelectedIcon size={16} />
                      </span>
                    ) : null}
                    <div style={{ minWidth: 0 }}>
                      <Heading as="h2" size="medium">{selected.name}</Heading>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <span style={{ fontSize: 'var(--ds-font-size-050)', fontWeight: 600, color: T.subtlest, letterSpacing: '0.04em' }}>
                          {labelize(selected.element_type)}
                        </span>
                        <Lozenge appearance={STATUS_APPEARANCE[selected.status] ?? 'default'}>{labelize(selected.status)}</Lozenge>
                      </span>
                    </div>
                  </div>
                  <IconButton
                    icon={<X size={16} />}
                    appearance="subtle"
                    spacing="compact"
                    aria-label="Close inspector"
                    onClick={() => setSelectedId(null)}
                  />
                </div>

                <InspectorRow k="Stage">{selected.stage ? labelize(selected.stage) : '—'}</InspectorRow>
                <InspectorRow k="Owner">{ownerName(selected.owner_id) ?? '—'}</InspectorRow>
                <InspectorRow k="Perspective">{perspectiveName(selected.perspective_id)}</InspectorRow>
                <InspectorRow k="Description">{selected.description ?? '—'}</InspectorRow>

                {selectedCharter !== null || selected.element_type === 'theme' ? (
                  <>
                    <h3 style={{
                      fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.subtlest,
                      letterSpacing: '0.04em', margin: '16px 0 4px',
                    }}>
                      Theme charter
                    </h3>
                    <InspectorRow k="Hypothesis">{selectedCharter?.hypothesis ?? '—'}</InspectorRow>
                    <InspectorRow k="Value thesis">{selectedCharter?.value_thesis ?? '—'}</InspectorRow>
                    <InspectorRow k="Scope">{selectedCharter?.scope ?? '—'}</InspectorRow>
                  </>
                ) : null}

                <h3 style={{
                  fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.subtlest,
                  letterSpacing: '0.04em', margin: '16px 0 4px',
                }}>
                  Linked KPIs
                </h3>
                {selectedKpiIds.length === 0 ? (
                  <span style={{ fontSize: 'var(--ds-font-size-200)', color: T.subtle }}>—</span>
                ) : (
                  selectedKpiIds.map((kpiId) => {
                    const kpi = kpiById.get(kpiId);
                    if (!kpi) return <span key={kpiId} style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>—</span>;
                    return (
                      <div key={kpiId}>
                        <Button
                          appearance="link"
                          spacing="compact"
                          isDisabled={!kpi.slug}
                          onClick={() => { if (kpi.slug) navigate(Routes.strata.kpi(kpi.slug)); }}
                        >
                          {kpi.name}
                        </Button>
                      </div>
                    );
                  })
                )}

                <h3 style={{
                  fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.subtlest,
                  letterSpacing: '0.04em', margin: '16px 0 4px',
                }}>
                  Incoming links ({incomingEdges.length})
                </h3>
                {incomingEdges.length === 0 ? (
                  <span style={{ fontSize: 'var(--ds-font-size-200)', color: T.subtle }}>—</span>
                ) : (
                  incomingEdges.map((e) => (
                    <div key={e.id} style={{ fontSize: 'var(--ds-font-size-200)', color: T.text, padding: '4px 0' }}>
                      {elementById.get(e.from_element_id)?.name ?? '—'}
                      <span style={{ color: T.subtlest }}>
                        {' '}· {labelize(e.relationship_type)}
                        {e.confidence != null ? ` · Confidence ${fmtRatioPct(e.confidence)}` : ''}
                      </span>
                    </div>
                  ))
                )}

                <h3 style={{
                  fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.subtlest,
                  letterSpacing: '0.04em', margin: '16px 0 4px',
                }}>
                  Outgoing links ({outgoingEdges.length})
                </h3>
                {outgoingEdges.length === 0 ? (
                  <span style={{ fontSize: 'var(--ds-font-size-200)', color: T.subtle }}>—</span>
                ) : (
                  outgoingEdges.map((e) => (
                    <div key={e.id} style={{ fontSize: 'var(--ds-font-size-200)', color: T.text, padding: '4px 0' }}>
                      {elementById.get(e.to_element_id)?.name ?? '—'}
                      <span style={{ color: T.subtlest }}>
                        {' '}· {labelize(e.relationship_type)}
                        {e.confidence != null ? ` · Confidence ${fmtRatioPct(e.confidence)}` : ''}
                      </span>
                    </div>
                  ))
                )}
              </div>
              </ResizablePanel>
            </>
          ) : null}
          </ResizablePanelGroup>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
            {legendPerspectives.map((p) => (
              <span
                key={p.id}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontSize: 'var(--ds-font-size-100)', color: T.subtle, whiteSpace: 'nowrap',
                }}
              >
                <span aria-hidden style={{
                  width: 10, height: 10, borderRadius: 2, flexShrink: 0,
                  background: perspectiveTone.get(p.id) ?? T.border,
                }} />
                {p.name}
              </span>
            ))}
            {legendPerspectives.length > 0 && relationshipTypes.length > 0 ? (
              <span aria-hidden style={{ alignSelf: 'stretch', borderLeft: `1px solid ${T.border}` }} />
            ) : null}
            {relationshipTypes.length > 0
              ? relationshipTypes.map((t) => (
                <span
                  key={t}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    fontSize: 'var(--ds-font-size-100)', color: T.subtle, whiteSpace: 'nowrap',
                  }}
                >
                  <EdgeSwatch />
                  {labelize(t)}
                </span>
              ))
              : <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>No relationship links yet</span>}
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 'var(--ds-font-size-100)', color: T.subtlest, whiteSpace: 'nowrap',
            }}>
              <EdgeSwatch dashed />
              Strong links animate (confidence 85%+)
            </span>
          </div>
        </>
      )}
    </StrataPageShell>
  );
}
