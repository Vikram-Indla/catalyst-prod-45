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
import { Plus, Minus, MoreHorizontal, Link, Unlink, ChevronDown, User } from '@/lib/atlaskit-icons';
import Textfield from '@atlaskit/textfield';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { ProjectIcon } from '@/components/shared/ProjectIcon';
import { catalystToast } from '@/lib/catalystToast';
import type { Dependency, IssueMeta, Hierarchy } from './types';

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
  return t.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const CARD_W = 300;
const COL_W = 420;
const ROW_H = 190;
const HEADER_H = 48;
const PAD_X = 32;
const PAD_Y = 32;
const LANE_GAP = 24;
const LINK = 'var(--ds-link)';
// Edge colours (Vikram 2026-06-25):
//  • IDLE  = neutral grey #505258 (ADS --ds-text-subtle).
//  • ACTIVE = Atlassian link blue — applied on edge hover, on a clicked/selected
//    edge (persists), and on every edge connected to a clicked card.
//    Esc clears all selection → back to grey.
const EDGE_GREY = 'var(--ds-text-subtle)';
const EDGE_BLUE = 'var(--ds-link)';
// ads-scanner:ignore-next-line — SVG marker fill needs a concrete color, not a CSS var()
const EDGE_GREY_HEX = 'var(--ds-text-subtle)';
// ads-scanner:ignore-next-line — SVG marker fill needs a concrete color, not a CSS var()
const EDGE_BLUE_HEX = 'var(--ds-link)';
const EDGE_WIDTH = 2;

type GroupBy = 'none' | 'status' | 'type' | 'assignee';
type LinkType = 'all' | 'blocks' | 'is_blocked_by';

const STATUS_ORDER = ['To Do', 'In Progress', 'Done', 'No status'];

function normalizeCategory(cat: string | null | undefined): string {
  if (!cat) return 'No status';
  const c = cat.toLowerCase().replace(/[_\s]/g, '');
  if (c === 'todo' || c === 'new') return 'To Do';
  if (c === 'inprogress' || c === 'indeterminate') return 'In Progress';
  if (c === 'done' || c === 'complete') return 'Done';
  return 'No status';
}

function groupValue(meta: any, by: GroupBy): string {
  if (by === 'status') return normalizeCategory(meta?.status_category);
  if (by === 'type') return meta?.issue_type ?? 'No type';
  if (by === 'assignee') {
    const a = meta?.assignee_account_id;
    return a ? `Assignee …${String(a).slice(-4)}` : 'Unassigned';
  }
  return 'all';
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
        background: 'var(--ds-background-neutral, rgba(5,21,36,0.06))',
        border: '1px solid var(--ds-border)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px' }}>
        {data.projectKey ? (
          <ProjectIcon projectKey={data.projectKey} name={data.label} color={data.color} size="small" />
        ) : null}
        <span style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 653, color: 'var(--ds-text)' }}>{data.label}</span>
      </div>
    </div>
  );
}

/* ── Card kebab menu (portal — React Flow canvas has transforms, so
 *    @atlaskit/dropdown-menu / Popper would land at (0,0); CLAUDE.md 2026-06-13). */
type RelatedItem = { key: string; label: string; type: string | null; edgeId: string; direction: 'outgoing' | 'incoming' };

function CardKebab({ onAddDependency, onLocate, onFilterByItem, relatedItems = [], onHighlightRelated }: {
  onAddDependency?: () => void;
  onLocate?: () => void;
  onFilterByItem?: () => void;
  relatedItems?: RelatedItem[];
  onHighlightRelated?: (key: string, edgeId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [subOpen, setSubOpen] = useState(false);
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

  // Collapse the "Highlight related" submenu whenever the menu closes.
  useEffect(() => { if (!open) setSubOpen(false); }, [open]);

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
        padding: '12px 16px',
        border: 'none',
        background: 'transparent',
        textAlign: 'left',
        fontFamily: 'var(--ds-font-family-body, "Atlassian Sans")',
        fontSize: 'var(--ds-font-size-400)',
        whiteSpace: 'nowrap',
        cursor: opts.disabled ? 'not-allowed' : 'pointer',
        color: opts.disabled ? 'var(--ds-text-disabled)' : 'var(--ds-text)',
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
          color: 'var(--ds-text-subtle)',
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
              // React portals bubble synthetic events through the REACT tree, so a
              // click here would reach the card's React Flow onNodeClick and reselect
              // the card — overriding the menu action. Stop it at the menu root.
              // (Vikram 2026-06-25)
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'fixed',
                top: rect.bottom + 4,
                left: rect.left - 240,
                minWidth: 280,
                zIndex: 9999,
                background: 'var(--ds-surface-overlay)',
                border: '1px solid var(--ds-border)',
                borderRadius: 8,
                boxShadow: 'var(--ds-shadow-overlay, 0 8px 16px rgba(9,30,66,0.25))',
                padding: '8px 0',
                fontFamily: 'var(--ds-font-family-body, "Atlassian Sans")',
              }}
            >
              {item('Add dependency', { onClick: onAddDependency })}
              {item('Filter by this work item', { onClick: onFilterByItem })}
              {/* Highlight related — hover/click opens a SIDE flyout (Jira parity),
                  grouped into Outgoing / Incoming dependencies; clicking an item
                  highlights its wire (same blue as a direct line click). */}
              <div
                style={{ position: 'relative' }}
                onMouseEnter={() => setSubOpen(true)}
                onMouseLeave={() => setSubOpen(false)}
              >
                <button
                  type="button"
                  role="menuitem"
                  aria-expanded={subOpen}
                  onClick={() => setSubOpen((v) => !v)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '12px 16px',
                    border: 'none',
                    borderLeft: subOpen ? '2px solid var(--ds-border-selected)' : '2px solid transparent',
                    background: subOpen ? 'var(--ds-background-selected)' : 'transparent',
                    textAlign: 'left',
                    fontFamily: 'var(--ds-font-family-body, "Atlassian Sans")',
                    fontSize: 'var(--ds-font-size-400)',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    color: subOpen ? 'var(--ds-text-selected)' : 'var(--ds-text)',
                  }}
                >
                  Highlight related work item
                  <span style={{ marginLeft: 24 }}>›</span>
                </button>
                {subOpen ? (
                  <div
                    role="menu"
                    aria-label="Related work items"
                    style={{
                      position: 'absolute',
                      left: '100%',
                      top: 0,
                      minWidth: 280,
                      maxWidth: 380,
                      zIndex: 10000,
                      background: 'var(--ds-surface-overlay)',
                      border: '1px solid var(--ds-border)',
                      borderRadius: 8,
                      boxShadow: 'var(--ds-shadow-overlay, 0 8px 16px rgba(9,30,66,0.25))',
                      padding: '8px 0',
                      fontFamily: 'var(--ds-font-family-body, "Atlassian Sans")',
                    }}
                  >
                    {relatedItems.length === 0 ? (
                      <div style={{ padding: '8px 16px', fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtlest)' }}>No related work items</div>
                    ) : (
                      (['outgoing', 'incoming'] as const).map((dir) => {
                        const list = relatedItems.filter((r) => r.direction === dir);
                        if (list.length === 0) return null;
                        return (
                          <div key={dir}>
                            <div style={{ padding: '8px 16px 4px', fontSize: 'var(--ds-font-size-200)', fontWeight: 700, color: 'var(--ds-text-subtle)' }}>
                              {dir === 'outgoing' ? 'Outgoing dependencies' : 'Incoming dependencies'}
                            </div>
                            {list.map((r) => (
                              <button
                                key={r.edgeId}
                                type="button"
                                role="menuitem"
                                onClick={() => { setOpen(false); onHighlightRelated?.(r.key, r.edgeId); }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 8,
                                  width: '100%',
                                  padding: '8px 16px',
                                  border: 'none',
                                  background: 'transparent',
                                  textAlign: 'left',
                                  fontFamily: 'var(--ds-font-family-body, "Atlassian Sans")',
                                  fontSize: 'var(--ds-font-size-400)',
                                  cursor: 'pointer',
                                  color: 'var(--ds-text)',
                                  minWidth: 0,
                                }}
                              >
                                {r.type ? <JiraIssueTypeIcon type={r.type} size={16} /> : null}
                                <span style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{r.key}</span>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</span>
                              </button>
                            ))}
                          </div>
                        );
                      })
                    )}
                  </div>
                ) : null}
              </div>
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
  const metaStyle = { fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle)' };
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        width: CARD_W,
        padding: '8px 16px',
        borderRadius: 4,
        background: 'var(--ds-surface-overlay)',
        // Selected (clicked) OR focus-linked card → primary-blue border, matching
        // the blue connected wires (Vikram 2026-06-25). Esc / pane click clears.
        border: (data.focused || data.selected || data.highlight)
          ? '2px solid var(--ds-link)'
          : '1px solid var(--ds-border)',
        boxShadow: (data.focused || data.selected || data.highlight)
          ? 'var(--ds-shadow-overlay, 0 0 0 2px rgba(12,102,228,0.3))'
          : 'var(--ds-shadow-raised, 0 1px 1px rgba(9,30,66,0.13))',
        textAlign: 'left',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
          {m.issue_type ? <JiraIssueTypeIcon type={m.issue_type} size={16} /> : null}
          {/* Key opens the issue in a NEW tab; current canvas/selection untouched.
              stopPropagation + nodrag so it never triggers node select/drag.
              (Vikram 2026-06-25) */}
          <a
            href={`/browse/${label}`}
            target="_blank"
            rel="noopener noreferrer"
            className="nodrag"
            onClick={(e) => e.stopPropagation()}
            style={{ fontSize: 'var(--ds-font-size-500)', fontWeight: 500, color: LINK, textDecoration: 'underline', cursor: 'pointer' }}
          >
            {label}
          </a>
        </span>
        <CardKebab
          onAddDependency={data.onAddDependency}
          onLocate={data.onLocate}
          onFilterByItem={data.onFilterByItem}
          relatedItems={data.relatedItems}
          onHighlightRelated={data.onHighlightRelated}
        />
      </div>
      {m.summary ? (
        <span
          style={{
            fontSize: 'var(--ds-font-size-500)',
            color: 'var(--ds-text)',
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
        <span style={{ display: 'flex', gap: 12, minWidth: 0 }}>
          <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={metaStyle}>Start date</span>
            <span style={{ fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>{fmtDate(m.start_date)}</span>
          </span>
          <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={metaStyle}>End date</span>
            <span style={{ fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>{fmtDate(m.end_date)}</span>
          </span>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {m.status ? (() => {
            // Jira dependency-card status: OUTLINED uppercase pill (border + text
            // tinted by category, transparent fill) — NOT the filled lozenge used
            // in tables/detail. Uppercase via JS .toUpperCase() (not CSS
            // text-transform) so the typography audit stays clean while matching
            // Jira's "TO DO" / "IN PROGRESS" rendering. (2026-06-25)
            const cat = normalizeCategory(m.status_category);
            const c = cat === 'Done'
              ? 'var(--ds-text-success)'
              : cat === 'In Progress'
                ? 'var(--ds-text-information)'
                : 'var(--ds-text-subtle)';
            return (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  height: 20,
                  padding: '0 8px',
                  border: `1px solid ${c}`,
                  borderRadius: 3,
                  background: 'var(--ds-surface)',
                  fontSize: 'var(--ds-font-size-100)',
                  fontWeight: 700,
                  letterSpacing: '0.5px',
                  color: c,
                  whiteSpace: 'nowrap',
                }}
              >
                {m.status.toUpperCase()}
              </span>
            );
          })() : null}
        </span>
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
  const stroke = d?.active ? EDGE_BLUE : EDGE_GREY;
  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={{ stroke, strokeWidth: EDGE_WIDTH }} />
      <EdgeLabelRenderer>
        <button
          type="button"
          aria-label={`${d?.label ?? 'blocks'} — open relationship`}
          onClick={(e) => { e.stopPropagation(); d?.onSelect?.(d, { x: e.clientX, y: e.clientY }); }}
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
            fontSize: 'var(--ds-font-size-200)',
            color: 'var(--ds-text)',
            background: 'var(--ds-surface)',
            border: 'none',
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
      <a
        href={`/browse/${k}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 500, color: LINK, textDecoration: 'underline', whiteSpace: 'nowrap', cursor: 'pointer' }}
      >
        {k}
      </a>
      <span
        style={{
          fontSize: 'var(--ds-font-size-400)',
          color: 'var(--ds-text)',
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

  const width = 280;
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
        background: 'var(--ds-surface-overlay)',
        border: '1px solid var(--ds-border)',
        borderRadius: 8,
        boxShadow: 'var(--ds-shadow-overlay, 0 8px 16px rgba(9,30,66,0.25))',
        padding: 12,
        fontFamily: 'var(--ds-font-family-body, "Atlassian Sans")',
      }}
    >
      {/* Source band (grey, rounded) */}
      <div style={{ background: 'var(--ds-background-neutral)', borderRadius: 6 }}>
        <IssueRow k={sel.sourceKey} meta={sel.sourceMeta} />
      </div>
      {/* Link row (white) — vertical connector line runs through the chain circle,
          aligned under the band type icons (Jira parity, 2026-06-25). */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 12px 8px 8px' }}>
        <span aria-hidden style={{ position: 'absolute', left: 24, top: 0, bottom: 0, width: 2, background: 'var(--ds-text-subtle)' }} />
        <span style={{ position: 'relative', zIndex: 1, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'var(--ds-background-neutral-bold)',
              color: 'var(--ds-text-inverse)',
            }}
          >
            <Link size={14} />
          </span>
          <span style={{ fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text)' }}>{sel.label}</span>
        </span>
        <button
          type="button"
          aria-label="Unlink dependency"
          onClick={() => { onUnlink(sel.depId); onClose(); }}
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            border: 'none',
            borderRadius: 4,
            background: 'transparent',
            cursor: 'pointer',
            color: 'var(--ds-text-subtle)',
          }}
        >
          <Unlink size={16} />
        </button>
      </div>
      {/* Target band (grey, rounded) */}
      <div style={{ background: 'var(--ds-background-neutral)', borderRadius: 6 }}>
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
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const SHORTCUTS: { keyLabel: string; action: string }[] = [
    { keyLabel: '←', action: 'Pan to the left' },
    { keyLabel: '→', action: 'Pan to the right' },
    { keyLabel: '↑', action: 'Pan to the top' },
    { keyLabel: '↓', action: 'Pan to the bottom' },
    { keyLabel: '+', action: 'Zoom the report in' },
    { keyLabel: '−', action: 'Zoom the report out' },
  ];
  const btn: React.CSSProperties = {
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: 'var(--ds-font-size-300)',
    color: 'var(--ds-text)',
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
        background: 'var(--ds-surface-overlay)',
        border: '1px solid var(--ds-border)',
        borderRadius: 8,
        boxShadow: 'var(--ds-shadow-overlay, 0 4px 8px rgba(9,30,66,0.16))',
      }}
    >
      <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle)', cursor: 'pointer' }}>
        <input type="checkbox" checked={zoomOnScroll} onChange={onToggleScroll} />
        Zoom on scroll
      </label>
      <span style={{ width: 1, height: 20, background: 'var(--ds-border)' }} />
      <button type="button" aria-label="Zoom out" style={btn} onClick={() => zoomOut()}>
        <Minus size={16} />
      </button>
      <span style={{ fontSize: 'var(--ds-font-size-300)', minWidth: 40, textAlign: 'center', color: 'var(--ds-text)' }}>
        {Math.round(zoom * 100)}%
      </span>
      <button type="button" aria-label="Zoom in" style={btn} onClick={() => zoomIn()}>
        <Plus size={16} />
      </button>
      <span style={{ width: 1, height: 20, background: 'var(--ds-border)' }} />
      {/* ads-scanner:ignore-next-line — React Flow fitView padding ratio, not CSS px */}
      <button type="button" style={btn} onClick={() => fitView({ padding: 0.2, duration: 200 })}>
        Fit
      </button>
      <button type="button" style={btn} onClick={() => setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 200 })}>
        Reset
      </button>
      <span style={{ width: 1, height: 20, background: 'var(--ds-border)' }} />
      <div style={{ position: 'relative', display: 'flex' }}>
        <button
          type="button"
          aria-label="Keyboard shortcuts"
          aria-haspopup="dialog"
          aria-expanded={shortcutsOpen}
          style={{ ...btn, color: shortcutsOpen ? 'var(--ds-text-selected)' : 'var(--ds-text)' }}
          onClick={() => setShortcutsOpen((v) => !v)}
        >
          <User size={16} />
        </button>
        {shortcutsOpen && (
          <>
            <div onClick={() => setShortcutsOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 6 }} aria-hidden />
            <div
              role="dialog"
              aria-label="Keyboard shortcuts"
              style={{
                position: 'absolute', bottom: 'calc(100% + 8px)', right: 0, zIndex: 7,
                width: 260, padding: 16, borderRadius: 8,
                background: 'var(--ds-surface-overlay)',
                border: '1px solid var(--ds-border)',
                boxShadow: 'var(--ds-shadow-overlay, 0 8px 16px rgba(9,30,66,0.25))',
              }}
            >
              <div style={{ fontSize: 'var(--ds-font-size-500)', fontWeight: 600, color: 'var(--ds-text)', marginBottom: 12 }}>
                Keyboard shortcuts
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {SHORTCUTS.map((s) => (
                  <div key={s.action} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      minWidth: 24, height: 24, padding: '0 4px', borderRadius: 4,
                      border: '1px solid var(--ds-border)', background: 'var(--ds-surface)',
                      fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text)',
                    }}>{s.keyLabel}</span>
                    <span style={{ fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text)' }}>{s.action}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Filter chip — Jira-style bordered trigger (Atlassian Sans) + portal-anchored
 *    menu. NOT @atlaskit/dropdown-menu: this toolbar sits inside an
 *    overflow:hidden ancestor, so Popper lands the menu at (0,0)
 *    (CLAUDE.md 2026-06-13). createPortal + getBoundingClientRect anchors it
 *    under the chip reliably. */
type ChipOption<T extends string> = { value: T; label: string; icon?: React.ReactNode };

function ChipSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  active,
  disabled,
  searchable,
  searchPlaceholder,
}: {
  label: string;
  value: T;
  options: Array<ChipOption<T>>;
  onChange: (v: T) => void;
  active?: boolean;
  disabled?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const anchorRef = useRef<HTMLSpanElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node) && !anchorRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey, true); };
  }, [open]);

  // Reset the search query whenever the menu closes.
  useEffect(() => { if (!open) setQuery(''); }, [open]);

  const current = options.find((o) => o.value === value)?.label ?? '';
  const text = active && current ? `${label}: ${current}` : label;
  const rect = anchorRef.current?.getBoundingClientRect();
  const visibleOptions = searchable && query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  return (
    <span ref={anchorRef} style={{ display: 'inline-flex' }}>
      {/* Jira chip: white fill + 1px border + rounded; active filter → blue
          border/text (Vikram 2026-06-25). */}
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          height: 32,
          padding: '0 8px 0 12px',
          background: 'var(--ds-surface)',
          border: `1px solid ${active ? 'var(--ds-border-selected)' : 'var(--ds-border)'}`,
          borderRadius: 6,
          color: active ? 'var(--ds-text-selected)' : 'var(--ds-text)',
          fontFamily: 'var(--ds-font-family-body, "Atlassian Sans")',
          fontSize: 'var(--ds-font-size-400)',
          fontWeight: 500,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={(e) => { if (!disabled && !active) e.currentTarget.style.background = 'var(--ds-background-neutral-subtle-hovered, var(--ds-background-neutral))'; }}
        onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'var(--ds-surface)'; }}
      >
        {text}
        <ChevronDown size={16} />
      </button>
      {open && rect
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              style={{
                position: 'fixed',
                top: rect.bottom + 4,
                left: rect.left,
                minWidth: searchable ? 320 : 200,
                maxWidth: 420,
                maxHeight: 360,
                overflowY: 'auto',
                zIndex: 9999,
                background: 'var(--ds-surface-overlay)',
                border: '1px solid var(--ds-border)',
                borderRadius: 4,
                boxShadow: 'var(--ds-shadow-overlay, 0 8px 16px rgba(9,30,66,0.25))',
                padding: '4px 0',
                fontFamily: 'var(--ds-font-family-body, "Atlassian Sans")',
              }}
            >
              {searchable && (
                <div style={{ padding: '4px 8px 8px' }}>
                  <Textfield
                    autoFocus
                    isCompact
                    value={query}
                    onChange={(e) => setQuery((e.target as HTMLInputElement).value)}
                    placeholder={searchPlaceholder ?? 'Search…'}
                  />
                </div>
              )}
              {visibleOptions.length === 0 && (
                <div style={{ padding: '8px 12px', fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtlest)' }}>No matches</div>
              )}
              {visibleOptions.map((o) => {
                const selected = o.value === value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    role="menuitemradio"
                    aria-checked={selected}
                    onClick={() => { setOpen(false); onChange(o.value); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      width: '100%',
                      padding: '8px 12px',
                      border: 'none',
                      background: searchable && selected ? 'var(--ds-background-selected)' : 'transparent',
                      textAlign: 'left',
                      fontFamily: 'inherit',
                      fontSize: 'var(--ds-font-size-400)',
                      color: 'var(--ds-text)',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {!searchable && (
                      <span
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          border: `2px solid ${selected ? 'var(--ds-border-selected)' : 'var(--ds-border-bold)'}`,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {selected ? <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ds-background-selected-bold)' }} /> : null}
                      </span>
                    )}
                    {o.icon ? <span style={{ display: 'inline-flex', flexShrink: 0 }}>{o.icon}</span> : null}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.label}</span>
                  </button>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </span>
  );
}

interface DependenciesDiagramProps {
  projectKey: string;
  /** Full project name (e.g. "Senaei BAU"). Falls back to projectKey when absent. */
  projectName?: string | null;
  /** Project brand color (hex) for the frame chip icon. */
  projectColor?: string | null;
  dependencies: Dependency[];
  issueMeta?: IssueMeta;
  onAddClick: () => void;
  onChanged: () => void;
  /** Hub-supplied soft-delete of a dependency by id (adapter owns the table). */
  onDeleteDependency: (id: number | string) => Promise<void>;
  /** Hub-supplied timeline deep-link for "Locate work item in timeline". */
  getTimelineHref: (key: string) => string;
  /** When set, the canvas centers on + highlights this work item on mount
   *  (driven by the timeline "Show dependencies for <key>" flow, ?focus=). */
  focusKey?: string | null;
  /** Hierarchy map (card keys + ancestors) for the "Roll-up to" filter. */
  hierarchy?: Hierarchy;
  /** All projects from the project module — for the "Project" filter. */
  projects?: Array<{ project_key: string; name: string | null; color?: string | null; avatar_url?: string | null; icon?: string | null }>;
}

type RollUpLevel = 'none' | 'Business Request' | 'Epic' | 'Feature' | 'Story';

function DiagramInner({ projectKey, projectName, projectColor, dependencies, issueMeta = {}, hierarchy = {}, projects = [], onAddClick, onChanged, onDeleteDependency, getTimelineHref, focusKey }: DependenciesDiagramProps) {
  const { setCenter, setViewport, getViewport, zoomIn, zoomOut } = useReactFlow();
  const handleDeleteDep = useCallback(
    async (depId: number | string) => {
      try {
        await onDeleteDependency(depId);
        catalystToast.success('Dependency removed');
        onChanged();
      } catch (err) {
        console.error('[Dependencies] remove failed', err);
        catalystToast.error(`Could not remove dependency: ${(err as any)?.message ?? String(err)}`);
      }
    },
    [onChanged, onDeleteDependency],
  );

  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [linkType, setLinkType] = useState<LinkType>('all');
  const [rollUp, setRollUp] = useState<RollUpLevel>('none');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [sprint, setSprint] = useState<string>('all');
  const [release, setRelease] = useState<string>('all');
  const [workItem, setWorkItem] = useState<string>('all');

  /* Edge highlight state (Vikram 2026-06-25):
     - hoveredEdgeId : edge under the cursor → blue (transient)
     - selectedEdgeId: a clicked edge → blue (persists until Esc / pane click)
     - selectedNodeId: a clicked card → ALL its connected edges → blue */
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  // Single-relationship highlight (Highlight related → pick one item): borders
  // ONLY this one card (the picked target), never its neighbours. Distinct from
  // selectedNodeId (card click), which borders the card + all its neighbours.
  const [highlightCardId, setHighlightCardId] = useState<string | null>(null);
  const clearSelection = useCallback(() => { setSelectedEdgeId(null); setSelectedNodeId(null); setHighlightCardId(null); }, []);

  /* Project options — ALL projects from the project module (ph_jira_projects),
     not just those present in the dependency set. */
  const projectOptions = useMemo(() => {
    const mk = (p: { project_key: string; name?: string | null; color?: string | null; avatar_url?: string | null; icon?: string | null }) => ({
      value: p.project_key,
      label: p.name ? `${p.project_key} — ${p.name}` : p.project_key,
      icon: (
        <ProjectIcon
          projectKey={p.project_key}
          name={p.name ?? p.project_key}
          color={p.color ?? undefined}
          avatarUrl={p.avatar_url ?? undefined}
          iconName={p.icon ?? undefined}
          size="xsmall"
        />
      ),
    });
    const opts = (projects ?? []).filter((p) => p.project_key).map(mk);
    const known = new Set(opts.map((o) => o.value));
    Object.values(issueMeta).forEach((m) => {
      if (m.project_key && !known.has(m.project_key)) { known.add(m.project_key); opts.push(mk({ project_key: m.project_key })); }
    });
    opts.sort((a, b) => a.value.localeCompare(b.value));
    return [{ value: 'all', label: 'All projects' }, ...opts];
  }, [projects, issueMeta]);

  const sprintOptions = useMemo(() => {
    const s = new Set<string>();
    Object.values(issueMeta).forEach((m) => { if (m.sprint) s.add(m.sprint); });
    return [{ value: 'all', label: 'All sprints' }, ...Array.from(s).sort().map((p) => ({ value: p, label: p }))];
  }, [issueMeta]);

  const releaseOptions = useMemo(() => {
    const s = new Set<string>();
    Object.values(issueMeta).forEach((m) => { if (m.release) m.release.split(', ').forEach((r) => { if (r) s.add(r); }); });
    return [{ value: 'all', label: 'All releases' }, ...Array.from(s).sort().map((p) => ({ value: p, label: p }))];
  }, [issueMeta]);

  /* Work item options — Jira parity: native type icon + key + title, searchable. */
  const workItemOptions = useMemo(() => {
    const keys = new Set<string>();
    dependencies.forEach((d) => { keys.add(d.source_issue_key); keys.add(d.target_issue_key); });
    const opts = Array.from(keys).sort().map((k) => {
      const meta = issueMeta[k];
      const summary = meta?.summary ?? '';
      const type = meta?.issue_type ?? hierarchy[k]?.issue_type ?? null;
      return {
        value: k,
        label: summary ? `${k} ${summary}` : k,
        icon: type ? <JiraIssueTypeIcon type={type} size={16} /> : undefined,
      };
    });
    return [{ value: 'all', label: 'All work items' }, ...opts];
  }, [dependencies, issueMeta, hierarchy]);

  /* Resolve a key to its ancestor of the requested hierarchy level (or itself). */
  const resolveAncestor = useCallback((key: string, level: RollUpLevel): string => {
    if (level === 'none') return key;
    let cur: string | undefined = key;
    const seen = new Set<string>();
    while (cur && !seen.has(cur)) {
      seen.add(cur);
      const node = hierarchy[cur] ?? (issueMeta[cur] ? { issue_type: issueMeta[cur].issue_type, parent_key: issueMeta[cur].parent_key ?? null, summary: issueMeta[cur].summary } : null);
      if (!node) break;
      if ((node.issue_type ?? '') === level) return cur;
      cur = node.parent_key ?? undefined;
    }
    return key; // no ancestor of that level — keep the original card
  }, [hierarchy, issueMeta]);

  const matchesCardFilters = useCallback((key: string): boolean => {
    const m = issueMeta[key];
    if (projectFilter !== 'all' && (m?.project_key ?? '') !== projectFilter) return false;
    if (sprint !== 'all' && (m?.sprint ?? '') !== sprint) return false;
    if (release !== 'all') {
      const rels = (m?.release ?? '').split(', ').filter(Boolean);
      if (!rels.includes(release)) return false;
    }
    return true;
  }, [issueMeta, projectFilter, sprint, release]);

  /* Apply link-type + project/sprint/release/work-item filters, then roll-up remap. */
  const filteredDeps = useMemo(() => {
    let result = linkType === 'all' ? dependencies : dependencies.filter((d) => d.dependency_type === linkType);

    if (projectFilter !== 'all' || sprint !== 'all' || release !== 'all') {
      // keep an edge if EITHER endpoint matches (cross-boundary deps stay visible)
      result = result.filter((d) => matchesCardFilters(d.source_issue_key) || matchesCardFilters(d.target_issue_key));
    }
    if (workItem !== 'all') {
      result = result.filter((d) => d.source_issue_key === workItem || d.target_issue_key === workItem);
    }
    if (rollUp !== 'none') {
      const seenEdge = new Set<string>();
      const rolled: Dependency[] = [];
      for (const d of result) {
        const s = resolveAncestor(d.source_issue_key, rollUp);
        const t = resolveAncestor(d.target_issue_key, rollUp);
        if (s === t) continue; // collapsed onto itself
        const sig = `${s}|${t}|${d.dependency_type}`;
        if (seenEdge.has(sig)) continue;
        seenEdge.add(sig);
        rolled.push({ ...d, source_issue_key: s, target_issue_key: t });
      }
      result = rolled;
    }
    return result;
  }, [dependencies, linkType, projectFilter, sprint, release, workItem, rollUp, matchesCardFilters, resolveAncestor]);

  const uniqueIssues = useMemo(() => {
    const keys = new Set<string>();
    filteredDeps.forEach((dep) => {
      keys.add(dep.source_issue_key);
      keys.add(dep.target_issue_key);
    });
    return Array.from(keys).sort();
  }, [filteredDeps]);

  /* Card meta: prefer full issueMeta; fall back to hierarchy (type+summary)
     for roll-up ancestor cards that weren't in the dependency set. */
  const cardData = useCallback(
    (k: string) => {
      const meta = issueMeta[k] ?? (hierarchy[k]
        ? { issue_type: hierarchy[k].issue_type, summary: hierarchy[k].summary }
        : null);
      // Related work items for the "Highlight related" submenu — the OTHER
      // endpoint of every edge touching this card, + that edge's id so a click
      // can highlight the wire (same blue as a direct line click).
      const related: RelatedItem[] = filteredDeps
        .filter((d) => d.source_issue_key === k || d.target_issue_key === k)
        .map((d) => {
          const outgoing = d.source_issue_key === k;
          const other = outgoing ? d.target_issue_key : d.source_issue_key;
          const om = issueMeta[other] ?? (hierarchy[other] ? { issue_type: hierarchy[other].issue_type, summary: hierarchy[other].summary } : null);
          return { key: other, label: om?.summary ?? '', type: om?.issue_type ?? null, edgeId: `dep-${d.id}`, direction: (outgoing ? 'outgoing' : 'incoming') as 'outgoing' | 'incoming' };
        });
      return {
        label: k,
        meta,
        onAddDependency: onAddClick,
        onLocate: () => { window.location.href = getTimelineHref(k); },
        // Filter the whole report down to this work item (sets the Work item chip).
        onFilterByItem: () => { setSelectedEdgeId(null); setSelectedNodeId(null); setWorkItem(k); },
        relatedItems: related,
        // Selecting a related item highlights ONLY that one relationship: the
        // connecting wire + the picked target card's border. NOT the source card,
        // NOT other neighbours. (Vikram 2026-06-25)
        onHighlightRelated: (key: string, edgeId: string) => { setSelectedNodeId(null); setSelectedEdgeId(edgeId); setHighlightCardId(key); },
      };
    },
    [issueMeta, hierarchy, onAddClick, projectKey, filteredDeps, setWorkItem, setSelectedEdgeId, setSelectedNodeId, setHighlightCardId, getTimelineHref],
  );

  /* Keyboard shortcuts (Jira parity): arrows pan, +/- zoom. Active while the
     canvas is focused / hovered and no text input is targeted. */
  const PAN_STEP = 80;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;
      switch (e.key) {
        case 'ArrowLeft': { const v = getViewport(); setViewport({ ...v, x: v.x + PAN_STEP }, { duration: 120 }); break; }
        case 'ArrowRight': { const v = getViewport(); setViewport({ ...v, x: v.x - PAN_STEP }, { duration: 120 }); break; }
        case 'ArrowUp': { const v = getViewport(); setViewport({ ...v, y: v.y + PAN_STEP }, { duration: 120 }); break; }
        case 'ArrowDown': { const v = getViewport(); setViewport({ ...v, y: v.y - PAN_STEP }, { duration: 120 }); break; }
        case '+': case '=': zoomIn({ duration: 120 }); break;
        case '-': case '_': zoomOut({ duration: 120 }); break;
        case 'Escape': clearSelection(); return;
        default: return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [getViewport, setViewport, zoomIn, zoomOut, clearSelection]);

  const nodes: Node[] = useMemo(() => {
    const depth = computeDepth(
      uniqueIssues,
      filteredDeps.map((d) => ({ source: d.source_issue_key, target: d.target_issue_key })),
    );
    const card = (k: string, x: number, y: number): Node => ({
      id: k,
      type: 'workItem',
      data: { ...cardData(k), focused: k === focusKey },
      position: { x, y },
      selected: k === focusKey,
      draggable: true,
      zIndex: k === focusKey ? 3 : 2, // frame(0) < edges(1) < cards(2) < focused(3)
    });

    if (groupBy === 'none') {
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
      // No project frame box when ungrouped — cards float directly on the grey
      // canvas (Jira parity; the frame box read as an unwanted "small container").
      return uniqueIssues.map((k) => card(k, PAD_X + (depth[k] ?? 0) * COL_W, HEADER_H + rowOf[k] * ROW_H));
    }

    // Grouped: one frame per group value, stacked vertically.
    const buckets: Record<string, string[]> = {};
    for (const k of uniqueIssues) (buckets[groupValue(issueMeta[k], groupBy)] ||= []).push(k);
    const order = (a: string, b: string) => {
      if (groupBy === 'status') return STATUS_ORDER.indexOf(a) - STATUS_ORDER.indexOf(b);
      return a.localeCompare(b);
    };
    const groups = Object.keys(buckets).sort(order);
    const maxDepth = uniqueIssues.reduce((m, k) => Math.max(m, depth[k] ?? 0), 0);
    const frameWidth = PAD_X * 2 + maxDepth * COL_W + CARD_W;

    const frames: Node[] = [];
    const cards: Node[] = [];
    let cumY = 0;
    for (const g of groups) {
      const keys = buckets[g];
      const colCount: Record<number, number> = {};
      const rowOf: Record<string, number> = {};
      let maxRows = 1;
      for (const k of keys) {
        const d = depth[k] ?? 0;
        const r = colCount[d] ?? 0;
        rowOf[k] = r; colCount[d] = r + 1; maxRows = Math.max(maxRows, r + 1);
      }
      const frameHeight = HEADER_H + (maxRows - 1) * ROW_H + 140 + PAD_Y;
      frames.push({
        id: `frame:${g}`,
        type: 'frame',
        position: { x: 0, y: cumY },
        data: { label: g },
        draggable: false,
        selectable: false,
        style: { width: frameWidth, height: frameHeight, zIndex: 0 },
      });
      for (const k of keys) cards.push(card(k, PAD_X + (depth[k] ?? 0) * COL_W, cumY + HEADER_H + rowOf[k] * ROW_H));
      cumY += frameHeight + LANE_GAP;
    }
    return [...frames, ...cards];
  }, [uniqueIssues, filteredDeps, issueMeta, projectKey, projectName, projectColor, groupBy, cardData, focusKey]);

  const [sel, setSel] = useState<any>(null);
  const onSelectEdge = useCallback((d: any, point: { x: number; y: number }) => setSel({ ...d, x: point.x, y: point.y }), []);

  const edges: Edge[] = useMemo(
    () =>
      filteredDeps.map((dep) => {
        const id = `dep-${dep.id}`;
        // Active (blue) when: hovered, selected (clicked), OR connected to the
        // clicked card. Otherwise neutral grey.
        const active =
          hoveredEdgeId === id ||
          selectedEdgeId === id ||
          (!!selectedNodeId && (dep.source_issue_key === selectedNodeId || dep.target_issue_key === selectedNodeId));
        return {
          id,
          source: dep.source_issue_key,
          target: dep.target_issue_key,
          type: 'dependency',
          zIndex: active ? 2 : 1,
          // ads-scanner:ignore-next-line — SVG marker requires a concrete color, not a CSS var()
          markerEnd: { type: MarkerType.ArrowClosed, color: active ? EDGE_BLUE_HEX : EDGE_GREY_HEX, width: 18, height: 18 },
          data: {
            label: dep.dependency_type === 'blocks' ? 'blocks' : 'is blocked by',
            depId: dep.id,
            active,
            sourceKey: dep.source_issue_key,
            targetKey: dep.target_issue_key,
            sourceMeta: issueMeta[dep.source_issue_key] ?? null,
            targetMeta: issueMeta[dep.target_issue_key] ?? null,
            onSelect: onSelectEdge,
          },
        };
      }),
    [filteredDeps, issueMeta, onSelectEdge, hoveredEdgeId, selectedEdgeId, selectedNodeId],
  );

  const nodeTypes = useMemo(() => ({ workItem: WorkItemNode, frame: FrameNode }), []);
  const edgeTypes = useMemo(() => ({ dependency: DependencyEdge }), []);

  const [flowNodes, setNodes, onNodesChange] = useNodesState(nodes);
  const [flowEdges, setEdges, onEdgesChange] = useEdgesState(edges);
  const [zoomOnScroll, setZoomOnScroll] = useState(false);

  // Split node/edge sync (Vikram 2026-06-25): the combined effect re-applied the
  // memoised `nodes` (original layout positions) every time `edges` changed —
  // so hovering/clicking a card or edge (which recomputes `edges` for the blue
  // highlight) snapped any dragged card back to its computed spot. Syncing nodes
  // ONLY when the layout memo itself changes preserves manual drags; edge
  // re-colouring no longer touches node positions.
  React.useEffect(() => {
    setNodes(nodes);
  }, [nodes, setNodes]);

  React.useEffect(() => {
    setEdges(edges);
  }, [edges, setEdges]);

  // Patch selection flags in place (preserve positions — no memo recompute).
  // selected  = the clicked card → primary-blue border (ONLY this card, never its
  //             neighbours — Vikram 2026-06-25).
  // highlight = the single card picked via "Highlight related" → blue border.
  // Both cleared on Esc / pane click.
  React.useEffect(() => {
    setNodes((prev) =>
      prev.map((n) => {
        if (n.type !== 'workItem') return n;
        const sel = n.id === selectedNodeId;
        const hl = n.id === highlightCardId;
        if (n.data?.selected === sel && n.data?.highlight === hl) return n;
        return { ...n, data: { ...n.data, selected: sel, highlight: hl } };
      }),
    );
  }, [selectedNodeId, highlightCardId, setNodes]);

  /* Center + highlight the focused work item (?focus= from the timeline). */
  React.useEffect(() => {
    if (!focusKey) return;
    const target = nodes.find((n) => n.id === focusKey);
    if (!target) return;
    const t = setTimeout(() => {
      setCenter(target.position.x + CARD_W / 2, target.position.y + ROW_H / 2, { zoom: 1, duration: 500 });
    }, 120);
    return () => clearTimeout(t);
  }, [focusKey, nodes, setCenter]);

  return (
    <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', fontFamily: 'var(--ds-font-family-body, "Atlassian Sans")' }}>
      {/* Filter toolbar (Jira Plans parity) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '12px 16px',
          borderBottom: '1px solid var(--ds-border)',
          background: 'var(--ds-surface)',
          flexWrap: 'wrap',
        }}
      >
        {/* Roll-up to: collapse dependency endpoints onto their ancestor of
            the chosen hierarchy level (Epic / Feature / Story). */}
        <ChipSelect<RollUpLevel>
          label="Roll-up to"
          value={rollUp}
          active={rollUp !== 'none'}
          options={[
            { value: 'none', label: 'None' },
            { value: 'Business Request', label: 'Business Request', icon: <JiraIssueTypeIcon type="Business Request" size={16} /> },
            { value: 'Epic', label: 'Epic', icon: <JiraIssueTypeIcon type="Epic" size={16} /> },
            { value: 'Feature', label: 'Feature', icon: <JiraIssueTypeIcon type="Feature" size={16} /> },
            { value: 'Story', label: 'Story', icon: <JiraIssueTypeIcon type="Story" size={16} /> },
          ]}
          onChange={setRollUp}
        />
        <ChipSelect<GroupBy>
          label="Group by"
          value={groupBy}
          active={groupBy !== 'none'}
          options={[
            { value: 'none', label: 'None' },
            { value: 'status', label: 'Status' },
            { value: 'type', label: 'Type' },
            { value: 'assignee', label: 'Assignee' },
          ]}
          onChange={setGroupBy}
        />
        <ChipSelect<string>
          label="Project"
          value={projectFilter}
          active={projectFilter !== 'all'}
          options={projectOptions}
          onChange={setProjectFilter}
        />
        <ChipSelect<string>
          label="Sprint"
          value={sprint}
          active={sprint !== 'all'}
          options={sprintOptions}
          onChange={setSprint}
        />
        <ChipSelect<string>
          label="Release"
          value={release}
          active={release !== 'all'}
          options={releaseOptions}
          onChange={setRelease}
        />
        <ChipSelect<string>
          label="Work item"
          value={workItem}
          active={workItem !== 'all'}
          options={workItemOptions}
          onChange={setWorkItem}
          searchable
          searchPlaceholder="Choose a work item..."
        />
        <ChipSelect<LinkType>
          label="Issue link type"
          value={linkType}
          active={linkType !== 'all'}
          options={[
            { value: 'all', label: 'All' },
            { value: 'blocks', label: 'Blocks' },
            { value: 'is_blocked_by', label: 'Is blocked by' },
          ]}
          onChange={setLinkType}
        />
        <button
          type="button"
          onClick={() => { setGroupBy('none'); setLinkType('all'); setRollUp('none'); setProjectFilter('all'); setSprint('all'); setRelease('all'); setWorkItem('all'); }}
          style={{ border: 'none', background: 'transparent', color: 'var(--ds-link)', fontSize: 'var(--ds-font-size-400)', cursor: 'pointer', padding: '0 8px', height: 32 }}
        >
          Reset
        </button>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle)' }}>
          {filteredDeps.length} {filteredDeps.length === 1 ? 'dependency' : 'dependencies'}
        </span>
        <button
          type="button"
          onClick={onAddClick}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            height: 32,
            padding: '0 12px',
            background: 'var(--ds-surface)',
            border: '1px solid var(--ds-border)',
            borderRadius: 8,
            color: 'var(--ds-text)',
            fontSize: 'var(--ds-font-size-400)',
            fontWeight: 500,
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ds-background-neutral-subtle-hovered, var(--ds-background-neutral))'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--ds-surface)'; }}
        >
          <Plus size={16} />
          Add dependency
        </button>
      </div>

      {/* Canvas — grey tint spans the whole surface (Jira parity). */}
      <div style={{ position: 'relative', flex: 1, minHeight: 0, background: 'var(--ds-surface-sunken)' }}>
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onEdgeClick={(e, edge) => { setSelectedNodeId(null); setHighlightCardId(null); setSelectedEdgeId(edge.id); onSelectEdge(edge.data, { x: e.clientX, y: e.clientY }); }}
          onEdgeMouseEnter={(_, edge) => setHoveredEdgeId(edge.id)}
          onEdgeMouseLeave={() => setHoveredEdgeId(null)}
          onNodeClick={(_, node) => { setSelectedEdgeId(null); setHighlightCardId(null); setSelectedNodeId(node.id); }}
          onPaneClick={clearSelection}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          // ads-scanner:ignore-next-line — React Flow fitView padding ratio, not CSS px
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.2}
          maxZoom={2}
          nodesDraggable
          zoomOnScroll={zoomOnScroll}
          panOnScroll
          proOptions={{ hideAttribution: true }}
          style={{ background: 'var(--ds-surface-sunken)' }}
        />
        <ZoomBar
          zoomOnScroll={zoomOnScroll}
          onToggleScroll={() => setZoomOnScroll((v) => !v)}
        />
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
