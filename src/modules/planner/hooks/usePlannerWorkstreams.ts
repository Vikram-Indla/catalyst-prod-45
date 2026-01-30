// ============================================================
// WORKSTREAMS V10 - Data Hook
// Includes archive support and task count for delete protection
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
import { isValidUUID } from '@/lib/utils/assertUuid';

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
  is_archived: boolean;
  lead_id: string | null;
  start_date: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  key_prefix: string; // 3-letter code for task keys (e.g., CAT, DEL)
  // Computed fields (for UI display)
  code?: string; // Derived from key_prefix
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

export function usePlannerWorkstreams(includeArchived = false) {
  return useQuery({
    queryKey: ['planner-workstreams', includeArchived],
    queryFn: async (): Promise<Workstream[]> => {
      // Fetch workstreams
      let query = supabase
        .from('planner_workstreams')
        .select('*')
        .order('name');

      // Filter archived unless explicitly requested
      if (!includeArchived) {
        query = query.eq('is_archived', false);
      }

      const { data: workstreams, error } = await query;

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

      // Lead resolution
      // - planner_workstreams.lead_id FK -> resource_inventory.id
      // - workstream_members.user_id FK -> profiles.id (profile/auth id)
      const leadResourceIds = workstreams.map(ws => ws.lead_id).filter((id): id is string => isValidUUID(id));
      const leadProfileIdsFromMembers = (members || [])
        .filter(m => m.role === 'lead')
        .map(m => m.user_id)
        .filter((id): id is string => isValidUUID(id));

      const leadByResourceId = new Map<string, { name: string; initials: string; profile_id: string | null }>();
      const leadByProfileId = new Map<string, { resource_id: string; name: string; initials: string }>();

      if (leadResourceIds.length > 0) {
        const { data: leadResources, error: leadError } = await supabase
          .from('resource_inventory')
          .select('id, profile_id, name')
          .in('id', leadResourceIds);
        if (leadError) throw new Error(leadError.message);
        (leadResources || []).forEach(r => {
          const name = (r as any).name || 'Unknown';
          const initials = getInitials((r as any).name || '');
          leadByResourceId.set((r as any).id, {
            name,
            initials,
            profile_id: (r as any).profile_id ?? null,
          });
        });
      }

      if (leadProfileIdsFromMembers.length > 0) {
        const { data: leadResourcesByProfile, error: leadProfileError } = await supabase
          .from('resource_inventory')
          .select('id, profile_id, name')
          .in('profile_id', leadProfileIdsFromMembers);
        if (leadProfileError) throw new Error(leadProfileError.message);
        (leadResourcesByProfile || []).forEach(r => {
          const profileId = (r as any).profile_id;
          if (!isValidUUID(profileId)) return;
          leadByProfileId.set(profileId, {
            resource_id: (r as any).id,
            name: (r as any).name || 'Unknown',
            initials: getInitials((r as any).name || ''),
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

        // Prefer explicit workstream.lead_id (resource id)
        let leadInfo: Workstream['lead'] | undefined;

        if (ws.lead_id && leadByResourceId.has(ws.lead_id)) {
          leadInfo = { id: ws.lead_id, ...leadByResourceId.get(ws.lead_id)! };
        } else if (leadProfile?.id && leadByProfileId.has(leadProfile.id)) {
          const mapped = leadByProfileId.get(leadProfile.id)!;
          leadInfo = { id: mapped.resource_id, name: mapped.name, initials: mapped.initials };
        } else if (leadProfile) {
          // Fallback display (no resource mapping found)
          leadInfo = {
            id: leadProfile.id,
            name: leadProfile.full_name || 'Unknown',
            initials: getInitials(leadProfile.full_name || ''),
          };
        }
        
        return {
          id: ws.id,
          name: ws.name,
          slug: ws.slug,
          description: ws.description,
          color: ws.color,
          icon: ws.icon,
          sort_order: ws.sort_order,
          is_active: ws.is_active,
          is_archived: ws.is_archived ?? false,
          lead_id: ws.lead_id,
          start_date: ws.start_date,
          due_date: ws.due_date,
          created_at: ws.created_at,
          updated_at: ws.updated_at,
          key_prefix: ws.key_prefix || ws.name.slice(0, 3).toUpperCase(),
          // Computed fields - use key_prefix as the display code
          code: ws.key_prefix || ws.name.slice(0, 3).toUpperCase(),
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

// Separate hook to get archived count (always fetches current count regardless of view)
export function useArchivedWorkstreamsCount() {
  return useQuery({
    queryKey: ['planner-workstreams-archived-count'],
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from('planner_workstreams')
        .select('*', { count: 'exact', head: true })
        .eq('is_archived', true);

      if (error) throw new Error(error.message);
      return count || 0;
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
      // Must be resource_inventory.id (FK planner_workstreams.lead_id)
      leadId?: string | null;
      keyPrefix?: string; // 3-5 letter code for task keys
    }) => {
      const slug = data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      // Generate key_prefix from name if not provided
      const keyPrefix = data.keyPrefix?.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5) 
        || data.name.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase();
      
      const { data: result, error } = await supabase
        .from('planner_workstreams')
        .insert({
          name: data.name,
          slug,
          description: data.description,
          color: data.color,
          lead_id: data.leadId || null,
          is_archived: false,
          key_prefix: keyPrefix,
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
      if (updates.is_archived !== undefined) updateData.is_archived = updates.is_archived;
      // key_prefix update - will trigger DB trigger to update all linked task keys
      if (updates.key_prefix !== undefined) updateData.key_prefix = updates.key_prefix.toUpperCase();
      
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
      // Check if workstream has linked tasks
      const { count, error: countError } = await supabase
        .from('planner_tasks')
        .select('id', { count: 'exact', head: true })
        .eq('workstream_id', id);
      
      if (countError) throw new Error(countError.message);
      
      if (count && count > 0) {
        throw new Error(`Cannot delete workstream: ${count} task(s) are linked to it. Remove or reassign tasks first.`);
      }
      
      const { error } = await supabase
        .from('planner_workstreams')
        .delete()
        .eq('id', id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-workstreams'] });
      catalystToast.success('Workstream deleted', 'The workstream has been permanently deleted.');
    },
    onError: (error: Error) => {
      catalystToast.error('Cannot delete workstream', error.message);
    },
  });
}

export function useArchiveWorkstream() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, archive }: { id: string; archive: boolean }) => {
      const { error } = await supabase
        .from('planner_workstreams')
        .update({ is_archived: archive })
        .eq('id', id);

      if (error) throw new Error(error.message);
    },
    onSuccess: (_, { archive }) => {
      queryClient.invalidateQueries({ queryKey: ['planner-workstreams'] });
      catalystToast.success(
        archive ? 'Workstream archived' : 'Workstream restored',
        archive 
          ? 'The workstream has been moved to the archive.' 
          : 'The workstream has been restored to active.'
      );
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
        const { error: demoteError } = await supabase
          .from('workstream_members')
          .update({ role: 'member' })
          .eq('workstream_id', workstreamId)
          .eq('role', 'lead');

        if (demoteError) throw new Error(demoteError.message);
      }

      const { error: upsertError } = await supabase
        .from('workstream_members')
        .upsert(
          {
            workstream_id: workstreamId,
            user_id: userId,
            role,
          },
          { onConflict: 'workstream_id,user_id' }
        );

      if (upsertError) throw new Error(upsertError.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-workstreams'] });
      catalystToast.success('Member added', 'The member has been added to the workstream.');
    },
    onError: (error: Error) => {
      catalystToast.error('Failed to add member', error.message);
    },
  });
}

// Assign/clear workstream lead while keeping workstream_members (profile_id) in sync.
// - leadResourceId: resource_inventory.id (FK planner_workstreams.lead_id)
// - workstream_members.user_id: profiles.id (resource_inventory.profile_id)
export function useSetWorkstreamLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workstreamId,
      leadResourceId,
    }: {
      workstreamId: string;
      leadResourceId: string | null;
    }) => {
      // Demote existing lead members
      const { error: demoteError } = await supabase
        .from('workstream_members')
        .update({ role: 'member' })
        .eq('workstream_id', workstreamId)
        .eq('role', 'lead');
      if (demoteError) throw new Error(demoteError.message);

      if (!leadResourceId) {
        const { error: clearError } = await supabase
          .from('planner_workstreams')
          .update({ lead_id: null })
          .eq('id', workstreamId);
        if (clearError) throw new Error(clearError.message);
        return;
      }

      const { data: resource, error: resourceError } = await supabase
        .from('resource_inventory')
        .select('id, profile_id')
        .eq('id', leadResourceId)
        .single();
      if (resourceError) throw new Error(resourceError.message);

      const profileId = (resource as any)?.profile_id as string | null;
      if (!isValidUUID(profileId)) {
        throw new Error('Selected lead must have a linked profile.');
      }

      // Upsert lead membership (profile id)
      const { error: upsertError } = await supabase
        .from('workstream_members')
        .upsert(
          {
            workstream_id: workstreamId,
            user_id: profileId,
            role: 'lead',
          },
          { onConflict: 'workstream_id,user_id' }
        );
      if (upsertError) throw new Error(upsertError.message);

      // Update workstream lead_id (resource id)
      const { error: leadError } = await supabase
        .from('planner_workstreams')
        .update({ lead_id: leadResourceId })
        .eq('id', workstreamId);
      if (leadError) throw new Error(leadError.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-workstreams'] });
    },
    onError: (error: Error) => {
      catalystToast.error('Failed to update lead', error.message);
    },
  });
}

export function useRemoveWorkstreamMember() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ workstreamId, userId }: { workstreamId: string; userId: string }) => {
      const { error: deleteError } = await supabase
        .from('workstream_members')
        .delete()
        .eq('workstream_id', workstreamId)
        .eq('user_id', userId);

      if (deleteError) throw new Error(deleteError.message);

      // If the removed member (profile id) is the current lead, clear planner_workstreams.lead_id (resource id)
      const { data: ws, error: wsError } = await supabase
        .from('planner_workstreams')
        .select('lead_id')
        .eq('id', workstreamId)
        .single();
      if (wsError) throw new Error(wsError.message);

      const leadResourceId = (ws as any)?.lead_id as string | null;
      if (!isValidUUID(leadResourceId)) return;

      const { data: leadResource, error: leadResourceError } = await supabase
        .from('resource_inventory')
        .select('profile_id')
        .eq('id', leadResourceId)
        .maybeSingle();
      if (leadResourceError) throw new Error(leadResourceError.message);

      const leadProfileId = (leadResource as any)?.profile_id as string | null;
      if (leadProfileId === userId) {
        const { error: clearLeadError } = await supabase
          .from('planner_workstreams')
          .update({ lead_id: null })
          .eq('id', workstreamId);
        if (clearLeadError) throw new Error(clearLeadError.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-workstreams'] });
    },
  });
}
