/**
 * WorkItemTree — Main tree view for Work Item Hierarchy
 * Stage E: Full keyboard nav, empty children, focus ring, design compliance
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { ChevronRight, ChevronDown, GripVertical, MoreHorizontal, Trash2 } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import type { WorkItem } from '@/types/hierarchy';
import { canBeParentOf, HIERARCHY_LEVELS } from '@/types/hierarchy';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { StatusBadge } from './StatusBadge';

interface WorkItemTreeProps {
  items: WorkItem[];
  selectedId: string | null;
  onSelect: (item: WorkItem) => void;
  onDeselect?: () => void;
  onDelete?: (item: WorkItem) => void;
  onMove?: (itemId: string, newParentId: string) => void;
  onAddChild?: (parent: WorkItem) => void;
  allExpanded: boolean;
}

/* ── Skeleton rows ── */
export function TreeSkeleton({ rows = 5 }: { rows?: number }) {
  const { isDark } = useTheme();
  const shimmerBg = isDark ? '#1A1A1A' : '#F1F5F9';
  const headerBg = isDark ? 'rgba(255,255,255,0.03)' : '#FAFAFA';
  return (
    <div style={{ border: '1px solid var(--divider)', borderRadius: 8, overflow: 'hidden', background: 'var(--bg-app)' }}>
      <div style={{ height: 32, background: headerBg, borderBottom: '1px solid var(--divider)', display: 'flex', alignItems: 'center', padding: '8px 12px' }}>
        <div style={{ width: 100, height: 10, background: 'var(--divider)', borderRadius: 4 }} />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ height: 44, maxHeight: 44, display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 12 + (i % 3) * 20, paddingRight: 12, borderBottom: '1px solid var(--divider)' }}>
          <div style={{ width: 20, height: 20, borderRadius: 4, background: shimmerBg }} className="hi-shimmer" />
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--divider)' }} className="hi-shimmer" />
          <div style={{ width: 48, height: 12, borderRadius: 4, background: 'var(--divider)' }} className="hi-shimmer" />
          <div style={{ flex: 1, height: 12, borderRadius: 4, background: shimmerBg, maxWidth: 200 }} className="hi-shimmer" />
          <div style={{ width: 60, height: 22, borderRadius: 9999, background: shimmerBg }} className="hi-shimmer" />
          <div style={{ width: 24, height: 24, borderRadius: '50%', background: shimmerBg }} className="hi-shimmer" />
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
        <div key={i} style={{ width: 12, height: 4, borderRadius: 1, background: i <= level ? 'var(--fg-3)' : 'var(--divider)' }} />
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

/* StatusPill is now StatusBadge (filled Jira-style) */

/* ── Assignee avatar ── */
/* ── Avatar color palette (no purple/yellow) ── */
const AVATAR_COLORS = ['#0D9488','#2563EB','#DC2626','#16A34A','#64748B','#0284C7','#059669','#BE123C','#1D4ED8','#0F766E'];
function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function AssigneeAvatar({ assignee }: { assignee?: WorkItem['assignee'] }) {
  const { isDark } = useTheme();
  if (!assignee) {
    return <div style={{ width: 24, height: 24, borderRadius: '50%', background: isDark ? '#1A1A1A' : '#F1F5F9', border: '1px solid var(--divider)', flexShrink: 0 }} />;
  }
  const avatarUrl = (assignee as any).avatar;
  if (avatarUrl) {
    return <img src={avatarUrl} alt={assignee.displayName} style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />;
  }
  const initials = assignee.displayName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const bgColor = getAvatarColor(assignee.displayName);
  return (
    <div style={{ width: 24, height: 24, borderRadius: '50%', background: bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: '#FFFFFF', fontFamily: "'Inter', sans-serif" }}>{initials}</span>
    </div>
  );
}

/* ── Progress bar (parents only) ── */
function ProgressBar({ stats }: { stats: WorkItem['stats'] }) {
  const { isDark } = useTheme();
  if (stats.totalDescendants === 0) return null;
  const pct = Math.round((stats.completedCount / stats.totalDescendants) * 100);
  const isComplete = pct === 100;
  const fillColor = isComplete ? 'var(--sem-success)' : 'var(--cp-blue)';
  const textColor = isComplete ? '#15803D' : 'var(--cp-blue)';
  return (
    <div style={{ width: 64, display: 'flex', flexDirection: 'column', gap: 2, justifyContent: 'center' }}>
      <div style={{ height: 4, background: isDark ? '#1A1A1A' : '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: fillColor, borderRadius: 4, transition: 'width 300ms ease' }} />
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
        <MoreHorizontal size={16} color="var(--fg-3)" />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 4, background: 'var(--bg-app)',
          border: '1px solid var(--divider)', borderRadius: 6, zIndex: 50, minWidth: 140, overflow: 'hidden',
        }}>
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete?.(item); }}
            style={{
              width: '100%', padding: '8px 12px', fontSize: 13, fontFamily: "'Inter', sans-serif",
              color: 'var(--sem-danger)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(220, 38, 38, 0.06)')}
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

/* ── No children message ── */
function NoChildrenMessage({ parentLevel, depth, onAdd, parent }: { parentLevel: number; depth: number; onAdd?: (parent: WorkItem) => void; parent: WorkItem }) {
  const childLevel = HIERARCHY_LEVELS.find((l) => canBeParentOf(parentLevel, l.id));
  if (!childLevel) return null;
  return (
    <div style={{
      height: 50, display: 'flex', alignItems: 'center', gap: 8,
      paddingLeft: (depth + 1) * 20 + 12, paddingRight: 12,
      borderBottom: '1px solid var(--divider)', fontFamily: "'Inter', sans-serif",
    }}>
      <span style={{ fontSize: 12, color: 'var(--fg-3)', fontStyle: 'italic' }}>No child items</span>
      {onAdd && (
        <button
          onClick={() => onAdd(parent)}
          style={{
            fontSize: 12, fontWeight: 600, color: 'var(--cp-blue)', background: 'none', border: 'none',
            cursor: 'pointer', fontFamily: "'Inter', sans-serif", padding: 0,
          }}
        >
          + Add {childLevel.name}
        </button>
      )}
    </div>
  );
}

/* ── Single tree row ── */
function TreeRow({
  item, depth, expanded, onToggle, selected, onSelect, onDelete,
  dragState, onDragStart, onDragOver, onDragEnd, onDrop, rowRef,
}: {
  item: WorkItem; depth: number; expanded: boolean; onToggle: (id: string) => void;
  selected: boolean; onSelect: (item: WorkItem) => void; onDelete?: (item: WorkItem) => void;
  dragState: DragState;
  onDragStart: (item: WorkItem) => void;
  onDragOver: (e: React.DragEvent, targetItem: WorkItem) => void;
  onDragEnd: () => void;
  onDrop: (e: React.DragEvent, targetItem: WorkItem) => void;
  rowRef?: (el: HTMLDivElement | null) => void;
}) {
  const hasChildren = item.children.length > 0;
  const isDragged = dragState.draggedItem?.id === item.id;
  const isDragOver = dragState.dragOverId === item.id;
  const isValidTarget = isDragOver && dragState.isValidDrop;
  const isInvalidTarget = isDragOver && !dragState.isValidDrop;

  let borderLeft = 'none';
  if (isValidTarget) borderLeft = '2px solid var(--cp-blue)';
  if (isInvalidTarget) borderLeft = '2px solid var(--sem-danger)';

  return (
    <div
      ref={rowRef}
      role="treeitem" aria-expanded={hasChildren ? expanded : undefined}
      aria-level={depth + 1} aria-selected={selected} tabIndex={-1}
      data-item-id={item.id}
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
      className="hi-tree-row"
      style={{
        height: 44, maxHeight: 44, display: 'flex', alignItems: 'center', gap: 8,
        paddingLeft: Math.min(depth, 8) * 20 + 12, paddingRight: 12, borderBottom: '1px solid var(--divider)',
        background: selected ? 'var(--cp-primary-5)' : undefined, cursor: 'pointer', outline: 'none',
        fontFamily: "'Inter', sans-serif",
        opacity: isDragged ? 0.5 : 1,
        borderLeft,
        transition: 'opacity 150ms ease, border-left 150ms ease, background 100ms ease',
      }}
    >
      <GripVertical size={14} className="hi-row-action" style={{ color: 'var(--fg-4)', flexShrink: 0, cursor: 'grab' }} />

      {hasChildren ? (
        <button onClick={(e) => { e.stopPropagation(); onToggle(item.id); }}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', flexShrink: 0 }}
          tabIndex={-1} aria-label={expanded ? 'Collapse' : 'Expand'}>
          {expanded ? <ChevronDown size={20} color="var(--fg-3)" /> : <ChevronRight size={20} color="var(--fg-3)" />}
        </button>
      ) : <div style={{ width: 20, flexShrink: 0 }} />}

      {item.issueType ? (
        <JiraIssueTypeIcon type={item.issueType} size={16} />
      ) : (
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.hierarchyColor, flexShrink: 0 }} />
      )}

      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--cp-blue)', fontVariantNumeric: 'tabular-nums', minWidth: 56, flexShrink: 0 }}>
        {item.key}
      </span>

      <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--fg-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {item.title}
      </span>

      {item.priority && <PriorityBars level={priorityToLevel(item.priority.name)} />}
      <ProgressBar stats={item.stats} />

      {item.fixVersion && (
        <span style={{ height: 20, padding: '0 8px', fontSize: 10, fontWeight: 600, color: '#0F766E', background: '#CCFBF1', border: '1px solid rgba(13,148,136,0.2)', borderRadius: 9999, display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
          {item.fixVersion.name}
        </span>
      )}

      <StatusBadge status={item.status.name} />
      <AssigneeAvatar assignee={item.assignee} />
      <ActionsMenu item={item} onDelete={onDelete} />
    </div>
  );
}

/* ── Recursive subtree ── */
function TreeBranch({
  items, depth, expandedIds, onToggle, selectedId, onSelect, onDelete, onAddChild,
  dragState, onDragStart, onDragOver, onDragEnd, onDrop, rowRefs,
}: {
  items: WorkItem[]; depth: number; expandedIds: Set<string>; onToggle: (id: string) => void;
  selectedId: string | null; onSelect: (item: WorkItem) => void; onDelete?: (item: WorkItem) => void;
  onAddChild?: (parent: WorkItem) => void;
  dragState: DragState;
  onDragStart: (item: WorkItem) => void;
  onDragOver: (e: React.DragEvent, targetItem: WorkItem) => void;
  onDragEnd: () => void;
  onDrop: (e: React.DragEvent, targetItem: WorkItem) => void;
  rowRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
}) {
  return (
    <>
      {items.map((item) => {
        const isExpanded = expandedIds.has(item.id);
        const hasChildren = item.children.length > 0;
        return (
          <div key={item.id} role="group">
            <TreeRow item={item} depth={Math.min(depth, 8)} expanded={isExpanded} onToggle={onToggle}
              selected={selectedId === item.id} onSelect={onSelect} onDelete={onDelete}
              dragState={dragState} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDrop={onDrop}
              rowRef={(el) => { if (el) rowRefs.current.set(item.id, el); else rowRefs.current.delete(item.id); }}
            />
            {isExpanded && hasChildren && (
              <TreeBranch items={item.children} depth={depth + 1} expandedIds={expandedIds}
                onToggle={onToggle} selectedId={selectedId} onSelect={onSelect} onDelete={onDelete} onAddChild={onAddChild}
                dragState={dragState} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDrop={onDrop}
                rowRefs={rowRefs} />
            )}
            {isExpanded && !hasChildren && (
              <NoChildrenMessage parentLevel={item.hierarchyLevel} depth={depth} onAdd={onAddChild} parent={item} />
            )}
          </div>
        );
      })}
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

/** Flatten visible items for keyboard navigation */
function flattenVisible(items: WorkItem[], expandedIds: Set<string>): WorkItem[] {
  const result: WorkItem[] = [];
  for (const item of items) {
    result.push(item);
    if (expandedIds.has(item.id) && item.children.length > 0) {
      result.push(...flattenVisible(item.children, expandedIds));
    }
  }
  return result;
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

/** Find an item's parent in the tree */
function findParent(items: WorkItem[], targetId: string): WorkItem | null {
  for (const item of items) {
    for (const child of item.children) {
      if (child.id === targetId) return item;
    }
    const found = findParent(item.children, targetId);
    if (found) return found;
  }
  return null;
}

export function WorkItemTree({ items, selectedId, onSelect, onDeselect, onDelete, onMove, onAddChild, allExpanded }: WorkItemTreeProps) {
  const { isDark } = useTheme();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const prevAllExpanded = useRef(allExpanded);
  const [dragState, setDragState] = useState<DragState>({ draggedItem: null, dragOverId: null, isValidDrop: false });
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const treeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (allExpanded !== prevAllExpanded.current) {
      prevAllExpanded.current = allExpanded;
      setExpandedIds(allExpanded ? new Set(collectIds(items)) : new Set());
    }
  }, [allExpanded, items]);

  const toggle = useCallback((id: string) => {
    setExpandedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }, []);

  // Focus management
  useEffect(() => {
    if (focusedId) {
      const el = rowRefs.current.get(focusedId);
      el?.focus();
    }
  }, [focusedId]);

  // Keyboard navigation handler on tree container
  const handleTreeKeyDown = useCallback((e: React.KeyboardEvent) => {
    const visibleItems = flattenVisible(items, expandedIds);
    if (visibleItems.length === 0) return;

    const currentIndex = focusedId ? visibleItems.findIndex(i => i.id === focusedId) : -1;
    const currentItem = currentIndex >= 0 ? visibleItems[currentIndex] : null;

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        const nextIdx = currentIndex < visibleItems.length - 1 ? currentIndex + 1 : 0;
        setFocusedId(visibleItems[nextIdx].id);
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        const prevIdx = currentIndex > 0 ? currentIndex - 1 : visibleItems.length - 1;
        setFocusedId(visibleItems[prevIdx].id);
        break;
      }
      case 'ArrowRight': {
        e.preventDefault();
        if (!currentItem) break;
        if (currentItem.children.length > 0 && !expandedIds.has(currentItem.id)) {
          toggle(currentItem.id);
        } else if (currentItem.children.length > 0 && expandedIds.has(currentItem.id)) {
          // Move to first child
          setFocusedId(currentItem.children[0].id);
        }
        break;
      }
      case 'ArrowLeft': {
        e.preventDefault();
        if (!currentItem) break;
        if (currentItem.children.length > 0 && expandedIds.has(currentItem.id)) {
          toggle(currentItem.id);
        } else {
          // Move to parent
          const parent = findParent(items, currentItem.id);
          if (parent) setFocusedId(parent.id);
        }
        break;
      }
      case 'Enter':
      case ' ': {
        e.preventDefault();
        if (currentItem) onSelect(currentItem);
        break;
      }
      case 'Escape': {
        e.preventDefault();
        onDeselect?.();
        break;
      }
    }
  }, [items, expandedIds, focusedId, toggle, onSelect, onDeselect]);

  // DnD handlers
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
    <div style={{ border: '1px solid var(--divider)', borderRadius: 8, overflow: 'hidden', background: 'var(--bg-app)' }}>
      {/* Column header row */}
      <div style={{
        height: 50, background: isDark ? 'rgba(255,255,255,0.03)' : '#FAFAFA', borderBottom: '1px solid var(--divider)',
        display: 'flex', alignItems: 'center', padding: '8px 12px',
        fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600,
        textTransform: 'uppercase', color: 'var(--fg-3)', letterSpacing: '0.06em',
      }}>
        <span style={{ flex: 1 }}>Work</span>
        <span style={{ width: 80, textAlign: 'right' }}>Release</span>
        <span style={{ width: 100, textAlign: 'right' }}>Status</span>
        <span style={{ width: 80, textAlign: 'right' }}>Assignee</span>
      </div>
      <div ref={treeRef} role="tree" aria-label="Work Item Hierarchy" tabIndex={0} onKeyDown={handleTreeKeyDown}
        style={{ outline: 'none' }}>
        <TreeBranch items={items} depth={0} expandedIds={expandedIds} onToggle={toggle}
          selectedId={selectedId} onSelect={onSelect} onDelete={onDelete} onAddChild={onAddChild}
          dragState={dragState} onDragStart={handleDragStart} onDragOver={handleDragOver}
          onDragEnd={handleDragEnd} onDrop={handleDrop} rowRefs={rowRefs} />
      </div>
      <style>{`
        .hi-tree-row:hover { background: var(--bg-1) !important; }
        .hi-tree-row[aria-selected="true"]:hover { background: var(--cp-primary-5) !important; }
        .hi-row-action { opacity: 0; transition: opacity 150ms ease; }
        .hi-tree-row:hover .hi-row-action { opacity: 1; }
        .hi-tree-row:focus-visible { box-shadow: inset 0 0 0 2px var(--cp-blue); }
      `}</style>
    </div>
  );
}
