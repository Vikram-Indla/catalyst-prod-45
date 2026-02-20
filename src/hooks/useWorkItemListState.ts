/**
 * useWorkItemListState — Centralized state for sorting, filtering, grouping of work items list
 */
import { useState, useMemo, useCallback } from 'react';
import type { WorkItemRow } from '@/hooks/useProjectWorkItems';
import { useDebounce } from '@/hooks/useDebounce';

// ─── Types ────────────────────────────────────────────────
export type SortDir = 'asc' | 'desc';
export interface SortColumn {
  field: keyof WorkItemRow;
  dir: SortDir;
}

export type GroupByField = 'none' | 'status_name' | 'priority' | 'assignee_name' | 'type_name';

export interface FilterState {
  statuses: string[];
  priorities: string[];
  assignees: string[];
  types: string[];
  labels: string[];
  flagged: 'any' | 'yes' | 'no';
  dueDate: 'any' | 'overdue' | 'this_week' | 'custom';
  dueDateRange?: [string, string];
}

export interface GroupedItems {
  key: string;
  label: string;
  items: WorkItemRow[];
}

const DEFAULT_FILTERS: FilterState = {
  statuses: [],
  priorities: [],
  assignees: [],
  types: [],
  labels: [],
  flagged: 'any',
  dueDate: 'any',
};

// ─── Column definitions ──────────────────────────────────
export interface ColumnDef {
  key: string;
  label: string;
  field: keyof WorkItemRow | null;
  width: number | undefined;
  visible: boolean;
  sortable: boolean;
}

export const DEFAULT_COLUMNS: ColumnDef[] = [
  { key: 'checkbox', label: '', field: null, width: 34, visible: true, sortable: false },
  { key: 'type', label: 'TYPE', field: 'type_name', width: 46, visible: true, sortable: true },
  { key: 'key', label: 'KEY', field: 'item_key', width: 70, visible: true, sortable: true },
  { key: 'summary', label: 'SUMMARY', field: 'title', width: undefined, visible: true, sortable: true },
  { key: 'status', label: 'STATUS', field: 'status_name', width: 102, visible: true, sortable: true },
  { key: 'comments', label: 'COMMENTS', field: null, width: 60, visible: true, sortable: false },
  { key: 'assignee', label: 'ASSIGNEE', field: 'assignee_name', width: 136, visible: true, sortable: true },
  { key: 'dueDate', label: 'DUE DATE', field: 'due_date', width: 100, visible: true, sortable: true },
  { key: 'priority', label: 'PRIORITY', field: 'priority', width: 84, visible: true, sortable: true },
  { key: 'labels', label: 'LABELS', field: null, width: 74, visible: true, sortable: false },
];

// ─── Hook ─────────────────────────────────────────────────
export function useWorkItemListState(items: WorkItemRow[]) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [sorts, setSorts] = useState<SortColumn[]>([]);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [groupBy, setGroupBy] = useState<GroupByField>('none');
  const [activeAssigneeFilters, setActiveAssigneeFilters] = useState<Set<string>>(new Set());
  const [columns, setColumns] = useState<ColumnDef[]>(DEFAULT_COLUMNS);

  // Toggle sort: asc → desc → clear. Shift adds secondary.
  const toggleSort = useCallback((field: keyof WorkItemRow, multi: boolean) => {
    setSorts(prev => {
      const idx = prev.findIndex(s => s.field === field);
      if (idx === -1) {
        const newSort: SortColumn = { field, dir: 'asc' };
        return multi ? [...prev, newSort] : [newSort];
      }
      const current = prev[idx];
      if (current.dir === 'asc') {
        const updated = [...prev];
        updated[idx] = { ...current, dir: 'desc' };
        return updated;
      }
      // desc → remove
      return prev.filter((_, i) => i !== idx);
    });
  }, []);

  const toggleAssigneeFilter = useCallback((name: string) => {
    setActiveAssigneeFilters(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setActiveAssigneeFilters(new Set());
  }, []);

  const hasActiveFilters = useMemo(() => {
    return filters.statuses.length > 0 ||
      filters.priorities.length > 0 ||
      filters.assignees.length > 0 ||
      filters.types.length > 0 ||
      filters.labels.length > 0 ||
      filters.flagged !== 'any' ||
      filters.dueDate !== 'any' ||
      activeAssigneeFilters.size > 0;
  }, [filters, activeAssigneeFilters]);

  // Active filter chips
  const activeFilterChips = useMemo(() => {
    const chips: { key: string; label: string; value: string; remove: () => void }[] = [];
    filters.statuses.forEach(s => chips.push({
      key: `status-${s}`, label: 'Status', value: s,
      remove: () => setFilters(f => ({ ...f, statuses: f.statuses.filter(x => x !== s) })),
    }));
    filters.priorities.forEach(p => chips.push({
      key: `priority-${p}`, label: 'Priority', value: p,
      remove: () => setFilters(f => ({ ...f, priorities: f.priorities.filter(x => x !== p) })),
    }));
    filters.assignees.forEach(a => chips.push({
      key: `assignee-${a}`, label: 'Assignee', value: a,
      remove: () => setFilters(f => ({ ...f, assignees: f.assignees.filter(x => x !== a) })),
    }));
    filters.types.forEach(t => chips.push({
      key: `type-${t}`, label: 'Type', value: t,
      remove: () => setFilters(f => ({ ...f, types: f.types.filter(x => x !== t) })),
    }));
    if (filters.flagged !== 'any') chips.push({
      key: 'flagged', label: 'Flagged', value: filters.flagged,
      remove: () => setFilters(f => ({ ...f, flagged: 'any' })),
    });
    if (filters.dueDate !== 'any') chips.push({
      key: 'dueDate', label: 'Due', value: filters.dueDate.replace('_', ' '),
      remove: () => setFilters(f => ({ ...f, dueDate: 'any' })),
    });
    activeAssigneeFilters.forEach(a => chips.push({
      key: `avatar-${a}`, label: 'Assignee', value: a,
      remove: () => toggleAssigneeFilter(a),
    }));
    return chips;
  }, [filters, activeAssigneeFilters, toggleAssigneeFilter]);

  // Process items: filter → sort
  const processed = useMemo(() => {
    let result = [...items];
    const q = debouncedSearch.toLowerCase();

    // Search
    if (q) {
      result = result.filter(i =>
        i.title?.toLowerCase().includes(q) ||
        i.summary?.toLowerCase().includes(q) ||
        i.item_key?.toLowerCase().includes(q)
      );
    }

    // Filters
    if (filters.statuses.length > 0) result = result.filter(i => filters.statuses.includes(i.status_name));
    if (filters.priorities.length > 0) result = result.filter(i => filters.priorities.includes(i.priority));
    if (filters.assignees.length > 0) result = result.filter(i => i.assignee_name && filters.assignees.includes(i.assignee_name));
    if (filters.types.length > 0) result = result.filter(i => filters.types.includes(i.type_name));
    if (filters.flagged === 'yes') result = result.filter(i => i.is_flagged);
    if (filters.flagged === 'no') result = result.filter(i => !i.is_flagged);
    if (filters.dueDate === 'overdue') result = result.filter(i => i.due_date && new Date(i.due_date) < new Date(new Date().toDateString()));
    if (filters.dueDate === 'this_week') {
      const now = new Date();
      const weekEnd = new Date(now);
      weekEnd.setDate(now.getDate() + (7 - now.getDay()));
      result = result.filter(i => i.due_date && new Date(i.due_date) <= weekEnd && new Date(i.due_date) >= new Date(now.toDateString()));
    }

    // Avatar stack filter (OR)
    if (activeAssigneeFilters.size > 0) {
      result = result.filter(i => i.assignee_name && activeAssigneeFilters.has(i.assignee_name));
    }

    // Sort
    if (sorts.length > 0) {
      result.sort((a, b) => {
        for (const s of sorts) {
          const aVal = (a as any)[s.field] ?? '';
          const bVal = (b as any)[s.field] ?? '';
          const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
          if (cmp !== 0) return s.dir === 'asc' ? cmp : -cmp;
        }
        return 0;
      });
    }

    return result;
  }, [items, debouncedSearch, filters, sorts, activeAssigneeFilters]);

  // Group
  const grouped = useMemo((): GroupedItems[] | null => {
    if (groupBy === 'none') return null;
    const map = new Map<string, WorkItemRow[]>();
    for (const item of processed) {
      const val = (item as any)[groupBy] ?? '';
      const key = val || (groupBy === 'assignee_name' ? 'Unassigned' : 'None');
      const arr = map.get(key) || [];
      arr.push(item);
      map.set(key, arr);
    }
    return [...map.entries()].map(([key, items]) => ({
      key,
      label: key,
      items,
    }));
  }, [processed, groupBy]);

  // Unique values for filter options
  const uniqueStatuses = useMemo(() => [...new Set(items.map(i => i.status_name))].sort(), [items]);
  const uniquePriorities = useMemo(() => {
    const order = ['Critical', 'High', 'Medium', 'Low'];
    return [...new Set(items.map(i => i.priority))].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  }, [items]);
  const uniqueTypes = useMemo(() => [...new Set(items.map(i => i.type_name))].sort(), [items]);
  const uniqueAssignees = useMemo(() => [...new Set(items.map(i => i.assignee_name).filter(Boolean) as string[])].sort(), [items]);

  return {
    search, setSearch,
    sorts, toggleSort,
    filters, setFilters,
    groupBy, setGroupBy,
    columns, setColumns,
    activeAssigneeFilters, toggleAssigneeFilter,
    clearAllFilters, hasActiveFilters, activeFilterChips,
    processed, grouped,
    uniqueStatuses, uniquePriorities, uniqueTypes, uniqueAssignees,
  };
}
