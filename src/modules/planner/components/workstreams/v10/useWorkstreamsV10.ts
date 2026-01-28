// ============================================================
// WORKSTREAMS V10 DATA HOOK
// Fetches and transforms workstream data with health calculations
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  WorkstreamDataV10,
  WorkstreamMemberV10,
  WorkstreamsSummaryV10,
  WorkstreamActivity,
  calculateHealth,
  getInitials,
  getWorkstreamCode,
  getColorFromName,
} from './types';
import { toast } from 'sonner';

// =========================
// FETCH WORKSTREAMS
// =========================
export function useWorkstreamsV10() {
  return useQuery({
    queryKey: ['workstreams-v10'],
    queryFn: async (): Promise<WorkstreamDataV10[]> => {
      console.log('[Workstreams V10] Fetching workstreams...');
      
      try {
        // Fetch workstreams (no is_archived column - use is_active)
        const { data: workstreams, error } = await supabase
          .from('planner_workstreams')
          .select(`
            id,
            name,
            slug,
            color,
            description,
            created_at,
            start_date,
            due_date,
            is_active
          `)
          .eq('is_active', true)
          .order('name');

        console.log('[Workstreams V10] Workstreams query result:', { workstreams, error });
        if (error) throw new Error(error.message || 'Failed to fetch workstreams');

      // Fetch members for all workstreams
      const { data: allMembers, error: membersError } = await supabase
        .from('workstream_members')
        .select(`
          id,
          workstream_id,
          user_id,
          role
        `);

      if (membersError) throw new Error(membersError.message || 'Failed to fetch members');

      // Fetch profiles separately
      const memberUserIds = [...new Set((allMembers || []).map(m => m.user_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', memberUserIds.length > 0 ? memberUserIds : ['00000000-0000-0000-0000-000000000000']);

      if (profilesError) throw new Error(profilesError.message || 'Failed to fetch profiles');

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      // Fetch task counts per workstream
      const { data: tasks, error: tasksError } = await supabase
        .from('planner_tasks')
        .select('id, workstream_id, status_id, due_date')
        .not('workstream_id', 'is', null);

      if (tasksError) throw new Error(tasksError.message || 'Failed to fetch tasks');

      // Fetch statuses (use is_done instead of is_done_state)
      const { data: statuses, error: statusesError } = await supabase
        .from('planner_statuses')
        .select('id, name, is_done');

      if (statusesError) throw new Error(statusesError.message || 'Failed to fetch statuses');

      const statusMap = new Map((statuses || []).map(s => [s.id, s]));
      const now = new Date();

      // Aggregate data per workstream
      const result = (workstreams || []).map((ws) => {
        const wsMembers = (allMembers || [])
          .filter(m => m.workstream_id === ws.id)
          .map((m): WorkstreamMemberV10 => {
            const profile = profileMap.get(m.user_id);
            return {
              id: m.id,
              user_id: m.user_id,
              role: m.role as 'lead' | 'member',
              initials: getInitials(profile?.full_name || null),
              color: getColorFromName(profile?.full_name || 'Unknown'),
              full_name: profile?.full_name || null,
              avatar_url: profile?.avatar_url || null,
              job_title: null, // profiles doesn't have job_title
            };
          });

        const wsTasks = (tasks || []).filter(t => t.workstream_id === ws.id);
        const taskCount = wsTasks.length;
        
        let completedCount = 0;
        let inProgressCount = 0;
        let backlogCount = 0;
        let overdueCount = 0;

        wsTasks.forEach(task => {
          const status = statusMap.get(task.status_id);
          if (status?.is_done) {
            completedCount++;
          } else if (status?.name?.toLowerCase().includes('progress')) {
            inProgressCount++;
          } else {
            backlogCount++;
          }
          // Check overdue
          if (task.due_date && new Date(task.due_date) < now && !status?.is_done) {
            overdueCount++;
          }
        });

        const progress = taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0;
        const health = calculateHealth(overdueCount, taskCount, completedCount, backlogCount);
        const lead = wsMembers.find(m => m.role === 'lead') || null;

        return {
          id: ws.id,
          name: ws.name,
          code: getWorkstreamCode(ws.name),
          color: ws.color || getColorFromName(ws.name),
          description: ws.description,
          task_count: taskCount,
          overdue_count: overdueCount,
          completed_count: completedCount,
          in_progress_count: inProgressCount,
          backlog_count: backlogCount,
          progress,
          members: wsMembers,
          health,
          healthTrend: 'stable' as const, // Would need historical data for real trends
          lead,
          isLocked: false,
          isMember: true, // TODO: Check actual membership
          created_at: ws.created_at,
          start_date: ws.start_date,
          due_date: ws.due_date,
        };
      });
      
      console.log('[Workstreams V10] Transformed:', result.length, 'workstreams');
      return result;
      } catch (err) {
        console.error('[Workstreams V10] Error in queryFn:', err);
        throw err instanceof Error ? err : new Error(String(err));
      }
    },
    staleTime: 30000,
  });
}

// =========================
// SUMMARY CALCULATION
// =========================
export function useWorkstreamsSummaryV10(workstreams: WorkstreamDataV10[] | undefined): WorkstreamsSummaryV10 {
  if (!workstreams || workstreams.length === 0) {
    return {
      totalWorkstreams: 0,
      totalTasks: 0,
      overallProgress: 0,
      healthyCount: 0,
      atRiskCount: 0,
      criticalCount: 0,
    };
  }

  const totalTasks = workstreams.reduce((sum, ws) => sum + ws.task_count, 0);
  const totalCompleted = workstreams.reduce((sum, ws) => sum + ws.completed_count, 0);
  const overallProgress = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

  return {
    totalWorkstreams: workstreams.length,
    totalTasks,
    overallProgress,
    healthyCount: workstreams.filter(ws => ws.health === 'healthy').length,
    atRiskCount: workstreams.filter(ws => ws.health === 'at-risk').length,
    criticalCount: workstreams.filter(ws => ws.health === 'critical').length,
  };
}

// =========================
// FETCH ACTIVITIES (planner_activity_log has different schema)
// =========================
export function useWorkstreamActivities(workstreamId: string | null) {
  return useQuery({
    queryKey: ['workstream-activities-v10', workstreamId],
    queryFn: async (): Promise<WorkstreamActivity[]> => {
      if (!workstreamId) return [];

      // planner_activity_log uses task_id, not entity_id
      // For workstream activities, we'd need a different approach
      // For now return empty - would need schema change or different table
      return [];
    },
    enabled: !!workstreamId,
  });
}

// =========================
// CREATE WORKSTREAM
// =========================
export function useCreateWorkstreamV10() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      description: string;
      color: string;
      members: { user_id: string; role: 'lead' | 'member' }[];
    }) => {
      const slug = data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

      // Create workstream
      const { data: ws, error } = await supabase
        .from('planner_workstreams')
        .insert({
          name: data.name,
          slug,
          color: data.color,
          description: data.description || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Add members
      if (data.members.length > 0) {
        const { error: memberError } = await supabase
          .from('workstream_members')
          .insert(
            data.members.map(m => ({
              workstream_id: ws.id,
              user_id: m.user_id,
              role: m.role,
            }))
          );

        if (memberError) throw memberError;
      }

      return ws;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workstreams-v10'] });
      toast.success('Workstream created');
    },
    onError: (error) => {
      toast.error('Failed to create workstream');
      console.error(error);
    },
  });
}

// =========================
// UPDATE WORKSTREAM
// =========================
export function useUpdateWorkstreamV10() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: {
        name: string;
        description: string;
        color: string;
        members: { user_id: string; role: 'lead' | 'member' }[];
      };
    }) => {
      // Update workstream
      const { error } = await supabase
        .from('planner_workstreams')
        .update({
          name: data.name,
          color: data.color,
          description: data.description || null,
        })
        .eq('id', id);

      if (error) throw error;

      // Sync members: delete all and re-insert
      const { error: deleteError } = await supabase
        .from('workstream_members')
        .delete()
        .eq('workstream_id', id);

      if (deleteError) throw deleteError;

      if (data.members.length > 0) {
        const { error: insertError } = await supabase
          .from('workstream_members')
          .insert(
            data.members.map(m => ({
              workstream_id: id,
              user_id: m.user_id,
              role: m.role,
            }))
          );

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workstreams-v10'] });
      queryClient.invalidateQueries({ queryKey: ['workstream-activities-v10'] });
      toast.success('Workstream updated');
    },
    onError: (error) => {
      toast.error('Failed to update workstream');
      console.error(error);
    },
  });
}

// =========================
// ARCHIVE WORKSTREAM (use is_active instead of is_archived)
// =========================
export function useArchiveWorkstreamV10() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('planner_workstreams')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workstreams-v10'] });
      toast.success('Workstream archived');
    },
    onError: (error) => {
      toast.error('Failed to archive workstream');
      console.error(error);
    },
  });
}

// =========================
// DELETE WORKSTREAM
// =========================
export function useDeleteWorkstreamV10() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('planner_workstreams')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workstreams-v10'] });
      toast.success('Workstream deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete workstream');
      console.error(error);
    },
  });
}

// =========================
// AVAILABLE MEMBERS (for picker) - profiles doesn't have job_title
// =========================
export function useAvailableMembersV10() {
  return useQuery({
    queryKey: ['available-members-v10'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('approval_status', 'APPROVED')
        .order('full_name');

      if (error) throw error;

      return (data || []).map(p => ({
        id: p.id,
        user_id: p.id,
        full_name: p.full_name,
        avatar_url: p.avatar_url,
        job_title: null as string | null,
        initials: getInitials(p.full_name),
        color: getColorFromName(p.full_name || 'Unknown'),
      }));
    },
    staleTime: 60000,
  });
}

// =========================
// HELPERS
// =========================
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
