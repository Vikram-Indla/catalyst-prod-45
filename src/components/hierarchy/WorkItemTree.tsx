/**
 * WorkItemTree — Main tree view for Work Item Hierarchy
 * Stage C: FP-002 44px rows, ARIA tree semantics, hover-reveal actions
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { ChevronRight, ChevronDown, GripVertical, MoreHorizontal } from 'lucide-react';
import type { WorkItem } from '@/types/hierarchy';

interface WorkItemTreeProps {
  items: WorkItem[];
  selectedId: string | null;
  onSelect: (item: WorkItem) => void;
  allExpanded: boolean;
}

/* ── Priority bars (4 monochrome bars, 12×4px, gap 2px) ── */
function PriorityBars({ level }: { level: number }) {
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          style={{
            width: 12,
            height: 4,
            borderRadius: 1,
            background: i <= level ? '#64748B' : '#E2E8F0',
          }}
        />
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
  const bgColor = `${status.color}14`; // ~8% opacity
  const borderColor = `${status.color}33`; // ~20% opacity
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        height: 22,
        padding: '0 8px',
        borderRadius: 9999,
        background: bgColor,
        border: `1px solid ${borderColor}`,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: status.color,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: status.colorText,
          fontFamily: "'Inter', sans-serif",
          lineHeight: 1,
        }}
      >
        {status.name}
      </span>
    </span>
  );
}

/* ── Assignee avatar ── */
function AssigneeAvatar({ assignee }: { assignee?: WorkItem['assignee'] }) {
  if (!assignee) {
    return (
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: '#F1F5F9',
          border: '1px solid #E2E8F0',
          flexShrink: 0,
        }}
      />
    );
  }
  const initials = assignee.displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      style={{
        width: 24,
        height: 24,
        borderRadius: '50%',
        background: '#2563EB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 10, fontWeight: 700, color: '#FFFFFF', fontFamily: "'Inter', sans-serif" }}>
        {initials}
      </span>
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
      <span
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: textColor,
          fontFamily: "'Inter', sans-serif",
          fontVariantNumeric: 'tabular-nums',
          textAlign: 'right',
        }}
      >
        {pct}%
      </span>
    </div>
  );
}

/* ── Single tree row ── */
function TreeRow({
  item,
  depth,
  expanded,
  onToggle,
  selected,
  onSelect,
}: {
  item: WorkItem;
  depth: number;
  expanded: boolean;
  onToggle: (id: string) => void;
  selected: boolean;
  onSelect: (item: WorkItem) => void;
}) {
  const hasChildren = item.children.length > 0;

  return (
    <div
      role="treeitem"
      aria-expanded={hasChildren ? expanded : undefined}
      aria-level={depth + 1}
      aria-selected={selected}
      tabIndex={0}
      onClick={() => onSelect(item)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(item); }
        if (e.key === 'ArrowRight' && hasChildren && !expanded) { e.preventDefault(); onToggle(item.id); }
        if (e.key === 'ArrowLeft' && hasChildren && expanded) { e.preventDefault(); onToggle(item.id); }
      }}
      className="hi-tree-row"
      style={{
        height: 44,
        maxHeight: 44,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        paddingLeft: depth * 20 + 12,
        paddingRight: 12,
        borderBottom: '1px solid #E2E8F0',
        background: selected ? '#EFF6FF' : undefined,
        cursor: 'pointer',
        outline: 'none',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* 1. Drag handle */}
      <GripVertical size={14} className="hi-row-action" style={{ color: '#94A3B8', flexShrink: 0 }} />

      {/* 2. Expand/collapse */}
      {hasChildren ? (
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(item.id); }}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', flexShrink: 0 }}
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded
            ? <ChevronDown size={20} color="#64748B" />
            : <ChevronRight size={20} color="#64748B" />}
        </button>
      ) : (
        <div style={{ width: 20, flexShrink: 0 }} />
      )}

      {/* 3. Hierarchy dot */}
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: item.hierarchyColor,
          flexShrink: 0,
        }}
      />

      {/* 4. Key */}
      <span
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: '#2563EB',
          fontVariantNumeric: 'tabular-nums',
          minWidth: 56,
          flexShrink: 0,
        }}
      >
        {item.key}
      </span>

      {/* 5. Title */}
      <span
        style={{
          flex: 1,
          fontSize: 13,
          fontWeight: 500,
          color: '#0F172A',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {item.title}
      </span>

      {/* 6. Priority */}
      {item.priority && <PriorityBars level={priorityToLevel(item.priority.name)} />}

      {/* 7. Progress */}
      <ProgressBar stats={item.stats} />

      {/* 8. Version badge */}
      {item.fixVersion && (
        <span
          style={{
            height: 20,
            padding: '0 8px',
            fontSize: 10,
            fontWeight: 600,
            color: '#7C3AED',
            background: '#F5F3FF',
            border: '1px solid rgba(124,58,237,0.2)',
            borderRadius: 9999,
            display: 'inline-flex',
            alignItems: 'center',
            whiteSpace: 'nowrap',
          }}
        >
          {item.fixVersion.name}
        </span>
      )}

      {/* 9. Status pill */}
      <StatusPill status={item.status} />

      {/* 10. Assignee avatar */}
      <AssigneeAvatar assignee={item.assignee} />

      {/* 11. Actions button */}
      <button
        className="hi-row-action"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          display: 'flex',
          flexShrink: 0,
        }}
        aria-label="More actions"
      >
        <MoreHorizontal size={16} color="#64748B" />
      </button>
    </div>
  );
}

/* ── Recursive subtree ── */
function TreeBranch({
  items,
  depth,
  expandedIds,
  onToggle,
  selectedId,
  onSelect,
}: {
  items: WorkItem[];
  depth: number;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  selectedId: string | null;
  onSelect: (item: WorkItem) => void;
}) {
  return (
    <>
      {items.map((item) => (
        <div key={item.id} role="group">
          <TreeRow
            item={item}
            depth={depth}
            expanded={expandedIds.has(item.id)}
            onToggle={onToggle}
            selected={selectedId === item.id}
            onSelect={onSelect}
          />
          {expandedIds.has(item.id) && item.children.length > 0 && (
            <TreeBranch
              items={item.children}
              depth={depth + 1}
              expandedIds={expandedIds}
              onToggle={onToggle}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          )}
        </div>
      ))}
    </>
  );
}

/* ── Collect all IDs recursively ── */
function collectIds(items: WorkItem[]): string[] {
  const ids: string[] = [];
  for (const item of items) {
    if (item.children.length > 0) {
      ids.push(item.id);
      ids.push(...collectIds(item.children));
    }
  }
  return ids;
}

/* ── Count all items recursively ── */
function countAll(items: WorkItem[]): number {
  let c = items.length;
  for (const item of items) c += countAll(item.children);
  return c;
}

export function WorkItemTree({ items, selectedId, onSelect, allExpanded }: WorkItemTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const prevAllExpanded = useRef(allExpanded);

  useEffect(() => {
    if (allExpanded !== prevAllExpanded.current) {
      prevAllExpanded.current = allExpanded;
      if (allExpanded) {
        setExpandedIds(new Set(collectIds(items)));
      } else {
        setExpandedIds(new Set());
      }
    }
  }, [allExpanded, items]);

  const toggle = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const total = countAll(items);

  return (
    <div style={{ border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden', background: '#FFFFFF' }}>
      {/* Toolbar */}
      <div
        style={{
          height: 32,
          background: '#FAFAFA',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            color: '#64748B',
            letterSpacing: '0.06em',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          Hierarchy Tree
        </span>
        <span
          style={{
            fontSize: 11,
            color: '#64748B',
            fontFamily: "'Inter', sans-serif",
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {total} items
        </span>
      </div>

      {/* Tree container */}
      <div role="tree" aria-label="Work Item Hierarchy">
        <TreeBranch
          items={items}
          depth={0}
          expandedIds={expandedIds}
          onToggle={toggle}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      </div>

      {/* Hover styles */}
      <style>{`
        .hi-tree-row:hover { background: #F8FAFC !important; }
        .hi-tree-row[aria-selected="true"]:hover { background: #EFF6FF !important; }
        .hi-row-action { opacity: 0; transition: opacity 150ms ease; }
        .hi-tree-row:hover .hi-row-action { opacity: 1; }
      `}</style>
    </div>
  );
}
