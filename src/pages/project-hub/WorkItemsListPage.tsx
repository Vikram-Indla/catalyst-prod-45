import React, { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProjectWorkItems } from '@/hooks/useProjectWorkItems';
import { useWorkItemListState } from '@/hooks/useWorkItemListState';
import { WorkItemsToolbar } from '@/components/project-hub/work-items/WorkItemsToolbar';
import { WorkItemsTable } from '@/components/project-hub/work-items/WorkItemsTable';
import { CreateWorkItemModal } from '@/components/project-hub/work-items/CreateWorkItemModal';
import { WorkItemDetailModal } from '@/components/project-hub/work-items/WorkItemDetailModal';
import { SyncBanner } from '@/components/project-hub/source-badge/SyncBanner';
import { SyncLegend } from '@/components/project-hub/source-badge/SyncLegend';
import { SourceFilterPills } from '@/components/project-hub/source-filter/SourceFilterPills';
import { ConflictResolutionDrawer } from '@/components/project-hub/jira-sync/ConflictResolutionDrawer';
import { JiraSyncDrawer } from '@/components/project-hub/jira-sync/JiraSyncDrawer';
import { updateWorkItem, createWorkItem, deleteWorkItem } from '@/services/workItemService';
import { Loader2, History } from 'lucide-react';
import { toast } from 'sonner';

// Mock source data for Stage C — will be replaced with real queries in Stage D
function getMockSourceData(item: any, idx: number) {
  // Simulate: ~60% jira, ~40% catalyst
  const isJira = idx % 5 !== 0;
  const statuses: Array<'synced' | 'stale' | 'conflict' | 'syncing'> = ['synced', 'synced', 'synced', 'stale', 'conflict'];
  const syncStatus = isJira ? statuses[idx % statuses.length] : undefined;
  const releases = ['R2.4', 'R2.3', 'R2.5', 'R3.0', null, null];
  return {
    source: (isJira ? 'jira' : 'catalyst') as 'catalyst' | 'jira',
    syncStatus,
    lastSyncedAt: isJira ? new Date(Date.now() - (idx % 10) * 3600000).toISOString() : undefined,
    releaseLabel: releases[idx % releases.length] || undefined,
  };
}

export default function WorkItemsListPage() {
  const { key } = useParams<{ key: string }>();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [detailItemId, setDetailItemId] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<'all' | 'catalyst' | 'jira'>('all');
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [conflictDrawerOpen, setConflictDrawerOpen] = useState(false);
  const [syncDrawerOpen, setSyncDrawerOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: project } = useQuery({
    queryKey: ['ph-project-by-key', key],
    queryFn: async () => {
      if (!key) return null;
      const { data } = await supabase.from('ph_projects').select('id, key, name').eq('key', key.toUpperCase()).maybeSingle();
      return data;
    },
    enabled: !!key,
  });

  const { data: items = [], isLoading } = useProjectWorkItems(project?.id);
  const listState = useWorkItemListState(items);

  const { data: statuses = [] } = useQuery({
    queryKey: ['ph-statuses', project?.id],
    queryFn: async () => {
      if (!project?.id) return [];
      const { data } = await supabase.from('ph_workflow_statuses').select('id, name, category, color').eq('project_id', project.id).order('sort_order');
      return (data || []) as { id: string; name: string; category: string; color: string }[];
    },
    enabled: !!project?.id,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['ph-profiles-for-project', project?.id],
    queryFn: async () => {
      if (!project?.id) return [];
      const { data: members } = await supabase.from('ph_project_members').select('user_id').eq('project_id', project.id);
      const userIds = (members || []).map((m: any) => m.user_id).filter(Boolean);
      if (userIds.length === 0) return [];
      const { data: profs } = await supabase.from('profiles').select('id, full_name').in('id', userIds);
      return (profs || []).map((p: any) => ({ id: p.id, name: p.full_name || 'Unknown' }));
    },
    enabled: !!project?.id,
  });

  const invalidateItems = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['ph-work-items', project?.id] });
  }, [queryClient, project?.id]);

  const handleInlineUpdate = useCallback(async (id: string, changes: Record<string, any>) => {
    try { await updateWorkItem(id, changes); invalidateItems(); toast.success('Updated'); }
    catch (e: any) { toast.error(e.message); invalidateItems(); }
  }, [invalidateItems]);

  const handleBulkUpdate = useCallback(async (ids: string[], changes: Record<string, any>) => {
    try { await Promise.all(ids.map(id => updateWorkItem(id, changes))); invalidateItems(); toast.success(`Updated ${ids.length} items`); }
    catch (e: any) { toast.error(e.message); invalidateItems(); }
  }, [invalidateItems]);

  const handleBulkDelete = useCallback(async (ids: string[]) => {
    try { await Promise.all(ids.map(id => deleteWorkItem(id))); invalidateItems(); toast.success(`Deleted ${ids.length} item(s)`); }
    catch (e: any) { toast.error(e.message); }
  }, [invalidateItems]);

  const handleClone = useCallback(async (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item || !project) return;
    try {
      await createWorkItem({ project_id: project.id, type_id: item.type_id, status_id: item.status_id, title: `${item.title} (Copy)`, item_type: item.item_type, priority: item.priority, assignee_id: item.assignee_id, parent_id: item.parent_id, due_date: item.due_date, department: item.department, is_flagged: item.is_flagged });
      invalidateItems(); toast.success('Item cloned');
    } catch (e: any) { toast.error(e.message); }
  }, [items, project, invalidateItems]);

  // Mock source counts
  const mockSourceData = useMemo(() => listState.processed.map((item, idx) => getMockSourceData(item, idx)), [listState.processed]);
  const catalystCount = mockSourceData.filter(d => d.source === 'catalyst').length;
  const jiraCount = mockSourceData.filter(d => d.source === 'jira').length;
  const conflictCount = mockSourceData.filter(d => d.syncStatus === 'conflict').length;
  const lastSyncedAt = new Date(Date.now() - 7200000).toISOString(); // 2h ago mock

  // Filter items by source
  const filteredItems = useMemo(() => {
    if (sourceFilter === 'all') return listState.processed;
    return listState.processed.filter((_, idx) => mockSourceData[idx]?.source === sourceFilter);
  }, [listState.processed, sourceFilter, mockSourceData]);

  // Mock conflicts for drawer
  const mockConflicts = useMemo(() => {
    return mockSourceData
      .map((d, idx) => ({ ...d, item: listState.processed[idx] }))
      .filter(d => d.syncStatus === 'conflict')
      .map((d, i) => ({
        id: `conflict-${i}`,
        field: ['status', 'assignee', 'priority'][i % 3],
        catalystValue: ['In Review', 'Ahmed Hassan', 'High'][i % 3],
        jiraValue: ['In Progress', 'Mohammed Al-Sayed', 'Medium'][i % 3],
        detectedAt: new Date(Date.now() - 3600000 * (i + 1)).toISOString(),
      }));
  }, [mockSourceData, listState.processed]);

  // Mock sync logs
  const mockSyncLogs = [
    { id: '1', startedAt: new Date(Date.now() - 7200000).toISOString(), status: 'completed' as const, itemsSynced: 47, conflictsFound: 3 },
    { id: '2', startedAt: new Date(Date.now() - 86400000).toISOString(), status: 'completed' as const, itemsSynced: 52, conflictsFound: 0 },
    { id: '3', startedAt: new Date(Date.now() - 172800000).toISOString(), status: 'failed' as const, itemsSynced: 0, conflictsFound: 0 },
  ];

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
    <div style={{ fontFamily: 'Inter, sans-serif', background: '#FFFFFF', minHeight: '100%' }}>
      {/* Sync Banner */}
      {!bannerDismissed && (
        <SyncBanner
          conflictCount={conflictCount}
          lastSyncedAt={lastSyncedAt}
          onReviewConflicts={() => setConflictDrawerOpen(true)}
          onSyncNow={() => toast.info('Sync triggered (mock)')}
          onDismiss={() => setBannerDismissed(true)}
        />
      )}

      <div className="px-6 py-4 max-w-[1400px] mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 mb-3">
          <span style={{ fontSize: 10, color: '#94A3B8' }}>ProjectHub</span>
          <span style={{ fontSize: 10, color: '#CBD5E1' }}>/</span>
          <span style={{ fontSize: 10, color: '#94A3B8' }}>{project?.key ?? key?.toUpperCase()} — {project?.name ?? 'Loading…'}</span>
          <span style={{ fontSize: 10, color: '#CBD5E1' }}>/</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#475569' }}>List</span>
        </div>

        {/* Page header */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2.5">
            <h1 style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em', fontFamily: 'Sora, sans-serif', color: '#0F172A', margin: 0 }}>
              Work Items
            </h1>
            <span style={{ fontSize: 11, fontWeight: 500, padding: '1px 8px', borderRadius: 99, background: '#F1F5F9', color: '#64748B' }}>
              {filteredItems.length}
            </span>
          </div>
          <button
            onClick={() => setSyncDrawerOpen(true)}
            className="inline-flex items-center gap-1.5"
            style={{
              height: 30, padding: '0 10px', borderRadius: 4,
              border: '0.75px solid #E2E8F0', background: 'none',
              fontSize: 11, fontWeight: 500, color: '#475569',
              fontFamily: 'Inter, sans-serif', cursor: 'pointer',
            }}
          >
            <History size={13} />
            Sync Log
          </button>
        </div>

        {/* Toolbar with source filter pills */}
        <div className="flex items-center gap-3 py-2">
          <SourceFilterPills
            value={sourceFilter}
            onChange={setSourceFilter}
            catalystCount={catalystCount}
            jiraCount={jiraCount}
          />
        </div>

        <WorkItemsToolbar
          search={listState.search}
          onSearchChange={listState.setSearch}
          totalCount={filteredItems.length}
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

        {/* Sync Legend */}
        <SyncLegend visible={sourceFilter !== 'catalyst'} />

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin" style={{ color: '#2563EB' }} />
          </div>
        ) : (
          <WorkItemsTable
            items={filteredItems}
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
      </div>

      {project && <CreateWorkItemModal open={createOpen} onClose={() => setCreateOpen(false)} projectId={project.id} projectKey={project.key} />}
      {project && <WorkItemDetailModal open={!!detailItemId} itemId={detailItemId} projectId={project.id} projectKey={project.key} onClose={() => setDetailItemId(null)} onNavigate={setDetailItemId} />}

      {/* Conflict Resolution Drawer */}
      <ConflictResolutionDrawer
        open={conflictDrawerOpen}
        onClose={() => setConflictDrawerOpen(false)}
        itemKey={project?.key || ''}
        conflicts={mockConflicts}
        onResolve={(id, resolution) => {
          toast.success(`Conflict resolved: ${resolution}`);
          setConflictDrawerOpen(false);
        }}
      />

      {/* Jira Sync Drawer */}
      <JiraSyncDrawer
        open={syncDrawerOpen}
        onClose={() => setSyncDrawerOpen(false)}
        projectKey={project?.key || ''}
        jiraProjectKey="SENAEI-BAU"
        lastSyncedAt={lastSyncedAt}
        syncLogs={mockSyncLogs}
        writeBackQueue={[]}
        onSyncNow={() => toast.info('Sync triggered (mock)')}
        onApproveWriteBack={() => {}}
      />
    </div>
  );
}
