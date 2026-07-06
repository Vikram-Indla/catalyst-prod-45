/**
 * PageTree — canonical Wiki page tree (CAT-DOCS-NOTION-20260704-001).
 *
 * Confluence-style nested page navigation built from ADS primitives:
 * @atlaskit/pragmatic-drag-and-drop (element adapter) with the tree-item
 * hitbox — drag a page above/below a sibling to reorder, onto a page to
 * nest it as a child. No hand-rolled drag machinery.
 */
import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import {
  draggable,
  dropTargetForElements,
  monitorForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import {
  attachInstruction,
  extractInstruction,
  type Instruction,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';
import { ChevronRight, ChevronDown, FileText, Plus, Trash2 } from '@/lib/atlaskit-icons';
import type { WikiPageSummary } from '@/hooks/useWiki';

export interface PageTreeMove {
  id: string;
  newParentId: string | null;
  newPosition: number;
}

export interface PageTreeProps {
  pages: WikiPageSummary[];
  selectedId?: string | null;
  onSelect: (page: WikiPageSummary) => void;
  onMove: (move: PageTreeMove) => void;
  onCreateChild: (parentId: string | null) => void;
  onDelete?: (page: WikiPageSummary) => void;
  emptyHint?: string;
}

interface TreeNode extends WikiPageSummary {
  children: TreeNode[];
}

function buildTree(pages: WikiPageSummary[]): TreeNode[] {
  const byId = new Map<string, TreeNode>();
  pages.forEach((p) => byId.set(p.id, { ...p, children: [] }));
  const roots: TreeNode[] = [];
  byId.forEach((node) => {
    const parent = node.parent_id ? byId.get(node.parent_id) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  });
  const sort = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.position - b.position || a.title.localeCompare(b.title));
    nodes.forEach((n) => sort(n.children));
  };
  sort(roots);
  return roots;
}

function isDescendant(pages: WikiPageSummary[], candidateId: string, ancestorId: string): boolean {
  const parentOf = new Map(pages.map((p) => [p.id, p.parent_id]));
  let cur: string | null | undefined = candidateId;
  while (cur) {
    if (cur === ancestorId) return true;
    cur = parentOf.get(cur) ?? null;
  }
  return false;
}

const ROW_H = 30;
const INDENT = 16;

function TreeRow({
  node,
  depth,
  selectedId,
  expanded,
  onToggle,
  onSelect,
  onCreateChild,
  onDelete,
}: {
  node: TreeNode;
  depth: number;
  selectedId?: string | null;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (page: WikiPageSummary) => void;
  onCreateChild: (parentId: string | null) => void;
  onDelete?: (page: WikiPageSummary) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [instruction, setInstruction] = useState<Instruction | null>(null);
  const [dragging, setDragging] = useState(false);
  const isSelected = selectedId === node.id;
  const isOpen = expanded.has(node.id);
  const hasChildren = node.children.length > 0;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const cleanupDrag = draggable({
      element: el,
      getInitialData: () => ({ kind: 'wiki-page', pageId: node.id, parentId: node.parent_id }),
      onDragStart: () => setDragging(true),
      onDrop: () => setDragging(false),
    });
    const cleanupDrop = dropTargetForElements({
      element: el,
      canDrop: ({ source }) => source.data.kind === 'wiki-page' && source.data.pageId !== node.id,
      getData: ({ input, element }) =>
        attachInstruction(
          { kind: 'wiki-page-target', pageId: node.id, parentId: node.parent_id },
          {
            input,
            element,
            currentLevel: depth,
            indentPerLevel: INDENT,
            mode: isOpen && hasChildren ? 'expanded' : 'standard',
          },
        ),
      onDrag: ({ self }) => setInstruction(extractInstruction(self.data)),
      onDragLeave: () => setInstruction(null),
      onDrop: () => setInstruction(null),
    });
    return () => {
      cleanupDrag();
      cleanupDrop();
    };
  }, [node.id, node.parent_id, depth, isOpen, hasChildren]);

  const dropLine =
    instruction?.type === 'reorder-above'
      ? { top: -1 }
      : instruction?.type === 'reorder-below'
        ? { bottom: -1 }
        : null;

  return (
    <Fragment>
      <div
        ref={ref}
        role="treeitem"
        aria-selected={isSelected}
        aria-expanded={hasChildren ? isOpen : undefined}
        tabIndex={0}
        onClick={() => onSelect(node)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSelect(node);
          if (e.key === 'ArrowRight' && !isOpen) onToggle(node.id);
          if (e.key === 'ArrowLeft' && isOpen) onToggle(node.id);
        }}
        className="wiki-tree-row"
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          height: ROW_H,
          paddingInlineStart: 6 + depth * INDENT,
          paddingInlineEnd: 6,
          borderRadius: 4,
          cursor: 'pointer',
          userSelect: 'none',
          opacity: dragging ? 0.5 : 1,
          background: isSelected
            ? 'var(--ds-background-selected)'
            : instruction?.type === 'make-child'
              ? 'var(--ds-background-neutral-subtle)'
              : undefined,
          color: isSelected ? 'var(--ds-text-selected)' : 'var(--ds-text)',
          font: 'var(--ds-font-body)',
        }}
      >
        {dropLine && (
          <span
            aria-hidden
            style={{
              position: 'absolute',
              insetInlineStart: 6 + depth * INDENT,
              insetInlineEnd: 0,
              height: 2,
              background: 'var(--ds-border-focused)',
              borderRadius: 1,
              ...dropLine,
            }}
          />
        )}
        {/* Indentation guides — one faint vertical line per ancestor level,
            so deep trees keep a legible parent thread (Confluence/Notion). */}
        {Array.from({ length: depth }, (_, i) => (
          <span
            key={i}
            aria-hidden
            style={{
              position: 'absolute',
              insetInlineStart: 13 + i * INDENT,
              top: 0,
              bottom: 0,
              width: 1,
              background: 'var(--ds-border)',
              pointerEvents: 'none',
            }}
          />
        ))}
        <button
          type="button"
          aria-label={isOpen ? 'Collapse' : 'Expand'}
          onClick={(e) => {
            e.stopPropagation();
            onToggle(node.id);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 18,
            height: 18,
            border: 'none',
            background: 'transparent',
            color: 'var(--ds-icon-subtle)',
            cursor: 'pointer',
            visibility: hasChildren ? 'visible' : 'hidden',
            padding: 0,
          }}
        >
          {isOpen ? (
            <ChevronDown style={{ width: 14, height: 14 }} />
          ) : (
            <ChevronRight style={{ width: 14, height: 14 }} />
          )}
        </button>
        {node.icon ? (
          <span aria-hidden style={{ width: 16, textAlign: 'center', flexShrink: 0 }}>{node.icon}</span>
        ) : (
          <FileText aria-hidden style={{ width: 14, height: 14, color: 'var(--ds-icon-subtle)', flexShrink: 0 }} />
        )}
        <span
          // Arabic titles lay out RTL, English LTR (V7 RTL audit).
          dir="auto"
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
            minWidth: 0,
          }}
        >
          {node.title || 'Untitled'}
        </span>
        <button
          type="button"
          aria-label={`Add a page inside ${node.title || 'Untitled'}`}
          className="wiki-tree-add"
          onClick={(e) => {
            e.stopPropagation();
            onCreateChild(node.id);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 20,
            height: 20,
            border: 'none',
            borderRadius: 4,
            background: 'transparent',
            color: 'var(--ds-icon-subtle)',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <Plus style={{ width: 14, height: 14 }} />
        </button>
        {onDelete && (
          <button
            type="button"
            aria-label={`Delete ${node.title || 'Untitled'}`}
            className="wiki-tree-add"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(node);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 20,
              height: 20,
              border: 'none',
              borderRadius: 4,
              background: 'transparent',
              color: 'var(--ds-icon-subtle)',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <Trash2 style={{ width: 13, height: 13 }} />
          </button>
        )}
      </div>
      {isOpen &&
        node.children.map((child) => (
          <TreeRow
            key={child.id}
            node={child}
            depth={depth + 1}
            selectedId={selectedId}
            expanded={expanded}
            onToggle={onToggle}
            onSelect={onSelect}
            onCreateChild={onCreateChild}
            onDelete={onDelete}
          />
        ))}
    </Fragment>
  );
}

export function PageTree({ pages, selectedId, onSelect, onMove, onCreateChild, onDelete, emptyHint }: PageTreeProps) {
  const tree = useMemo(() => buildTree(pages), [pages]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  // Auto-expand ancestors of the selection so deep pages are always visible.
  useEffect(() => {
    if (!selectedId) return;
    const parentOf = new Map(pages.map((p) => [p.id, p.parent_id]));
    setExpanded((prev) => {
      const next = new Set(prev);
      let cur = parentOf.get(selectedId) ?? null;
      while (cur) {
        next.add(cur);
        cur = parentOf.get(cur) ?? null;
      }
      return next;
    });
  }, [selectedId, pages]);

  useEffect(() => {
    return monitorForElements({
      canMonitor: ({ source }) => source.data.kind === 'wiki-page',
      onDrop: ({ source, location }) => {
        const target = location.current.dropTargets[0];
        if (!target) return;
        const sourceId = source.data.pageId as string;
        const targetId = (target.data as { pageId?: string }).pageId;
        if (!targetId || sourceId === targetId) return;
        // Never drop a page into its own subtree
        if (isDescendant(pages, targetId, sourceId)) return;

        const instruction = extractInstruction(target.data);
        const targetPage = pages.find((p) => p.id === targetId);
        if (!instruction || !targetPage) return;

        if (instruction.type === 'make-child') {
          const children = pages.filter((p) => p.parent_id === targetId);
          const maxPos = children.reduce((m, c) => Math.max(m, c.position), -1);
          onMove({ id: sourceId, newParentId: targetId, newPosition: maxPos + 1 });
          setExpanded((prev) => new Set(prev).add(targetId));
        } else if (instruction.type === 'reorder-above' || instruction.type === 'reorder-below') {
          const siblings = pages
            .filter((p) => (p.parent_id ?? null) === (targetPage.parent_id ?? null) && p.id !== sourceId)
            .sort((a, b) => a.position - b.position);
          const idx = siblings.findIndex((s) => s.id === targetId);
          const insertAt = instruction.type === 'reorder-above' ? idx : idx + 1;
          const newPosition =
            insertAt <= 0
              ? (siblings[0]?.position ?? 0) - 1
              : insertAt >= siblings.length
                ? (siblings[siblings.length - 1]?.position ?? 0) + 1
                : (siblings[insertAt - 1].position + siblings[insertAt].position) / 2;
          onMove({ id: sourceId, newParentId: targetPage.parent_id ?? null, newPosition });
        }
      },
    });
  }, [pages, onMove]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // WAI-ARIA tree keyboard pattern: Up/Down traverse VISIBLE rows in DOM
  // order, Home/End jump to the extremes. (Right/Left expand/collapse are
  // handled per-row.) DOM-order query keeps this correct under any
  // expansion state without threading a flat index through the recursion.
  const handleTreeKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
    const root = e.currentTarget;
    const items = Array.from(root.querySelectorAll<HTMLElement>('[role="treeitem"]'));
    const current = items.indexOf(document.activeElement as HTMLElement);
    if (current < 0 && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    const next =
      e.key === 'ArrowDown'
        ? items[current + 1]
        : e.key === 'ArrowUp'
          ? items[current - 1]
          : e.key === 'Home'
            ? items[0]
            : items[items.length - 1];
    next?.focus();
  };

  return (
    <div
      role="tree"
      aria-label="Pages"
      onKeyDown={handleTreeKeyDown}
      style={{ display: 'flex', flexDirection: 'column', gap: 1 }}
    >
      <style>{`
        .wiki-tree-row .wiki-tree-add { visibility: hidden; }
        .wiki-tree-row:hover .wiki-tree-add { visibility: visible; }
        .wiki-tree-row:hover { background: var(--ds-background-neutral-subtle); }
        .wiki-tree-row:focus-visible { outline: 2px solid var(--ds-border-focused); outline-offset: -2px; }
      `}</style>
      {tree.length === 0 ? (
        <p style={{ color: 'var(--ds-text-subtle)', font: 'var(--ds-font-body-small)', padding: '8px 6px', margin: 0 }}>
          {emptyHint ?? 'No pages yet'}
        </p>
      ) : (
        tree.map((node) => (
          <TreeRow
            key={node.id}
            node={node}
            depth={0}
            selectedId={selectedId}
            expanded={expanded}
            onToggle={toggle}
            onSelect={onSelect}
            onCreateChild={onCreateChild}
            onDelete={onDelete}
          />
        ))
      )}
      <button
        type="button"
        onClick={() => onCreateChild(null)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginTop: 4,
          padding: '5px 8px',
          border: 'none',
          borderRadius: 4,
          background: 'transparent',
          color: 'var(--ds-text-subtle)',
          font: 'var(--ds-font-body)',
          cursor: 'pointer',
        }}
      >
        <Plus style={{ width: 14, height: 14 }} /> New page
      </button>
    </div>
  );
}

export default PageTree;
