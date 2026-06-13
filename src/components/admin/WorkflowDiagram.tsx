import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Button from '@atlaskit/button/new';
import Tooltip from '@atlaskit/tooltip';
import { computeDiagramLayout, DIAGRAM_NODE_WIDTH, DIAGRAM_NODE_HEIGHT } from './diagramLayout';
import { STATUS_CATEGORY_COLORS, type StatusCategory } from '@/constants/statusCategoryColors';
import type { TypeStatus, Transition } from '@/hooks/useTypeWorkflow';

interface WorkflowDiagramProps {
  statuses: TypeStatus[];
  transitions: Transition[];
  initialStatusId: string | null;
  onDeleteTransition: (id: string, isGlobal: boolean) => void;
  onAddTransition: (fromStatusId: string | null, toStatusId: string) => void;
}

interface DragState {
  nodeId: string;
  startNodeX: number;
  startNodeY: number;
  startMouseX: number;
  startMouseY: number;
}

interface SelectedEdge {
  transition: Transition;
}

type AddMode = { step: 'source' } | { step: 'destination'; sourceId: string };

const GLOBAL_NODE_ID = '__global__';
const CANVAS_PAD = 40;

function arrowPath(x1: number, y1: number, x2: number, y2: number): string {
  const mx = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`;
}

export function WorkflowDiagram({
  statuses,
  transitions,
  initialStatusId,
  onDeleteTransition,
  onAddTransition,
}: WorkflowDiagramProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const [selectedEdge, setSelectedEdge] = useState<SelectedEdge | null>(null);
  const [addMode, setAddMode] = useState<AddMode | null>(null);
  const [panDrag, setPanDrag] = useState<{ startX: number; startY: number; startPan: { x: number; y: number } } | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const basePositions = useMemo(
    () => computeDiagramLayout(statuses, transitions, initialStatusId),
    [statuses, transitions, initialStatusId]
  );

  // Initialise / reset node positions when statuses change
  useEffect(() => {
    const map: Record<string, { x: number; y: number }> = {};
    for (const pos of basePositions) {
      map[pos.id] = { x: pos.x, y: pos.y };
    }
    setNodePositions(map);
  }, [basePositions]);

  const canvasWidth  = useMemo(() => {
    const xs = Object.values(nodePositions).map((p) => p.x);
    return xs.length ? Math.max(...xs) + DIAGRAM_NODE_WIDTH + CANVAS_PAD : 800;
  }, [nodePositions]);

  const canvasHeight = useMemo(() => {
    const ys = Object.values(nodePositions).map((p) => p.y);
    return ys.length ? Math.max(...ys) + DIAGRAM_NODE_HEIGHT + CANVAS_PAD : 500;
  }, [nodePositions]);

  const statusMap = useMemo(() => new Map(statuses.map((s) => [s.id, s])), [statuses]);

  // Reachability check — flood from initial
  const reachable = useMemo(() => {
    if (!initialStatusId) return new Set<string>();
    const visited = new Set<string>();
    const queue = [initialStatusId];
    const adj = new Map<string, string[]>();
    for (const t of transitions) {
      if (t.from_status_id !== null && t.work_item_type !== null) {
        if (!adj.has(t.from_status_id)) adj.set(t.from_status_id, []);
        adj.get(t.from_status_id)!.push(t.to_status_id);
      }
    }
    // global transitions contribute to reachability too (from any status)
    const globalTos = transitions.filter((t) => t.from_status_id === null).map((t) => t.to_status_id);
    while (queue.length) {
      const cur = queue.shift()!;
      if (visited.has(cur)) continue;
      visited.add(cur);
      for (const nb of (adj.get(cur) ?? [])) queue.push(nb);
      for (const nb of globalTos) if (!visited.has(nb)) queue.push(nb);
    }
    return visited;
  }, [statuses, transitions, initialStatusId]);

  // Node drag
  function startNodeDrag(e: React.MouseEvent, nodeId: string) {
    if (addMode) return;
    e.stopPropagation();
    const pos = nodePositions[nodeId];
    dragRef.current = {
      nodeId,
      startNodeX: pos.x,
      startNodeY: pos.y,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
    };
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (dragRef.current) {
      const dx = (e.clientX - dragRef.current.startMouseX) / zoom;
      const dy = (e.clientY - dragRef.current.startMouseY) / zoom;
      setNodePositions((prev) => ({
        ...prev,
        [dragRef.current!.nodeId]: {
          x: Math.max(0, dragRef.current!.startNodeX + dx),
          y: Math.max(0, dragRef.current!.startNodeY + dy),
        },
      }));
      return;
    }
    if (panDrag) {
      const dx = e.clientX - panDrag.startX;
      const dy = e.clientY - panDrag.startY;
      setPan({ x: panDrag.startPan.x + dx, y: panDrag.startPan.y + dy });
    }
  }

  function handleMouseUp() {
    dragRef.current = null;
    setPanDrag(null);
  }

  function handleSvgMouseDown(e: React.MouseEvent) {
    if ((e.target as Element).closest('[data-node]')) return;
    if (addMode) return;
    setPanDrag({ startX: e.clientX, startY: e.clientY, startPan: pan });
  }

  function handleNodeClick(nodeId: string) {
    if (!addMode) return;
    if (addMode.step === 'source') {
      if (nodeId === GLOBAL_NODE_ID) {
        setAddMode({ step: 'destination', sourceId: GLOBAL_NODE_ID });
      } else {
        setAddMode({ step: 'destination', sourceId: nodeId });
      }
    } else {
      if (nodeId === addMode.sourceId) {
        setAddMode(null);
        return;
      }
      if (nodeId === GLOBAL_NODE_ID) {
        setAddMode(null);
        return;
      }
      const fromId = addMode.sourceId === GLOBAL_NODE_ID ? null : addMode.sourceId;
      const dup = transitions.find(
        (t) => t.from_status_id === fromId && t.to_status_id === nodeId
      );
      if (dup) {
        setAddMode(null);
        return;
      }
      onAddTransition(fromId, nodeId);
      setAddMode(null);
    }
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setAddMode(null);
        setSelectedEdge(null);
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedEdge) {
        const t = selectedEdge.transition;
        const isGlobal = t.work_item_type === null || t.from_status_id === null;
        onDeleteTransition(t.id, isGlobal);
        setSelectedEdge(null);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedEdge, onDeleteTransition]);

  function autoLayout() {
    const map: Record<string, { x: number; y: number }> = {};
    for (const pos of basePositions) {
      map[pos.id] = { x: pos.x, y: pos.y };
    }
    setNodePositions(map);
    setPan({ x: 0, y: 0 });
    setZoom(1);
  }

  function renderEdges() {
    return transitions.map((t) => {
      const isGlobal = t.from_status_id === null;
      const fromPos = isGlobal
        ? nodePositions[GLOBAL_NODE_ID]
        : nodePositions[t.from_status_id!];
      const toPos = nodePositions[t.to_status_id];
      if (!fromPos || !toPos) return null;

      const x1 = fromPos.x + DIAGRAM_NODE_WIDTH;
      const y1 = fromPos.y + DIAGRAM_NODE_HEIGHT / 2;
      const x2 = toPos.x;
      const y2 = toPos.y + DIAGRAM_NODE_HEIGHT / 2;

      const isSelected = selectedEdge?.transition.id === t.id;
      const color = isGlobal ? '#D97706' : (isSelected ? 'var(--ds-link, #0052CC)' : 'var(--ds-border, #DFE1E6)');

      return (
        <g key={t.id}>
          <path
            d={arrowPath(x1, y1, x2, y2)}
            fill="none"
            stroke={color}
            strokeWidth={isSelected ? 2.5 : 1.5}
            strokeDasharray={isGlobal ? '6 3' : undefined}
            markerEnd={`url(#arrow-${isGlobal ? 'global' : isSelected ? 'selected' : 'default'})`}
            style={{ cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedEdge(isSelected ? null : { transition: t });
            }}
          />
          {/* Hit area */}
          <path
            d={arrowPath(x1, y1, x2, y2)}
            fill="none"
            stroke="transparent"
            strokeWidth={12}
            style={{ cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedEdge(isSelected ? null : { transition: t });
            }}
          />
        </g>
      );
    });
  }

  function renderNodes() {
    const nodes = statuses.map((status) => {
      const pos = nodePositions[status.id];
      if (!pos) return null;
      const catColor = STATUS_CATEGORY_COLORS[status.category as StatusCategory] ?? '#64748B';
      const isInitial = status.id === initialStatusId;
      const isUnreachable = !reachable.has(status.id);
      const isAddSource = addMode?.step === 'destination' && (addMode as { step: 'destination'; sourceId: string }).sourceId === status.id;
      const isAddTarget = addMode?.step === 'destination';

      return (
        <g
          key={status.id}
          transform={`translate(${pos.x}, ${pos.y})`}
          data-node={status.id}
          style={{ cursor: addMode ? 'pointer' : 'grab' }}
          onMouseDown={(e) => startNodeDrag(e, status.id)}
          onClick={() => handleNodeClick(status.id)}
        >
          <rect
            width={DIAGRAM_NODE_WIDTH}
            height={DIAGRAM_NODE_HEIGHT}
            rx={4}
            fill="var(--ds-surface, #FFFFFF)"
            stroke={isAddSource ? catColor : isAddTarget ? 'var(--ds-border-focused, #388BFF)' : catColor}
            strokeWidth={isAddSource || isAddTarget ? 2 : 1.5}
          />
          {/* Category strip */}
          <rect
            width={4}
            height={DIAGRAM_NODE_HEIGHT}
            rx={2}
            fill={catColor}
          />
          {/* Label */}
          <text
            x={14}
            y={DIAGRAM_NODE_HEIGHT / 2 + 5}
            fontSize={12}
            fontFamily="var(--ds-font-family-body, 'Atlassian Sans', sans-serif)"
            fill="var(--ds-text, #172B4D)"
            clipPath={`url(#clip-${status.id})`}
          >
            {status.name}
          </text>
          <clipPath id={`clip-${status.id}`}>
            <rect x={14} y={0} width={DIAGRAM_NODE_WIDTH - 20} height={DIAGRAM_NODE_HEIGHT} />
          </clipPath>
          {/* Unreachable dot */}
          {isUnreachable && (
            <Tooltip content="No inbound transition — unreachable from the initial status">
              {/* Tooltip wrapper doesn't work directly in SVG; we use title element */}
              <circle cx={DIAGRAM_NODE_WIDTH - 10} cy={10} r={5} fill="#DC2626">
                <title>No inbound transition — unreachable from the initial status</title>
              </circle>
            </Tooltip>
          )}
          {/* Initial marker (dot on left side) */}
          {isInitial && (
            <circle cx={-8} cy={DIAGRAM_NODE_HEIGHT / 2} r={5} fill="var(--ds-text, #172B4D)" />
          )}
        </g>
      );
    });

    // Global "Any status · global" node
    const gpos = nodePositions[GLOBAL_NODE_ID];
    if (gpos) {
      const isHighlighted =
        addMode?.step === 'destination' &&
        (addMode as { step: 'destination'; sourceId: string }).sourceId === GLOBAL_NODE_ID;
      nodes.push(
        <g
          key={GLOBAL_NODE_ID}
          transform={`translate(${gpos.x}, ${gpos.y})`}
          data-node={GLOBAL_NODE_ID}
          style={{ cursor: addMode ? 'pointer' : 'grab' }}
          onMouseDown={(e) => startNodeDrag(e, GLOBAL_NODE_ID)}
          onClick={() => handleNodeClick(GLOBAL_NODE_ID)}
        >
          <rect
            width={DIAGRAM_NODE_WIDTH}
            height={DIAGRAM_NODE_HEIGHT}
            rx={4}
            fill="transparent"
            stroke="#D97706"
            strokeWidth={1.5}
            strokeDasharray="6 3"
          />
          <text
            x={DIAGRAM_NODE_WIDTH / 2}
            y={DIAGRAM_NODE_HEIGHT / 2 + 5}
            fontSize={11}
            textAnchor="middle"
            fontFamily="var(--ds-font-family-body, 'Atlassian Sans', sans-serif)"
            fill="#D97706"
          >
            Any status · global
          </text>
        </g>
      );
    }

    return nodes;
  }

  const fromStatus = selectedEdge
    ? (selectedEdge.transition.from_status_id
        ? statusMap.get(selectedEdge.transition.from_status_id)?.name ?? '—'
        : 'Any status')
    : null;
  const toStatus = selectedEdge
    ? (statusMap.get(selectedEdge.transition.to_status_id)?.name ?? '—')
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 480 }}>
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 16px',
          borderBottom: '1px solid var(--ds-border, #DFE1E6)',
          background: 'var(--ds-background-neutral-subtle, #F7F8F9)',
          flexWrap: 'wrap',
        }}
      >
        <Button
          appearance="subtle"
          spacing="compact"
          onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
        >−</Button>
        <span style={{ fontSize: 12, color: 'var(--ds-text-subtle, #42526E)', minWidth: 36, textAlign: 'center' }}>
          {Math.round(zoom * 100)}%
        </span>
        <Button
          appearance="subtle"
          spacing="compact"
          onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
        >Fit</Button>
        <Button
          appearance="subtle"
          spacing="compact"
          onClick={() => setZoom((z) => Math.min(1.6, z + 0.1))}
        >+</Button>
        <div style={{ width: 1, height: 20, background: 'var(--ds-border, #DFE1E6)', margin: '0 4px' }} />
        <Button
          appearance="subtle"
          spacing="compact"
          onClick={autoLayout}
        >Auto-layout</Button>
        <Button
          appearance={addMode ? 'primary' : 'subtle'}
          spacing="compact"
          onClick={() => setAddMode(addMode ? null : { step: 'source' })}
        >
          {addMode
            ? addMode.step === 'source'
              ? 'Pick source…'
              : 'Pick destination…'
            : 'Add transition'}
        </Button>
        {addMode && (
          <Button appearance="subtle" spacing="compact" onClick={() => setAddMode(null)}>
            Cancel (Esc)
          </Button>
        )}

        {/* Edge toolbar */}
        {selectedEdge && (
          <>
            <div style={{ width: 1, height: 20, background: 'var(--ds-border, #DFE1E6)', margin: '0 4px' }} />
            <span style={{ fontSize: 12, color: 'var(--ds-text, #172B4D)' }}>
              {fromStatus} → {toStatus}
            </span>
            <Button
              appearance="danger"
              spacing="compact"
              onClick={() => {
                const t = selectedEdge.transition;
                const isGlobal = t.work_item_type === null || t.from_status_id === null;
                onDeleteTransition(t.id, isGlobal);
                setSelectedEdge(null);
              }}
            >
              Delete
            </Button>
          </>
        )}
      </div>

      {/* Canvas */}
      <div
        style={{
          flex: 1,
          overflow: 'hidden',
          cursor: panDrag ? 'grabbing' : 'grab',
          background: 'var(--ds-surface-sunken, #F7F8F9)',
          userSelect: 'none',
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox={`${-pan.x / zoom} ${-pan.y / zoom} ${canvasWidth / zoom} ${canvasHeight / zoom}`}
          style={{ display: 'block' }}
          onMouseDown={handleSvgMouseDown}
          onClick={() => { setSelectedEdge(null); }}
        >
          <defs>
            <marker id="arrow-default" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0,10 3.5,0 7" fill="var(--ds-border, #DFE1E6)" />
            </marker>
            <marker id="arrow-selected" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0,10 3.5,0 7" fill="var(--ds-link, #0052CC)" />
            </marker>
            <marker id="arrow-global" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0,10 3.5,0 7" fill="#D97706" />
            </marker>
          </defs>

          {/* Start dot + line to initial status */}
          {initialStatusId && nodePositions[initialStatusId] && (
            <>
              <circle
                cx={nodePositions[initialStatusId].x - 20}
                cy={nodePositions[initialStatusId].y + DIAGRAM_NODE_HEIGHT / 2}
                r={6}
                fill="var(--ds-text, #172B4D)"
              />
              <line
                x1={nodePositions[initialStatusId].x - 14}
                y1={nodePositions[initialStatusId].y + DIAGRAM_NODE_HEIGHT / 2}
                x2={nodePositions[initialStatusId].x}
                y2={nodePositions[initialStatusId].y + DIAGRAM_NODE_HEIGHT / 2}
                stroke="var(--ds-text, #172B4D)"
                strokeWidth={1.5}
                markerEnd="url(#arrow-default)"
              />
            </>
          )}

          {renderEdges()}
          {renderNodes()}
        </svg>
      </div>
    </div>
  );
}
