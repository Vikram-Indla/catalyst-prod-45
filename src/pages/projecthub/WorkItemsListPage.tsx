import React, { useState, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePhWorkItems, WorkItemRow } from '@/hooks/usePhWorkItems';
import { WorkItemsToolbar } from '@/components/projecthub/WorkItemsToolbar';
import { WorkItemsTable } from '@/components/projecthub/WorkItemsTable';
import { ALL_COLUMNS, ColumnKey } from '@/components/projecthub/WorkItemTableRow';
import { Loader2 } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

type GroupByField = 'none' | 'status_name' | 'priority' | 'assignee_name' | 'type_name';

interface AdvancedFilters {
  statuses: string[];
  priorities: string[];
  types: string[];
  dueDate: 'all' | 'overdue' | 'this_week' | 'this_month';
}

const DEFAULT_ADV: AdvancedFilters = { statuses: [], priorities: [], types: [], dueDate: 'all' };

// Default visible columns (first load)
const DEFAULT_VISIBLE = new Set<ColumnKey>([
  'checkbox', 'type', 'key', 'summary', 'status', 'priority', 'assignee',
  'dueDate', 'cycleTime', 'reporter', 'labels', 'release', 'flag', 'comments',
  'dept', 'team',
]);

export default function WorkItemsListPage() {
  const { key } = useParams<{ key: string }>();

  // Resolve project
  const { data: project } = useQuery({
    queryKey: ['ph-project-by-key', key],
    queryFn: async () => {
      if (!key) return null;
      const { data } = await supabase.from('ph_projects').select('id, key, name').eq('key', key.toUpperCase()).maybeSingle();
      return data;
    },
    enabled: !!key,
  });

  const { data: items = [], isLoading } = useWorkItems(project?.id);

  // ─── State ────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [advFilters, setAdvFilters] = useState<AdvancedFilters>(DEFAULT_ADV);
  const [activeAssigneeFilters, setActiveAssigneeFilters] = useState<Set<string>>(new Set());
  const [groupBy, setGroupBy] = useState<GroupByField>('none');
  const [visibleCols, setVisibleCols] = useState<Set<ColumnKey>>(DEFAULT_VISIBLE);

  const toggleAssigneeFilter = useCallback((name: string) => {
    setActiveAssigneeFilters(prev => { const n = new Set(prev); n.has(name) ? n.delete(name) : n.add(name); return n; });
  }, []);

  const clearAllFilters = useCallback(() => {
    setAdvFilters(DEFAULT_ADV);
    setActiveAssigneeFilters(new Set());
    setSearch('');
  }, []);

  // ─── Derived ──────────────────────────────────────────
  const hasActiveFilters = advFilters.statuses.length > 0 || advFilters.priorities.length > 0 ||
    advFilters.types.length > 0 || advFilters.dueDate !== 'all' || activeAssigneeFilters.size > 0;
  const filterCount = advFilters.statuses.length + advFilters.priorities.length + advFilters.types.length +
    (advFilters.dueDate !== 'all' ? 1 : 0) + activeAssigneeFilters.size;

  // Filter + search
  const processed = useMemo(() => {
    let result = [...items];
    const q = debouncedSearch.toLowerCase();
    if (q) result = result.filter(i => i.title?.toLowerCase().includes(q) || i.item_key?.toLowerCase().includes(q));
    if (advFilters.statuses.length > 0) result = result.filter(i => advFilters.statuses.includes(i.status_name));
    if (advFilters.priorities.length > 0) result = result.filter(i => advFilters.priorities.includes(i.priority));
    if (advFilters.types.length > 0) result = result.filter(i => advFilters.types.includes(i.type_name));
    if (advFilters.dueDate === 'overdue') result = result.filter(i => i.due_date && new Date(i.due_date) < new Date(new Date().toDateString()));
    if (advFilters.dueDate === 'this_week') {
      const now = new Date(); const end = new Date(now); end.setDate(now.getDate() + (7 - now.getDay()));
      result = result.filter(i => i.due_date && new Date(i.due_date) <= end && new Date(i.due_date) >= new Date(now.toDateString()));
    }
    if (advFilters.dueDate === 'this_month') {
      const now = new Date(); const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      result = result.filter(i => i.due_date && new Date(i.due_date) <= end && new Date(i.due_date) >= new Date(now.toDateString()));
    }
    if (activeAssigneeFilters.size > 0) result = result.filter(i => i.assignee_name && activeAssigneeFilters.has(i.assignee_name));
    return result;
  }, [items, debouncedSearch, advFilters, activeAssigneeFilters]);

  // Grouping
  const grouped = useMemo(() => {
    if (groupBy === 'none') return null;
    const map = new Map<string, WorkItemRow[]>();
    for (const item of processed) {
      const val = (item as any)[groupBy] ?? '';
      const key = val || (groupBy === 'assignee_name' ? 'Unassigned' : 'None');
      const arr = map.get(key) || [];
      arr.push(item);
      map.set(key, arr);
    }
    return [...map.entries()].map(([key, items]) => ({ key, label: key, items }));
  }, [processed, groupBy]);

  // Unique values for filters
  const uniqueStatuses = useMemo(() => [...new Set(items.map(i => i.status_name))].sort(), [items]);
  const uniquePriorities = useMemo(() => {
    const order = ['critical', 'high', 'medium', 'low'];
    return [...new Set(items.map(i => i.priority))].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  }, [items]);
  const uniqueTypes = useMemo(() => [...new Set(items.map(i => i.type_name))].sort(), [items]);

  // Assignees for avatar stack
  const assignees = useMemo(() => {
    const seen = new Set<string>();
    const result: { name: string; color: string }[] = [];
    const colors = ['#2563EB', '#0D9488', '#7C3AED', '#D97706', '#DC2626', '#16A34A'];
    for (const item of items) {
      if (item.assignee_name && !seen.has(item.assignee_name)) {
        seen.add(item.assignee_name);
        let hash = 0;
        for (let i = 0; i < item.assignee_name.length; i++) hash = item.assignee_name.charCodeAt(i) + ((hash << 5) - hash);
        result.push({ name: item.assignee_name, color: colors[Math.abs(hash) % colors.length] });
      }
    }
    return result;
  }, [items]);

  // Column toggles
  const columnToggles = ALL_COLUMNS
    .filter(c => c.key !== 'checkbox')
    .map(c => ({ key: c.key, label: c.label || c.key, visible: visibleCols.has(c.key as ColumnKey) }));
  const toggleColumn = (key: string) => {
    setVisibleCols(prev => {
      const n = new Set(prev);
      n.has(key as ColumnKey) ? n.delete(key as ColumnKey) : n.add(key as ColumnKey);
      return n;
    });
  };

  return (
    <div className="px-6 py-4" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 mb-3">
        <span className="text-[10px]" style={{ color: '#94A3B8' }}>ProjectHub</span>
        <span className="text-[10px]" style={{ color: '#CBD5E1' }}>/</span>
        <span className="text-[10px]" style={{ color: '#94A3B8' }}>{project?.key ?? key?.toUpperCase()} — {project?.name ?? 'Loading…'}</span>
        <span className="text-[10px]" style={{ color: '#CBD5E1' }}>/</span>
        <span className="text-[10px] font-bold" style={{ color: '#475569' }}>List</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-2.5 mb-1">
        <h1 className="text-[18px] font-bold tracking-tight" style={{ fontFamily: 'Sora, sans-serif', color: '#0F172A' }}>
          Work Items
        </h1>
        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: '#F1F5F9', color: '#64748B' }}>
          {processed.length}
        </span>
      </div>

      {/* Toolbar */}
      <WorkItemsToolbar
        search={search}
        onSearchChange={setSearch}
        assignees={assignees}
        activeAssigneeFilters={activeAssigneeFilters}
        onToggleAssigneeFilter={toggleAssigneeFilter}
        advancedFilters={advFilters}
        onAdvancedFiltersChange={setAdvFilters}
        hasActiveFilters={hasActiveFilters}
        filterCount={filterCount}
        onClearAllFilters={clearAllFilters}
        uniqueStatuses={uniqueStatuses}
        uniquePriorities={uniquePriorities}
        uniqueTypes={uniqueTypes}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        columnToggles={columnToggles}
        onToggleColumn={toggleColumn}
      />

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-[#2563EB]" />
        </div>
      ) : (
        <WorkItemsTable
          items={processed}
          onRowClick={(id) => console.log(id)}
          grouped={grouped}
          visibleColumns={visibleCols}
          isEmpty={processed.length === 0}
          hasFilters={hasActiveFilters || !!debouncedSearch}
          onClearFilters={clearAllFilters}
        />
      )}
    </div>
  );
}
