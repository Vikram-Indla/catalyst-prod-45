import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProjectWorkItems } from '@/hooks/useProjectWorkItems';
import { useWorkItemListState } from '@/hooks/useWorkItemListState';
import { WorkItemsToolbar } from '@/components/project-hub/work-items/WorkItemsToolbar';
import { WorkItemsTable } from '@/components/project-hub/work-items/WorkItemsTable';
import { CreateWorkItemModal } from '@/components/project-hub/work-items/CreateWorkItemModal';
import { WorkItemDetailModal } from '@/components/project-hub/work-items/WorkItemDetailModal';
import { Loader2 } from 'lucide-react';
import { useState, useMemo } from 'react';

export default function WorkItemsListPage() {
  const { key } = useParams<{ key: string }>();
  const [createOpen, setCreateOpen] = useState(false);
  const [detailItemId, setDetailItemId] = useState<string | null>(null);

  // Resolve project by key
  const { data: project } = useQuery({
    queryKey: ['ph-project-by-key', key],
    queryFn: async () => {
      if (!key) return null;
      const { data } = await supabase
        .from('ph_projects')
        .select('id, key, name')
        .eq('key', key.toUpperCase())
        .maybeSingle();
      return data;
    },
    enabled: !!key,
  });

  const { data: items = [], isLoading } = useProjectWorkItems(project?.id);

  const listState = useWorkItemListState(items);

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

  return (
    <div className="px-6 py-4 max-w-[1400px] mx-auto" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 mb-3">
        <span className="text-[10px] text-[#94A3B8]">ProjectHub</span>
        <span className="text-[10px] text-[#CBD5E1]">/</span>
        <span className="text-[10px] text-[#94A3B8]">
          {project?.key ?? key?.toUpperCase()} — {project?.name ?? 'Loading…'}
        </span>
        <span className="text-[10px] text-[#CBD5E1]">/</span>
        <span className="text-[10px] font-bold text-[#475569]">List</span>
      </div>

      {/* Page header */}
      <div className="flex items-center gap-2.5 mb-1">
        <h1 className="text-[18px] font-bold tracking-tight" style={{ fontFamily: 'Sora, sans-serif', color: '#0F172A' }}>
          Work Items
        </h1>
        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: '#F1F5F9', color: '#64748B' }}>
          {listState.processed.length}
        </span>
      </div>

      <WorkItemsToolbar
        search={listState.search}
        onSearchChange={listState.setSearch}
        totalCount={listState.processed.length}
        assignees={assignees}
        activeAssigneeFilters={listState.activeAssigneeFilters}
        onToggleAssigneeFilter={listState.toggleAssigneeFilter}
        filters={listState.filters}
        onFiltersChange={listState.setFilters}
        hasActiveFilters={listState.hasActiveFilters}
        activeFilterChips={listState.activeFilterChips}
        onClearAllFilters={listState.clearAllFilters}
        uniqueStatuses={listState.uniqueStatuses}
        uniquePriorities={listState.uniquePriorities}
        uniqueTypes={listState.uniqueTypes}
        uniqueAssignees={listState.uniqueAssignees}
        groupBy={listState.groupBy}
        onGroupByChange={listState.setGroupBy}
        columns={listState.columns}
        onColumnsChange={listState.setColumns}
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-[#2563EB]" />
        </div>
      ) : (
        <WorkItemsTable
          items={listState.processed}
          onRowClick={setDetailItemId}
          onCreateClick={() => setCreateOpen(true)}
          sorts={listState.sorts}
          onToggleSort={listState.toggleSort}
          columns={listState.columns}
          grouped={listState.grouped}
        />
      )}

      {/* Create Modal */}
      {project && (
        <CreateWorkItemModal open={createOpen} onClose={() => setCreateOpen(false)} projectId={project.id} projectKey={project.key} />
      )}

      {/* Detail Modal */}
      {project && (
        <WorkItemDetailModal
          open={!!detailItemId}
          itemId={detailItemId}
          projectId={project.id}
          projectKey={project.key}
          onClose={() => setDetailItemId(null)}
          onNavigate={(id) => setDetailItemId(id)}
        />
      )}
    </div>
  );
}
