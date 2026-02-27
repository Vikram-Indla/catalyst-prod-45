/**
 * WorkItemTree — Main tree view for Work Item Hierarchy
 * Stage D: Full DB wiring, drag-and-drop hierarchy moves
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { ChevronRight, ChevronDown, GripVertical, MoreHorizontal, Trash2 } from 'lucide-react';
import type { WorkItem } from '@/types/hierarchy';
import { canBeParentOf } from '@/types/hierarchy';

interface WorkItemTreeProps {
  items: WorkItem[];
  selectedId: string | null;
  onSelect: (item: WorkItem) => void;
  onDelete?: (item: WorkItem) => void;
  onMove?: (itemId: string, newParentId: string) => void;
  allExpanded: boolean;
}

/* ── Skeleton rows ── */
export function TreeSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div style={{ border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden', background: '#FFFFFF' }}>
      <div style={{ height: 32, background: '#FAFAFA', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', padding: '0 12px' }}>
        <div style={{ width: 100, height: 10, background: '#E2E8F0', borderRadius: 4 }} />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ height: 44, maxHeight: 44, display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 12 + (i % 3) * 20, paddingRight: 12, borderBottom: '1px solid #E2E8F0' }}>
          <div style={{ width: 20, height: 20, borderRadius: 4, background: '#F1F5F9' }} className="hi-shimmer" />
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#E2E8F0' }} className="hi-shimmer" />
          <div style={{ width: 48, height: 12, borderRadius: 4, background: '#E2E8F0' }} className="hi-shimmer" />
          <div style={{ flex: 1, height: 12, borderRadius: 4, background: '#F1F5F9', maxWidth: 200 }} className="hi-shimmer" />
          <div style={{ width: 60, height: 22, borderRadius: 9999, background: '#F1F5F9' }} className="hi-shimmer" />
          <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#F1F5F9' }} className="hi-shimmer" />
        </div>
      ))}
      <style>{`
        @keyframes hi-shimmer-anim { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }
        .hi-shimmer { animation: hi-shimmer-anim 1.5s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

/* ── Priority bars (4 monochrome bars, 12×4px, gap 2px) ── */
function PriorityBars({ level }: { level: number }) {
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} style={{ width: 12, height: 4, borderRadius: 1, background: i <= level ? '#64748B' : '#E2E8F0' }} />
      ))}
    </div>
  );
}

function priorityToLevel(name?: string): number {
  if (!name) return 0;
  const n = name.toLowerCase();
  if (n === 'critical') return 4;
  if (n === 'high') return 3;
  if (n === 'medium') return 2;
  if (n === 'low') return 1;
  return 0;
}

/* ── Status pill ── */
function StatusPill({ status }: { status: WorkItem['status'] }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, height: 22, padding: '0 8px',
      borderRadius: 9999, background: `${status.color}14`, border: `1px solid ${status.color}33`, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: status.color, flexShrink: 0 }} />
      <span style={{ fontSize: 11, fontWeight: 600, color: status.colorText, fontFamily: "'Inter', sans-serif", lineHeight: 1 }}>
        {status.name}
      </span>
    </span>
  );
}

/* ── Assignee avatar ── */
function AssigneeAvatar({ assignee }: { assignee?: WorkItem['assignee'] }) {
  if (!assignee) {
    return <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#F1F5F9', border: '1px solid #E2E8F0', flexShrink: 0 }} />;
  }
  const initials = assignee.displayName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: '#FFFFFF', fontFamily: "'Inter', sans-serif" }}>{initials}</span>
    </div>
  );
}

/* ── Progress bar (parents only) ── */
function ProgressBar({ stats }: { stats: WorkItem['stats'] }) {
  if (stats.totalDescendants === 0) return <div style={{ width: 64 }} />;
  const pct = Math.round((stats.completedCount / stats.totalDescendants) * 100);
  const isComplete = pct === 100;
  const fillColor = isComplete ? '#16A34A' : '#2563EB';
  const textColor = isComplete ? '#15803D' : '#2563EB';
  return (
    <div style={{ width: 64, display: 'flex', flexDirection: 'column', gap: 2, justifyContent: 'center' }}>
      <div style={{ height: 4, background: '#F1F5F9', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: fillColor, borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 500, color: textColor, fontFamily: "'Inter', sans-serif", fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
        {pct}%
      </span>
    </div>
  );
}

/* ── Actions dropdown ── */
function ActionsMenu({ item, onDelete }: { item: WorkItem; onDelete?: (item: WorkItem) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="hi-row-action"
        onClick={(e) => { e.stopPropagation(); setOpen((p) => !p); }}
        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', flexShrink: 0 }}
        aria-label="More actions"
      >
        <MoreHorizontal size={16} color="#64748B" />
      </button>
      {open && (
        <div
          style={{
            position: 'absolute', top: '100%', right: 0, marginTop: 4, background: '#FFFFFF',
            border: '1px solid #E2E8F0', borderRadius: 6, zIndex: 50, minWidth: 140, overflow: 'hidden',
          }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete?.(item); }}
            style={{
              width: '100%', padding: '8px 12px', fontSize: 13, fontFamily: "'Inter', sans-serif",
              color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#FEF2F2')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '')}
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

/* ── DnD State ── */
type DragState = {
  draggedItem: WorkItem | null;
  dragOverId: string | null;
  isValidDrop: boolean;
};

/* ── Single tree row ── */
function TreeRow({
  item, depth, expanded, onToggle, selected, onSelect, onDelete,
  dragState, onDragStart, onDragOver, onDragEnd, onDrop,
}: {
  item: WorkItem; depth: number; expanded: boolean; onToggle: (id: string) => void;
  selected: boolean; onSelect: (item: WorkItem) => void; onDelete?: (item: WorkItem) => void;
  dragState: DragState;
  onDragStart: (item: WorkItem) => void;
  onDragOver: (e: React.DragEvent, targetItem: WorkItem) => void;
  onDragEnd: () => void;
  onDrop: (e: React.DragEvent, targetItem: WorkItem) => void;
}) {
  const hasChildren = item.children.length > 0;
  const isDragged = dragState.draggedItem?.id === item.id;
  const isDragOver = dragState.dragOverId === item.id;
  const isValidTarget = isDragOver && dragState.isValidDrop;
  const isInvalidTarget = isDragOver && !dragState.isValidDrop;

  let borderLeft = 'none';
  if (isValidTarget) borderLeft = '2px solid #2563EB';
  if (isInvalidTarget) borderLeft = '2px solid #DC2626';

  return (
    <div
      role="treeitem" aria-expanded={hasChildren ? expanded : undefined}
      aria-level={depth + 1} aria-selected={selected} tabIndex={0}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', item.id);
        onDragStart(item);
      }}
      onDragOver={(e) => onDragOver(e, item)}
      onDragEnd={onDragEnd}
      onDrop={(e) => onDrop(e, item)}
      onClick={() => onSelect(item)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(item); }
        if (e.key === 'ArrowRight' && hasChildren && !expanded) { e.preventDefault(); onToggle(item.id); }
        if (e.key === 'ArrowLeft' && hasChildren && expanded) { e.preventDefault(); onToggle(item.id); }
      }}
      className="hi-tree-row"
      style={{
        height: 44, maxHeight: 44, display: 'flex', alignItems: 'center', gap: 8,
        paddingLeft: depth * 20 + 12, paddingRight: 12, borderBottom: '1px solid #E2E8F0',
        background: selected ? '#EFF6FF' : undefined, cursor: 'pointer', outline: 'none',
        fontFamily: "'Inter', sans-serif",
        opacity: isDragged ? 0.5 : 1,
        borderLeft,
        transition: 'opacity 150ms ease, border-left 150ms ease',
      }}
    >
      <GripVertical size={14} className="hi-row-action" style={{ color: '#94A3B8', flexShrink: 0, cursor: 'grab' }} />

      {hasChildren ? (
        <button onClick={(e) => { e.stopPropagation(); onToggle(item.id); }}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', flexShrink: 0 }}
          aria-label={expanded ? 'Collapse' : 'Expand'}>
          {expanded ? <ChevronDown size={20} color="#64748B" /> : <ChevronRight size={20} color="#64748B" />}
        </button>
      ) : <div style={{ width: 20, flexShrink: 0 }} />}

      <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.hierarchyColor, flexShrink: 0 }} />

      <span style={{ fontSize: 12, fontWeight: 500, color: '#2563EB', fontVariantNumeric: 'tabular-nums', minWidth: 56, flexShrink: 0 }}>
        {item.key}
      </span>

      <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {item.title}
      </span>

      {item.priority && <PriorityBars level={priorityToLevel(item.priority.name)} />}
      <ProgressBar stats={item.stats} />

      {item.fixVersion && (
        <span style={{ height: 20, padding: '0 8px', fontSize: 10, fontWeight: 600, color: '#7C3AED', background: '#F5F3FF', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 9999, display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
          {item.fixVersion.name}
        </span>
      )}

      <StatusPill status={item.status} />
      <AssigneeAvatar assignee={item.assignee} />
      <ActionsMenu item={item} onDelete={onDelete} />
    </div>
  );
}

/* ── Recursive subtree ── */
function TreeBranch({
  items, depth, expandedIds, onToggle, selectedId, onSelect, onDelete,
  dragState, onDragStart, onDragOver, onDragEnd, onDrop,
}: {
  items: WorkItem[]; depth: number; expandedIds: Set<string>; onToggle: (id: string) => void;
  selectedId: string | null; onSelect: (item: WorkItem) => void; onDelete?: (item: WorkItem) => void;
  dragState: DragState;
  onDragStart: (item: WorkItem) => void;
  onDragOver: (e: React.DragEvent, targetItem: WorkItem) => void;
  onDragEnd: () => void;
  onDrop: (e: React.DragEvent, targetItem: WorkItem) => void;
}) {
  return (
    <>
      {items.map((item) => (
        <div key={item.id} role="group">
          <TreeRow item={item} depth={Math.min(depth, 8)} expanded={expandedIds.has(item.id)} onToggle={onToggle}
            selected={selectedId === item.id} onSelect={onSelect} onDelete={onDelete}
            dragState={dragState} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDrop={onDrop} />
          {expandedIds.has(item.id) && item.children.length > 0 && (
            <TreeBranch items={item.children} depth={depth + 1} expandedIds={expandedIds}
              onToggle={onToggle} selectedId={selectedId} onSelect={onSelect} onDelete={onDelete}
              dragState={dragState} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDrop={onDrop} />
          )}
        </div>
      ))}
    </>
  );
}

function collectIds(items: WorkItem[]): string[] {
  const ids: string[] = [];
  for (const item of items) {
    if (item.children.length > 0) { ids.push(item.id); ids.push(...collectIds(item.children)); }
  }
  return ids;
}

function countAll(items: WorkItem[]): number {
  let c = items.length;
  for (const item of items) c += countAll(item.children);
  return c;
}

/** Check if targetId is a descendant of itemId */
function isDescendant(items: WorkItem[], itemId: string, targetId: string): boolean {
  function findAndCheck(nodes: WorkItem[], underItem: boolean): boolean {
    for (const node of nodes) {
      if (underItem && node.id === targetId) return true;
      const isUnder = underItem || node.id === itemId;
      if (node.children.length > 0 && findAndCheck(node.children, isUnder)) return true;
    }
    return false;
  }
  return findAndCheck(items, false);
}

export function WorkItemTree({ items, selectedId, onSelect, onDelete, onMove, allExpanded }: WorkItemTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const prevAllExpanded = useRef(allExpanded);
  const [dragState, setDragState] = useState<DragState>({ draggedItem: null, dragOverId: null, isValidDrop: false });

  useEffect(() => {
    if (allExpanded !== prevAllExpanded.current) {
      prevAllExpanded.current = allExpanded;
      setExpandedIds(allExpanded ? new Set(collectIds(items)) : new Set());
    }
  }, [allExpanded, items]);

  const toggle = useCallback((id: string) => {
    setExpandedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }, []);

  const handleDragStart = useCallback((item: WorkItem) => {
    setDragState({ draggedItem: item, dragOverId: null, isValidDrop: false });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, targetItem: WorkItem) => {
    e.preventDefault();
    if (!dragState.draggedItem) return;
    if (dragState.draggedItem.id === targetItem.id) {
      setDragState(prev => ({ ...prev, dragOverId: null, isValidDrop: false }));
      return;
    }
    // Can't drop on own descendant
    if (isDescendant(items, dragState.draggedItem.id, targetItem.id)) {
      setDragState(prev => ({ ...prev, dragOverId: targetItem.id, isValidDrop: false }));
      return;
    }
    const isValid = canBeParentOf(targetItem.hierarchyLevel, dragState.draggedItem.hierarchyLevel);
    e.dataTransfer.dropEffect = isValid ? 'move' : 'none';
    setDragState(prev => ({ ...prev, dragOverId: targetItem.id, isValidDrop: isValid }));
  }, [dragState.draggedItem, items]);

  const handleDragEnd = useCallback(() => {
    setDragState({ draggedItem: null, dragOverId: null, isValidDrop: false });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetItem: WorkItem) => {
    e.preventDefault();
    if (!dragState.draggedItem || dragState.draggedItem.id === targetItem.id) {
      setDragState({ draggedItem: null, dragOverId: null, isValidDrop: false });
      return;
    }
    const isValid = canBeParentOf(targetItem.hierarchyLevel, dragState.draggedItem.hierarchyLevel)
      && !isDescendant(items, dragState.draggedItem.id, targetItem.id);
    if (isValid && onMove) {
      onMove(dragState.draggedItem.id, targetItem.id);
    }
    setDragState({ draggedItem: null, dragOverId: null, isValidDrop: false });
  }, [dragState.draggedItem, items, onMove]);

  const total = countAll(items);

  return (
    <div style={{ border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden', background: '#FFFFFF' }}>
      <div style={{ height: 32, background: '#FAFAFA', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px' }}>
        <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.06em', fontFamily: "'Inter', sans-serif" }}>
          Hierarchy Tree
        </span>
        <span style={{ fontSize: 11, color: '#64748B', fontFamily: "'Inter', sans-serif", fontVariantNumeric: 'tabular-nums' }}>
          {total} items
        </span>
      </div>
      <div role="tree" aria-label="Work Item Hierarchy">
        <TreeBranch items={items} depth={0} expandedIds={expandedIds} onToggle={toggle}
          selectedId={selectedId} onSelect={onSelect} onDelete={onDelete}
          dragState={dragState} onDragStart={handleDragStart} onDragOver={handleDragOver}
          onDragEnd={handleDragEnd} onDrop={handleDrop} />
      </div>
      <style>{`
        .hi-tree-row:hover { background: #F8FAFC !important; }
        .hi-tree-row[aria-selected="true"]:hover { background: #EFF6FF !important; }
        .hi-row-action { opacity: 0; transition: opacity 150ms ease; }
        .hi-tree-row:hover .hi-row-action { opacity: 1; }
      `}</style>
    </div>
  );
}
