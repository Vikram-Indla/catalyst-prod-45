import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProjectWorkItems } from '@/hooks/useProjectWorkItems';
import { useWorkItemListState } from '@/hooks/useWorkItemListState';
import { WorkItemsToolbar } from '@/components/project-hub/work-items/WorkItemsToolbar';
import { WorkItemsTable } from '@/components/project-hub/work-items/WorkItemsTable';
import { CreateWorkItemModal } from '@/components/project-hub/work-items/CreateWorkItemModal';
import { WorkItemDetailModal } from '@/components/project-hub/work-items/WorkItemDetailModal';
import { updateWorkItem, createWorkItem, deleteWorkItem } from '@/services/workItemService';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function WorkItemsListPage() {
  const { key } = useParams<{ key: string }>();
  const [createOpen, setCreateOpen] = useState(false);
  const [detailItemId, setDetailItemId] = useState<string | null>(null);
  const queryClient = useQueryClient();

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

  // Fetch workflow statuses for this project
  const { data: statuses = [] } = useQuery({
    queryKey: ['ph-statuses', project?.id],
    queryFn: async () => {
      if (!project?.id) return [];
      const { data } = await supabase
        .from('ph_workflow_statuses')
        .select('id, name, category, color')
        .eq('project_id', project.id)
        .order('sort_order');
      return (data || []) as { id: string; name: string; category: string; color: string }[];
    },
    enabled: !!project?.id,
  });

  // Fetch project member profiles
  const { data: profiles = [] } = useQuery({
    queryKey: ['ph-profiles-for-project', project?.id],
    queryFn: async () => {
      if (!project?.id) return [];
      const { data: members } = await supabase
        .from('ph_project_members')
        .select('user_id')
        .eq('project_id', project.id);
      const userIds = (members || []).map((m: any) => m.user_id).filter(Boolean);
      if (userIds.length === 0) return [];
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);
      return (profs || []).map((p: any) => ({ id: p.id, name: p.full_name || 'Unknown' }));
    },
    enabled: !!project?.id,
  });

  const invalidateItems = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['ph-work-items', project?.id] });
  }, [queryClient, project?.id]);

  // Inline update (optimistic)
  const handleInlineUpdate = useCallback(async (id: string, changes: Record<string, any>) => {
    try {
      await updateWorkItem(id, changes);
      invalidateItems();
      toast.success('Updated');
    } catch (e: any) {
      toast.error(e.message);
      invalidateItems(); // revert
    }
  }, [invalidateItems]);

  // Bulk update
  const handleBulkUpdate = useCallback(async (ids: string[], changes: Record<string, any>) => {
    try {
      await Promise.all(ids.map(id => updateWorkItem(id, changes)));
      invalidateItems();
      toast.success(`Updated ${ids.length} items`);
    } catch (e: any) {
      toast.error(e.message);
      invalidateItems();
    }
  }, [invalidateItems]);

  // Bulk delete
  const handleBulkDelete = useCallback(async (ids: string[]) => {
    try {
      await Promise.all(ids.map(id => deleteWorkItem(id)));
      invalidateItems();
      toast.success(`Deleted ${ids.length} item(s)`);
    } catch (e: any) {
      toast.error(e.message);
    }
  }, [invalidateItems]);

  // Clone item
  const handleClone = useCallback(async (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item || !project) return;
    try {
      await createWorkItem({
        project_id: project.id,
        type_id: item.type_id,
        status_id: item.status_id,
        title: `${item.title} (Copy)`,
        item_type: item.item_type,
        priority: item.priority,
        assignee_id: item.assignee_id,
        parent_id: item.parent_id,
        due_date: item.due_date,
        story_points: item.story_points,
        is_flagged: item.is_flagged,
      });
      invalidateItems();
      toast.success('Item cloned');
    } catch (e: any) {
      toast.error(e.message);
    }
  }, [items, project, invalidateItems]);

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
          onInlineUpdate={handleInlineUpdate}
          onBulkUpdate={handleBulkUpdate}
          onBulkDelete={handleBulkDelete}
          onCloneItem={handleClone}
          statuses={statuses}
          profiles={profiles}
          hasSearchOrFilter={listState.hasActiveFilters || !!listState.search}
          onClearFilters={() => { listState.clearAllFilters(); listState.setSearch(''); }}
        />
      )}

      {project && (
        <CreateWorkItemModal open={createOpen} onClose={() => setCreateOpen(false)} projectId={project.id} projectKey={project.key} />
      )}
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
