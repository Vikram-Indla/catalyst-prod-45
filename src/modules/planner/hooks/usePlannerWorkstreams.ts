// ============================================================
// WORKSTREAMS V10 - Data Hook
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WorkstreamMember {
  id: string;
  user_id: string;
  role: 'lead' | 'member';
  profile?: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
}

export interface Workstream {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  icon: string | null;
  sort_order: number | null;
  is_active: boolean | null;
  lead_id: string | null;
  start_date: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  // Computed fields (for UI display)
  code?: string; // Derived from slug
  members?: WorkstreamMember[];
  memberCount?: number;
  taskCount?: number;
  overdueCount?: number;
  doneCount?: number;
  progress?: number;
  health?: 'healthy' | 'at-risk' | 'critical' | 'locked';
  trend?: 'up' | 'down' | 'stable';
  lead?: {
    id: string;
    name: string;
    initials: string;
  };
}

export function usePlannerWorkstreams() {
  return useQuery({
    queryKey: ['planner-workstreams'],
    queryFn: async (): Promise<Workstream[]> => {
      // Fetch workstreams
      const { data: workstreams, error } = await supabase
        .from('planner_workstreams')
        .select('*')
        .order('name');

      if (error) throw new Error(error.message);
      if (!workstreams) return [];

      // Fetch members for each workstream
      const { data: members } = await supabase
        .from('workstream_members')
        .select(`
          id,
          workstream_id,
          user_id,
          role,
          profiles:user_id (
            id,
            full_name,
            email,
            avatar_url
          )
        `);

      // Fetch task counts from planner_tasks
      const { data: tasks } = await supabase
        .from('planner_tasks')
        .select('id, workstream_id, due_date, status_id');

      // Get status for done check
      const { data: statuses } = await supabase
        .from('planner_statuses')
        .select('id, slug')
        .eq('slug', 'done');
      
      const doneStatusId = statuses?.[0]?.id;

      // Fetch lead profiles from resource_inventory or profiles
      const leadIds = workstreams.map(ws => ws.lead_id).filter(Boolean) as string[];
      let leadProfilesMap = new Map<string, { name: string; initials: string }>();
      
      if (leadIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', leadIds);
        
        (profiles || []).forEach(p => {
          leadProfilesMap.set(p.id, {
            name: p.full_name || 'Unknown',
            initials: getInitials(p.full_name || ''),
          });
        });
      }

      // Map workstreams with computed data
      return workstreams.map((ws): Workstream => {
        const wsMembers = members?.filter(m => m.workstream_id === ws.id) || [];
        const wsTasks = tasks?.filter(t => t.workstream_id === ws.id) || [];
        
        // Calculate overdue (tasks with past due dates that aren't done)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const overdueCount = wsTasks.filter(t => {
          if (!t.due_date) return false;
          if (t.status_id === doneStatusId) return false;
          const dueDate = new Date(t.due_date);
          return dueDate < today;
        }).length;

        const doneCount = wsTasks.filter(t => t.status_id === doneStatusId).length;
        const taskCount = wsTasks.length;

        // Calculate health based on overdue ratio
        const overdueRatio = taskCount > 0 ? overdueCount / taskCount : 0;
        let health: Workstream['health'] = 'healthy';
        if (overdueRatio > 0.3) health = 'critical';
        else if (overdueRatio > 0.15) health = 'at-risk';

        // Calculate progress
        const progress = taskCount > 0 ? Math.round((doneCount / taskCount) * 100) : 0;

        // Find lead from members or from lead_id
        const leadMember = wsMembers.find(m => m.role === 'lead');
        const leadProfile = leadMember?.profiles as any;
        
        // Use lead_id to fetch from profiles if no member has lead role
        let leadInfo = leadProfile 
          ? { id: leadProfile.id, name: leadProfile.full_name || 'Unknown', initials: getInitials(leadProfile.full_name || '') }
          : ws.lead_id && leadProfilesMap.has(ws.lead_id)
            ? { id: ws.lead_id, ...leadProfilesMap.get(ws.lead_id)! }
            : undefined;
        
        return {
          id: ws.id,
          name: ws.name,
          slug: ws.slug,
          description: ws.description,
          color: ws.color,
          icon: ws.icon,
          sort_order: ws.sort_order,
          is_active: ws.is_active,
          lead_id: ws.lead_id,
          start_date: ws.start_date,
          due_date: ws.due_date,
          created_at: ws.created_at,
          updated_at: ws.updated_at,
          // Computed fields
          code: ws.slug?.slice(0, 3).toUpperCase() || ws.name.slice(0, 3).toUpperCase(),
          members: wsMembers.map(m => ({
            id: m.id,
            user_id: m.user_id,
            role: m.role as 'lead' | 'member',
            profile: m.profiles as any,
          })),
          memberCount: wsMembers.length,
          taskCount,
          overdueCount,
          doneCount,
          progress,
          health,
          trend: 'stable' as const,
          lead: leadInfo,
        };
      });
    },
  });
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function useCreateWorkstream() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      color: string;
      leadId?: string | null;
    }) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      const slug = data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const { data: result, error } = await supabase
        .from('planner_workstreams')
        .insert({
          name: data.name,
          slug,
          description: data.description,
          color: data.color,
          lead_id: data.leadId || null,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-workstreams'] });
    },
  });
}

export function useUpdateWorkstream() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Workstream> }) => {
      const updateData: any = {};
      if (updates.name !== undefined) {
        updateData.name = updates.name;
        updateData.slug = updates.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      }
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.color !== undefined) updateData.color = updates.color;
      if (updates.lead_id !== undefined) updateData.lead_id = updates.lead_id;
      if (updates.start_date !== undefined) updateData.start_date = updates.start_date;
      if (updates.due_date !== undefined) updateData.due_date = updates.due_date;
      
      const { error } = await supabase
        .from('planner_workstreams')
        .update(updateData)
        .eq('id', id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-workstreams'] });
    },
  });
}

export function useDeleteWorkstream() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('planner_workstreams')
        .delete()
        .eq('id', id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-workstreams'] });
    },
  });
}

export function useAddWorkstreamMember() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ workstreamId, userId, role }: { 
      workstreamId: string; 
      userId: string; 
      role: 'lead' | 'member';
    }) => {
      // If adding a lead, demote existing leads first
      if (role === 'lead') {
        await supabase
          .from('workstream_members')
          .update({ role: 'member' })
          .eq('workstream_id', workstreamId)
          .eq('role', 'lead');
      }

      const { error } = await supabase
        .from('workstream_members')
        .upsert({
          workstream_id: workstreamId,
          user_id: userId,
          role,
        });

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-workstreams'] });
    },
  });
}

export function useRemoveWorkstreamMember() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ workstreamId, userId }: { workstreamId: string; userId: string }) => {
      const { error } = await supabase
        .from('workstream_members')
        .delete()
        .eq('workstream_id', workstreamId)
        .eq('user_id', userId);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-workstreams'] });
    },
  });
}
