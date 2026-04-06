/**
 * WorkHubTable — Main container (Stage E: GOD-TIER polish)
 * 3 QA cycles: edge cases, design compliance, accessibility
 */
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useWorkItems, useCreateWorkItem, useUpdateWorkItem, useBulkUpdateWorkItems, useDeleteWorkItem } from '@/hooks/useWorkHub';
import { deriveStatusCategory } from '@/services/workhub-service';
import type { FilterConfig, SortConfig, GroupByField, ViewMode, ColumnConfig } from '@/types/workhub';
import type { WorkHubItem } from '@/services/workhub-service';
import WorkHubToolbar from './WorkHubToolbar';
import WorkHubHeader from './WorkHubHeader';
import WorkHubRow from './WorkHubRow';
import WorkHubGroupHeader from './WorkHubGroupHeader';
import WorkHubInlineCreate from './WorkHubInlineCreate';
import WorkHubBulkBar from './WorkHubBulkBar';
import WorkHubSidePanel from './WorkHubSidePanel';
import { AlertTriangle } from 'lucide-react';

interface WorkHubTableProps {
  projectKey: string;
  projectId?: string;
  defaultType?: string;
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'type', label: 'Type', visible: true, width: 44, minWidth: 44, sortable: true, filterable: true, resizable: false },
  { id: 'key', label: 'Key', visible: true, width: 110, minWidth: 100, sortable: true, filterable: false, resizable: true },
  { id: 'summary', label: 'Summary', visible: true, width: 400, minWidth: 300, sortable: true, filterable: false, resizable: true },
  { id: 'status', label: 'Status', visible: true, width: 140, minWidth: 130, sortable: true, filterable: true, resizable: true },
  { id: 'parent', label: 'Parent', visible: true, width: 200, minWidth: 180, sortable: false, filterable: true, resizable: true },
  { id: 'assignee', label: 'Assignee', visible: true, width: 160, minWidth: 140, sortable: true, filterable: true, resizable: true },
  { id: 'priority', label: 'Priority', visible: true, width: 90, minWidth: 80, sortable: true, filterable: true, resizable: false },
  { id: 'created', label: 'Created', visible: true, width: 110, minWidth: 100, sortable: true, filterable: false, resizable: true },
  { id: 'updated', label: 'Updated', visible: true, width: 110, minWidth: 100, sortable: true, filterable: false, resizable: true },
  { id: 'due_date', label: 'Due Date', visible: false, width: 110, minWidth: 100, sortable: true, filterable: false, resizable: true },
  { id: 'points', label: 'Points', visible: true, width: 80, minWidth: 70, sortable: true, filterable: false, resizable: false },
];

const EMPTY_FILTERS: FilterConfig = { statuses: [], types: [], priorities: [], assignee_ids: [], has_due_date: null, search_query: '' };

function normalizeCategory(cat: string | null): string {
  if (!cat) return 'To Do';
  const c = cat.toLowerCase();
  if (c === 'done' || c === 'complete') return 'Done';
  if (c === 'in progress' || c === 'in_progress') return 'In Progress';
  return 'To Do';
}

const GROUP_ORDER = ['To Do', 'In Progress', 'Done'];

const GROUP_DEFAULT_STATUS: Record<string, string> = {
  'To Do': 'Backlog',
  'In Progress': 'In Progress',
  'Done': 'Done',
};

function loadColumnConfig(projectKey: string): ColumnConfig[] | null {
  try {
    const stored = localStorage.getItem(`workhub-columns-${projectKey}`);
    return stored ? JSON.parse(stored) : null;
  } catch { return null; }
}

function saveColumnConfig(projectKey: string, columns: ColumnConfig[]) {
  try { localStorage.setItem(`workhub-columns-${projectKey}`, JSON.stringify(columns)); } catch {}
}

function loadSort(projectKey: string, viewMode: string): SortConfig | null {
  try {
    const stored = localStorage.getItem(`workhub-sort-${projectKey}-${viewMode}`);
    return stored ? JSON.parse(stored) : null;
  } catch { return null; }
}

function saveSort(projectKey: string, viewMode: string, sort: SortConfig | null) {
  try {
    if (sort) localStorage.setItem(`workhub-sort-${projectKey}-${viewMode}`, JSON.stringify(sort));
    else localStorage.removeItem(`workhub-sort-${projectKey}-${viewMode}`);
  } catch {}
}

/* Skeleton row matching column layout */
function SkeletonRow({ columns, idx }: { columns: ColumnConfig[]; idx: number }) {
  const vis = columns.filter(c => c.visible);
  return (
    <div style={{ display: 'flex', alignItems: 'center', height: 50, borderBottom: '0.75px solid var(--bd-subtle, rgba(255,255,255,0.05))' }} aria-hidden>
      <div style={{ width: 44, minWidth: 44, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
        <div className="wh-skeleton" style={{ width: 16, height: 16, borderRadius: 3 }} />
      </div>
      {vis.map(col => (
        <div key={col.id} style={{ width: col.width, minWidth: col.minWidth, padding: '8px 12px', flexShrink: 0 }}>
          <div className="wh-skeleton" style={{
            height: 12, borderRadius: 4,
            width: col.id === 'key' ? 80 : col.id === 'summary' ? `${180 + (idx % 3) * 40}px` : col.id === 'status' ? 90 : col.id === 'priority' ? 16 : col.id === 'points' ? 24 : '60%',
          }} />
        </div>
      ))}
    </div>
  );
}

export default function WorkHubTable({ projectKey, projectId, defaultType = 'Story' }: WorkHubTableProps) {
  const [filters, setFilters] = useState<FilterConfig>(EMPTY_FILTERS);
  const [viewMode, setViewMode] = useState<ViewMode>('backlog');
  const [sort, setSort] = useState<SortConfig | null>(() => loadSort(projectKey, 'backlog'));
  const [groupBy, setGroupBy] = useState<GroupByField>('status_category');
  const [columns, setColumns] = useState<ColumnConfig[]>(() => loadColumnConfig(projectKey) || DEFAULT_COLUMNS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [panelItemId, setPanelItemId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<'view' | 'create'>('view');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<{ ids: string[]; items: WorkHubItem[] } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const { data: items = [], isLoading, error, refetch } = useWorkItems(projectKey, filters, sort ?? undefined);
  const createMutation = useCreateWorkItem(projectKey);
  const updateMutation = useUpdateWorkItem(projectKey);
  const bulkMutation = useBulkUpdateWorkItems(projectKey);
  const deleteMutation = useDeleteWorkItem(projectKey);

  // Persist column config
  useEffect(() => { saveColumnConfig(projectKey, columns); }, [columns, projectKey]);
  // Persist sort per view
  useEffect(() => { saveSort(projectKey, viewMode, sort); }, [sort, projectKey, viewMode]);

  // Cmd+K → focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); searchRef.current?.focus(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Clear filters on view mode change
  const handleViewModeChange = useCallback((v: ViewMode) => {
    setViewMode(v);
    setFilters(EMPTY_FILTERS);
    setSort(loadSort(projectKey, v));
  }, [projectKey]);

  // Auto-collapse Done when >200 items
  useEffect(() => {
    if (items.length > 200 && !collapsed['Done']) {
      setCollapsed(prev => ({ ...prev, 'Done': true }));
    }
  }, [items.length]);

  const uniqueStatuses = useMemo(() => [...new Set(items.map(i => i.status).filter(Boolean))].sort(), [items]);
  const uniqueTypes = useMemo(() => [...new Set(items.map(i => i.issue_type).filter(Boolean))].sort(), [items]);
  const uniqueAssignees = useMemo(() => [...new Set(items.map(i => i.assignee_display_name).filter(Boolean) as string[])].sort(), [items]);
  const uniquePriorities = useMemo(() => [...new Set(items.map(i => i.priority).filter(Boolean))].sort(), [items]);

  const grouped = useMemo(() => {
    if (groupBy === 'none') return [{ key: 'all', label: 'All Items', items }];
    const groups = new Map<string, WorkHubItem[]>();
    for (const item of items) {
      let key: string;
      switch (groupBy) {
        case 'status_category': key = normalizeCategory(item.status_category); break;
        case 'assignee_id': key = item.assignee_display_name || 'Unassigned'; break;
        case 'priority': key = item.priority || 'None'; break;
        case 'type': key = item.issue_type || 'Unknown'; break;
        case 'parent_key': key = item.parent_key || 'No Parent'; break;
        default: key = 'All'; break;
      }
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    }
    const entries = Array.from(groups.entries());
    if (groupBy === 'status_category') entries.sort((a, b) => GROUP_ORDER.indexOf(a[0]) - GROUP_ORDER.indexOf(b[0]));
    else entries.sort((a, b) => a[0].localeCompare(b[0]));
    return entries.map(([key, items]) => ({ key, label: key, items }));
  }, [items, groupBy]);

  const handleSort = useCallback((column: string) => {
    setSort(prev => {
      if (!prev || prev.column !== column) return { column, direction: 'asc' };
      if (prev.direction === 'asc') return { column, direction: 'desc' };
      return null;
    });
  }, []);

  const handleColumnResize = useCallback((columnId: string, width: number) => {
    setColumns(prev => prev.map(c => c.id === columnId ? { ...c, width } : c));
  }, []);

  const handleColumnToggle = useCallback((columnId: string) => {
    setColumns(prev => prev.map(c => c.id === columnId ? { ...c, visible: !c.visible } : c));
  }, []);

  const allSelected = items.length > 0 && items.every(i => selectedIds.has(i.id));
  const handleSelectAll = useCallback((checked: boolean) => {
    setSelectedIds(checked ? new Set(items.map(i => i.id)) : new Set());
  }, [items]);

  const toggleSelect = useCallback((id: string, checked: boolean) => {
    setSelectedIds(prev => { const n = new Set(prev); if (checked) n.add(id); else n.delete(id); return n; });
  }, []);

  const handleInlineEdit = useCallback((itemId: string, field: string, value: any) => {
    const updates: Record<string, any> = { [field]: value };
    if (field === 'status') updates.status_category = deriveStatusCategory(value);
    updateMutation.mutate({ itemId, updates });
  }, [updateMutation]);

  const handleInlineCreate = useCallback((summary: string, type: string, groupCategory?: string) => {
    const status = GROUP_DEFAULT_STATUS[groupCategory || 'To Do'] || 'Backlog';
    const status_category = deriveStatusCategory(status);
    const resolvedProjectId = projectId || (items[0] as any)?.project_id || '';
    createMutation.mutate({
      summary, issue_type: type, status, status_category, priority: 'Medium',
      project_key: projectKey, project_id: resolvedProjectId,
    });
  }, [createMutation, projectKey, projectId, items]);

  const handleToolbarCreate = useCallback(() => { setPanelItemId(null); setPanelMode('create'); }, []);

  const handleDeleteRequest = useCallback((itemIds: string[]) => {
    const targetItems = items.filter(i => itemIds.includes(i.id));
    setDeleteConfirm({ ids: itemIds, items: targetItems });
  }, [items]);

  const confirmDelete = useCallback(() => {
    if (!deleteConfirm) return;
    if (deleteConfirm.ids.length === 1) {
      deleteMutation.mutate(deleteConfirm.ids[0]);
      if (panelItemId === deleteConfirm.ids[0]) setPanelItemId(null);
    } else {
      bulkMutation.mutate({ type: 'delete', item_ids: deleteConfirm.ids });
    }
    setSelectedIds(new Set());
    setDeleteConfirm(null);
  }, [deleteConfirm, deleteMutation, bulkMutation, panelItemId]);

  const handleBulkStatus = (status: string) => { bulkMutation.mutate({ type: 'status_change', item_ids: Array.from(selectedIds), value: status }); setSelectedIds(new Set()); };
  const handleBulkPriority = (priority: string) => { bulkMutation.mutate({ type: 'priority_change', item_ids: Array.from(selectedIds), value: priority }); setSelectedIds(new Set()); };
  const handleBulkDelete = () => { handleDeleteRequest(Array.from(selectedIds)); };

  const hasActiveFilters = (filters.statuses?.length || 0) + (filters.types?.length || 0) + (filters.priorities?.length || 0) + (filters.assignee_ids?.length || 0) > 0 || !!filters.search_query;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-app)', minWidth: 1320 }} role="region" aria-label="Work items table">
      <WorkHubToolbar
        filters={filters}
        onFiltersChange={setFilters}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        onCreateClick={handleToolbarCreate}
        uniqueStatuses={uniqueStatuses}
        uniqueTypes={uniqueTypes}
        uniqueAssignees={uniqueAssignees}
        uniquePriorities={uniquePriorities}
        columns={columns}
        onColumnToggle={handleColumnToggle}
        searchRef={searchRef}
      />

      <div style={{ flex: 1, overflow: 'auto' }} role="grid" aria-rowcount={items.length} aria-colcount={columns.filter(c => c.visible).length + 1}>
        <WorkHubHeader
          columns={columns}
          sort={sort}
          onSort={handleSort}
          allSelected={allSelected}
          onSelectAll={handleSelectAll}
          onColumnResize={handleColumnResize}
        />

        {/* Loading skeleton — matches column layout */}
        {isLoading && Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} columns={columns} idx={i} />)}

        {/* Error state — red banner */}
        {error && !isLoading && (
          <div style={{ margin: '12px 16px', padding: '12px 16px', background: 'var(--tint-red, #FEF2F2)', borderLeft: '4px solid #DC2626', borderRadius: '0 6px 6px 0', display: 'flex', alignItems: 'center', gap: 10 }} role="alert">
            <AlertTriangle size={18} color="#DC2626" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#991B1B' }}>Failed to load work items</div>
              <div style={{ fontSize: 13, color: '#7F1D1D', marginTop: 2 }}>{(error as Error).message || 'An unexpected error occurred'}</div>
            </div>
            <button onClick={() => refetch()} style={{ padding: '6px 16px', fontSize: 13, fontWeight: 600, color: 'var(--bg-app)', background: 'var(--sem-danger)', border: 'none', borderRadius: 4, cursor: 'pointer', flexShrink: 0 }}>Retry</button>
          </div>
        )}

        {/* Grouped rows */}
        {!isLoading && !error && grouped.map(group => (
          <div key={group.key} style={{ contentVisibility: group.items.length > 50 && collapsed[group.key] ? 'auto' : 'visible' }}>
            {groupBy !== 'none' && (
              <WorkHubGroupHeader
                label={group.label}
                count={group.items.length}
                collapsed={!!collapsed[group.key]}
                onToggle={() => setCollapsed(prev => ({ ...prev, [group.key]: !prev[group.key] }))}
                onAddItem={() => setCollapsed(prev => ({ ...prev, [group.key]: false }))}
              />
            )}
            {!collapsed[group.key] && (
              <>
                {group.items.map(item => (
                  <WorkHubRow
                    key={item.id}
                    item={item}
                    columns={columns}
                    selected={selectedIds.has(item.id)}
                    onSelect={checked => toggleSelect(item.id, checked)}
                    onOpenPanel={id => { setPanelItemId(id); setPanelMode('view'); }}
                    onInlineEdit={handleInlineEdit}
                    onDelete={id => handleDeleteRequest([id])}
                    allStatuses={uniqueStatuses}
                    allPriorities={uniquePriorities}
                    searchQuery={filters.search_query}
                  />
                ))}
                <WorkHubInlineCreate
                  defaultType={defaultType}
                  groupCategory={group.key}
                  onSubmit={(summary, type) => handleInlineCreate(summary, type, group.key)}
                />
              </>
            )}
          </div>
        ))}

        {/* Empty state — no items */}
        {!isLoading && !error && items.length === 0 && !hasActiveFilters && (
          <div style={{ padding: '60px 0', textAlign: 'center' }}>
            <div style={{ width: 160, height: 120, margin: '0 auto 20px', background: 'var(--bg-1)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><rect x="8" y="12" width="32" height="24" rx="3" stroke="var(--fg-3, #94A3B8)" strokeWidth="1.5" /><path d="M16 22H32M16 28H26" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" /></svg>
            </div>
            <div style={{ fontSize: 20, fontWeight: 650, color: 'var(--fg-1)', fontFamily: "'Sora', sans-serif", marginBottom: 4 }}>No work items yet</div>
            <div style={{ fontSize: 14, color: 'var(--fg-3)', marginBottom: 20 }}>Create your first work item to get started</div>
            <button onClick={handleToolbarCreate} style={{ padding: '8px 20px', fontSize: 13, fontWeight: 600, color: 'var(--bg-app)', background: 'var(--cp-blue)', border: 'none', borderRadius: 6, cursor: 'pointer' }}>+ Create Item</button>
          </div>
        )}

        {/* Empty state — filters active but no match */}
        {!isLoading && !error && items.length === 0 && hasActiveFilters && (
          <div style={{ padding: '48px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--fg-3)', marginBottom: 4 }}>No items match your filters</div>
            <button onClick={() => setFilters(EMPTY_FILTERS)} style={{ fontSize: 13, color: 'var(--cp-blue)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, marginTop: 8, textDecoration: 'underline' }}>Clear all filters</button>
          </div>
        )}
      </div>

      {/* Bulk bar — hidden when 0 selected */}
      <WorkHubBulkBar
        selectedCount={selectedIds.size}
        onSetStatus={handleBulkStatus}
        onSetPriority={handleBulkPriority}
        onDelete={handleBulkDelete}
        onClear={() => setSelectedIds(new Set())}
        statuses={uniqueStatuses}
        priorities={uniquePriorities}
      />

      {(panelItemId || panelMode === 'create') && (
        <WorkHubSidePanel
          itemId={panelItemId}
          projectKey={projectKey}
          onClose={() => { setPanelItemId(null); setPanelMode('view'); }}
        />
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <>
          <div onClick={() => setDeleteConfirm(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 9998 }} />
          <div role="alertdialog" aria-label="Delete confirmation" style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: 420, background: 'var(--bg-app)', borderRadius: 8, padding: 24,
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', zIndex: 9999,
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 650, color: 'var(--fg-1)', marginBottom: 8, fontFamily: "'Sora', sans-serif" }}>
              Delete {deleteConfirm.ids.length === 1 ? deleteConfirm.items[0]?.issue_key : `${deleteConfirm.ids.length} items`}?
            </h3>
            {deleteConfirm.ids.length === 1 ? (
              <p style={{ fontSize: 13, color: 'var(--fg-3)', lineHeight: 1.5, marginBottom: 20 }}>
                "{deleteConfirm.items[0]?.summary}" will be moved to trash. This action can be undone within 30 days.
              </p>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--fg-3)', lineHeight: 1.6, marginBottom: 20 }}>
                {deleteConfirm.items.slice(0, 3).map(item => (
                  <div key={item.id} style={{ display: 'flex', gap: 6, marginBottom: 2 }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 500, color: 'var(--fg-1)', flexShrink: 0 }}>{item.issue_key}:</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.summary}</span>
                  </div>
                ))}
                {deleteConfirm.items.length > 3 && (
                  <div style={{ color: 'var(--fg-4)', marginTop: 4 }}>...and {deleteConfirm.items.length - 3} more</div>
                )}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 500, color: 'var(--fg-2)', background: 'transparent', border: '1px solid var(--bd-default, rgba(255,255,255,0.08))', borderRadius: 6, cursor: 'pointer' }}>Cancel</button>
              <button onClick={confirmDelete} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, color: 'var(--bg-app)', background: 'var(--sem-danger)', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                {deleteConfirm.ids.length === 1 ? 'Delete' : `Delete ${deleteConfirm.ids.length} items`}
              </button>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes wh-pulse { 0%,100%{opacity:.4} 50%{opacity:1} }
        .wh-skeleton { background: var(--bd-default, #E2E8F0); animation: wh-pulse 1.5s ease-in-out infinite; }
        @keyframes slideUp { from{transform:translateX(-50%) translateY(20px);opacity:0} to{transform:translateX(-50%) translateY(0);opacity:1} }
      `}</style>
    </div>
  );
}
