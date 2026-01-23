import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BusinessRequest, CreateBusinessRequestFormData, ReadinessChecklist } from '@/types/business-request';
import { useToast } from '@/hooks/use-toast';
import { Json } from '@/integrations/supabase/types';

// Helper to generate MIM-XXX format request key
const generateRequestKey = async (): Promise<string> => {
  // Get all existing request keys to find the max number
  const { data, error } = await supabase
    .from('business_requests')
    .select('request_key')
    .not('request_key', 'is', null);
  
  if (error) {
    console.error('Error getting request keys:', error);
    // Fallback to timestamp-based key to avoid collisions
    const timestamp = Date.now().toString().slice(-6);
    return `MIM-${timestamp}`;
  }
  
  // Find the highest number from existing keys (handles gaps from deleted records)
  let maxNum = 0;
  (data || []).forEach(row => {
    if (row.request_key) {
      const match = row.request_key.match(/MIM-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
  });
  
  // Generate next sequential number, padded to 3 digits
  const nextNum = (maxNum + 1).toString().padStart(3, '0');
  return `MIM-${nextNum}`;
};

// Helper to transform DB row to BusinessRequest
const transformRow = (row: any): BusinessRequest => ({
  ...row,
  readiness_checklist: (row.readiness_checklist as ReadinessChecklist) || {
    requirements_documented: false,
    technical_design_approved: false,
    resources_allocated: false,
    environment_ready: false,
    test_cases_prepared: false,
  },
});

export function useBusinessRequests(searchQuery?: string) {
  const queryClient = useQueryClient();
  
  // Set up real-time subscription for automatic updates
  useEffect(() => {
    const channel = supabase
      .channel('business-requests-realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'business_requests'
        },
        () => {
          // Refetch data when any change occurs
          queryClient.invalidateQueries({ queryKey: ['business-requests'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
  
  return useQuery({
    queryKey: ['business-requests', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('business_requests')
        .select('*')
        .is('deleted_at', null) // Filter out soft-deleted items
        .order('created_at', { ascending: false });

      if (searchQuery && searchQuery.trim()) {
        // Search in both title and request_key for partial matches
        query = query.or(`title.ilike.%${searchQuery}%,request_key.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Collect unique user IDs from requestor and assignee fields
      const userIds = new Set<string>();
      (data || []).forEach(row => {
        // Only add if it looks like a UUID (contains dashes and is 36 chars)
        if (row.requestor && row.requestor.length === 36 && row.requestor.includes('-')) {
          userIds.add(row.requestor);
        }
        if (row.assignee && row.assignee.length === 36 && row.assignee.includes('-')) {
          userIds.add(row.assignee);
        }
      });
      
      // Fetch profile names for all user IDs
      let profileMap: Record<string, string> = {};
      if (userIds.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', Array.from(userIds));
        
        if (profiles) {
          profiles.forEach(p => {
            profileMap[p.id] = p.full_name || p.email || '—';
          });
        }
      }
      
      // Transform rows and resolve user IDs to names
      return (data || []).map(row => {
        const transformed = transformRow(row);
        // Resolve requestor/assignee UUIDs to names
        if (row.requestor && profileMap[row.requestor]) {
          transformed.requestor_name = profileMap[row.requestor];
        }
        if (row.assignee && profileMap[row.assignee]) {
          transformed.assignee_name = profileMap[row.assignee];
        }
        return transformed;
      });
    },
  });
}

export function useBusinessRequest(id: string | null) {
  const queryClient = useQueryClient();
  
  // Set up real-time subscription for this specific request
  useEffect(() => {
    if (!id) return;
    
    const channel = supabase
      .channel(`business-request-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'business_requests',
          filter: `id=eq.${id}`
        },
        () => {
          // Refetch this specific request when it's updated
          queryClient.invalidateQueries({ queryKey: ['business-request', id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, queryClient]);
  
  return useQuery({
    queryKey: ['business-request', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('business_requests')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      
      const transformed = transformRow(data);
      
      // Resolve requestor UUID to name if it looks like a UUID
      if (data.requestor && data.requestor.length === 36 && data.requestor.includes('-')) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', data.requestor)
          .single();
        
        if (profile) {
          transformed.requestor_name = profile.full_name || profile.email || '—';
        }
      }
      
      return transformed;
    },
    enabled: !!id,
  });
}

export function useCreateBusinessRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateBusinessRequestFormData & { delivery_platform?: string; planned_quarter?: string[] | null; assignee?: string | null; end_date_locked?: boolean; end_date_locked_by?: string | null; end_date_locked_at?: string | null }) => {
      // Get current user for audit logging
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get profile for actor name
      let actorName = 'System';
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', user.id)
          .single();
        actorName = profile?.full_name || profile?.email || 'Unknown User';
      }

      // Generate request key in MIM-XXX format
      const requestKey = await generateRequestKey();
      
      const { data: result, error } = await supabase
        .from('business_requests')
        .insert([{
          title: data.title,
          description: data.description || null,
          platform: data.platform,
          complexity: data.complexity,
          urgency: data.urgency,
          track: data.track || null,
          requestor: data.requestor || null,
          business_justification: data.business_justification || null,
          request_key: requestKey,
          delivery_platform: data.delivery_platform || null,
          planned_quarter: data.planned_quarter || null,
          department: (data as any).department || null,
          department_id: (data as any).department_id || null,
          business_owner: (data as any).business_owner || null,
          business_owner_id: (data as any).business_owner_id || null,
          // Date fields
          start_date: (data as any).start_date || null,
          end_date: (data as any).end_date || null,
          impl_start_date: (data as any).impl_start_date || null,
          // Many views use impl_target_end_date as "Target Complete"; keep it in sync on create
          impl_target_end_date: (data as any).impl_target_end_date || (data as any).end_date || null,
          // Assignee
          assignee: (data as any).assignee || null,
          // Lock fields
          end_date_locked: (data as any).end_date_locked || false,
          end_date_locked_by: (data as any).end_date_locked_by || null,
          end_date_locked_at: (data as any).end_date_locked_at || null,
        }])
        .select()
        .single();
      if (error) throw error;

      // Create audit log for creation
      await supabase.from('business_request_audit_logs').insert({
        business_request_id: result.id,
        actor_id: user?.id || null,
        actor_name: actorName,
        action: 'CREATE',
        field_changed: null,
        old_value: null,
        new_value: data.title
      });

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-requests'] });
      // Toast is shown in the modal with more context (request key, summary)
    },
    onError: (error) => {
      toast({ title: 'Failed to create business request', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateBusinessRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<BusinessRequest> }) => {
      // Get current user for audit logging
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get profile for actor name
      let actorName = 'System';
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', user.id)
          .single();
        actorName = profile?.full_name || profile?.email || 'Unknown User';
      }

      // Get the current data before update for audit logging
      const { data: currentData } = await supabase
        .from('business_requests')
        .select('*')
        .eq('id', id)
        .single();
      
      // Convert ReadinessChecklist to Json-compatible format
      // IMPORTANT: Remove system-managed fields AND computed fields from update payload
      const updateData: Record<string, any> = { ...data };

      // Remove system-managed fields
      delete updateData.id;
      delete updateData.request_key;
      delete updateData.created_at;
      delete updateData.updated_at;
      delete updateData.deleted_at;

      // Remove internal UI-only fields
      delete updateData._batch;

      // Remove computed/joined fields that don't exist in the database
      delete updateData.requestor_name;
      delete updateData.assignee_name;
      delete updateData.department_name;
      delete updateData.business_owner_name;
      delete updateData.product_name;
      
      if (data.readiness_checklist) {
        updateData.readiness_checklist = data.readiness_checklist as unknown as Json;
      }
      
      // Handle forced rank update - need to shift other items
      if (data.rank !== undefined) {
        const newRank = data.rank;
        
        if (newRank !== null) {
          // Get current item's old rank
          const { data: currentItem } = await supabase
            .from('business_requests')
            .select('rank')
            .eq('id', id)
            .single();
          
          const oldRank = currentItem?.rank;
          
          // Get all items that need to be shifted
          const { data: allItems } = await supabase
            .from('business_requests')
            .select('id, rank')
            .not('id', 'eq', id)
            .not('rank', 'is', null)
            .order('rank', { ascending: true });
          
          if (allItems && allItems.length > 0) {
            // Shift items to make room for the forced rank
            const itemsToUpdate: { id: string; rank: number }[] = [];
            
            for (const item of allItems) {
              if (item.rank !== null && item.rank >= newRank) {
                // Shift item down by 1
                itemsToUpdate.push({ id: item.id, rank: item.rank + 1 });
              }
            }
            
            // Update shifted items
            for (const item of itemsToUpdate) {
              await supabase
                .from('business_requests')
                .update({ rank: item.rank })
                .eq('id', item.id);
            }
          }
        }
      }
      
      const { data: result, error } = await supabase
        .from('business_requests')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      // Create audit log entries for changed fields
      if (currentData) {
        const auditLogs: any[] = [];
        
        for (const [key, newValue] of Object.entries(data)) {
          const oldValue = (currentData as any)[key];
          const oldStr = oldValue === null || oldValue === undefined ? null : String(oldValue);
          const newStr = newValue === null || newValue === undefined ? null : String(newValue);
          
          // Only log if value actually changed
          if (oldStr !== newStr) {
            auditLogs.push({
              business_request_id: id,
              actor_id: user?.id || null,
              actor_name: actorName,
              action: 'UPDATE',
              field_changed: key,
              old_value: oldStr,
              new_value: newStr
            });
          }
        }
        
        // Insert all audit logs
        if (auditLogs.length > 0) {
          await supabase.from('business_request_audit_logs').insert(auditLogs);
        }
      }

      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['business-requests'] });
      queryClient.invalidateQueries({ queryKey: ['business-request'] });
      queryClient.invalidateQueries({ queryKey: ['business-request-audit'] });
      queryClient.invalidateQueries({ queryKey: ['all-business-requests-for-rank'] });
      // Removed auto-toast - let components handle their own notifications
    },
    onError: (error) => {
      toast({ title: 'Failed to update business request', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteBusinessRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      // Get the request_key before soft deleting for the success message
      const { data: request } = await supabase
        .from('business_requests')
        .select('request_key')
        .eq('id', id)
        .single();
      
      // Soft delete by setting deleted_at timestamp
      const { error } = await supabase
        .from('business_requests')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      
      return request?.request_key || 'Request';
    },
    onSuccess: (requestKey) => {
      queryClient.invalidateQueries({ queryKey: ['business-requests'] });
      toast({ title: `${requestKey} deleted successfully` });
    },
    onError: (error) => {
      toast({ title: 'Failed to delete business request', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDuplicateBusinessRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      // Get current user for reporter field
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get the original request (only need the title)
      const { data: original, error: fetchError } = await supabase
        .from('business_requests')
        .select('title, request_key')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;
      if (!original) throw new Error('Request not found');

      // Generate request key in MIM-XXX format
      const requestKey = await generateRequestKey();

      // Create new request with only title copied, status reset to New Demand (new_request), and scoring reset to unscored
      const { data: newRequest, error: insertError } = await supabase
        .from('business_requests')
        .insert({
          title: `${original.title} (Copy)`,
          request_key: requestKey,
          process_step: 'new_request',
          requestor: user?.id || null, // Set reporter to current user

          // Reset scoring to "unscored"
          business_score: null,
          business_value: null,
          score_strategic_alignment: null,
          score_time_urgency: null,
          score_resource_feasibility: null,

          // Reset rank/priority
          rank: null,
          priority_tier: null,
          is_force_ranked: false,
          rank_override_justification: null,
        })
        .select()
        .single();
      
      if (insertError) throw insertError;
      
      // Create audit log for the duplicate (reuse user from above)
      let actorName = 'System';
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', user.id)
          .single();
        actorName = profile?.full_name || profile?.email || 'Unknown User';
      }

      await supabase.from('business_request_audit_logs').insert({
        business_request_id: newRequest.id,
        actor_id: user?.id || null,
        actor_name: actorName,
        action: 'CREATE',
        field_changed: null,
        old_value: null,
        new_value: `Duplicated from ${original.request_key}`
      });

      return newRequest;
    },
    onSuccess: (newRequest) => {
      queryClient.invalidateQueries({ queryKey: ['business-requests'] });
      toast({ title: `Request duplicated as ${newRequest.request_key}` });
    },
    onError: (error) => {
      toast({ title: 'Failed to duplicate request', description: error.message, variant: 'destructive' });
    },
  });
}
