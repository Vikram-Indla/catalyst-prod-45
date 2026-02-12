/**
 * JiraProjectsPage — Jira Projects management + sync
 * Phase 3, Task 2
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderGit2, RefreshCw, Loader2 } from 'lucide-react';
import { useJiraProjects } from '@/hooks/workhub/useJiraProjects';
import { useSyncLog, useTriggerSync } from '@/hooks/workhub/useSyncLog';
import { SyncStatusCards } from './SyncStatusCard';
import { SyncLogTable } from './SyncLogTable';
import { SyncBadge } from '../shared/SyncBadge';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

export function JiraProjectsPage() {
  const navigate = useNavigate();
  const { data: projects = [], isLoading: projectsLoading } = useJiraProjects();
  const { data: syncLogs = [], isLoading: logsLoading } = useSyncLog();
  const triggerSync = useTriggerSync();
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const [syncAllRunning, setSyncAllRunning] = useState(false);

  // Total work items count
  const { data: totalItems = 0 } = useQuery({
    queryKey: ['workhub', 'total-work-items'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('ph_work_items')
        .select('*', { count: 'exact', head: true });
      if (error) throw new Error(error.message);
      return count || 0;
    },
    staleTime: 30_000,
  });

  // Per-project item counts
  const { data: projectCounts = {} } = useQuery({
    queryKey: ['workhub', 'project-item-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_work_items')
        .select('jira_project_id');
      if (error) throw new Error(error.message);
      const counts: Record<string, number> = {};
      (data ?? []).forEach((item: any) => {
        if (item.jira_project_id) {
          counts[item.jira_project_id] = (counts[item.jira_project_id] || 0) + 1;
        }
      });
      return counts;
    },
    staleTime: 30_000,
  });

  const handleSyncProject = async (projectId: string) => {
    setSyncingIds(prev => new Set(prev).add(projectId));
    try {
      await triggerSync.mutateAsync({ projectId, syncType: 'manual' });
      toast.success('Sync completed successfully');
    } catch (err: any) {
      toast.error(`Sync failed: ${err.message}`);
    } finally {
      setSyncingIds(prev => {
        const next = new Set(prev);
        next.delete(projectId);
        return next;
      });
    }
  };

  const handleSyncAll = async () => {
    setSyncAllRunning(true);
    try {
      for (const project of projects) {
        setSyncingIds(prev => new Set(prev).add(project.id));
        await triggerSync.mutateAsync({ projectId: project.id, syncType: 'manual' });
        setSyncingIds(prev => {
          const next = new Set(prev);
          next.delete(project.id);
          return next;
        });
      }
      toast.success(`Sync complete — ${projects.length} projects refreshed`);
    } catch (err: any) {
      toast.error(`Sync failed: ${err.message}`);
    } finally {
      setSyncAllRunning(false);
      setSyncingIds(new Set());
    }
  };

  const getSyncStatus = (lastSynced?: string): { color: string; dotBg: string } => {
    if (!lastSynced) return { color: '#dc2626', dotBg: '#fecaca' };
    const hours = (Date.now() - new Date(lastSynced).getTime()) / 3600000;
    if (hours < 24) return { color: '#16a34a', dotBg: '#dcfce7' };
    return { color: '#ca8a04', dotBg: '#fef9c3' };
  };

  return (
    <div style={{ fontFamily: 'var(--wh-font-sans)' }}>
      {/* Page Header */}
      <header className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: '#dbeafe' }}
          >
            <FolderGit2 className="w-5 h-5" style={{ color: 'var(--wh-primary)' }} />
          </div>
          <div>
            <h1
              className="text-2xl font-bold"
              style={{ fontFamily: 'var(--wh-font-display)', color: 'var(--wh-text-primary)' }}
            >
              Jira Projects
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--wh-text-secondary)' }}>
              Connected Jira spaces — {projects.length} projects
            </p>
          </div>
        </div>

        <button
          onClick={handleSyncAll}
          disabled={syncAllRunning || projectsLoading}
          className="px-4 py-2 text-sm font-medium rounded-lg border transition-colors disabled:opacity-50 flex items-center gap-2"
          style={{
            borderColor: 'var(--wh-primary)',
            color: 'var(--wh-primary)',
            background: 'transparent',
          }}
        >
          {syncAllRunning ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Sync All
        </button>
      </header>

      {/* KPI Status Cards */}
      <SyncStatusCards
        projects={projects}
        totalItems={totalItems}
        syncLogs={syncLogs}
      />

      {/* Project Cards Grid */}
      {projectsLoading ? (
        <div className="flex items-center justify-center py-12" style={{ color: 'var(--wh-text-tertiary)' }}>
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading projects...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(project => {
            const isSyncing = syncingIds.has(project.id);
            const itemCount = projectCounts[project.id] || 0;
            const syncStatus = getSyncStatus(project.last_synced_at);

            return (
              <div
                key={project.id}
                className="relative p-5 rounded-xl border cursor-pointer transition-shadow hover:shadow-md"
                style={{
                  background: 'var(--wh-surface)',
                  borderColor: 'var(--wh-border)',
                  borderRadius: 'var(--wh-radius-xl)',
                  borderLeft: `4px solid ${project.color}`,
                  boxShadow: 'var(--wh-shadow-sm)',
                }}
                onClick={() => navigate(`/workhub/workitems?project=${project.id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div
                      className="text-xl font-bold"
                      style={{ fontFamily: 'var(--wh-font-display)', color: 'var(--wh-text-primary)' }}
                    >
                      {project.project_key}
                    </div>
                    <div className="text-[13px] mt-0.5" style={{ color: 'var(--wh-text-secondary)' }}>
                      {project.name}
                    </div>
                  </div>
                  {/* Sync status dot */}
                  <div
                    className="w-2.5 h-2.5 rounded-full mt-1"
                    style={{ backgroundColor: syncStatus.color }}
                    title={project.last_synced_at ? `Synced ${project.last_synced_at}` : 'Never synced'}
                  />
                </div>

                <div className="text-xs mb-3" style={{ color: 'var(--wh-text-tertiary)' }}>
                  {itemCount} work item{itemCount !== 1 ? 's' : ''}
                </div>

                <div className="flex items-center justify-between">
                  <SyncBadge lastSyncedAt={project.last_synced_at} />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSyncProject(project.id);
                    }}
                    disabled={isSyncing}
                    className="px-2.5 py-1 text-xs font-medium rounded-md border transition-colors disabled:opacity-50 flex items-center gap-1.5"
                    style={{
                      borderColor: 'var(--wh-border)',
                      color: 'var(--wh-text-secondary)',
                      background: 'transparent',
                    }}
                  >
                    {isSyncing ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3" />
                    )}
                    Sync Now
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sync Log Table */}
      <SyncLogTable logs={syncLogs} projects={projects} isLoading={logsLoading} />
    </div>
  );
}
