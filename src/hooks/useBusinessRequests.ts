import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BusinessRequest, CreateBusinessRequestFormData, ReadinessChecklist } from '@/types/business-request';
import { useToast } from '@/hooks/use-toast';
import { Json } from '@/integrations/supabase/types';

// Helper to generate MIM-XXX format request key
const generateRequestKey = async (): Promise<string> => {
  // Get count of existing requests to generate next number
  const { count, error } = await supabase
    .from('business_requests')
    .select('*', { count: 'exact', head: true });
  
  if (error) {
    console.error('Error getting request count:', error);
    // Fallback to random 3-digit number
    const randomNum = Math.floor(Math.random() * 900) + 100;
    return `MIM-${randomNum}`;
  }
  
  // Generate next sequential number, padded to 3 digits
  const nextNum = ((count || 0) + 1).toString().padStart(3, '0');
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
        .order('created_at', { ascending: false });

      if (searchQuery && searchQuery.trim()) {
        // Search in both title and request_key for partial matches
        query = query.or(`title.ilike.%${searchQuery}%,request_key.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(transformRow);
    },
  });
}

export function useBusinessRequest(id: string | null) {
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
      return transformRow(data);
    },
    enabled: !!id,
  });
}

export function useCreateBusinessRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateBusinessRequestFormData & { delivery_platform?: string; planned_quarter?: string }) => {
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
      toast({ title: 'Business request created successfully' });
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
      const updateData: Record<string, any> = { ...data };
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
      // Only show toast for non-rank updates or explicit saves
      if (variables.data.rank === undefined) {
        toast({ title: 'Business request updated successfully' });
      }
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
      const { error } = await supabase
        .from('business_requests')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-requests'] });
      toast({ title: 'Business request deleted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to delete business request', description: error.message, variant: 'destructive' });
    },
  });
}
