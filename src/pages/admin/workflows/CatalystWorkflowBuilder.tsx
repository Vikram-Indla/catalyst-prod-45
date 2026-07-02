import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getSmoothStepPath,
  type Node,
  type Edge,
  type Connection,
  type NodeProps,
  type EdgeProps,
  type OnConnect,
  type ReactFlowInstance,
  MarkerType,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import Spinner from '@atlaskit/spinner';
import { SectionMessage } from '@/components/ads/SectionMessage';
import {
  useTypeWorkflow,
  useAddTransition,
  useDeleteTransition,
  useSetInitialStatus,
  type WorkItemType,
  type TypeStatus,
} from '@/hooks/useTypeWorkflow';
import { useCreateStatus } from '@/hooks/useWorkflowStatuses';
import {
  STATUS_CATEGORY_COLORS,
  STATUS_CATEGORY_LABELS,
  type StatusCategory,
} from '@/constants/statusCategoryColors';

// ── Dark palette matching Jira Workflow Builder ─────────────────────────────
const DARK = {
  canvas: 'var(--ds-surface-sunken)',
  surface: 'var(--ds-surface)',
  surfaceHover: 'var(--ds-background-neutral)',
  border: 'var(--ds-border)',
  borderHover: 'var(--ds-background-information-bold)',
  text: 'var(--ds-border)',
  textSubtle: 'var(--ds-text-subtle)',
  textBrand: 'var(--ds-background-information-bold)',
  textDanger: 'var(--ds-text-danger)',
  nodeTodo: 'var(--ds-background-neutral)',
  nodeInProgress: 'var(--ds-background-information)',
  nodeDone: 'var(--ds-background-success)',
  nodeBorderTodo: 'var(--ds-border)',
  nodeBorderInProgress: 'var(--ds-border-focused)',
  nodeBorderDone: 'var(--ds-border)',
  textTodo: 'var(--ds-border)',
  textInProgress: 'var(--ds-text-brand)',
  textDone: 'var(--ds-background-success)',
  edge: 'var(--ds-border-bold)',
  edgeHover: 'var(--ds-background-information-bold)',
};

const NODE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  todo:        { bg: DARK.nodeTodo,        border: DARK.nodeBorderTodo,        text: DARK.textTodo },
  in_progress: { bg: DARK.nodeInProgress,  border: DARK.nodeBorderInProgress,  text: DARK.textInProgress },
  done:        { bg: DARK.nodeDone,        border: DARK.nodeBorderDone,        text: DARK.textDone },
};

// ── Status node ─────────────────────────────────────────────────────────────
export function StatusNode({ data, selected }: NodeProps) {
  const d = data as { name: string; category: string; isInitial: boolean; isCurrent?: boolean; readonly?: boolean };
  const colors = NODE_COLORS[d.category] ?? NODE_COLORS.todo;

  const borderColor = d.isCurrent
    ? 'var(--ds-link)'
    : selected
    ? DARK.borderHover
    : colors.border;

  const boxShadow = d.isCurrent
    ? '0 0 0 3px var(--ds-link, rgba(12,102,228,0.45)), 0 0 12px var(--ds-link, rgba(12,102,228,0.25))'
    : selected
    ? `0 0 0 2px ${DARK.borderHover}40`
    : 'none';

  return (
    <div
      style={{
        width: 160,
        padding: '8px 12px',
        borderRadius: 4,
        border: `1.5px solid ${borderColor}`,
        background: colors.bg,
        boxShadow,
        cursor: d.readonly ? 'default' : 'grab',
        position: 'relative',
        userSelect: 'none',
      }}
    >
      {/* Connection handles — appear on hover via CSS below */}
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: DARK.borderHover,
          border: `2px solid ${DARK.canvas}`,
          width: 10,
          height: 10,
          top: -5,
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: DARK.borderHover,
          border: `2px solid ${DARK.canvas}`,
          width: 10,
          height: 10,
          bottom: -5,
        }}
      />
      {/* Also left/right handles for multi-direction connections */}
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{
          background: DARK.borderHover,
          border: `2px solid ${DARK.canvas}`,
          width: 10,
          height: 10,
          right: -5,
        }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        style={{
          background: DARK.borderHover,
          border: `2px solid ${DARK.canvas}`,
          width: 10,
          height: 10,
          left: -5,
        }}
      />

      {d.isInitial && (
        <div style={{
          position: 'absolute',
          top: -16,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 'var(--ds-font-size-100)',
          fontWeight: 700,
          letterSpacing: '0.08em',
          color: DARK.textBrand,
          background: DARK.canvas,
          padding: '0px 5px',
          borderRadius: 2,
          whiteSpace: 'nowrap',
        }}>
          INITIAL
        </div>
      )}
      {d.isCurrent && (
        <div style={{
          position: 'absolute',
          bottom: -16,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 'var(--ds-font-size-100)',
          fontWeight: 700,
          letterSpacing: '0.08em',
          color: 'var(--ds-link)',
          background: DARK.canvas,
          padding: '0px 5px',
          borderRadius: 2,
          whiteSpace: 'nowrap',
        }}>
          CURRENT
        </div>
      )}

      <div style={{
        fontSize: 'var(--ds-font-size-100)',
        fontWeight: 600,
        letterSpacing: '0.06em',
        color: colors.text,
        textAlign: 'center',
        textTransform: 'uppercase',
        lineHeight: 1.2,
      }}>
        {d.name}
      </div>
    </div>
  );
}

// ── Start node ───────────────────────────────────────────────────────────────
export function StartNode(_: NodeProps) {
  return (
    <div style={{
      width: 48,
      height: 48,
      borderRadius: '50%',
      background: 'var(--ds-background-neutral-bold)',
      border: `2px solid var(--ds-border-bold)`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 'var(--ds-font-size-100)',
      fontWeight: 700,
      letterSpacing: '0.06em',
      color: 'var(--ds-border)',
    }}>
      START
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: DARK.borderHover,
          border: `2px solid ${DARK.canvas}`,
          width: 8,
          height: 8,
          bottom: -4,
        }}
      />
    </div>
  );
}

// ── Deletable edge ───────────────────────────────────────────────────────────
export function DeletableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  data,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
  });

  const onDelete = (data as any)?.onDelete as ((id: string) => void) | undefined;
  const [hovered, setHovered] = useState(false);

  const strokeColor = selected || hovered ? DARK.edgeHover : DARK.edge;

  return (
    <>
      {/* Wide invisible path for easier clicking */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={12}
        style={{ cursor: 'pointer' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />
      <BaseEdge
        path={edgePath}
        style={{
          stroke: strokeColor,
          strokeWidth: selected || hovered ? 2 : 1.5,
        }}
      />
      {(selected || hovered) && onDelete && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              zIndex: 10,
            }}
          >
            <button
              onClick={() => onDelete(id)}
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: DARK.textDanger,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 'var(--ds-font-size-100)',
                fontWeight: 700,
                color: 'var(--ds-text-inverse)',
                lineHeight: 1,
              }}
              title="Delete transition"
            >
              ×
            </button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const NODE_TYPES = { status: StatusNode, start: StartNode };
export const EDGE_TYPES = { deletable: DeletableEdge };

// ── Layout helper ─────────────────────────────────────────────────────────────
export function autoLayout(
  statuses: Array<{ id: string }>,
  transitions: Array<{ from_status_id: string | null; to_status_id: string }>,
  initialStatusId: string | null,
): Map<string, { x: number; y: number }> {
  const ids = statuses.map((s) => s.id);
  const idSet = new Set(ids);
  const adj = new Map<string, string[]>();
  for (const id of ids) adj.set(id, []);
  for (const t of transitions) {
    if (t.from_status_id && idSet.has(t.from_status_id) && idSet.has(t.to_status_id)) {
      adj.get(t.from_status_id)!.push(t.to_status_id);
    }
  }
  const layerMap = new Map<string, number>();
  const queue: string[] = [];
  const seed = initialStatusId && idSet.has(initialStatusId) ? initialStatusId : ids[0];
  if (seed) { layerMap.set(seed, 0); queue.push(seed); }
  while (queue.length) {
    const cur = queue.shift()!;
    const curLayer = layerMap.get(cur)!;
    for (const nxt of (adj.get(cur) ?? [])) {
      if (!layerMap.has(nxt)) { layerMap.set(nxt, curLayer + 1); queue.push(nxt); }
    }
  }
  let maxLayer = 0;
  for (const l of layerMap.values()) if (l > maxLayer) maxLayer = l;
  for (const id of ids) {
    if (!layerMap.has(id)) { layerMap.set(id, ++maxLayer); }
  }

  const layers = new Map<number, string[]>();
  for (const id of ids) {
    const l = layerMap.get(id)!;
    if (!layers.has(l)) layers.set(l, []);
    layers.get(l)!.push(id);
  }

  const NODE_W = 160;
  const NODE_H = 40;
  const H_GAP = 60;
  const V_GAP = 80;
  const posMap = new Map<string, { x: number; y: number }>();
  const sortedLayers = [...layers.keys()].sort((a, b) => a - b);
  const maxCols = Math.max(...[...layers.values()].map((a) => a.length));
  const totalW = maxCols * NODE_W + (maxCols - 1) * H_GAP;

  sortedLayers.forEach((layerNum, li) => {
    const group = layers.get(layerNum)!;
    const rowW = group.length * NODE_W + (group.length - 1) * H_GAP;
    const rowLeft = (totalW - rowW) / 2;
    const y = li * (NODE_H + V_GAP);
    group.forEach((id, i) => {
      posMap.set(id, { x: rowLeft + i * (NODE_W + H_GAP), y });
    });
  });

  return posMap;
}

// ── Main builder component ──────────────────────────────────────────────────
interface CatalystWorkflowBuilderProps {
  projectKey: string;
  workItemType: WorkItemType;
  /** Read-only view mode: no toolbar, no drag-to-connect, no edge deletion */
  readonly?: boolean;
  /** UUID of the current status — highlights the node with a blue glow */
  currentStatusId?: string;
}

export function CatalystWorkflowBuilder({
  projectKey,
  workItemType,
  readonly: isReadonly = false,
  currentStatusId,
}: CatalystWorkflowBuilderProps) {
  const { data: workflow, isLoading, isError, error, refetch } = useTypeWorkflow(projectKey, workItemType);
  const addTransition = useAddTransition(projectKey, workItemType);
  const deleteTransition = useDeleteTransition(projectKey, workItemType);
  const createStatus = useCreateStatus(projectKey);
  const setInitialStatus = useSetInitialStatus(projectKey, workItemType);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Add-status modal state
  const [addingStatus, setAddingStatus] = useState(false);
  const [newStatusName, setNewStatusName] = useState('');
  const [newStatusCat, setNewStatusCat] = useState<StatusCategory>('todo');
  const [addStatusLoading, setAddStatusLoading] = useState(false);
  const addStatusInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (addingStatus) setTimeout(() => addStatusInputRef.current?.focus(), 50); }, [addingStatus]);

  const rfInstance = useRef<ReactFlowInstance | null>(null);

  // Build nodes and edges from workflow data
  useEffect(() => {
    if (!workflow) return;
    const statuses = workflow.statuses;
    const transitions = workflow.transitions;
    const initialId = workflow.initialStatusId;

    const posMap = autoLayout(statuses, transitions, initialId);

    // START node
    const allNodes: Node[] = [
      {
        id: '__start__',
        type: 'start',
        position: { x: (posMap.values().next().value?.x ?? 80) + 56, y: -80 },
        data: {},
        draggable: !isReadonly,
        selectable: false,
      },
    ];

    for (const s of statuses) {
      const pos = posMap.get(s.id) ?? { x: 0, y: 0 };
      allNodes.push({
        id: s.id,
        type: 'status',
        position: pos,
        data: {
          name: s.name,
          category: s.category,
          isInitial: s.id === initialId,
          isCurrent: s.id === currentStatusId,
          readonly: isReadonly,
        },
        draggable: !isReadonly,
      });
    }

    const idSet = new Set(statuses.map((s) => s.id));

    const handleDelete = isReadonly
      ? undefined
      : (edgeId: string) => { deleteTransition.mutateAsync(edgeId); };

    const allEdges: Edge[] = [];

    // START → initial
    if (initialId) {
      allEdges.push({
        id: `__start__->${initialId}`,
        source: '__start__',
        target: initialId,
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed, color: DARK.edge, width: 16, height: 16 },
        style: { stroke: DARK.edge, strokeWidth: 1.5 },
        animated: false,
        selectable: false,
      });
    }

    for (const t of transitions) {
      if (!idSet.has(t.to_status_id)) continue;
      const sourceId = t.from_status_id ?? '__global__';
      const edgeId = t.id;
      allEdges.push({
        id: edgeId,
        source: t.from_status_id ?? '__start__',
        target: t.to_status_id,
        type: 'deletable',
        markerEnd: { type: MarkerType.ArrowClosed, color: DARK.edge, width: 14, height: 14 },
        style: { stroke: DARK.edge },
        data: { onDelete: handleDelete },
      });
    }

    setNodes(allNodes);
    setEdges(allEdges);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflow]);

  // When user connects two nodes → create transition
  const onConnect: OnConnect = useCallback(
    async (connection: Connection) => {
      const { source, target } = connection;
      if (!source || !target || source === '__start__' || target === '__start__') return;
      try {
        await addTransition.mutateAsync({
          fromStatusId: source === '__global__' ? null : source,
          toStatusId: target,
        });
      } catch (_) {
        // duplicate transition ignored
      }
    },
    [addTransition],
  );

  const submitAddStatus = async () => {
    const n = newStatusName.trim();
    if (!n) { setAddingStatus(false); return; }
    setAddStatusLoading(true);
    try {
      await createStatus.mutateAsync({
        name: n,
        category: newStatusCat,
        color: STATUS_CATEGORY_COLORS[newStatusCat],
        typeAssignments: [workItemType],
      });
      setNewStatusName('');
      setAddingStatus(false);
    } finally {
      setAddStatusLoading(false);
    }
  };

  // isError alone misses the persisted-cache case (status stays 'success' on
  // failed background refetch when hydrated data exists; only `error` is set).
  if (isError || error) {
    return (
      <div style={{ flex: 1, padding: '16px 24px', background: DARK.canvas }}>
        <div style={{ maxWidth: 720 }}>
          <SectionMessage
            appearance="error"
            title="Couldn't load this workflow"
            actions={[{ key: 'retry', text: 'Retry', onClick: () => refetch() }]}
          >
            {(error as Error)?.message ?? 'Unknown error loading workflow statuses.'}
          </SectionMessage>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, background: DARK.canvas }}>
        <Spinner size="medium" appearance="invert" />
      </div>
    );
  }

  const statuses = workflow?.statuses ?? [];
  const CATS: StatusCategory[] = ['todo', 'in_progress', 'done'];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: DARK.canvas }}>
      {/* Toolbar — hidden in readonly mode */}
      {!isReadonly && <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '8px 16px',
        background: DARK.surface,
        borderBottom: `1px solid ${DARK.border}`,
        flexShrink: 0,
      }}>
        {/* Add status button / inline form */}
        {addingStatus ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <select
              value={newStatusCat}
              onChange={(e) => setNewStatusCat(e.target.value as StatusCategory)}
              style={{
                fontSize: 'var(--ds-font-size-200)',
                height: 28,
                padding: '0 6px',
                borderRadius: 3,
                border: `1px solid ${DARK.border}`,
                background: DARK.nodeTodo,
                color: DARK.text,
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              {CATS.map((c) => (
                <option key={c} value={c}>{STATUS_CATEGORY_LABELS[c]}</option>
              ))}
            </select>
            <input
              ref={addStatusInputRef}
              value={newStatusName}
              onChange={(e) => setNewStatusName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitAddStatus();
                if (e.key === 'Escape') { setAddingStatus(false); setNewStatusName(''); }
              }}
              placeholder="Status name…"
              disabled={addStatusLoading}
              style={{
                height: 28,
                fontSize: 'var(--ds-font-size-200)',
                border: `1px solid ${DARK.border}`,
                borderRadius: 3,
                padding: '0 8px',
                fontFamily: 'inherit',
                color: DARK.text,
                background: DARK.nodeTodo,
                width: 160,
              }}
            />
            <button
              onClick={submitAddStatus}
              disabled={addStatusLoading || !newStatusName.trim()}
              style={{
                height: 28,
                padding: '0 10px',
                fontSize: 'var(--ds-font-size-200)',
                fontWeight: 500,
                border: 'none',
                borderRadius: 3,
                cursor: newStatusName.trim() ? 'pointer' : 'not-allowed',
                background: newStatusName.trim() ? 'var(--ds-link, var(--ds-link))' : DARK.border,
                color: 'var(--ds-text-inverse)',
                fontFamily: 'inherit',
              }}
            >
              {addStatusLoading ? '…' : 'Add'}
            </button>
            <button
              onClick={() => { setAddingStatus(false); setNewStatusName(''); }}
              style={{
                height: 28,
                padding: '0 8px',
                fontSize: 'var(--ds-font-size-200)',
                border: `1px solid ${DARK.border}`,
                borderRadius: 3,
                cursor: 'pointer',
                background: 'transparent',
                color: DARK.textSubtle,
                fontFamily: 'inherit',
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAddingStatus(true)}
            style={{
              height: 28,
              padding: '0 12px',
              fontSize: 'var(--ds-font-size-200)',
              fontWeight: 500,
              border: `1px solid ${DARK.border}`,
              borderRadius: 3,
              cursor: 'pointer',
              background: 'transparent',
              color: DARK.text,
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="4" width="12" height="6" rx="1.5" stroke={DARK.text} strokeWidth="1.2"/>
            </svg>
            Add status
          </button>
        )}

        <div style={{
          marginLeft: 8,
          padding: '0 8px',
          height: 20,
          borderLeft: `1px solid ${DARK.border}`,
          display: 'flex',
          alignItems: 'center',
        }}>
          <span style={{ fontSize: 'var(--ds-font-size-100)', color: DARK.textSubtle }}>
            Drag handles to connect • Click edge × to delete
          </span>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 'var(--ds-font-size-100)', color: DARK.textSubtle }}>
            {statuses.length} statuses • {workflow?.transitions.length ?? 0} transitions
          </span>
        </div>
      </div>}

      {/* React Flow canvas */}
      <div style={{ flex: 1, position: 'relative' }}>
        <style>{`
          .react-flow__handle {
            opacity: 0;
            transition: opacity 0.15s;
          }
          .react-flow__node:hover .react-flow__handle,
          .react-flow__node.selected .react-flow__handle {
            opacity: 1;
          }
          .react-flow__handle:hover {
            opacity: 1 !important;
            transform: scale(1.3);
          }
          .react-flow__background {
            background: ${DARK.canvas};
          }
          .react-flow__controls {
            background: ${DARK.surface};
            border: 1px solid ${DARK.border};
            border-radius: 4px;
            box-shadow: none;
          }
          .react-flow__controls-button {
            background: ${DARK.surface};
            border-bottom: 0px solid ${DARK.border};
            fill: ${DARK.text};
          }
          .react-flow__controls-button:hover {
            background: ${DARK.surfaceHover};
          }
          .react-flow__controls-button svg {
            fill: ${DARK.text};
          }
          .react-flow__minimap {
            background: ${DARK.surface} !important;
            border: 1px solid ${DARK.border};
            border-radius: 4px;
          }
          .react-flow__attribution {
            display: none;
          }
        `}</style>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={isReadonly ? undefined : onConnect}
          nodeTypes={NODE_TYPES}
          edgeTypes={EDGE_TYPES}
          nodesConnectable={!isReadonly}
          nodesDraggable={!isReadonly}
          onInit={(instance) => {
            rfInstance.current = instance;
            instance.fitView({ padding: 0.2 });
          }}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          defaultEdgeOptions={{
            type: 'deletable',
            markerEnd: { type: MarkerType.ArrowClosed, color: DARK.edge, width: 14, height: 14 },
            style: { stroke: DARK.edge },
          }}
          deleteKeyCode={null}
          style={{ background: DARK.canvas }}
          proOptions={{ hideAttribution: true }}
        >
          <Background color={DARK.border} gap={24} size={1} />
          <Controls showInteractive={false} />
          <MiniMap
            nodeColor={(n) => {
              const cat = (n.data as any)?.category as string;
              return NODE_COLORS[cat]?.bg ?? DARK.surface;
            }}
            maskColor={`${DARK.canvas}CC`}
            style={{ bottom: 16, right: 16 }}
          />
        </ReactFlow>
      </div>
    </div>
  );
}
