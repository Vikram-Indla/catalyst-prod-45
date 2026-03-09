/**
 * WorkHubTable — Main table container (Stage D: Sacred Gate — fully wired)
 * Manages view mode, filters, sort, grouping, selection, side panel, CRUD
 * ZERO mock data. All interactions wired to Supabase via hooks.
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
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
import { toast } from 'sonner';

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

// Map group label to default status for new items
const GROUP_DEFAULT_STATUS: Record<string, string> = {
  'To Do': 'Backlog',
  'In Progress': 'In Progress',
  'Done': 'Done',
};

// Load column config from localStorage
function loadColumnConfig(projectKey: string): ColumnConfig[] | null {
  try {
    const stored = localStorage.getItem(`workhub-columns-${projectKey}`);
    return stored ? JSON.parse(stored) : null;
  } catch { return null; }
}

function saveColumnConfig(projectKey: string, columns: ColumnConfig[]) {
  try {
    localStorage.setItem(`workhub-columns-${projectKey}`, JSON.stringify(columns));
  } catch {}
}

export default function WorkHubTable({ projectKey, projectId, defaultType = 'Story' }: WorkHubTableProps) {
  const [filters, setFilters] = useState<FilterConfig>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortConfig | null>(null);
  const [groupBy, setGroupBy] = useState<GroupByField>('status_category');
  const [viewMode, setViewMode] = useState<ViewMode>('backlog');
  const [columns, setColumns] = useState<ColumnConfig[]>(() => loadColumnConfig(projectKey) || DEFAULT_COLUMNS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [panelItemId, setPanelItemId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<'view' | 'create'>('view');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<{ ids: string[]; items: WorkHubItem[] } | null>(null);

  const { data: items = [], isLoading, error } = useWorkItems(projectKey, filters, sort ?? undefined);
  const createMutation = useCreateWorkItem(projectKey);
  const updateMutation = useUpdateWorkItem(projectKey);
  const bulkMutation = useBulkUpdateWorkItems(projectKey);
  const deleteMutation = useDeleteWorkItem(projectKey);

  // Persist column config
  useEffect(() => { saveColumnConfig(projectKey, columns); }, [columns, projectKey]);

  // Unique values for filters (derived from REAL data)
  const uniqueStatuses = useMemo(() => [...new Set(items.map(i => i.status).filter(Boolean))].sort(), [items]);
  const uniqueTypes = useMemo(() => [...new Set(items.map(i => i.issue_type).filter(Boolean))].sort(), [items]);
  const uniqueAssignees = useMemo(() => [...new Set(items.map(i => i.assignee_display_name).filter(Boolean) as string[])].sort(), [items]);
  const uniquePriorities = useMemo(() => [...new Set(items.map(i => i.priority).filter(Boolean))].sort(), [items]);

  // Grouping
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
    if (groupBy === 'status_category') {
      entries.sort((a, b) => GROUP_ORDER.indexOf(a[0]) - GROUP_ORDER.indexOf(b[0]));
    } else {
      entries.sort((a, b) => a[0].localeCompare(b[0]));
    }

    return entries.map(([key, items]) => ({ key, label: key, items }));
  }, [items, groupBy]);

  // Sort handler
  const handleSort = useCallback((column: string) => {
    setSort(prev => {
      if (!prev || prev.column !== column) return { column, direction: 'asc' };
      if (prev.direction === 'asc') return { column, direction: 'desc' };
      return null;
    });
  }, []);

  // Column resize handler
  const handleColumnResize = useCallback((columnId: string, width: number) => {
    setColumns(prev => prev.map(c => c.id === columnId ? { ...c, width } : c));
  }, []);

  // Selection
  const allSelected = items.length > 0 && items.every(i => selectedIds.has(i.id));
  const handleSelectAll = useCallback((checked: boolean) => {
    setSelectedIds(checked ? new Set(items.map(i => i.id)) : new Set());
  }, [items]);

  const toggleSelect = useCallback((id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  }, []);

  // ═══ INLINE EDIT — wired to real mutation ═══
  const handleInlineEdit = useCallback((itemId: string, field: string, value: any) => {
    const updates: Record<string, any> = { [field]: value };
    // Auto-calc status_category when status changes
    if (field === 'status') {
      updates.status_category = deriveStatusCategory(value);
    }
    updateMutation.mutate({ itemId, updates });
  }, [updateMutation]);

  // ═══ INLINE CREATE — wired to real mutation ═══
  const handleInlineCreate = useCallback((summary: string, type: string, groupCategory?: string) => {
    const status = GROUP_DEFAULT_STATUS[groupCategory || 'To Do'] || 'Backlog';
    const status_category = deriveStatusCategory(status);

    // Resolve project_id from first item or use prop
    const resolvedProjectId = projectId || items[0]?.id?.split('-')[0] || '';

    createMutation.mutate({
      summary,
      issue_type: type,
      status,
      status_category,
      priority: 'Medium',
      project_key: projectKey,
      project_id: resolvedProjectId,
    });
  }, [createMutation, projectKey, projectId, items]);

  // ═══ TOOLBAR CREATE — opens side panel in create mode ═══
  const handleToolbarCreate = useCallback(() => {
    setPanelItemId(null);
    setPanelMode('create');
  }, []);

  // ═══ DELETE with confirmation ═══
  const handleDeleteRequest = useCallback((itemIds: string[]) => {
    const targetItems = items.filter(i => itemIds.includes(i.id));
    setDeleteConfirm({ ids: itemIds, items: targetItems });
  }, [items]);

  const confirmDelete = useCallback(() => {
    if (!deleteConfirm) return;
    if (deleteConfirm.ids.length === 1) {
      deleteMutation.mutate(deleteConfirm.ids[0]);
      // Close side panel if showing deleted item
      if (panelItemId === deleteConfirm.ids[0]) setPanelItemId(null);
    } else {
      bulkMutation.mutate({ type: 'delete', item_ids: deleteConfirm.ids });
    }
    setSelectedIds(new Set());
    setDeleteConfirm(null);
  }, [deleteConfirm, deleteMutation, bulkMutation, panelItemId]);

  // Bulk actions
  const handleBulkStatus = (status: string) => {
    bulkMutation.mutate({ type: 'status_change', item_ids: Array.from(selectedIds), value: status });
    setSelectedIds(new Set());
  };
  const handleBulkPriority = (priority: string) => {
    bulkMutation.mutate({ type: 'priority_change', item_ids: Array.from(selectedIds), value: priority });
    setSelectedIds(new Set());
  };
  const handleBulkDelete = () => {
    handleDeleteRequest(Array.from(selectedIds));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#FFFFFF', minWidth: 1320 }}>
      {/* Toolbar */}
      <WorkHubToolbar
        filters={filters}
        onFiltersChange={setFilters}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onCreateClick={handleToolbarCreate}
        uniqueStatuses={uniqueStatuses}
        uniqueTypes={uniqueTypes}
        uniqueAssignees={uniqueAssignees}
        uniquePriorities={uniquePriorities}
      />

      {/* Table area */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {/* Header */}
        <WorkHubHeader
          columns={columns}
          sort={sort}
          onSort={handleSort}
          allSelected={allSelected}
          onSelectAll={handleSelectAll}
          onColumnResize={handleColumnResize}
        />

        {/* Loading skeleton */}
        {isLoading && (
          <div style={{ padding: '24px 16px' }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ height: 36, marginBottom: 1, background: '#F8FAFC', borderRadius: 2, animation: 'pulse 1.5s infinite' }} />
            ))}
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: '#DC2626', marginBottom: 8 }}>
              Failed to load work items
            </div>
            <div style={{ fontSize: 13, color: '#64748B', marginBottom: 12 }}>
              {(error as Error).message || 'An unexpected error occurred'}
            </div>
            <button
              onClick={() => window.location.reload()}
              style={{ padding: '6px 16px', fontSize: 13, fontWeight: 600, color: 'white', background: '#2563EB', border: 'none', borderRadius: 4, cursor: 'pointer' }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Grouped rows */}
        {!isLoading && !error && grouped.map(group => (
          <div key={group.key}>
            {groupBy !== 'none' && (
              <WorkHubGroupHeader
                label={group.label}
                count={group.items.length}
                collapsed={!!collapsed[group.key]}
                onToggle={() => setCollapsed(prev => ({ ...prev, [group.key]: !prev[group.key] }))}
                onAddItem={() => {
                  // Expand group and focus inline create
                  setCollapsed(prev => ({ ...prev, [group.key]: false }));
                }}
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

        {/* Empty state */}
        {!isLoading && !error && items.length === 0 && (
          <div style={{ padding: '60px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: '#64748B', marginBottom: 4 }}>No work items found</div>
            <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 16 }}>Try adjusting your filters or create a new item</div>
            <button
              onClick={handleToolbarCreate}
              style={{ padding: '8px 20px', fontSize: 13, fontWeight: 600, color: 'white', background: '#2563EB', border: 'none', borderRadius: 6, cursor: 'pointer' }}
            >
              Create your first item
            </button>
          </div>
        )}
      </div>

      {/* Bulk action bar */}
      <WorkHubBulkBar
        selectedCount={selectedIds.size}
        onSetStatus={handleBulkStatus}
        onSetPriority={handleBulkPriority}
        onDelete={handleBulkDelete}
        onClear={() => setSelectedIds(new Set())}
        statuses={uniqueStatuses}
        priorities={uniquePriorities}
      />

      {/* Side panel */}
      {(panelItemId || panelMode === 'create') && (
        <WorkHubSidePanel
          itemId={panelItemId}
          projectKey={projectKey}
          onClose={() => { setPanelItemId(null); setPanelMode('view'); }}
        />
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <>
          <div onClick={() => setDeleteConfirm(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 9998 }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: 420, background: '#FFFFFF', borderRadius: 8, padding: 24,
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', zIndex: 9999,
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 650, color: '#0F172A', marginBottom: 8 }}>
              Delete {deleteConfirm.ids.length === 1 ? deleteConfirm.items[0]?.issue_key : `${deleteConfirm.ids.length} items`}?
            </h3>
            {deleteConfirm.ids.length === 1 ? (
              <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.5, marginBottom: 20 }}>
                "{deleteConfirm.items[0]?.summary}" will be moved to trash. This action can be undone within 30 days.
              </p>
            ) : (
              <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6, marginBottom: 20 }}>
                {deleteConfirm.items.slice(0, 3).map(item => (
                  <div key={item.id} style={{ display: 'flex', gap: 6, marginBottom: 2 }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 500, color: '#0F172A', flexShrink: 0 }}>{item.issue_key}:</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.summary}</span>
                  </div>
                ))}
                {deleteConfirm.items.length > 3 && (
                  <div style={{ color: '#94A3B8', marginTop: 4 }}>...and {deleteConfirm.items.length - 3} more</div>
                )}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{
                padding: '8px 16px', fontSize: 13, fontWeight: 500, color: '#334155',
                background: 'transparent', border: '1px solid rgba(15,23,42,0.12)', borderRadius: 6, cursor: 'pointer',
              }}>Cancel</button>
              <button onClick={confirmDelete} style={{
                padding: '8px 16px', fontSize: 13, fontWeight: 600, color: 'white',
                background: '#DC2626', border: 'none', borderRadius: 6, cursor: 'pointer',
              }}>
                {deleteConfirm.ids.length === 1 ? 'Delete' : `Delete ${deleteConfirm.ids.length} items`}
              </button>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
