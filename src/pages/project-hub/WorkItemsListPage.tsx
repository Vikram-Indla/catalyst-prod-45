import React, { useState, useMemo, useCallback, useEffect, lazy, Suspense } from 'react';
import { CatalystPageHeader } from '@/components/shared/CatalystPageHeader';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProjectWorkItems } from '@/hooks/useProjectWorkItems';
import { useWorkItemListState } from '@/hooks/useWorkItemListState';
import { useSyncSummary, useConflicts, useSyncLogs, useWriteBackQueue, useTriggerSync, useResolveConflict, useApproveWriteBack, jiraSyncKeys } from '@/hooks/useJiraSync';
import { jiraSyncService } from '@/services/jira-sync.service';
import { WorkItemsToolbar } from '@/components/project-hub/work-items/WorkItemsToolbar';
import { WorkItemsTable } from '@/components/project-hub/work-items/WorkItemsTable';
import { CreateWorkItemModal } from '@/components/project-hub/work-items/CreateWorkItemModal';
const CatalystDetailRouter = lazy(() => import('@/components/catalyst-detail-views/CatalystDetailRouter'));
import { SyncBanner } from '@/components/project-hub/source-badge/SyncBanner';
import { SyncLegend } from '@/components/project-hub/source-badge/SyncLegend';
import { SourceFilterPills } from '@/components/project-hub/source-filter/SourceFilterPills';
import { ConflictResolutionDrawer } from '@/components/project-hub/jira-sync/ConflictResolutionDrawer';
import { JiraSyncDrawer } from '@/components/project-hub/jira-sync/JiraSyncDrawer';
import { updateWorkItem, createWorkItem, deleteWorkItem } from '@/services/workItemService';
import { Loader2, History } from '@/lib/atlaskit-icons';
import { token } from '@atlaskit/tokens';
import { FlagsHost, flag } from '@/components/shared/JiraTable/flags';

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

  // Project lookup
  const { data: project } = useQuery({
    queryKey: ['ph-project-by-key', key],
    queryFn: async () => {
      if (!key) return null;
      const { data } = await supabase.from('ph_projects').select('id, key, name').eq('key', key.toUpperCase()).maybeSingle();
      return data;
    },
    enabled: !!key,
  });

  const projectId = project?.id ?? '';

  // Work items — source filter applied at DB level
  const { data: items = [], isLoading } = useProjectWorkItems(projectId || undefined, sourceFilter);
  const listState = useWorkItemListState(items);

  // Sync summary from the aggregation view — NOT hardcoded
  const { data: syncSummary } = useSyncSummary(projectId);
  const catalystCount = syncSummary?.catalyst_count ?? 0;
  const jiraCount = syncSummary?.jira_count ?? 0;
  const conflictCount = syncSummary?.conflict_count ?? 0;
  const lastSyncedAt = syncSummary?.last_synced_at ?? null;

  // Conflicts from real DB
  const { data: conflicts = [], isLoading: conflictsLoading } = useConflicts(projectId);

  // Sync logs from real DB
  const { data: syncLogs = [], isLoading: logsLoading } = useSyncLogs(projectId);

  // Write-back queue from real DB
  const { data: writeBackQueue = [], isLoading: wbLoading } = useWriteBackQueue(projectId);

  // Mutations
  const triggerSync = useTriggerSync();
  const resolveConflict = useResolveConflict();
  const approveWriteBack = useApproveWriteBack();

  // Statuses & profiles
  const { data: statuses = [] } = useQuery({
    queryKey: ['ph-statuses', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data } = await supabase.from('ph_workflow_statuses').select('id, name, category, color').eq('project_id', projectId).order('sort_order');
      return (data || []) as { id: string; name: string; category: string; color: string }[];
    },
    enabled: !!projectId,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['ph-profiles-for-project', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data: members } = await supabase.from('ph_project_members').select('user_id').eq('project_id', projectId);
      const userIds = (members || []).map((m: any) => m.user_id).filter(Boolean);
      if (userIds.length === 0) return [];
      const { data: profs } = await supabase.from('profiles').select('id, full_name').in('id', userIds);
      return (profs || []).map((p: any) => ({ id: p.id, name: p.full_name || 'Unknown' }));
    },
    enabled: !!projectId,
  });

  // Real-time subscription for sync status updates (D5)
  useEffect(() => {
    if (!projectId) return;
    const channel = supabase
      .channel(`project-${projectId}-sync`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ph_work_items',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['ph-work-items', projectId] });
          queryClient.invalidateQueries({ queryKey: jiraSyncKeys.syncSummary(projectId) });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [projectId, queryClient]);

  const invalidateItems = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['ph-work-items', projectId] });
    queryClient.invalidateQueries({ queryKey: jiraSyncKeys.syncSummary(projectId) });
  }, [queryClient, projectId]);

  // Inline update with write-back interception (D4)
  const handleInlineUpdate = useCallback(async (id: string, changes: Record<string, any>) => {
    try {
      // Check if this is a Jira-sourced item
      const item = items.find(i => i.id === id);
      if (item?.source === 'jira') {
        // Queue write-back for each changed field
        for (const [field, value] of Object.entries(changes)) {
          await jiraSyncService.queueWriteBack(id, field, String(value));
        }
        flag.info('Change queued for Jira sync approval');
      }
      // Always update locally
      await updateWorkItem(id, changes);
      invalidateItems();
      queryClient.invalidateQueries({ queryKey: jiraSyncKeys.writeBackQueue(projectId) });
      if (item?.source !== 'jira') flag.success('Updated');
    } catch (e: any) {
      flag.error(e.message);
      invalidateItems();
    }
  }, [invalidateItems, items, projectId, queryClient]);

  const handleBulkUpdate = useCallback(async (ids: string[], changes: Record<string, any>) => {
    try {
      // Queue write-backs for Jira items
      for (const id of ids) {
        const item = items.find(i => i.id === id);
        if (item?.source === 'jira') {
          for (const [field, value] of Object.entries(changes)) {
            await jiraSyncService.queueWriteBack(id, field, String(value));
          }
        }
      }
      await Promise.all(ids.map(id => updateWorkItem(id, changes)));
      invalidateItems();
      queryClient.invalidateQueries({ queryKey: jiraSyncKeys.writeBackQueue(projectId) });
      flag.success(`Updated ${ids.length} items`);
    } catch (e: any) { flag.error(e.message); invalidateItems(); }
  }, [invalidateItems, items, projectId, queryClient]);

  const handleBulkDelete = useCallback(async (ids: string[]) => {
    try { await Promise.all(ids.map(id => deleteWorkItem(id))); invalidateItems(); flag.success(`Deleted ${ids.length} item(s)`); }
    catch (e: any) { flag.error(e.message); }
  }, [invalidateItems]);

  const handleClone = useCallback(async (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item || !project) return;
    try {
      await createWorkItem({ project_id: project.id, type_id: item.type_id, status_id: item.status_id, title: `${item.title} (Copy)`, item_type: item.item_type, priority: item.priority, assignee_id: item.assignee_id, parent_id: item.parent_id, due_date: item.due_date, department: item.department, is_flagged: item.is_flagged });
      invalidateItems(); flag.success('Item cloned');
    } catch (e: any) { flag.error(e.message); }
  }, [items, project, invalidateItems]);

  // Sync Now handler
  const handleSyncNow = useCallback(() => {
    if (!projectId || triggerSync.isPending) return;
    triggerSync.mutate(projectId, {
      onSuccess: () => flag.success('Sync triggered successfully'),
      onError: () => flag.error('Sync failed. Please try again.'),
    });
  }, [projectId, triggerSync]);

  // Resolve conflict handler
  const handleResolveConflict = useCallback((conflictId: string, resolution: 'keep_catalyst' | 'keep_jira') => {
    resolveConflict.mutate({ conflictId, resolution }, {
      onSuccess: () => {
        flag.success(`Conflict resolved: ${resolution === 'keep_catalyst' ? 'Kept Catalyst' : 'Kept Jira'}`);
        invalidateItems();
      },
      onError: (e: any) => flag.error(`Failed: ${e.message}`),
    });
  }, [resolveConflict, invalidateItems]);

  // Approve write-back handler
  const handleApproveWriteBack = useCallback((queueId: string) => {
    approveWriteBack.mutate(queueId, {
      onSuccess: () => flag.success('Write-back approved'),
      onError: (e: any) => flag.error(`Failed: ${e.message}`),
    });
  }, [approveWriteBack]);

  // Map conflicts to drawer format
  const drawerConflicts = useMemo(() => {
    return conflicts.map(c => ({
      id: c.id,
      field: c.field_name,
      catalystValue: c.catalyst_value ?? '',
      jiraValue: c.jira_value ?? '',
      detectedAt: c.detected_at,
    }));
  }, [conflicts]);

  // Map sync logs to drawer format
  const drawerSyncLogs = useMemo(() => {
    return syncLogs.map(l => ({
      id: l.id,
      startedAt: l.started_at,
      status: l.status,
      itemsSynced: l.items_synced,
      conflictsFound: l.conflicts_found,
    }));
  }, [syncLogs]);

  // Map write-back queue to drawer format
  const drawerWriteBackQueue = useMemo(() => {
    return writeBackQueue.map(q => ({
      id: q.id,
      fieldName: q.field_name,
      newValue: q.new_value,
      queuedAt: q.queued_at,
    }));
  }, [writeBackQueue]);

  const assignees = useMemo(() => {
    const seen = new Set<string>();
    const result: { name: string; color: string }[] = [];
    const colors = ['var(--ds-text-brand, var(--cp-workstream-catalyst-primary, #2563EB))', 'var(--cp-teal-60, #0D9488)', 'var(--cp-purple-60, #7C3AED)', 'var(--ds-text-warning, var(--cp-warning, #D97706))', 'var(--ds-text-danger, var(--cp-danger, #DC2626))', 'var(--ds-text-success, var(--cp-success, #16A34A))'];
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
    <div style={{ fontFamily: 'var(--cp-font-body)', background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))', minHeight: '100%' }}>
      {/* Sync Banner — conflictCount from real DB */}
      {!bannerDismissed && (
        <SyncBanner
          conflictCount={conflictCount}
          lastSyncedAt={lastSyncedAt}
          onReviewConflicts={() => setConflictDrawerOpen(true)}
          onSyncNow={handleSyncNow}
          onDismiss={() => setBannerDismissed(true)}
        />
      )}

      <div style={{ paddingInline: token('space.300', '24px'), paddingBlock: token('space.200', '16px'), maxWidth: 1400, marginInline: 'auto' }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: token('space.050', '4px'), marginBlockEnd: token('space.150', '12px') }}>
          <span style={{ fontSize: 10, color: 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light, #94A3B8)))' }}>ProjectHub</span>
          <span style={{ fontSize: 10, color: 'var(--ds-text-disabled, #CBD5E1)' }}>/</span>
          <span style={{ fontSize: 10, color: 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light, #94A3B8)))' }}>{project?.key ?? key?.toUpperCase()} — {project?.name ?? 'Loading…'}</span>
          <span style={{ fontSize: 10, color: 'var(--ds-text-disabled, #CBD5E1)' }}>/</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--ds-text-subtle, #475569)' }}>List</span>
        </div>

        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBlockEnd: token('space.050', '4px') }}>
          <CatalystPageHeader title="Work Items" />
          <button
            onClick={() => setSyncDrawerOpen(true)}
            style={{
              height: 32, paddingInline: token('space.150', '12px'), borderRadius: 4,
              border: `1px solid ${token('color.border', 'var(--ds-border, #DFE1E6)')}`, background: 'none',
              fontSize: 11, fontWeight: 500, color: token('color.text.subtle', 'var(--ds-text-subtle, #44546F)'),
              fontFamily: 'var(--cp-font-body)', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: token('space.075', '6px'),
            }}
          >
            <History size={13} />
            Sync Log
          </button>
        </div>

        {/* Toolbar with source filter pills — counts from real DB */}
        <div style={{ display: 'flex', alignItems: 'center', gap: token('space.150', '12px'), paddingBlock: token('space.100', '8px') }}>
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

        {/* Sync Legend */}
        <SyncLegend visible={sourceFilter !== 'catalyst'} />

        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBlock: token('space.600', '80px') }}>
            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary, #2563EB))' }} />
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
            sourceFilter={sourceFilter}
          />
        )}
      </div>

      {project && <CreateWorkItemModal open={createOpen} onClose={() => setCreateOpen(false)} projectId={project.id} projectKey={project.key} />}
      {project && detailItemId && (
        <Suspense fallback={null}>
          <CatalystDetailRouter
            isOpen={!!detailItemId}
            itemId={detailItemId}
            projectId={project.id}
            projectKey={project.key}
            onClose={() => setDetailItemId(null)}
            onNavigate={setDetailItemId}
          />
        </Suspense>
      )}

      {/* Conflict Resolution Drawer — real data */}
      <ConflictResolutionDrawer
        open={conflictDrawerOpen}
        onClose={() => setConflictDrawerOpen(false)}
        itemKey={project?.key || ''}
        conflicts={drawerConflicts}
        onResolve={handleResolveConflict}
      />

      {/* Jira Sync Drawer — real data */}
      <JiraSyncDrawer
        open={syncDrawerOpen}
        onClose={() => setSyncDrawerOpen(false)}
        projectKey={project?.key || ''}
        jiraProjectKey={syncSummary?.project_key || project?.key || ''}
        lastSyncedAt={lastSyncedAt}
        syncLogs={drawerSyncLogs}
        writeBackQueue={drawerWriteBackQueue}
        onSyncNow={handleSyncNow}
        onApproveWriteBack={handleApproveWriteBack}
        isSyncing={triggerSync.isPending}
      />
      <FlagsHost />
    </div>
  );
}
