import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { BusinessRequest, CreateBusinessRequestFormData } from '@/types/business-request';
import { useToast } from '@/hooks/use-toast';
import { Json } from '@/integrations/supabase/types';

// Helper to generate MIM-XXX format request key
const generateRequestKey = async (): Promise<string> => {
  // Get all existing request keys to find the max number
  const { data, error } = await typedQuery('business_requests')
    .select('request_key')
    .not('request_key', 'is', null)
    .limit(1000);

  if (error) {
    console.error('Error getting request keys:', error);
    // Fallback to timestamp-based key to avoid collisions
    const timestamp = Date.now().toString().slice(-6);
    return `MIM-${timestamp}`;
  }
  
  // Find the highest number from existing keys (handles gaps from deleted records)
  let maxNum = 0;
  ((data || []) as any[]).forEach((row: any) => {
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
const transformRow = (row: any): BusinessRequest => ({ ...row });

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
      // Performance optimization: limit to 200 rows for fast initial load
      // 2026-06-01: select * + JOIN profiles for Delivery Manager
      // (project_manager_user_id) and Product Owner (po_user_id) so the
      // product backlog adapter can surface their display names without a
      // second round-trip.
      let query = typedQuery('business_requests')
        .select(
          '*,' +
          'delivery_manager:project_manager_user_id(id, full_name, avatar_url),' +
          'product_owner:po_user_id(id, full_name, avatar_url)'
        )
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(200);

      if (searchQuery && searchQuery.trim()) {
        query = query.or(`title.ilike.%${searchQuery}%,request_key.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      const dataTyped = (data || []) as any[];
      if (dataTyped.length === 0) return [];
      
      // Collect unique user IDs from requestor and assignee fields
      const userIds = new Set<string>();
      dataTyped.forEach((row: any) => {
        if (row.requestor && row.requestor.length === 36 && row.requestor.includes('-')) {
          userIds.add(row.requestor);
        }
        if (row.assignee && row.assignee.length === 36 && row.assignee.includes('-')) {
          userIds.add(row.assignee);
        }
      });
      
      // Batch fetch profile names (single query)
      const profileMap: Record<string, string> = {};
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
      return dataTyped.map((row: any) => {
        const transformed = transformRow(row);
        if (row.requestor && profileMap[row.requestor]) {
          transformed.requestor_name = profileMap[row.requestor];
        }
        if (row.assignee && profileMap[row.assignee]) {
          transformed.assignee_name = profileMap[row.assignee];
        }
        return transformed;
      });
    },
    staleTime: 30000,
    placeholderData: (prev: any) => prev, // Keep previous data visible during refetch
  });
}

export function useBusinessRequest(id: string | null) {
  const queryClient = useQueryClient();
  
  // Set up real-time subscription for this specific request
  useEffect(() => {
    if (!id) return;
    
    const channel = supabase
      .channel(`business-request-${id}-${Math.random().toString(36).slice(2, 10)}`)
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
      const { data, error } = await typedQuery('business_requests')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      
      const dataTyped = data as any;
      const transformed = transformRow(dataTyped);
      
      // Resolve requestor UUID to name if it looks like a UUID
      if (dataTyped.requestor && dataTyped.requestor.length === 36 && dataTyped.requestor.includes('-')) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', dataTyped.requestor)
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
    mutationFn: async (data: CreateBusinessRequestFormData & { planned_quarter?: string[] | null }) => {
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
      
      // Insert only columns that exist in the slimmed 22-column schema.
      // Dropped columns (platform, complexity, track, requestor,
      // business_justification, delivery_platform, department, department_id,
      // business_owner, business_owner_id, start_date, impl_start_date,
      // impl_target_end_date, assignee, end_date_locked, end_date_locked_by,
      // end_date_locked_at, scope_url, import_source, import_ref) were removed
      // in the 2026-06-01 schema slim-down.
      const { data: result, error } = await typedQuery('business_requests')
        .insert([{
          title: data.title,
          description: data.description || null,
          urgency: data.urgency || null,
          request_key: requestKey,
          planned_quarter: data.planned_quarter || null,
          end_date: (data as any).end_date || null,
          request_type: (data as any).request_type || null,
          category: (data as any).category || null,
          theme: (data as any).theme || null,
          stakeholders: (data as any).stakeholders || [],
          po_user_id: (data as any).po_user_id || null,
          project_manager_user_id: (data as any).project_manager_user_id || null,
          targeted_feature: (data as any).targeted_feature ?? false,
          product_id: (data as any).product_id || null,
        }])
        .select()
        .single();
      if (error) throw error;

      // Create audit log for creation
      await typedQuery('business_request_audit_logs').insert({
        business_request_id: (result as any).id,
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

let _cachedActorInfo: { userId: string | null; actorName: string } | null = null;

async function getActorInfo() {
  if (_cachedActorInfo) return _cachedActorInfo;
  const { data: { user } } = await supabase.auth.getUser();
  let actorName = 'System';
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();
    actorName = profile?.full_name || profile?.email || 'Unknown User';
  }
  _cachedActorInfo = { userId: user?.id ?? null, actorName };
  return _cachedActorInfo;
}

async function logBrAudit(
  id: string,
  data: Partial<BusinessRequest>,
  beforeData?: Record<string, any> | null,
) {
  // `beforeData` is the row state captured BEFORE the UPDATE statement
  // ran. Without it, a fresh SELECT here returns the row with the new
  // values already applied (the UPDATE commits synchronously), making
  // oldStr === newStr for every field and producing zero audit rows.
  let currentData: Record<string, any> | null = beforeData ?? null;
  if (!currentData) {
    const { data: fetched } = await typedQuery('business_requests')
      .select('*')
      .eq('id', id)
      .single();
    currentData = (fetched as Record<string, any>) ?? null;
  }
  if (!currentData) return;

  const { userId, actorName } = await getActorInfo();
  const auditLogs: any[] = [];

  for (const [key, newValue] of Object.entries(data)) {
    const oldValue = (currentData as any)[key];
    const oldStr = oldValue === null || oldValue === undefined ? null : String(oldValue);
    const newStr = newValue === null || newValue === undefined ? null : String(newValue);
    if (oldStr !== newStr) {
      auditLogs.push({
        business_request_id: id,
        actor_id: userId,
        actor_name: actorName,
        action: 'UPDATE',
        field_changed: key,
        old_value: oldStr,
        new_value: newStr,
      });
    }
  }

  if (auditLogs.length > 0) {
    await typedQuery('business_request_audit_logs').insert(auditLogs);
  }
}

export function useUpdateBusinessRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['business-request', id] });
      const prev = queryClient.getQueryData<BusinessRequest>(['business-request', id]);
      if (prev) {
        queryClient.setQueryData(['business-request', id], { ...prev, ...data });
      }
      return { prev };
    },
    mutationFn: async ({ id, data }: { id: string; data: Partial<BusinessRequest> }) => {
      const updateData: Record<string, any> = { ...data };

      delete updateData.id;
      delete updateData.request_key;
      delete updateData.created_at;
      delete updateData.updated_at;
      delete updateData.deleted_at;
      delete updateData._batch;
      delete updateData.requestor_name;
      delete updateData.assignee_name;
      delete updateData.department_name;
      delete updateData.business_owner_name;
      delete updateData.product_name;

      if (data.readiness_checklist) {
        updateData.readiness_checklist = data.readiness_checklist as unknown as Json;
      }

      if (data.rank !== undefined) {
        const newRank = data.rank;

        if (newRank !== null) {
          const { data: currentItem } = await typedQuery('business_requests')
            .select('rank')
            .eq('id', id)
            .single();

          const currentItemTyped = currentItem as any;

          const { data: allItems } = await typedQuery('business_requests')
            .select('id, rank')
            .not('id', 'eq', id)
            .not('rank', 'is', null)
            .order('rank', { ascending: true })
            .limit(1000);

          const allItemsTyped = (allItems || []) as any[];

          if (allItemsTyped.length > 0) {
            const itemsToUpdate: { id: string; rank: number }[] = [];

            for (const item of allItemsTyped) {
              if (item.rank !== null && item.rank >= newRank) {
                itemsToUpdate.push({ id: item.id, rank: item.rank + 1 });
              }
            }

            for (const item of itemsToUpdate) {
              await typedQuery('business_requests')
                .update({ rank: item.rank })
                .eq('id', item.id);
            }
          }
        }
      }

      // Snapshot the row BEFORE the update so the audit logger can diff
      // old → new. Fetching after the UPDATE would see the new values
      // already in place and produce no audit rows.
      const { data: beforeRow } = await typedQuery('business_requests')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      const { data: result, error } = await typedQuery('business_requests')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      // Fire-and-forget audit logging — does not block the UI
      logBrAudit(id, data, beforeRow as Record<string, any> | null).catch(() => {});

      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['business-request', variables.id] });
      if (variables.data.rank !== undefined) {
        queryClient.invalidateQueries({ queryKey: ['business-requests'] });
        queryClient.invalidateQueries({ queryKey: ['all-business-requests-for-rank'] });
      }
    },
    onError: (error, variables, context) => {
      if (context?.prev) {
        queryClient.setQueryData(['business-request', variables.id], context.prev);
      }
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
      const { data: request } = await typedQuery('business_requests')
        .select('request_key')
        .eq('id', id)
        .single();
      
      // Soft delete by setting deleted_at timestamp
      const { error } = await typedQuery('business_requests')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      
      return (request as any)?.request_key || 'Request';
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
      const { data: original, error: fetchError } = await typedQuery('business_requests')
        .select('title, request_key')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;
      
      const originalTyped = original as any;
      if (!originalTyped) throw new Error('Request not found');

      // Generate request key in MIM-XXX format
      const requestKey = await generateRequestKey();

      // Create new request with only title copied, status reset to New Demand (new_request), and scoring reset to unscored
      const { data: newRequest, error: insertError } = await typedQuery('business_requests')
        .insert({
          title: `${originalTyped.title} (Copy)`,
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
      
      const newRequestTyped = newRequest as any;
      
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

      await typedQuery('business_request_audit_logs').insert({
        business_request_id: newRequestTyped.id,
        actor_id: user?.id || null,
        actor_name: actorName,
        action: 'CREATE',
        field_changed: null,
        old_value: null,
        new_value: `Duplicated from ${originalTyped.request_key}`
      });

      return newRequestTyped;
    },
    onSuccess: (newRequest: any) => {
      queryClient.invalidateQueries({ queryKey: ['business-requests'] });
      toast({ title: `Request duplicated as ${newRequest.request_key}` });
    },
    onError: (error) => {
      toast({ title: 'Failed to duplicate request', description: error.message, variant: 'destructive' });
    },
  });
}

export function useBusinessRequestsByProduct(productId: string | null | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!productId) return;
    const channel = supabase
      .channel(`business-requests-product-${productId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'business_requests' }, () => {
        queryClient.invalidateQueries({ queryKey: ['business-requests-by-product', productId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [productId, queryClient]);

  return useQuery({
    queryKey: ['business-requests-by-product', productId],
    queryFn: async () => {
      if (!productId) return [];
      const { data, error } = await typedQuery('business_requests')
        .select('*')
        .eq('product_id', productId)
        .is('deleted_at', null)
        .order('rank', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return ((data || []) as any[]).map(transformRow);
    },
    enabled: !!productId,
    staleTime: 30000,
    placeholderData: (prev: any) => prev,
  });
}
