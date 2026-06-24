/**
 * Dependency canvas (React Flow v12) — Jira Plans dependency-report style.
 *
 * Canvas-first: fills the surface. Flat background, status swimlane frames,
 * rich issue cards, smooth edges with on-hover delete, a toolbar (count + Add
 * dependency), and a bottom-right zoom bar (− / % / + / Fit / Zoom on scroll).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
import { Plus, Minus, MoreHorizontal, Link, Unlink } from '@/lib/atlaskit-icons';
import Button from '@atlaskit/button/new';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { StatusPill } from '@/components/shared/JiraTable/cells';
import { statusToLozenge } from '@/modules/project-work-hub/utils/statusToLozenge';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
import type { Dependency, IssueMeta } from './types';

// Lift the edge-label layer above the card nodes so the "blocks" pills are
// visible and clickable (React Flow paints labels below nodes by default).
if (typeof document !== 'undefined' && !document.getElementById('dep-edgelabel-z')) {
  const s = document.createElement('style');
  s.id = 'dep-edgelabel-z';
  s.textContent = '.react-flow__edgelabel-renderer { z-index: 6; }';
  document.head.appendChild(s);
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return '—';
  return t.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

const CARD_W = 280;
const COL_W = 400;
const ROW_H = 190;
const HEADER_H = 48;
const PAD_X = 32;
const PAD_Y = 32;
const LINK = 'var(--ds-link, #0C66E4)';

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

/* ── Project frame (single swimlane) ───────────────────────────────────── */
function FrameNode({ data }: { data: any }) {
  return (
    <div
      style={{
        // Pure visual backdrop — must not intercept clicks meant for the edge
        // labels / cards on top, and lets canvas-pan work when dragged over.
        pointerEvents: 'none',
        width: '100%',
        height: '100%',
        borderRadius: 8,
        background: 'var(--ds-surface-sunken, #F7F8F9)',
        border: '1px solid var(--ds-border, #DFE1E6)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px' }}>
        <span
          style={{
            width: 20,
            height: 20,
            borderRadius: 4,
            background: 'var(--ds-background-brand-bold, #1868DB)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--ds-text-inverse, #FFFFFF)',
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {String(data.label || '?').slice(0, 1)}
        </span>
        <span style={{ fontSize: 14, fontWeight: 653, color: 'var(--ds-text, #292A2E)' }}>{data.label}</span>
      </div>
    </div>
  );
}

/* ── Card kebab menu (portal — React Flow canvas has transforms, so
 *    @atlaskit/dropdown-menu / Popper would land at (0,0); CLAUDE.md 2026-06-13). */
function CardKebab({ onAddDependency, onLocate }: { onAddDependency?: () => void; onLocate?: () => void }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node) && !btnRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey, true); };
  }, [open]);

  const item = (label: string, opts: { onClick?: () => void; disabled?: boolean; chevron?: boolean }) => (
    <button
      type="button"
      role="menuitem"
      disabled={opts.disabled}
      onClick={() => { if (opts.disabled) return; setOpen(false); opts.onClick?.(); }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        padding: '8px 16px',
        border: 'none',
        background: 'transparent',
        textAlign: 'left',
        fontSize: 14,
        whiteSpace: 'nowrap',
        cursor: opts.disabled ? 'not-allowed' : 'pointer',
        color: opts.disabled ? 'var(--ds-text-disabled, #B3B9C4)' : 'var(--ds-text, #292A2E)',
      }}
    >
      {label}
      {opts.chevron ? <span style={{ marginLeft: 24 }}>›</span> : null}
    </button>
  );

  const rect = btnRef.current?.getBoundingClientRect();
  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label="Work item actions"
        className="nodrag"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 24,
          height: 24,
          border: 'none',
          borderRadius: 4,
          background: 'transparent',
          cursor: 'pointer',
          color: 'var(--ds-text-subtle, #505258)',
        }}
      >
        <MoreHorizontal size={16} />
      </button>
      {open && rect
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              aria-label="Work item actions"
              style={{
                position: 'fixed',
                top: rect.bottom + 4,
                left: rect.left - 180,
                minWidth: 220,
                zIndex: 9999,
                background: 'var(--ds-surface-overlay, #FFFFFF)',
                border: '1px solid var(--ds-border, #DFE1E6)',
                borderRadius: 8,
                boxShadow: 'var(--ds-shadow-overlay, 0 8px 16px rgba(9,30,66,0.25))',
                padding: '4px 0',
              }}
            >
              {item('Add dependency', { onClick: onAddDependency })}
              {item('Filter by this work item', { disabled: true })}
              {item('Highlight related work item', { disabled: true, chevron: true })}
              {item('Locate work item in timeline', { onClick: onLocate })}
            </div>,
            document.body,
          )
        : null}
    </>
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
        width: CARD_W,
        padding: 16,
        borderRadius: 8,
        background: 'var(--ds-surface-overlay, #FFFFFF)',
        border: '1px solid var(--ds-border, #DFE1E6)',
        boxShadow: 'var(--ds-shadow-raised, 0 1px 1px rgba(9,30,66,0.13))',
        textAlign: 'left',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          {m.issue_type ? <JiraIssueTypeIcon type={m.issue_type} size={16} /> : null}
          <span style={{ fontSize: 14, fontWeight: 500, color: LINK }}>{label}</span>
        </span>
        <CardKebab onAddDependency={data.onAddDependency} onLocate={data.onLocate} />
      </div>
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

/* ── Edge: smooth path + clickable label that opens the relationship popup ── */
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
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  const d = data as any;
  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={{ stroke: LINK, strokeWidth: 1.5 }} />
      <EdgeLabelRenderer>
        <button
          type="button"
          aria-label={`${d?.label ?? 'blocks'} — open relationship`}
          onClick={(e) => { e.stopPropagation(); d?.onSelect?.(d, { x: e.clientX, y: e.clientY }); }}
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
            fontSize: 11,
            color: 'var(--ds-text-subtle, #505258)',
            background: 'var(--ds-surface-overlay, #FFFFFF)',
            border: '1px solid var(--ds-border, #DFE1E6)',
            borderRadius: 4,
            padding: '4px 8px',
            whiteSpace: 'nowrap',
            cursor: 'pointer',
          }}
        >
          {d?.label ?? 'blocks'}
        </button>
      </EdgeLabelRenderer>
    </>
  );
}

/* ── Relationship popup (edge click) — source / link / target + unlink ───── */
function IssueRow({ k, meta }: { k: string; meta: any }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', minWidth: 0 }}>
      {meta?.issue_type ? <JiraIssueTypeIcon type={meta.issue_type} size={16} /> : null}
      <span style={{ fontSize: 14, fontWeight: 500, color: LINK, whiteSpace: 'nowrap' }}>{k}</span>
      <span
        style={{
          fontSize: 14,
          color: 'var(--ds-text, #292A2E)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {meta?.summary ?? ''}
      </span>
    </div>
  );
}

function RelationshipPopup({
  sel,
  onUnlink,
  onClose,
}: {
  sel: { depId: number; label: string; sourceKey: string; targetKey: string; sourceMeta: any; targetMeta: any; x: number; y: number };
  onUnlink: (depId: number) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // defer mousedown listener one tick so the opening click doesn't self-close it
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
    };
    const t = setTimeout(() => document.addEventListener('mousedown', onDown), 0);
    document.addEventListener('keydown', onKey, true);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey, true); };
  }, [onClose]);

  const width = 360;
  let left = sel.x - width / 2;
  left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
  const top = Math.min(sel.y + 12, window.innerHeight - 200);

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label="Dependency relationship"
      style={{
        position: 'fixed',
        top,
        left,
        width,
        zIndex: 9999,
        background: 'var(--ds-surface-overlay, #FFFFFF)',
        border: '1px solid var(--ds-border, #DFE1E6)',
        borderRadius: 8,
        boxShadow: 'var(--ds-shadow-overlay, 0 8px 16px rgba(9,30,66,0.25))',
        overflow: 'hidden',
      }}
    >
      <div style={{ background: 'var(--ds-surface-sunken, #F7F8F9)' }}>
        <IssueRow k={sel.sourceKey} meta={sel.sourceMeta} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 12px' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: 'var(--ds-background-neutral-bold, #44546F)',
              color: 'var(--ds-text-inverse, #FFFFFF)',
            }}
          >
            <Link size={14} />
          </span>
          <span style={{ fontSize: 14, color: 'var(--ds-text, #292A2E)' }}>{sel.label}</span>
        </span>
        <button
          type="button"
          aria-label="Unlink dependency"
          onClick={() => { onUnlink(sel.depId); onClose(); }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            border: 'none',
            borderRadius: 4,
            background: 'transparent',
            cursor: 'pointer',
            color: 'var(--ds-text-subtle, #505258)',
          }}
        >
          <Unlink size={16} />
        </button>
      </div>
      <div style={{ background: 'var(--ds-surface-sunken, #F7F8F9)' }}>
        <IssueRow k={sel.targetKey} meta={sel.targetMeta} />
      </div>
    </div>,
    document.body,
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
  const { zoomIn, zoomOut, fitView, setViewport } = useReactFlow();
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
      <button type="button" style={btn} onClick={() => setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 200 })}>
        Reset
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

function DiagramInner({ projectKey, dependencies, issueMeta = {}, onAddClick, onChanged }: DependenciesDiagramProps) {
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
    // Free graph layout inside ONE frame: x = dependency depth (column),
    // y = row within column. Cards are top-level + draggable; the frame is a
    // pure visual backdrop so canvas-pan works when dragged over it.
    const colCount: Record<number, number> = {};
    const rowOf: Record<string, number> = {};
    let maxRows = 1;
    let maxDepth = 0;
    for (const k of uniqueIssues) {
      const d = depth[k] ?? 0;
      const r = colCount[d] ?? 0;
      rowOf[k] = r;
      colCount[d] = r + 1;
      maxRows = Math.max(maxRows, r + 1);
      maxDepth = Math.max(maxDepth, d);
    }
    const frameWidth = PAD_X * 2 + maxDepth * COL_W + CARD_W;
    const frameHeight = HEADER_H + (maxRows - 1) * ROW_H + 140 + PAD_Y;

    const frame: Node = {
      id: 'frame:project',
      type: 'frame',
      position: { x: 0, y: 0 },
      data: { label: projectKey },
      draggable: false,
      selectable: false,
      style: { width: frameWidth, height: frameHeight, zIndex: 0 },
    };

    const cards: Node[] = uniqueIssues.map((k) => ({
      id: k,
      type: 'workItem',
      data: {
        label: k,
        meta: issueMeta[k] ?? null,
        onAddDependency: onAddClick,
        onLocate: () => {
          window.location.href = `/project-hub/${projectKey}/timeline`;
        },
      },
      position: { x: PAD_X + (depth[k] ?? 0) * COL_W, y: HEADER_H + rowOf[k] * ROW_H },
      draggable: true,
      // frame (0) < edges (1) < cards (2): edges draw over the opaque frame.
      zIndex: 2,
    }));

    return [frame, ...cards];
  }, [uniqueIssues, dependencies, issueMeta, projectKey, onAddClick]);

  const [sel, setSel] = useState<any>(null);
  const onSelectEdge = useCallback((d: any, point: { x: number; y: number }) => setSel({ ...d, x: point.x, y: point.y }), []);

  const edges: Edge[] = useMemo(
    () =>
      dependencies.map((dep) => ({
        id: `dep-${dep.id}`,
        source: dep.source_issue_key,
        target: dep.target_issue_key,
        type: 'dependency',
        zIndex: 1,
        // ads-scanner:ignore-next-line — SVG marker requires a concrete color, not a CSS var()
        markerEnd: { type: MarkerType.ArrowClosed, color: '#0C66E4' },
        data: {
          label: dep.dependency_type === 'blocks' ? 'blocks' : 'is blocked by',
          depId: dep.id,
          sourceKey: dep.source_issue_key,
          targetKey: dep.target_issue_key,
          sourceMeta: issueMeta[dep.source_issue_key] ?? null,
          targetMeta: issueMeta[dep.target_issue_key] ?? null,
          onSelect: onSelectEdge,
        },
      })),
    [dependencies, issueMeta, onSelectEdge],
  );

  const nodeTypes = useMemo(() => ({ workItem: WorkItemNode, frame: FrameNode }), []);
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
        <Button appearance="default" iconBefore={Plus} onClick={onAddClick}>
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
          onEdgeClick={(e, edge) => onSelectEdge(edge.data, { x: e.clientX, y: e.clientY })}
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
      {sel ? <RelationshipPopup sel={sel} onUnlink={handleDeleteDep} onClose={() => setSel(null)} /> : null}
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
