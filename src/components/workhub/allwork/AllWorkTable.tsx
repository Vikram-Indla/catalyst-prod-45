/**
 * AllWorkTable — Grid view table (V12 Hybrid Precision + Performance Optimization)
 * 44px rows, RGBA hover, hierarchy expand/collapse, React.memo rows, row virtualization
 *
 * Performance optimizations:
 * 1. buildTree() wrapped in useMemo to stabilize node references (fixes React.memo defeat)
 * 2. Row virtualization via @tanstack/react-virtual (optional, can be enabled via `enableVirtualization` prop)
 * 3. flattenTree() memoized alongside buildTree to prevent unnecessary flattening
 */
import { useState, useMemo, useCallback, memo, useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ChevronDown, ChevronRight, ArrowUp, ArrowDown, GripVertical, ExternalLink, Plus, MoreHorizontal } from '@/lib/atlaskit-icons';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { PriorityBars, normalisePriority } from '@/components/shared/PriorityIndicator';
import { StatusLozengeByType } from '@/components/workflow';
import type { AllWorkItem } from '@/types/allwork.types';
import { AllWorkContextMenu } from './AllWorkContextMenu';
import { formatDistanceToNow } from 'date-fns';

// ── Tree Utilities ──
interface TreeNode { item: AllWorkItem; children: TreeNode[]; depth: number; }

function buildTree(items: AllWorkItem[]): TreeNode[] {
  const byKey = new Map<string, AllWorkItem>();
  items.forEach(i => byKey.set(i.issue_key, i));
  const roots: TreeNode[] = [];
  const childMap = new Map<string, TreeNode[]>();
  items.forEach(i => {
    const node: TreeNode = { item: i, children: [], depth: 0 };
    if (i.parent_key && byKey.has(i.parent_key)) {
      if (!childMap.has(i.parent_key)) childMap.set(i.parent_key, []);
      childMap.get(i.parent_key)!.push(node);
    } else {
      roots.push(node);
    }
  });
  function attachChildren(nodes: TreeNode[], depth: number) {
    for (const n of nodes) {
      n.depth = depth;
      n.children = childMap.get(n.item.issue_key) || [];
      attachChildren(n.children, depth + 1);
    }
  }
  attachChildren(roots, 0);
  return roots;
}

function flattenTree(nodes: TreeNode[], expanded: Set<string>): TreeNode[] {
  const result: TreeNode[] = [];
  for (const n of nodes) {
    result.push(n);
    if (expanded.has(n.item.issue_key)) result.push(...flattenTree(n.children, expanded));
  }
  return result;
}

const HUB_COLORS: Record<string, { border: string; text: string; bg: string }> = {
  project: { border: 'var(--cp-blue)', text: 'var(--cp-blue)', bg: 'var(--cp-primary-5)' },
  product: { border: 'var(--fg-2)', text: 'var(--fg-2)', bg: 'var(--ds-surface-sunken)' },
  task: { border: 'var(--ds-border)', text: 'var(--fg-3)', bg: 'var(--ds-surface-sunken)' },
  incident: { border: 'var(--sem-danger)', text: 'var(--sem-danger)', bg: 'var(--ds-background-danger)' },
};
const AVATAR_COLORS = ['var(--ds-background-discovery-bold)', 'var(--ds-chart-orange-bold)', 'var(--ds-chart-green-bold)', 'var(--ds-chart-magenta-bold)', 'var(--ds-background-discovery-bold)', 'var(--ds-chart-teal-bold)', 'var(--ds-chart-red-bold)'];

function getHubType(issueType: string): string {
  const t = issueType.toLowerCase();
  if (t.includes('incident') || t.includes('bug') || t.includes('defect')) return 'incident';
  if (t.includes('epic') || t.includes('story') || t.includes('feature')) return 'project';
  if (t.includes('sub-task') || t.includes('subtask') || t.includes('task')) return 'task';
  return 'product';
}

function formatRelative(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: false }).replace('about ', '').replace('less than a minute', 'just now') + ' ago';
  } catch { return '—'; }
}

function nameToHash(name: string): number {
  return name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
}

// ── Columns ──
interface Column { key: string; label: string; width: string; sortable?: boolean; }

const COLUMNS: Column[] = [
  { key: 'checkbox', label: '', width: '40px' },
  { key: 'key', label: 'KEY', width: '140px', sortable: true },
  { key: 'summary', label: 'SUMMARY', width: '1fr' },
  { key: 'status', label: 'STATUS', width: '120px', sortable: true },
  { key: 'project', label: 'PROJECT', width: '140px' },
  { key: 'hub', label: 'HUB', width: '95px' },
  { key: 'priority', label: 'PRIORITY', width: '80px', sortable: true },
  { key: 'updated', label: 'UPDATED', width: '110px', sortable: true },
  { key: 'reporter', label: 'REPORTED BY', width: '180px' },
];

const GRID_TEMPLATE = COLUMNS.map(c => c.width).join(' ');

// ── Props ──
interface Props {
  items: AllWorkItem[];
  selectedIds: Set<string>;
  onToggleSelect: (key: string) => void;
  onSelectAll: () => void;
  selectAllState: 'none' | 'some' | 'all';
  onOpenItem: (key: string) => void;
  sortField: string;
  sortDir: 'asc' | 'desc';
  onSort: (field: string) => void;
  enableVirtualization?: boolean;  // Optional: enable row virtualization
}

export function AllWorkTable({
  items, selectedIds, onToggleSelect, onSelectAll, selectAllState,
  onOpenItem, sortField, sortDir, onSort, enableVirtualization = false,
}: Props) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => {
    const keys = new Set<string>();
    items.filter(i => i.parent_key).forEach(i => { if (i.parent_key) keys.add(i.parent_key); });
    return keys;
  });
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: AllWorkItem } | null>(null);

  // PERF: Memoize tree building to stabilize node references (fixes React.memo defeat)
  // This ensures that TableRow's memo comparison doesn't fail on every render
  const tree = useMemo(() => buildTree(items), [items]);
  const flatNodes = useMemo(() => flattenTree(tree, expandedKeys), [tree, expandedKeys]);
  const keysWithChildren = useMemo(() => {
    const s = new Set<string>();
    items.forEach(i => { if (i.parent_key) s.add(i.parent_key); });
    return s;
  }, [items]);

  // Virtualization support
  const rowsContainerRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: flatNodes.length,
    getScrollElement: () => rowsContainerRef.current,
    estimateSize: () => 44,  // Each row is 44px tall
    enabled: enableVirtualization,
  });

  const toggleExpand = useCallback((key: string) => {
    setExpandedKeys(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  return (
    <>
      <div
        className="overflow-hidden overflow-x-auto h-full flex flex-col"
        style={{ backgroundColor: 'var(--bg-app)' }}
        role="table"
        aria-label="Work items table"
      >
        {/* Header */}
        <div
          className="grid items-center sticky top-0 z-10"
          role="row"
          style={{
            gridTemplateColumns: GRID_TEMPLATE,
            height: 44,
            maxHeight: 44,
            backgroundColor: 'var(--bg-app)',
            borderBottom: '1px solid var(--bd-default, var(--cp-ink-1))',
          }}
        >
          <div className="flex justify-center" role="columnheader">
            <input
              type="checkbox"
              checked={selectAllState === 'all'}
              ref={el => { if (el) el.indeterminate = selectAllState === 'some'; }}
              onChange={onSelectAll}
              className="w-4 h-4 rounded cursor-pointer accent-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary))]"
              aria-label="Select all items"
            />
          </div>
          {COLUMNS.slice(1).map(col => (
            <button
              key={col.key}
              onClick={() => col.sortable && onSort(col.key)}
              role="columnheader"
              aria-sort={col.sortable && sortField === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
              className="flex items-center gap-1 text-left focus-visible:outline-2 focus-visible:outline-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary))] focus-visible:outline-offset-2 rounded"
              style={{
                fontSize: '10.5px',
                fontWeight: 650,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: 'var(--fg-3)',
                cursor: col.sortable ? 'pointer' : 'default',
                padding: '0 8px',
                fontFamily: 'var(--cp-font-body)',
              }}
            >
              {col.label}
              {col.sortable && sortField === col.key && (
                sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
              )}
            </button>
          ))}
        </div>

        {/* Rows — with optional virtualization */}
        <div
          ref={rowsContainerRef}
          className="flex-1 overflow-y-auto"
          style={enableVirtualization ? { height: '100%', overflow: 'auto' } : {}}
        >
          {enableVirtualization ? (
            // Virtualized rendering: only render visible rows
            <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
              {virtualizer.getVirtualItems().map(virtualItem => {
                const node = flatNodes[virtualItem.index];
                return (
                  <div
                    key={node.item.issue_key}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualItem.size}px`,
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                  >
                    <TableRow
                      node={node}
                      isSelected={selectedIds.has(node.item.issue_key)}
                      hasChildren={keysWithChildren.has(node.item.issue_key)}
                      isExpanded={expandedKeys.has(node.item.issue_key)}
                      onToggleSelect={onToggleSelect}
                      onToggleExpand={toggleExpand}
                      onOpenItem={onOpenItem}
                      onContextMenu={setContextMenu}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            // Standard rendering: render all visible (expanded) rows
            flatNodes.map(node => (
              <TableRow
                key={node.item.issue_key}
                node={node}
                isSelected={selectedIds.has(node.item.issue_key)}
                hasChildren={keysWithChildren.has(node.item.issue_key)}
                isExpanded={expandedKeys.has(node.item.issue_key)}
                onToggleSelect={onToggleSelect}
                onToggleExpand={toggleExpand}
                onOpenItem={onOpenItem}
                onContextMenu={setContextMenu}
              />
            ))
          )}
        </div>
      </div>

      {contextMenu && (
        <AllWorkContextMenu
          item={contextMenu.item}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onOpenItem={onOpenItem}
        />
      )}
    </>
  );
}

// ── Memoized Row ──
interface RowProps {
  node: TreeNode;
  isSelected: boolean;
  hasChildren: boolean;
  isExpanded: boolean;
  onToggleSelect: (key: string) => void;
  onToggleExpand: (key: string) => void;
  onOpenItem: (key: string) => void;
  onContextMenu: (ctx: { x: number; y: number; item: AllWorkItem }) => void;
}

const TableRow = memo(function TableRow({
  node, isSelected, hasChildren, isExpanded,
  onToggleSelect, onToggleExpand, onOpenItem, onContextMenu,
}: RowProps) {
  const item = node.item;
  const hubType = getHubType(item.issue_type);
  const hubC = HUB_COLORS[hubType];
  const hash = nameToHash(item.assignee_display_name || '');

  return (
    <div
      className="grid items-center group cursor-pointer"
      role="row"
      style={{
        gridTemplateColumns: GRID_TEMPLATE,
        height: 44,
        maxHeight: 44,
        borderBottom: '0.75px solid var(--bd-subtle, var(--cp-ink-1))',
        backgroundColor: isSelected ? 'var(--ds-background-information, rgba(37,99,235,0.08))' : node.depth > 0 ? 'var(--bg-1)' : 'var(--bg-app)',
        transition: 'background-color 80ms ease',
      }}
      onMouseEnter={e => { if (!isSelected) (e.currentTarget.style.backgroundColor = 'var(--hover)'); }}
      onMouseLeave={e => { if (!isSelected) (e.currentTarget.style.backgroundColor = node.depth > 0 ? 'var(--bg-1)' : 'var(--bg-app)'); }}
      onClick={() => onOpenItem(item.issue_key)}
      onContextMenu={(e) => { e.preventDefault(); onContextMenu({ x: e.clientX, y: e.clientY, item }); }}
    >
      {/* Checkbox */}
      <div className="flex justify-center" onClick={e => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(item.issue_key)}
          className="w-4 h-4 rounded cursor-pointer accent-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary))]"
          aria-label={`Select ${item.issue_key}`}
        />
      </div>

      {/* Key */}
      <div className="flex items-center gap-1.5 px-2 min-w-0" style={{ paddingLeft: `${8 + node.depth * 28}px` }}>
        <GripVertical className="w-3 h-3 opacity-0 group-hover:opacity-40 shrink-0 transition-opacity duration-80" style={{ color: 'var(--fg-3)' }} />
        {hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleExpand(item.issue_key); }}
            className="w-4 h-4 flex items-center justify-center shrink-0 rounded hover:bg-[rgba(128,128,128,0.12)] transition-all duration-150 focus-visible:outline-2 focus-visible:outline-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary))]"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
            aria-expanded={isExpanded}
          >
            <ChevronRight
              className="w-3.5 h-3.5 transition-transform duration-150"
              style={{ color: 'var(--fg-3)', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
            />
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <JiraIssueTypeIcon type={item.issue_type} size={16} />
        <span
          className="text-[13px] truncate"
          style={{ fontFamily: 'var(--cp-font-mono)', fontWeight: 650, color: 'var(--cp-blue)' }}
        >
          {item.issue_key}
        </span>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-1 px-2 min-w-0">
        <span className="text-[14px] truncate" style={{ color: 'var(--fg-1)', fontWeight: 400, fontFamily: 'var(--cp-font-body)' }}>
          {item.summary}
        </span>
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0 ml-auto transition-opacity duration-80">
          <button className="p-0.5 rounded hover:bg-[rgba(128,128,128,0.12)] focus-visible:outline-2 focus-visible:outline-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary))]" title="Open in new tab" aria-label="Open in new tab" onClick={e => e.stopPropagation()}>
            <ExternalLink className="w-3.5 h-3.5" style={{ color: 'var(--fg-3)' }} />
          </button>
          <button className="p-0.5 rounded hover:bg-[rgba(128,128,128,0.12)] focus-visible:outline-2 focus-visible:outline-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary))]" title="Add child" aria-label="Add child item" onClick={e => e.stopPropagation()}>
            <Plus className="w-3.5 h-3.5" style={{ color: 'var(--fg-3)' }} />
          </button>
        </div>
      </div>

      {/* Status — Jira-parity 6-category colours via workflow engine. */}
      <div className="px-2">
        <StatusLozengeByType
          issueType={item.issue_type}
          statusName={item.status}
          statusCategory={item.status_category}
          variant="bold"
          maxWidth={160}
        />
      </div>

      {/* Project */}
      <div className="px-2 truncate text-[13px]" style={{ color: 'var(--fg-2)', fontFamily: 'var(--cp-font-body)' }}>
        {item.project_key || '—'}
      </div>

      {/* Hub badge */}
      <div className="px-2">
        <span
          className="inline-block text-[10px] font-semibold uppercase px-2 py-0.5 rounded"
          style={{ backgroundColor: hubC.bg, color: hubC.text, border: `1px solid ${hubC.border}20` }}
        >
          {hubType}
        </span>
      </div>

      {/* Priority */}
      <div className="px-2">
        <PriorityBars priority={normalisePriority(item.priority)} barWidth={3} barHeight={12} />
      </div>

      {/* Updated */}
      <div className="px-2 text-[12px] truncate" style={{ color: 'var(--fg-3)', fontFamily: 'var(--cp-font-mono)' }}>
        {formatRelative(item.jira_updated_at)}
      </div>

      {/* Reporter */}
      <div className="flex items-center gap-1.5 px-2 min-w-0">
        {item.assignee_display_name ? (
          <>
            <div
              className="flex items-center justify-center rounded-full text-[10px] font-bold text-white shrink-0"
              style={{ width: 24, height: 24, backgroundColor: AVATAR_COLORS[hash % AVATAR_COLORS.length] }}
              aria-hidden="true"
            >
              {item.assignee_display_name.charAt(0).toUpperCase()}
            </div>
            <span className="text-[13px] truncate" style={{ color: 'var(--fg-2)', fontFamily: 'var(--cp-font-body)' }}>
              {item.assignee_display_name}
            </span>
          </>
        ) : (
          <span className="text-[12px] italic" style={{ color: 'var(--fg-3)' }}>Unassigned</span>
        )}
        <button
          className="ml-auto opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[rgba(128,128,128,0.12)] shrink-0 transition-opacity duration-80 focus-visible:outline-2 focus-visible:outline-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary))]"
          aria-label={`More actions for ${item.issue_key}`}
          onClick={(e) => { e.stopPropagation(); onContextMenu({ x: e.clientX, y: e.clientY, item }); }}
        >
          <MoreHorizontal className="w-4 h-4" style={{ color: 'var(--fg-3)' }} />
        </button>
      </div>
    </div>
  );
});
