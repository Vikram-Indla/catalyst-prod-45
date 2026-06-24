/**
 * Dependency canvas (React Flow v12) — Jira Plans dependency-report style.
 *
 * Canvas-first: fills the surface. Flat background, status swimlane frames,
 * rich issue cards, smooth edges with on-hover delete, a toolbar (count + Add
 * dependency), and a bottom-right zoom bar (− / % / + / Fit / Zoom on scroll).
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  useReactFlow,
  useViewport,
  Handle,
  Position,
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  Node,
  Edge,
  MarkerType,
  type EdgeProps,
} from '@xyflow/react';
// ads-scanner:ignore-next-line — React Flow's stylesheet is required for the canvas to render
import '@xyflow/react/dist/style.css';
import { Plus, X, Minus } from '@/lib/atlaskit-icons';
import Button from '@atlaskit/button/new';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { StatusPill } from '@/components/shared/JiraTable/cells';
import { statusToLozenge } from '@/modules/project-work-hub/utils/statusToLozenge';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
import type { Dependency, IssueMeta } from './types';

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return '—';
  return t.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

const COL_W = 320;
const ROW_H = 168;
const HEADER_H = 40;
const PAD_X = 24;
const PAD_Y = 16;
const LANE_GAP = 16;
const LINK = 'var(--ds-link, #0C66E4)';

const LANE_ORDER = ['To Do', 'In Progress', 'Done', 'No status'];

function normalizeCategory(cat: string | null | undefined): string {
  if (!cat) return 'No status';
  const c = cat.toLowerCase().replace(/[_\s]/g, '');
  if (c === 'todo' || c === 'new') return 'To Do';
  if (c === 'inprogress' || c === 'indeterminate') return 'In Progress';
  if (c === 'done' || c === 'complete') return 'Done';
  return 'No status';
}

function computeDepth(
  keys: string[],
  edges: Array<{ source: string; target: string }>,
): Record<string, number> {
  const depth: Record<string, number> = Object.fromEntries(keys.map((k) => [k, 0]));
  for (let i = 0; i < keys.length; i++) {
    let changed = false;
    for (const e of edges) {
      if (depth[e.source] === undefined || depth[e.target] === undefined) continue;
      if (depth[e.target] < depth[e.source] + 1) {
        depth[e.target] = depth[e.source] + 1;
        changed = true;
      }
    }
    if (!changed) break;
  }
  return depth;
}

/* ── Status swimlane frame ─────────────────────────────────────────────── */
function LaneNode({ data }: { data: any }) {
  return (
    <div
      style={{
        // Pure visual backdrop — must not intercept clicks meant for the
        // edge labels / delete buttons that sit over the lane.
        pointerEvents: 'none',
        width: '100%',
        height: '100%',
        borderRadius: 8,
        background: 'var(--ds-surface-sunken, #F7F8F9)',
        border: '1px solid var(--ds-border, #DFE1E6)',
      }}
    >
      <div style={{ padding: '12px 16px', fontSize: 12, fontWeight: 653, color: 'var(--ds-text-subtle, #505258)' }}>
        {data.label}
      </div>
    </div>
  );
}

/* ── Issue card node ───────────────────────────────────────────────────── */
function WorkItemNode({ data }: { data: any }) {
  const m = data.meta || {};
  const label = data.label as string;
  const metaStyle = { fontSize: 11, color: 'var(--ds-text-subtlest, #6B778C)' };
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        width: 240,
        padding: 12,
        borderRadius: 6,
        background: 'var(--ds-surface-overlay, #FFFFFF)',
        border: '1px solid var(--ds-border, #DFE1E6)',
        boxShadow: 'var(--ds-shadow-raised, 0 1px 1px rgba(9,30,66,0.13))',
        textAlign: 'left',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        {m.issue_type ? <JiraIssueTypeIcon type={m.issue_type} size={16} /> : null}
        <span style={{ fontSize: 14, fontWeight: 500, color: LINK }}>{label}</span>
      </span>
      {m.summary ? (
        <span
          style={{
            fontSize: 14,
            color: 'var(--ds-text, #292A2E)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {m.summary}
        </span>
      ) : null}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ display: 'flex', gap: 12 }}>
          <span style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={metaStyle}>Start date</span>
            <span style={{ fontSize: 12, color: 'var(--ds-text, #292A2E)' }}>—</span>
          </span>
          <span style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={metaStyle}>End date</span>
            <span style={{ fontSize: 12, color: 'var(--ds-text, #292A2E)' }}>{fmtDate(m.due_date)}</span>
          </span>
        </span>
        {m.status ? <StatusPill appearance={statusToLozenge(m.status)}>{m.status}</StatusPill> : null}
      </div>
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </div>
  );
}

/* ── Edge with label + on-hover delete ─────────────────────────────────── */
function DependencyEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  data,
}: EdgeProps) {
  const [hover, setHover] = useState(false);
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={{ stroke: LINK, strokeWidth: 1.5 }} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: 'var(--ds-surface-overlay, #FFFFFF)',
            border: '1px solid var(--ds-border, #DFE1E6)',
            borderRadius: 4,
            padding: '4px 4px',
            boxShadow: hover ? 'var(--ds-shadow-overlay, 0 4px 8px rgba(9,30,66,0.16))' : 'none',
          }}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
        >
          <span style={{ fontSize: 11, color: 'var(--ds-text-subtle, #505258)', whiteSpace: 'nowrap' }}>
            {(data as any)?.label ?? 'blocks'}
          </span>
          <button
            type="button"
            aria-label="Remove dependency"
            onClick={() => (data as any)?.onDelete?.((data as any).depId)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 18,
              height: 18,
              borderRadius: '50%',
              border: 'none',
              cursor: 'pointer',
              background: 'var(--ds-background-danger, #FFECEB)',
              color: 'var(--ds-text-danger, #AE2A19)',
            }}
          >
            <X size={12} />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

/* ── Bottom-right zoom control bar ─────────────────────────────────────── */
function ZoomBar({
  zoomOnScroll,
  onToggleScroll,
}: {
  zoomOnScroll: boolean;
  onToggleScroll: () => void;
}) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const { zoom } = useViewport();
  const btn: React.CSSProperties = {
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: 13,
    color: 'var(--ds-text, #292A2E)',
    padding: '4px 8px',
    borderRadius: 3,
  };
  return (
    <div
      style={{
        position: 'absolute',
        right: 16,
        bottom: 16,
        zIndex: 5,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '4px 8px',
        background: 'var(--ds-surface-overlay, #FFFFFF)',
        border: '1px solid var(--ds-border, #DFE1E6)',
        borderRadius: 8,
        boxShadow: 'var(--ds-shadow-overlay, 0 4px 8px rgba(9,30,66,0.16))',
      }}
    >
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ds-text-subtle, #505258)', cursor: 'pointer' }}>
        <input type="checkbox" checked={zoomOnScroll} onChange={onToggleScroll} />
        Zoom on scroll
      </label>
      <span style={{ width: 1, height: 20, background: 'var(--ds-border, #DFE1E6)' }} />
      <button type="button" aria-label="Zoom out" style={btn} onClick={() => zoomOut()}>
        <Minus size={16} />
      </button>
      <span style={{ fontSize: 13, minWidth: 40, textAlign: 'center', color: 'var(--ds-text, #292A2E)' }}>
        {Math.round(zoom * 100)}%
      </span>
      <button type="button" aria-label="Zoom in" style={btn} onClick={() => zoomIn()}>
        <Plus size={16} />
      </button>
      <span style={{ width: 1, height: 20, background: 'var(--ds-border, #DFE1E6)' }} />
      {/* ads-scanner:ignore-next-line — React Flow fitView padding ratio, not CSS px */}
      <button type="button" style={btn} onClick={() => fitView({ padding: 0.2, duration: 200 })}>
        Fit
      </button>
    </div>
  );
}

interface DependenciesDiagramProps {
  projectKey: string;
  dependencies: Dependency[];
  issueMeta?: IssueMeta;
  onAddClick: () => void;
  onChanged: () => void;
}

function DiagramInner({ dependencies, issueMeta = {}, onAddClick, onChanged }: DependenciesDiagramProps) {
  const handleDeleteDep = useCallback(
    async (depId: number) => {
      try {
        const { error } = await (supabase as any)
          .from('ph_issue_dependencies')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', depId);
        if (error) throw error;
        catalystToast.success('Dependency removed');
        onChanged();
      } catch (err) {
        console.error('[Dependencies] remove failed', err);
        catalystToast.error(`Could not remove dependency: ${(err as any)?.message ?? String(err)}`);
      }
    },
    [onChanged],
  );

  const uniqueIssues = useMemo(() => {
    const keys = new Set<string>();
    dependencies.forEach((dep) => {
      keys.add(dep.source_issue_key);
      keys.add(dep.target_issue_key);
    });
    return Array.from(keys).sort();
  }, [dependencies]);

  const nodes: Node[] = useMemo(() => {
    const depth = computeDepth(
      uniqueIssues,
      dependencies.map((d) => ({ source: d.source_issue_key, target: d.target_issue_key })),
    );
    const maxDepth = uniqueIssues.reduce((m, k) => Math.max(m, depth[k] ?? 0), 0);
    const frameWidth = PAD_X * 2 + (maxDepth + 1) * COL_W;

    const laneKeys: Record<string, string[]> = {};
    for (const k of uniqueIssues) {
      const lane = normalizeCategory(issueMeta[k]?.status_category);
      (laneKeys[lane] ||= []).push(k);
    }
    const lanes = LANE_ORDER.filter((l) => laneKeys[l]?.length);

    const frameNodes: Node[] = [];
    const cardNodes: Node[] = [];
    let cumY = 0;

    for (const lane of lanes) {
      const keys = laneKeys[lane];
      const colCount: Record<number, number> = {};
      const rowOf: Record<string, number> = {};
      let maxRows = 1;
      for (const k of keys) {
        const d = depth[k] ?? 0;
        const r = colCount[d] ?? 0;
        rowOf[k] = r;
        colCount[d] = r + 1;
        maxRows = Math.max(maxRows, r + 1);
      }
      const laneHeight = HEADER_H + maxRows * ROW_H + PAD_Y;

      frameNodes.push({
        id: `lane:${lane}`,
        type: 'lane',
        position: { x: 0, y: cumY },
        data: { label: lane },
        draggable: false,
        selectable: false,
        style: { width: frameWidth, height: laneHeight, zIndex: 0, pointerEvents: 'none' },
      });

      for (const k of keys) {
        cardNodes.push({
          id: k,
          type: 'workItem',
          parentId: `lane:${lane}`,
          extent: 'parent',
          data: { label: k, meta: issueMeta[k] ?? null },
          position: { x: PAD_X + (depth[k] ?? 0) * COL_W, y: HEADER_H + rowOf[k] * ROW_H },
        });
      }
      cumY += laneHeight + LANE_GAP;
    }

    return [...frameNodes, ...cardNodes];
  }, [uniqueIssues, dependencies, issueMeta]);

  const edges: Edge[] = useMemo(
    () =>
      dependencies.map((dep) => ({
        id: `dep-${dep.id}`,
        source: dep.source_issue_key,
        target: dep.target_issue_key,
        type: 'dependency',
        // ads-scanner:ignore-next-line — SVG marker requires a concrete color, not a CSS var()
        markerEnd: { type: MarkerType.ArrowClosed, color: '#0C66E4' },
        data: {
          label: dep.dependency_type === 'blocks' ? 'blocks' : 'is blocked by',
          depId: dep.id,
          onDelete: handleDeleteDep,
        },
      })),
    [dependencies, handleDeleteDep],
  );

  const nodeTypes = useMemo(() => ({ workItem: WorkItemNode, lane: LaneNode }), []);
  const edgeTypes = useMemo(() => ({ dependency: DependencyEdge }), []);

  const [flowNodes, setNodes, onNodesChange] = useNodesState(nodes);
  const [flowEdges, setEdges, onEdgesChange] = useEdgesState(edges);
  const [zoomOnScroll, setZoomOnScroll] = useState(false);

  React.useEffect(() => {
    setNodes(nodes);
    setEdges(edges);
  }, [nodes, edges, setNodes, setEdges]);

  return (
    <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 16px',
          borderBottom: '1px solid var(--ds-border, #DFE1E6)',
          background: 'var(--ds-surface, #FFFFFF)',
        }}
      >
        <span style={{ fontSize: 12, color: 'var(--ds-text-subtle, #505258)' }}>
          {dependencies.length} {dependencies.length === 1 ? 'dependency' : 'dependencies'}
        </span>
        <span style={{ flex: 1 }} />
        <Button appearance="primary" iconBefore={Plus} onClick={onAddClick}>
          Add dependency
        </Button>
      </div>

      {/* Canvas */}
      <div style={{ position: 'relative', flex: 1, minHeight: 0, background: 'var(--ds-surface, #FFFFFF)' }}>
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          // ads-scanner:ignore-next-line — React Flow fitView padding ratio, not CSS px
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.2}
          maxZoom={2}
          zoomOnScroll={zoomOnScroll}
          panOnScroll
          proOptions={{ hideAttribution: true }}
          style={{ background: 'var(--ds-surface, #FFFFFF)' }}
        />
        <ZoomBar zoomOnScroll={zoomOnScroll} onToggleScroll={() => setZoomOnScroll((v) => !v)} />
      </div>
    </div>
  );
}

export default function DependenciesDiagram(props: DependenciesDiagramProps) {
  return (
    <ReactFlowProvider>
      <DiagramInner {...props} />
    </ReactFlowProvider>
  );
}
