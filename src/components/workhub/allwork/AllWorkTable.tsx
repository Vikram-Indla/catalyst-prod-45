/**
 * AllWorkTable — Grid view table (V12 Hybrid Precision)
 * 44px rows, RGBA hover, hierarchy expand/collapse, React.memo rows
 */
import { useState, useMemo, useCallback, memo } from 'react';
import { ChevronDown, ChevronRight, ArrowUp, ArrowDown, GripVertical, ExternalLink, Plus, MoreHorizontal } from 'lucide-react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { StatusLozenge } from '@/components/ui/StatusLozenge';
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

// ── Constants ──
const PRIORITY_BARS: Record<string, { bars: number; color: string }> = {
  Highest: { bars: 4, color: 'var(--sem-danger)' },
  High: { bars: 3, color: '#f97316' },
  Medium: { bars: 2, color: 'var(--cp-blue)' },
  Low: { bars: 1, color: '#22c55e' },
  Lowest: { bars: 0, color: '#8c8f96' },
};

const HUB_COLORS: Record<string, { border: string; text: string; bg: string }> = {
  project: { border: 'var(--cp-blue)', text: 'var(--cp-blue)', bg: 'var(--cp-primary-5)' },
  product: { border: 'var(--fg-2)', text: 'var(--fg-2)', bg: '#F4F4F5' },
  task: { border: '#D4D4D8', text: 'var(--fg-3)', bg: '#F4F4F5' },
  incident: { border: 'var(--sem-danger)', text: 'var(--sem-danger)', bg: '#FEF2F2' },
};

const AVATAR_COLORS = ['#4C6EF5', '#FA8C16', '#52C41A', '#EB2F96', '#722ED1', '#13C2C2', '#F5222D'];

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

// ── Sub-components ──
const PriorityBars = memo(function PriorityBars({ priority }: { priority: string }) {
  const cfg = PRIORITY_BARS[priority] || { bars: 2, color: 'var(--cp-blue)' };
  return (
    <div className="flex items-end gap-[2px]" title={priority} aria-label={`Priority: ${priority}`}>
      {[0, 1, 2, 3].map(i => (
        <div
          key={i}
          style={{
            width: 3,
            height: 6 + i * 3,
            borderRadius: 1,
            backgroundColor: i < cfg.bars ? cfg.color : 'var(--divider)',
          }}
        />
      ))}
    </div>
  );
});

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
}

export function AllWorkTable({
  items, selectedIds, onToggleSelect, onSelectAll, selectAllState,
  onOpenItem, sortField, sortDir, onSort,
}: Props) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => {
    const keys = new Set<string>();
    items.filter(i => i.parent_key).forEach(i => { if (i.parent_key) keys.add(i.parent_key); });
    return keys;
  });
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: AllWorkItem } | null>(null);

  const tree = useMemo(() => buildTree(items), [items]);
  const flatNodes = useMemo(() => flattenTree(tree, expandedKeys), [tree, expandedKeys]);
  const keysWithChildren = useMemo(() => {
    const s = new Set<string>();
    items.forEach(i => { if (i.parent_key) s.add(i.parent_key); });
    return s;
  }, [items]);

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
            borderBottom: '1px solid var(--bd-default, rgba(255,255,255,0.08))',
          }}
        >
          <div className="flex justify-center" role="columnheader">
            <input
              type="checkbox"
              checked={selectAllState === 'all'}
              ref={el => { if (el) el.indeterminate = selectAllState === 'some'; }}
              onChange={onSelectAll}
              className="w-4 h-4 rounded cursor-pointer accent-[#2563EB]"
              aria-label="Select all items"
            />
          </div>
          {COLUMNS.slice(1).map(col => (
            <button
              key={col.key}
              onClick={() => col.sortable && onSort(col.key)}
              role="columnheader"
              aria-sort={col.sortable && sortField === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
              className="flex items-center gap-1 text-left focus-visible:outline-2 focus-visible:outline-[#2563EB] focus-visible:outline-offset-2 rounded"
              style={{
                fontSize: '10.5px',
                fontWeight: 650,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: 'var(--fg-3)',
                cursor: col.sortable ? 'pointer' : 'default',
                padding: '0 8px',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {col.label}
              {col.sortable && sortField === col.key && (
                sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
              )}
            </button>
          ))}
        </div>

        {/* Rows */}
        <div className="flex-1 overflow-y-auto">
          {flatNodes.map(node => (
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
          ))}
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
        borderBottom: '0.75px solid var(--bd-subtle, rgba(255,255,255,0.05))',
        backgroundColor: isSelected ? 'rgba(37,99,235,0.08)' : node.depth > 0 ? 'var(--bg-1)' : 'var(--bg-app)',
        transition: 'background-color 80ms ease',
      }}
      onMouseEnter={e => { if (!isSelected) (e.currentTarget.style.backgroundColor = 'var(--hover, rgba(255,255,255,0.04))'); }}
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
          className="w-4 h-4 rounded cursor-pointer accent-[#2563EB]"
          aria-label={`Select ${item.issue_key}`}
        />
      </div>

      {/* Key */}
      <div className="flex items-center gap-1.5 px-2 min-w-0" style={{ paddingLeft: `${8 + node.depth * 28}px` }}>
        <GripVertical className="w-3 h-3 opacity-0 group-hover:opacity-40 shrink-0 transition-opacity duration-[80ms]" style={{ color: 'var(--fg-3)' }} />
        {hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleExpand(item.issue_key); }}
            className="w-4 h-4 flex items-center justify-center shrink-0 rounded hover:bg-[rgba(128,128,128,0.12)] transition-all duration-150 focus-visible:outline-2 focus-visible:outline-[#2563EB]"
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
          style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 650, color: 'var(--cp-blue)' }}
        >
          {item.issue_key}
        </span>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-1 px-2 min-w-0">
        <span className="text-[14px] truncate" style={{ color: 'var(--fg-1)', fontWeight: 400, fontFamily: 'Inter, sans-serif' }}>
          {item.summary}
        </span>
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0 ml-auto transition-opacity duration-[80ms]">
          <button className="p-0.5 rounded hover:bg-[rgba(128,128,128,0.12)] focus-visible:outline-2 focus-visible:outline-[#2563EB]" title="Open in new tab" aria-label="Open in new tab" onClick={e => e.stopPropagation()}>
            <ExternalLink className="w-3.5 h-3.5" style={{ color: 'var(--fg-3)' }} />
          </button>
          <button className="p-0.5 rounded hover:bg-[rgba(128,128,128,0.12)] focus-visible:outline-2 focus-visible:outline-[#2563EB]" title="Add child" aria-label="Add child item" onClick={e => e.stopPropagation()}>
            <Plus className="w-3.5 h-3.5" style={{ color: 'var(--fg-3)' }} />
          </button>
        </div>
      </div>

      {/* Status */}
      <div className="px-2">
        <StatusLozenge status={item.status} />
      </div>

      {/* Project */}
      <div className="px-2 truncate text-[13px]" style={{ color: 'var(--fg-2)', fontFamily: 'Inter, sans-serif' }}>
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
        <PriorityBars priority={item.priority} />
      </div>

      {/* Updated */}
      <div className="px-2 text-[12px] truncate" style={{ color: 'var(--fg-3)', fontFamily: "'JetBrains Mono', monospace" }}>
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
            <span className="text-[13px] truncate" style={{ color: 'var(--fg-2)', fontFamily: 'Inter, sans-serif' }}>
              {item.assignee_display_name}
            </span>
          </>
        ) : (
          <span className="text-[12px] italic" style={{ color: 'var(--fg-3)' }}>Unassigned</span>
        )}
        <button
          className="ml-auto opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[rgba(128,128,128,0.12)] shrink-0 transition-opacity duration-[80ms] focus-visible:outline-2 focus-visible:outline-[#2563EB]"
          aria-label={`More actions for ${item.issue_key}`}
          onClick={(e) => { e.stopPropagation(); onContextMenu({ x: e.clientX, y: e.clientY, item }); }}
        >
          <MoreHorizontal className="w-4 h-4" style={{ color: 'var(--fg-3)' }} />
        </button>
      </div>
    </div>
  );
});
