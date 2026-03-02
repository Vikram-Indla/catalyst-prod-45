/**
 * AllWorkTable — Grid view table matching V3 HTML demo
 * 40px rows, Jira border style, hierarchy expand/collapse
 */
import { useState, useMemo, useCallback, useRef } from 'react';
import { ChevronDown, ChevronRight, ArrowUp, ArrowDown, GripVertical, ExternalLink, Plus, MoreHorizontal } from 'lucide-react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { StatusLozenge } from '@/components/ui/StatusLozenge';
import type { JiraIssue } from '@/hooks/workhub/useWorkItems';
import { buildTree, flattenTree } from '@/hooks/workhub/useWorkItems';
import { AllWorkContextMenu } from './AllWorkContextMenu';
import { formatDistanceToNow } from 'date-fns';

const PRIORITY_BARS: Record<string, { bars: number; color: string }> = {
  Highest: { bars: 4, color: '#ef4444' },
  High: { bars: 3, color: '#f97316' },
  Medium: { bars: 2, color: '#3b82f6' },
  Low: { bars: 1, color: '#22c55e' },
  Lowest: { bars: 0, color: '#8c8f96' },
};

function PriorityBars({ priority }: { priority: string }) {
  const cfg = PRIORITY_BARS[priority] || { bars: 2, color: '#3b82f6' };
  return (
    <div className="flex items-end gap-[2px]" title={priority}>
      {[0, 1, 2, 3].map(i => (
        <div
          key={i}
          style={{
            width: 3,
            height: 6 + i * 3,
            borderRadius: 1,
            backgroundColor: i < cfg.bars ? cfg.color : '#e2e8f0',
          }}
        />
      ))}
    </div>
  );
}

function formatRelative(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: false }).replace('about ', '').replace('less than a minute', 'just now') + ' ago';
  } catch { return '—'; }
}

const HUB_COLORS: Record<string, { border: string; text: string; bg: string }> = {
  project: { border: '#2563EB', text: '#2563EB', bg: '#EFF6FF' },
  product: { border: '#3F3F46', text: '#3F3F46', bg: '#F4F4F5' },
  task: { border: '#D4D4D8', text: '#71717A', bg: '#F4F4F5' },
  incident: { border: '#DC2626', text: '#DC2626', bg: '#FEF2F2' },
};

function getHubType(issueType: string): string {
  const t = issueType.toLowerCase();
  if (t.includes('incident') || t.includes('bug') || t.includes('defect')) return 'incident';
  if (t.includes('epic') || t.includes('story') || t.includes('feature')) return 'project';
  if (t.includes('sub-task') || t.includes('subtask') || t.includes('task')) return 'task';
  return 'product';
}

interface Column {
  key: string;
  label: string;
  width: string;
  sortable?: boolean;
}

const COLUMNS: Column[] = [
  { key: 'checkbox', label: '', width: '40px' },
  { key: 'key', label: 'Key', width: '140px', sortable: true },
  { key: 'summary', label: 'Summary', width: '1fr' },
  { key: 'status', label: 'Status', width: '120px', sortable: true },
  { key: 'project', label: 'Project', width: '140px' },
  { key: 'hub', label: 'Hub', width: '95px' },
  { key: 'priority', label: 'Priority', width: '80px', sortable: true },
  { key: 'updated', label: 'Updated', width: '110px', sortable: true },
  { key: 'reporter', label: 'Reported by', width: '180px' },
];

const GRID_TEMPLATE = COLUMNS.map(c => c.width).join(' ');

interface Props {
  items: JiraIssue[];
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
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: JiraIssue } | null>(null);

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

  const AVATAR_COLORS = ['#4C6EF5', '#FA8C16', '#52C41A', '#EB2F96', '#722ED1', '#13C2C2', '#F5222D'];

  return (
    <>
      <div
        className="rounded-lg border overflow-hidden overflow-x-auto h-full flex flex-col"
        style={{ borderColor: 'rgba(11,18,14,0.14)', backgroundColor: '#fff' }}
      >
        {/* Header */}
        <div
          className="grid items-center sticky top-0 z-10"
          style={{
            gridTemplateColumns: GRID_TEMPLATE,
            height: 40,
            backgroundColor: '#f8fafc',
            borderBottom: '0.56px solid rgba(11,18,14,0.14)',
          }}
        >
          <div className="flex justify-center">
            <input
              type="checkbox"
              checked={selectAllState === 'all'}
              ref={el => { if (el) el.indeterminate = selectAllState === 'some'; }}
              onChange={onSelectAll}
              className="w-4 h-4 rounded cursor-pointer"
              style={{ accentColor: '#1868db' }}
            />
          </div>
          {COLUMNS.slice(1).map(col => (
            <button
              key={col.key}
              onClick={() => col.sortable && onSort(col.key)}
              className="flex items-center gap-1 text-left"
              style={{
                fontSize: '10.5px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: '#6b6e76',
                cursor: col.sortable ? 'pointer' : 'default',
                padding: '0 8px',
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
          {flatNodes.map(node => {
            const item = node.item;
            const isSelected = selectedIds.has(item.issue_key);
            const hasChildren = keysWithChildren.has(item.issue_key);
            const isExpanded = expandedKeys.has(item.issue_key);
            const hubType = getHubType(item.issue_type);
            const hubC = HUB_COLORS[hubType];
            const nameHash = (item.assignee_display_name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);

            return (
              <div
                key={item.issue_key}
                className="grid items-center group cursor-pointer transition-colors"
                style={{
                  gridTemplateColumns: GRID_TEMPLATE,
                  height: 40,
                  maxHeight: 40,
                  borderBottom: '0.56px solid rgba(11,18,14,0.14)',
                  backgroundColor: isSelected ? '#e9f2fe' : node.depth > 0 ? '#fafbfc' : '#fff',
                }}
                onClick={() => onOpenItem(item.issue_key)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({ x: e.clientX, y: e.clientY, item });
                }}
              >
                {/* Checkbox */}
                <div className="flex justify-center" onClick={e => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(item.issue_key)}
                    className="w-4 h-4 rounded cursor-pointer"
                    style={{ accentColor: '#1868db' }}
                  />
                </div>

                {/* Key */}
                <div className="flex items-center gap-1.5 px-2 min-w-0" style={{ paddingLeft: `${8 + node.depth * 28}px` }}>
                  {/* Hover drag handle */}
                  <GripVertical className="w-3 h-3 opacity-0 group-hover:opacity-40 shrink-0 transition-opacity" style={{ color: '#6b6e76' }} />
                  {hasChildren ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleExpand(item.issue_key); }}
                      className="w-4 h-4 flex items-center justify-center shrink-0 rounded hover:bg-[#e2e8f0] transition-colors"
                    >
                      {isExpanded
                        ? <ChevronDown className="w-3.5 h-3.5" style={{ color: '#6b6e76' }} />
                        : <ChevronRight className="w-3.5 h-3.5" style={{ color: '#94a3b8' }} />
                      }
                    </button>
                  ) : (
                    <span className="w-4 shrink-0" />
                  )}
                  <JiraIssueTypeIcon type={item.issue_type} size={16} />
                  <span
                    className="text-[13px] truncate"
                    style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 653, color: '#1868db' }}
                  >
                    {item.issue_key}
                  </span>
                </div>

                {/* Summary */}
                <div className="flex items-center gap-1 px-2 min-w-0">
                  <span
                    className="text-[14px] truncate"
                    style={{ color: '#1A1D23', fontWeight: 400 }}
                  >
                    {item.summary}
                  </span>
                  {/* Hover actions */}
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0 ml-auto transition-opacity">
                    <button className="p-0.5 rounded hover:bg-[#e2e8f0]" title="Open in new tab" onClick={e => e.stopPropagation()}>
                      <ExternalLink className="w-3.5 h-3.5" style={{ color: '#6b6e76' }} />
                    </button>
                    <button className="p-0.5 rounded hover:bg-[#e2e8f0]" title="Add child" onClick={e => e.stopPropagation()}>
                      <Plus className="w-3.5 h-3.5" style={{ color: '#6b6e76' }} />
                    </button>
                  </div>
                </div>

                {/* Status */}
                <div className="px-2">
                  <StatusLozenge status={item.status} />
                </div>

                {/* Project */}
                <div className="px-2 truncate text-[13px]" style={{ color: '#44546f' }}>
                  {item.project_key}
                </div>

                {/* Hub badge */}
                <div className="px-2">
                  <span
                    className="inline-block text-[10px] font-semibold uppercase px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: hubC.bg,
                      color: hubC.text,
                      border: `1px solid ${hubC.border}20`,
                    }}
                  >
                    {hubType}
                  </span>
                </div>

                {/* Priority */}
                <div className="px-2">
                  <PriorityBars priority={item.priority} />
                </div>

                {/* Updated */}
                <div className="px-2 text-[12px] truncate" style={{ color: '#6b6e76' }}>
                  {formatRelative(item.jira_updated_at)}
                </div>

                {/* Reporter */}
                <div className="flex items-center gap-1.5 px-2 min-w-0">
                  {item.assignee_display_name ? (
                    <>
                      <div
                        className="flex items-center justify-center rounded-full text-[9px] font-bold text-white shrink-0"
                        style={{
                          width: 24, height: 24,
                          backgroundColor: AVATAR_COLORS[nameHash % AVATAR_COLORS.length],
                        }}
                      >
                        {item.assignee_display_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-[13px] truncate" style={{ color: '#44546f' }}>
                        {item.assignee_display_name}
                      </span>
                    </>
                  ) : (
                    <span className="text-[12px] italic" style={{ color: '#8c8f96' }}>Unassigned</span>
                  )}
                  {/* Meatball menu */}
                  <button
                    className="ml-auto opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[#e2e8f0] shrink-0 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      setContextMenu({ x: e.clientX, y: e.clientY, item });
                    }}
                  >
                    <MoreHorizontal className="w-4 h-4" style={{ color: '#6b6e76' }} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Context menu */}
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
