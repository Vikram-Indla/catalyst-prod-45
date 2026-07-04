/**
 * STRATA Strategy Map Canvas — /strata/strategy/map (CAT-STRATA-20260705-001).
 * Cause-and-effect canvas over strata_strategy_elements/strata_map_edges via
 * @xyflow/react. Positions persist server-side (strategyApi.updateMapPosition);
 * edge creation goes through strategyApi.createEdge. UI computes nothing.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Background, BackgroundVariant, Controls, MiniMap, ReactFlow,
  useEdgesState, useNodesState,
} from '@xyflow/react';
import type { Connection, Edge, Node } from '@xyflow/react';
// ads-scanner:ignore-next-line — @xyflow canvas library stylesheet, third-party requirement (no ADS equivalent, probed 2026-07-05)
import '@xyflow/react/dist/style.css';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import { Button, EmptyState, Lozenge, SectionMessage } from '@/components/ads';
import { PageContainer } from '@/components/shared/PageContainer';
import { Routes } from '@/lib/routes';
import {
  useElementKpis, useInvalidateStrata, useKpis, useMapEdges, usePerspectives,
  usePlayCharters, useStrataContext, useStrategyElements,
} from '@/modules/strata/hooks/useStrata';
import { strategyApi } from '@/modules/strata/domain';
import { StrataConfigContextBar } from '@/modules/strata/components/shared';
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
const TIER_Y: Record<string, number> = { theme: 0, play: 200, objective: 400 };

const sentenceCase = (s: string): string =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : s;

const chipStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center',
  padding: '4px 8px', borderRadius: 4,
  background: 'var(--ds-background-neutral)', color: 'var(--ds-text-subtle)',
  fontSize: 11, fontWeight: 600, border: 'none', cursor: 'default',
};

function NodeLabel({ el }: { el: StrataStrategyElement }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start', textAlign: 'left' }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ds-text)' }}>{el.name}</span>
      <span style={{ fontSize: 11, color: 'var(--ds-text-subtlest)' }}>{sentenceCase(el.element_type)}</span>
      <Lozenge appearance={STATUS_APPEARANCE[el.status] ?? 'default'}>{sentenceCase(el.status)}</Lozenge>
    </div>
  );
}

function InspectorRow({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--ds-border)' }}>
      <span style={{ width: 110, flexShrink: 0, fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtle)' }}>{k}</span>
      <span style={{ fontSize: 13, color: 'var(--ds-text)', minWidth: 0, overflowWrap: 'anywhere' }}>{children}</span>
    </div>
  );
}

export default function StrataStrategyMapPage() {
  const navigate = useNavigate();
  const { activeCycle, isLoading: contextLoading } = useStrataContext();
  const elementsQ = useStrategyElements(activeCycle?.id);
  const edgesQ = useMapEdges(activeCycle?.id);
  const chartersQ = usePlayCharters();
  const elementKpisQ = useElementKpis();
  const kpisQ = useKpis();
  const perspectivesQ = usePerspectives();
  const invalidate = useInvalidateStrata();

  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set());
  const [perspectiveFilter, setPerspectiveFilter] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [positionSaveFailed, setPositionSaveFailed] = useState(false);
  const [edgeError, setEdgeError] = useState<string | null>(null);

  const elements = useMemo(() => elementsQ.data ?? [], [elementsQ.data]);
  const mapEdges = useMemo(() => edgesQ.data ?? [], [edgesQ.data]);
  const perspectives = perspectivesQ.data ?? [];
  const charters = chartersQ.data ?? [];
  const elementKpis = elementKpisQ.data ?? [];
  const kpis = kpisQ.data ?? [];

  const elementById = useMemo(() => new Map(elements.map((e) => [e.id, e])), [elements]);
  const kpiById = useMemo(() => new Map(kpis.map((k) => [k.id, k])), [kpis]);
  const perspectiveName = (id: string | null): string =>
    (id ? perspectives.find((p) => p.id === id)?.name : null) ?? '—';

  const distinctTypes = useMemo(
    () => Array.from(new Set(elements.map((e) => e.element_type))),
    [elements],
  );
  const relationshipTypes = useMemo(
    () => Array.from(new Set(mapEdges.map((e) => e.relationship_type))),
    [mapEdges],
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
      return {
        id: el.id,
        position,
        data: { label: <NodeLabel el={el} /> },
        style: {
          background: 'var(--ds-surface-raised)',
          border: '1px solid var(--ds-border)',
          borderRadius: 8,
          padding: 12,
          minWidth: 160,
          width: 'auto',
        },
      } satisfies Node;
    });
  }, [visibleElements]);

  const derivedEdges = useMemo<Edge[]>(() => {
    const visibleIds = new Set(visibleElements.map((e) => e.id));
    return mapEdges
      .filter((e) => visibleIds.has(e.from_element_id) && visibleIds.has(e.to_element_id))
      .map((e) => ({
        id: e.id,
        source: e.from_element_id,
        target: e.to_element_id,
        label: e.relationship_type,
        animated: (e.confidence ?? 0) >= ANIMATED_CONFIDENCE,
      }));
  }, [mapEdges, visibleElements]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  useEffect(() => { setNodes(derivedNodes); }, [derivedNodes, setNodes]);
  useEffect(() => { setEdges(derivedEdges); }, [derivedEdges, setEdges]);

  const onNodeDragStop = useCallback((_event: unknown, node: Node) => {
    // Fire-and-forget persistence; the DB stays the source of truth.
    strategyApi
      .updateMapPosition(node.id, { x: Math.round(node.position.x), y: Math.round(node.position.y) })
      .catch(() => setPositionSaveFailed(true));
  }, []);

  const onConnect = useCallback((connection: Connection) => {
    if (!activeCycle || !connection.source || !connection.target) return;
    setEdgeError(null);
    strategyApi
      .createEdge({
        cycle_id: activeCycle.id,
        from_element_id: connection.source,
        to_element_id: connection.target,
        relationship_type: 'drives',
      })
      .then(() => invalidate())
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
  const selectedCharter = selected && selected.element_type === 'play'
    ? charters.find((c) => c.element_id === selected.id) ?? null
    : null;
  const selectedKpiIds = selected
    ? elementKpis.filter((l) => l.element_id === selected.id).map((l) => l.kpi_id)
    : [];
  const incomingEdges = selected ? mapEdges.filter((e) => e.to_element_id === selected.id) : [];
  const outgoingEdges = selected ? mapEdges.filter((e) => e.from_element_id === selected.id) : [];

  const isLoading = contextLoading || elementsQ.isLoading || edgesQ.isLoading;

  return (
    <PageContainer variant="wide">
      <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--ds-text)', margin: '0 0 8px' }}>Strategy Map</h1>
      <StrataConfigContextBar
        extra={
          <Button appearance="subtle" spacing="compact" onClick={() => navigate(Routes.strata.strategy())}>
            Back to Strategy Room
          </Button>
        }
      />

      {isLoading ? (
        <div style={{ padding: 32, color: 'var(--ds-text-subtle)' }}>Loading strategy map…</div>
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
          description="This cycle has no strategy elements. Draft themes, plays and objectives in the Strategy Room first."
          primaryAction={<Button appearance="primary" onClick={() => navigate(Routes.strata.strategy())}>Open Strategy Room</Button>}
        />
      ) : (
        <>
          {positionSaveFailed ? (
            <div style={{ marginBottom: 12 }}>
              <SectionMessage appearance="warning" title="Read-only">
                <p>Map positions could not be saved — your layout changes are local to this session only.</p>
              </SectionMessage>
            </div>
          ) : null}
          {edgeError ? (
            <div style={{ marginBottom: 12 }}>
              <SectionMessage appearance="error" title="Could not create link">
                <p>{edgeError}</p>
              </SectionMessage>
            </div>
          ) : null}

          {/* Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {distinctTypes.map((t) => {
              const active = !hiddenTypes.has(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleType(t)}
                  aria-pressed={active}
                  style={{
                    ...chipStyle,
                    cursor: 'pointer',
                    background: active ? 'var(--ds-background-selected)' : 'var(--ds-background-neutral-subtle)',
                    color: active ? 'var(--ds-text-selected)' : 'var(--ds-text-subtlest)',
                  }}
                >
                  {sentenceCase(t)}
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

          {/* Canvas */}
          <div
            data-testid="strata-map-canvas"
            style={{
              height: 'calc(100vh - 240px)',
              background: 'var(--ds-surface-sunken)',
              border: '1px solid var(--ds-border)',
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
              <MiniMap />
            </ReactFlow>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            {relationshipTypes.length > 0
              ? relationshipTypes.map((t) => <span key={t} style={chipStyle}>{sentenceCase(t)}</span>)
              : <span style={{ fontSize: 12, color: 'var(--ds-text-subtlest)' }}>No relationship links yet</span>}
            <span style={{ fontSize: 12, color: 'var(--ds-text-subtlest)' }}>
              animated = confidence ≥ {ANIMATED_CONFIDENCE}
            </span>
          </div>

          {/* Inspector */}
          {selected ? (
            <div
              data-testid="strata-map-inspector"
              style={{
                position: 'fixed', top: 96, right: 24, bottom: 24, width: 360, zIndex: 20,
                overflowY: 'auto',
                background: 'var(--ds-surface-raised)',
                boxShadow: 'var(--ds-shadow-overlay)',
                border: '1px solid var(--ds-border)',
                borderRadius: 8,
                padding: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ds-text)', margin: 0 }}>{selected.name}</h2>
                  <span style={{ fontSize: 11, color: 'var(--ds-text-subtlest)' }}>{sentenceCase(selected.element_type)}</span>
                </div>
                <Button appearance="subtle" spacing="compact" onClick={() => setSelectedId(null)}>Close</Button>
              </div>

              <InspectorRow k="Status">
                <Lozenge appearance={STATUS_APPEARANCE[selected.status] ?? 'default'}>{sentenceCase(selected.status)}</Lozenge>
              </InspectorRow>
              <InspectorRow k="Stage">{selected.stage ? sentenceCase(selected.stage) : '—'}</InspectorRow>
              <InspectorRow k="Owner">
                {selected.owner_id ? <span title={selected.owner_id}>{`${selected.owner_id.slice(0, 8)}…`}</span> : '—'}
              </InspectorRow>
              <InspectorRow k="Perspective">{perspectiveName(selected.perspective_id)}</InspectorRow>
              <InspectorRow k="Description">{selected.description ?? '—'}</InspectorRow>

              {selectedCharter !== null || selected.element_type === 'play' ? (
                <>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--ds-text-subtle)', margin: '16px 0 4px' }}>
                    Play charter
                  </h3>
                  <InspectorRow k="Hypothesis">{selectedCharter?.hypothesis ?? '—'}</InspectorRow>
                  <InspectorRow k="Value thesis">{selectedCharter?.value_thesis ?? '—'}</InspectorRow>
                  <InspectorRow k="Scope">{selectedCharter?.scope ?? '—'}</InspectorRow>
                </>
              ) : null}

              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--ds-text-subtle)', margin: '16px 0 4px' }}>
                Linked KPIs
              </h3>
              {selectedKpiIds.length === 0 ? (
                <span style={{ fontSize: 13, color: 'var(--ds-text-subtle)' }}>—</span>
              ) : (
                selectedKpiIds.map((kpiId) => {
                  const kpi = kpiById.get(kpiId);
                  if (!kpi) return <span key={kpiId} style={{ fontSize: 12, color: 'var(--ds-text-subtlest)' }}>—</span>;
                  return (
                    <div key={kpiId}>
                      <Button
                        appearance="subtle"
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

              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--ds-text-subtle)', margin: '16px 0 4px' }}>
                Incoming links ({incomingEdges.length})
              </h3>
              {incomingEdges.length === 0 ? (
                <span style={{ fontSize: 13, color: 'var(--ds-text-subtle)' }}>—</span>
              ) : (
                incomingEdges.map((e) => (
                  <div key={e.id} style={{ fontSize: 13, color: 'var(--ds-text)', padding: '4px 0' }}>
                    {elementById.get(e.from_element_id)?.name ?? '—'}
                    <span style={{ color: 'var(--ds-text-subtlest)' }}>
                      {' '}· {sentenceCase(e.relationship_type)} · {e.confidence != null ? `confidence ${e.confidence}` : '—'}
                    </span>
                  </div>
                ))
              )}

              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--ds-text-subtle)', margin: '16px 0 4px' }}>
                Outgoing links ({outgoingEdges.length})
              </h3>
              {outgoingEdges.length === 0 ? (
                <span style={{ fontSize: 13, color: 'var(--ds-text-subtle)' }}>—</span>
              ) : (
                outgoingEdges.map((e) => (
                  <div key={e.id} style={{ fontSize: 13, color: 'var(--ds-text)', padding: '4px 0' }}>
                    {elementById.get(e.to_element_id)?.name ?? '—'}
                    <span style={{ color: 'var(--ds-text-subtlest)' }}>
                      {' '}· {sentenceCase(e.relationship_type)} · {e.confidence != null ? `confidence ${e.confidence}` : '—'}
                    </span>
                  </div>
                ))
              )}
            </div>
          ) : null}
        </>
      )}
    </PageContainer>
  );
}
