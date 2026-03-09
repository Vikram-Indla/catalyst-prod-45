/**
 * WorkItemTable — Jira-parity flat/hierarchical table view
 * 44px rows, sortable columns, expandable hierarchy, load-more pagination
 * F1-F4: Inline editing  F5: Bulk actions  F6: Bulk move  F7: Source badge
 * F8-F11: New columns  F12: Column management  F15+F16: Context menu
 */

import React, { useState, useMemo, useCallback } from 'react';
import { ChevronRight, ChevronDown, MoreHorizontal, Plus, RefreshCw } from 'lucide-react';
import type { WorkItem } from '@/types/hierarchy';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { StatusBadge } from './StatusBadge';
import { StatusDropdown } from './StatusDropdown';
import { PriorityDropdown } from './PriorityDropdown';
import { AssigneeDropdown, type AssigneeOption } from './AssigneeDropdown';
import { InlineEditTitle } from './InlineEditTitle';
import { BulkActionBar } from './BulkActionBar';
import { BulkMoveModal } from './BulkMoveModal';
import { HierarchyContextMenu } from './HierarchyContextMenu';
import { ColumnManagerDropdown, ALL_COLUMNS, getInitialVisibleColumns, saveVisibleColumns } from './ColumnManager';
import { useUpdateIssueField } from '@/hooks/useUpdateIssueField';
import { useBulkUpdateIssues, useBulkDeleteIssues } from '@/hooks/useBulkUpdateIssues';
import { toast } from 'sonner';

interface WorkItemTableProps {
  items: WorkItem[];
  search: string;
  onSelect: (item: WorkItem) => void;
  selectedId: string | null;
  projectKey: string;
  allStatuses: string[];
  onCreateClick?: () => void;
  onRefresh?: () => void;
  onAddChild?: (parentItem: WorkItem) => void;
}

type SortKey = string;
type SortDir = 'asc' | 'desc';

interface FlatRow {
  item: WorkItem;
  depth: number;
  hasChildren: boolean;
}

function flattenTree(items: WorkItem[], expandedIds: Set<string>, depth = 0): FlatRow[] {
  const result: FlatRow[] = [];
  for (const item of items) {
    result.push({ item, depth, hasChildren: item.children.length > 0 });
    if (expandedIds.has(item.id) && item.children.length > 0) {
      result.push(...flattenTree(item.children, expandedIds, depth + 1));
    }
  }
  return result;
}

function collectAssignees(items: WorkItem[]): AssigneeOption[] {
  const map = new Map<string, AssigneeOption>();
  function walk(nodes: WorkItem[]) {
    for (const n of nodes) {
      if (n.assignee && !map.has(n.assignee.displayName)) {
        map.set(n.assignee.displayName, { displayName: n.assignee.displayName, email: n.assignee.email, accountId: n.assignee.id });
      }
      walk(n.children);
    }
  }
  walk(items);
  return Array.from(map.values()).sort((a, b) => a.displayName.localeCompare(b.displayName));
}

/* ── Source Badge (F7) ── */
function SourceBadge({ source }: { source?: 'jira' | 'catalyst' }) {
  if (source === 'catalyst') {
    return (
      <span style={{
        fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
        padding: '1px 4px', borderRadius: 2,
        background: '#CCFBF1', color: '#0F766E',
        textTransform: 'uppercase', marginLeft: 4, flexShrink: 0,
      }}>CATALYST</span>
    );
  }
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
      padding: '1px 4px', borderRadius: 2,
      background: '#DEEBFF', color: '#0747A6',
      textTransform: 'uppercase', marginLeft: 4, flexShrink: 0,
    }}>JIRA</span>
  );
}

/* ── Assignee avatar ── */
function AssigneeCell({ assignee, onClick }: { assignee?: WorkItem['assignee']; onClick?: (e: React.MouseEvent) => void }) {
  if (!assignee) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
        <div style={{ width: 24, height: 24, borderRadius: '50%', border: '1px dashed #CBD5E1', flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic' }}>Unassigned</span>
      </div>
    );
  }
  const initials = assignee.displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
      <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#FFFFFF' }}>{initials}</span>
      </div>
      <span style={{ fontSize: 12, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{assignee.displayName}</span>
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

/* ── Priority bars ── */
function PriorityBarsCell({ level }: { level: number }) {
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} style={{ width: 12, height: 4, borderRadius: 1, background: i <= level ? '#64748B' : '#E2E8F0' }} />
      ))}
    </div>
  );
}

/* ── Labels pills (F9) ── */
function LabelsPills({ labels }: { labels: string[] }) {
  if (!labels || labels.length === 0) return <span style={{ fontSize: 12, color: '#94A3B8' }}>—</span>;
  const show = labels.slice(0, 2);
  const rest = labels.length - 2;
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', overflow: 'hidden' }}>
      {show.map(l => (
        <span key={l} style={{
          fontSize: 10, padding: '2px 8px', borderRadius: 9999,
          background: '#F1F5F9', color: '#334155', whiteSpace: 'nowrap',
        }}>{l}</span>
      ))}
      {rest > 0 && <span style={{ fontSize: 10, color: '#94A3B8' }}>+{rest}</span>}
    </div>
  );
}

/* ── Due date with color coding (F11) ── */
function DueDateCell({ date }: { date?: string }) {
  if (!date) return <span style={{ fontSize: 12, color: '#94A3B8' }}>—</span>;
  const d = new Date(date);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  let color = '#334155';
  if (dDate < today) color = '#DC2626';
  else if (dDate.getTime() === today.getTime()) color = '#D97706';
  return (
    <span style={{ fontSize: 12, color }}>
      {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
    </span>
  );
}

/* ── Type colors ── */
const TYPE_COLORS: Record<string, string> = {
  'Epic': '#2563EB', 'Feature': '#7C3AED', 'Story': '#16A34A', 'Sub-task': '#64748B',
  'Task': '#64748B', 'Bug': '#DC2626',
};

/* ── Column header ── */
function ColHeader({ label, sortKey, currentSort, currentDir, onSort, width, flex }: {
  label: string; sortKey: string; currentSort: string; currentDir: SortDir;
  onSort: (k: string) => void; width?: number; flex?: number;
}) {
  const isActive = currentSort === sortKey;
  return (
    <div
      onClick={() => onSort(sortKey)}
      style={{
        width, flex, height: 36, display: 'flex', alignItems: 'center', padding: '0 8px',
        fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#64748B',
        letterSpacing: '0.06em', cursor: 'pointer', userSelect: 'none', fontFamily: "'Inter', sans-serif",
      }}
    >
      {label}
      {isActive && <span style={{ marginLeft: 4, fontSize: 10 }}>{currentDir === 'asc' ? '↑' : '↓'}</span>}
    </div>
  );
}

type ActiveDropdown = { type: 'status' | 'priority' | 'assignee'; itemId: string } | null;

interface ContextMenuState {
  x: number;
  y: number;
  item: WorkItem;
}

export function WorkItemTable({ items, search, onSelect, selectedId, projectKey, allStatuses, onCreateClick, onRefresh, onAddChild }: WorkItemTableProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>('work');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [perPage, setPerPage] = useState(50);
  const [activeDropdown, setActiveDropdown] = useState<ActiveDropdown>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [editingTitleKey, setEditingTitleKey] = useState<string | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(getInitialVisibleColumns);

  const updateField = useUpdateIssueField(projectKey);
  const bulkUpdate = useBulkUpdateIssues(projectKey);
  const bulkDelete = useBulkDeleteIssues(projectKey);
  const allAssignees = useMemo(() => collectAssignees(items), [items]);

  const toggle = useCallback((id: string) => {
    setExpandedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }, []);

  const handleSort = useCallback((key: string) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }, [sortKey]);

  const flatRows = useMemo(() => flattenTree(items, expandedIds), [items, expandedIds]);
  const visibleRows = flatRows.slice(0, perPage);
  const totalFlat = flatRows.length;

  // Visible column defs (ordered)
  const columns = useMemo(() =>
    ALL_COLUMNS.filter(c => visibleColumns.includes(c.id)),
  [visibleColumns]);

  const openDropdown = useCallback((type: 'status' | 'priority' | 'assignee', itemId: string) => {
    setActiveDropdown(prev => prev?.type === type && prev.itemId === itemId ? null : { type, itemId });
  }, []);

  /* ── Single-item handlers ── */
  const handleStatusChange = useCallback((issueKey: string, newStatus: string) => {
    updateField.mutate({ issueKey, fields: { status: newStatus } });
    setActiveDropdown(null);
    toast.success(`Status updated to ${newStatus}`);
  }, [updateField]);

  const handlePriorityChange = useCallback((issueKey: string, newPriority: string) => {
    updateField.mutate({ issueKey, fields: { priority: newPriority === 'None' ? null : newPriority } });
    setActiveDropdown(null);
    toast.success(`Priority updated to ${newPriority}`);
  }, [updateField]);

  const handleAssigneeChange = useCallback((issueKey: string, assignee: AssigneeOption | null) => {
    updateField.mutate({
      issueKey,
      fields: {
        assignee_display_name: assignee?.displayName || null,
        assignee_email: assignee?.email || null,
        assignee_account_id: assignee?.accountId || null,
      },
    });
    setActiveDropdown(null);
    toast.success(assignee ? `Assigned to ${assignee.displayName}` : 'Unassigned');
  }, [updateField]);

  const handleTitleSave = useCallback((issueKey: string, newTitle: string) => {
    updateField.mutate({ issueKey, fields: { summary: newTitle } });
    setEditingTitleKey(null);
    toast.success('Title updated');
  }, [updateField]);

  /* ── Checkbox selection ── */
  const toggleSelect = useCallback((key: string) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedKeys(new Set(visibleRows.map(r => r.item.key)));
  }, [visibleRows]);

  const clearSelection = useCallback(() => setSelectedKeys(new Set()), []);

  const selectedKeysArray = useMemo(() => Array.from(selectedKeys), [selectedKeys]);

  /* ── Bulk handlers ── */
  const handleBulkStatusChange = useCallback((status: string) => {
    bulkUpdate.mutate({ issueKeys: selectedKeysArray, fields: { status } });
    clearSelection();
  }, [bulkUpdate, selectedKeysArray, clearSelection]);

  const handleBulkAssigneeChange = useCallback((assignee: AssigneeOption | null) => {
    bulkUpdate.mutate({
      issueKeys: selectedKeysArray,
      fields: {
        assignee_display_name: assignee?.displayName || null,
        assignee_email: assignee?.email || null,
        assignee_account_id: assignee?.accountId || null,
      },
    });
    clearSelection();
  }, [bulkUpdate, selectedKeysArray, clearSelection]);

  const handleBulkPriorityChange = useCallback((priority: string) => {
    bulkUpdate.mutate({ issueKeys: selectedKeysArray, fields: { priority: priority === 'None' ? null : priority } });
    clearSelection();
  }, [bulkUpdate, selectedKeysArray, clearSelection]);

  const handleBulkDelete = useCallback(() => {
    bulkDelete.mutate({ issueKeys: selectedKeysArray });
    clearSelection();
  }, [bulkDelete, selectedKeysArray, clearSelection]);

  const handleBulkMove = useCallback((parentKey: string) => {
    bulkUpdate.mutate({ issueKeys: selectedKeysArray, fields: { parent_key: parentKey } });
    setShowMoveModal(false);
    clearSelection();
  }, [bulkUpdate, selectedKeysArray, clearSelection]);

  /* ── Context menu ── */
  const handleContextMenu = useCallback((e: React.MouseEvent, item: WorkItem) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, item });
  }, []);

  const openContextMenuFor3Dot = useCallback((e: React.MouseEvent, item: WorkItem) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setContextMenu({ x: rect.left, y: rect.bottom + 4, item });
  }, []);

  /* ── Header checkbox state ── */
  const allVisibleSelected = visibleRows.length > 0 && visibleRows.every(r => selectedKeys.has(r.item.key));
  const someSelected = visibleRows.some(r => selectedKeys.has(r.item.key));

  /* ── Cell renderer ── */
  function renderCell(colId: string, item: WorkItem, depth: number, hasChildren: boolean, isExpanded: boolean) {
    switch (colId) {
      case 'work':
        return (
          <div style={{ flex: 1, minWidth: 280, display: 'flex', alignItems: 'center', gap: 6, paddingLeft: depth * 24 + 8, paddingRight: 8, overflow: 'hidden' }}>
            {hasChildren ? (
              <button onClick={(e) => { e.stopPropagation(); toggle(item.id); }}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', flexShrink: 0 }}>
                {isExpanded ? <ChevronDown size={16} color="#94A3B8" /> : <ChevronRight size={16} color="#94A3B8" />}
              </button>
            ) : <div style={{ width: 16, flexShrink: 0 }} />}
            {item.issueType && <JiraIssueTypeIcon type={item.issueType} size={16} />}
            <span style={{ fontSize: 12, fontWeight: 600, color: '#2563EB', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
              {item.key}
            </span>
            <InlineEditTitle
              value={item.title}
              onSave={(newTitle) => handleTitleSave(item.key, newTitle)}
              forceEdit={editingTitleKey === item.key}
              onCancelForceEdit={() => setEditingTitleKey(null)}
            />
            <SourceBadge source={item.source} />
          </div>
        );
      case 'status':
        return (
          <div style={{ width: 150, padding: '0 8px', position: 'relative' }}>
            <StatusBadge status={item.status.name} onClick={(e) => { e.stopPropagation(); openDropdown('status', item.id); }} />
            {activeDropdown?.type === 'status' && activeDropdown.itemId === item.id && (
              <StatusDropdown currentStatus={item.status.name} availableStatuses={allStatuses}
                onSelect={(s) => handleStatusChange(item.key, s)} onClose={() => setActiveDropdown(null)} />
            )}
          </div>
        );
      case 'parent':
        return (
          <div style={{ width: 120, padding: '0 8px' }}>
            <span style={{ fontSize: 12, color: item.parentId ? '#2563EB' : '#94A3B8' }}>{item.parentId || '—'}</span>
          </div>
        );
      case 'assignee':
        return (
          <div style={{ width: 160, padding: '0 8px', overflow: 'hidden', position: 'relative' }}>
            <AssigneeCell assignee={item.assignee} onClick={(e) => { e.stopPropagation(); openDropdown('assignee', item.id); }} />
            {activeDropdown?.type === 'assignee' && activeDropdown.itemId === item.id && (
              <AssigneeDropdown currentAssignee={item.assignee?.displayName} availableAssignees={allAssignees}
                onSelect={(a) => handleAssigneeChange(item.key, a)} onClose={() => setActiveDropdown(null)} />
            )}
          </div>
        );
      case 'created':
        return (
          <div style={{ width: 150, padding: '0 8px' }}>
            <span style={{ fontSize: 12, color: '#64748B' }}>
              {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
            </span>
          </div>
        );
      case 'fixVersion':
        return (
          <div style={{ width: 140, padding: '0 8px' }}>
            {item.fixVersion ? (
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 3, background: '#F1F5F9', color: '#334155' }}>
                {item.fixVersion.name}
              </span>
            ) : <span style={{ fontSize: 12, color: '#94A3B8' }}>—</span>}
          </div>
        );
      case 'labels':
        return (
          <div style={{ width: 160, padding: '0 8px', overflow: 'hidden' }}>
            <LabelsPills labels={item.labels} />
          </div>
        );
      case 'storyPoints':
        return (
          <div style={{ width: 80, padding: '0 8px', textAlign: 'right' }}>
            <span style={{ fontSize: 12, color: item.storyPoints != null ? '#334155' : '#94A3B8' }}>
              {item.storyPoints != null ? item.storyPoints : '—'}
            </span>
          </div>
        );
      case 'dueDate':
        return (
          <div style={{ width: 120, padding: '0 8px' }}>
            <DueDateCell date={item.dueDate} />
          </div>
        );
      case 'reporter':
        return (
          <div style={{ width: 140, padding: '0 8px', overflow: 'hidden' }}>
            <span style={{ fontSize: 12, color: item.reporter ? '#0F172A' : '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.reporter || '—'}
            </span>
          </div>
        );
      case 'updated':
        return (
          <div style={{ width: 150, padding: '0 8px' }}>
            <span style={{ fontSize: 12, color: '#64748B' }}>
              {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
            </span>
          </div>
        );
      case 'priority':
        return (
          <div style={{ width: 90, padding: '0 8px', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}
              onClick={(e) => { e.stopPropagation(); openDropdown('priority', item.id); }}>
              <PriorityBarsCell level={priorityToLevel(item.priority?.name)} />
              <span style={{ fontSize: 11, color: '#64748B' }}>{item.priority?.name || '—'}</span>
            </div>
            {activeDropdown?.type === 'priority' && activeDropdown.itemId === item.id && (
              <PriorityDropdown currentPriority={item.priority?.name}
                onSelect={(p) => handlePriorityChange(item.key, p)} onClose={() => setActiveDropdown(null)} />
            )}
          </div>
        );
      case 'type':
        return (
          <div style={{ width: 100, padding: '0 8px' }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: TYPE_COLORS[item.issueType || ''] || '#64748B' }}>
              {item.issueType || '—'}
            </span>
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <div style={{ border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden', background: '#FFFFFF' }}>
      {/* Bulk action bar */}
      <BulkActionBar
        selectedCount={selectedKeys.size}
        allStatuses={allStatuses}
        allAssignees={allAssignees}
        onClear={clearSelection}
        onBulkStatusChange={handleBulkStatusChange}
        onBulkAssigneeChange={handleBulkAssigneeChange}
        onBulkPriorityChange={handleBulkPriorityChange}
        onBulkDelete={handleBulkDelete}
        onBulkMove={() => setShowMoveModal(true)}
      />

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', height: 36, background: '#FAFAFA', borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ width: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <input
            type="checkbox"
            checked={allVisibleSelected}
            ref={el => { if (el) el.indeterminate = someSelected && !allVisibleSelected; }}
            onChange={() => allVisibleSelected ? clearSelection() : selectAll()}
            style={{ width: 16, height: 16, cursor: 'pointer' }}
          />
        </div>
        {columns.map(col => (
          <ColHeader
            key={col.id}
            label={col.label}
            sortKey={col.id}
            currentSort={sortKey}
            currentDir={sortDir}
            onSort={handleSort}
            width={col.id === 'work' ? undefined : col.width}
            flex={col.id === 'work' ? 1 : undefined}
          />
        ))}
        {/* Column manager gear */}
        <div style={{ width: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ColumnManagerDropdown visibleColumns={visibleColumns} onChange={setVisibleColumns} />
        </div>
      </div>

      {/* Body rows */}
      {visibleRows.map(({ item, depth, hasChildren }) => {
        const isExpanded = expandedIds.has(item.id);
        const isSelected = selectedId === item.id;
        const isChecked = selectedKeys.has(item.key);

        return (
          <div
            key={item.id}
            className="hi-table-row"
            onClick={() => onSelect(item)}
            onContextMenu={(e) => handleContextMenu(e, item)}
            style={{
              height: 44, maxHeight: 44, display: 'flex', alignItems: 'center',
              borderBottom: '1px solid #F1F5F9', cursor: 'pointer',
              background: isChecked ? '#F0F9FF' : isSelected ? '#EFF6FF' : undefined,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {/* Checkbox */}
            <div style={{ width: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => toggleSelect(item.key)}
                onClick={e => e.stopPropagation()}
                style={{ width: 16, height: 16, cursor: 'pointer' }}
              />
            </div>

            {/* Dynamic columns */}
            {columns.map(col => (
              <React.Fragment key={col.id}>
                {renderCell(col.id, item, depth, hasChildren, isExpanded)}
              </React.Fragment>
            ))}

            {/* 3-dot actions (F16) */}
            <div style={{ width: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <button className="hi-row-action"
                onClick={(e) => openContextMenuFor3Dot(e, item)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                <MoreHorizontal size={16} color="#64748B" />
              </button>
            </div>
          </div>
        );
      })}

      {/* Footer */}
      <div style={{ height: 40, background: '#FAFAFA', borderTop: '1px solid #E2E8F0', padding: '0 16px', display: 'flex', alignItems: 'center' }}>
        <button
          onClick={onCreateClick}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500, color: '#64748B', padding: 0 }}
          onMouseEnter={e => (e.currentTarget.style.color = '#2563EB')}
          onMouseLeave={e => (e.currentTarget.style.color = '#64748B')}
        >
          <Plus size={14} /> Create
        </button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <span style={{ fontSize: 12, color: '#64748B', fontFamily: "'Inter', sans-serif" }}>
            {Math.min(perPage, totalFlat)} of {totalFlat}
          </span>
          {perPage < totalFlat && (
            <button
              onClick={() => setPerPage(p => p + 50)}
              style={{ marginLeft: 8, background: 'none', border: '1px solid #E2E8F0', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 500, color: '#2563EB', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}
            >
              Load more
            </button>
          )}
        </div>
        {onRefresh && (
          <button onClick={onRefresh} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
            <RefreshCw size={14} color="#64748B" />
          </button>
        )}
      </div>

      {/* Context menu (F15 + F16) */}
      {contextMenu && (
        <HierarchyContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          itemKey={contextMenu.item.key}
          currentStatus={contextMenu.item.status.name}
          currentPriority={contextMenu.item.priority?.name}
          currentAssignee={contextMenu.item.assignee?.displayName}
          allStatuses={allStatuses}
          allAssignees={allAssignees}
          onClose={() => setContextMenu(null)}
          onEditTitle={() => setEditingTitleKey(contextMenu.item.key)}
          onCopyKey={() => { navigator.clipboard.writeText(contextMenu.item.key); toast.success(`Copied ${contextMenu.item.key}`); }}
          onCopyLink={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied'); }}
          onChangeStatus={(s) => handleStatusChange(contextMenu.item.key, s)}
          onChangePriority={(p) => handlePriorityChange(contextMenu.item.key, p)}
          onChangeAssignee={(a) => handleAssigneeChange(contextMenu.item.key, a)}
          onMoveToParent={() => { setSelectedKeys(new Set([contextMenu.item.key])); setShowMoveModal(true); }}
          onAddChild={() => onAddChild?.(contextMenu.item)}
          onDelete={() => { bulkDelete.mutate({ issueKeys: [contextMenu.item.key] }); }}
        />
      )}

      {/* Bulk move modal (F6) */}
      {showMoveModal && (
        <BulkMoveModal
          items={items}
          selectedKeys={selectedKeysArray}
          onConfirm={handleBulkMove}
          onClose={() => setShowMoveModal(false)}
        />
      )}

      <style>{`
        .hi-table-row:hover { background: #F8FAFC !important; }
        .hi-table-row .hi-row-action { opacity: 0; transition: opacity 150ms ease; }
        .hi-table-row:hover .hi-row-action { opacity: 1; }
      `}</style>
    </div>
  );
}
