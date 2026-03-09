/**
 * WorkHubTable — Main table container
 * Manages view mode, filters, sort, grouping, selection, side panel
 */
import { useState, useMemo, useCallback } from 'react';
import { useWorkItems, useUpdateWorkItem, useBulkUpdateWorkItems, useDeleteWorkItem } from '@/hooks/useWorkHub';
import type { FilterConfig, SortConfig, GroupByField, ViewMode, ColumnConfig } from '@/types/workhub';
import type { WorkHubItem } from '@/services/workhub-service';
import WorkHubToolbar from './WorkHubToolbar';
import WorkHubHeader from './WorkHubHeader';
import WorkHubRow from './WorkHubRow';
import WorkHubGroupHeader from './WorkHubGroupHeader';
import WorkHubInlineCreate from './WorkHubInlineCreate';
import WorkHubBulkBar from './WorkHubBulkBar';
import WorkHubSidePanel from './WorkHubSidePanel';

interface WorkHubTableProps {
  projectKey: string;
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

export default function WorkHubTable({ projectKey, defaultType = 'Story' }: WorkHubTableProps) {
  const [filters, setFilters] = useState<FilterConfig>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortConfig | null>(null);
  const [groupBy, setGroupBy] = useState<GroupByField>('status_category');
  const [viewMode, setViewMode] = useState<ViewMode>('backlog');
  const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_COLUMNS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [panelItemId, setPanelItemId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const { data: items = [], isLoading } = useWorkItems(projectKey, filters, sort ?? undefined);
  const updateMutation = useUpdateWorkItem(projectKey);
  const bulkMutation = useBulkUpdateWorkItems(projectKey);
  const deleteMutation = useDeleteWorkItem(projectKey);

  // Unique values for filters
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

    // Sort groups
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

  // Inline edit
  const handleInlineEdit = useCallback((itemId: string, field: string, value: any) => {
    updateMutation.mutate({ itemId, updates: { [field]: value } });
  }, [updateMutation]);

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
    bulkMutation.mutate({ type: 'delete', item_ids: Array.from(selectedIds) });
    setSelectedIds(new Set());
  };

  // Inline create
  const handleInlineCreate = useCallback((_summary: string, _type: string) => {
    // Will be wired to createWorkItem in next stage
  }, []);

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
        onCreateClick={() => {}}
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

        {/* Grouped rows */}
        {!isLoading && grouped.map(group => (
          <div key={group.key}>
            {groupBy !== 'none' && (
              <WorkHubGroupHeader
                label={group.label}
                count={group.items.length}
                collapsed={!!collapsed[group.key]}
                onToggle={() => setCollapsed(prev => ({ ...prev, [group.key]: !prev[group.key] }))}
                onAddItem={() => {}}
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
                    onOpenPanel={id => setPanelItemId(id)}
                    onInlineEdit={handleInlineEdit}
                  />
                ))}
                <WorkHubInlineCreate
                  defaultType={defaultType}
                  groupCategory={group.key}
                  onSubmit={handleInlineCreate}
                />
              </>
            )}
          </div>
        ))}

        {/* Empty state */}
        {!isLoading && items.length === 0 && (
          <div style={{ padding: '60px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: '#64748B', marginBottom: 4 }}>No work items found</div>
            <div style={{ fontSize: 13, color: '#94A3B8' }}>Try adjusting your filters or create a new item</div>
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
      {panelItemId && (
        <WorkHubSidePanel
          itemId={panelItemId}
          projectKey={projectKey}
          onClose={() => setPanelItemId(null)}
        />
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
