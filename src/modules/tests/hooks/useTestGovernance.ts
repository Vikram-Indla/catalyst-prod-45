import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types
export interface ActivityTimelineEntry {
  id: string;
  program_id: string;
  entity_type: string;
  entity_id: string;
  entity_key: string | null;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  action_category: string | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  created_at: string;
}

export interface PermissionDenial {
  id: string;
  user_id: string;
  program_id: string | null;
  attempted_action: string;
  resource_type: string;
  resource_id: string | null;
  denial_reason: string | null;
  required_permission: string | null;
  request_path: string | null;
  created_at: string;
}

// Log activity
export function useLogActivity() {
  return useMutation({
    mutationFn: async (params: {
      programId?: string;
      entityType: string;
      entityId: string;
      entityKey?: string;
      action: string;
      actionCategory?: string;
      oldValues?: Record<string, any>;
      newValues?: Record<string, any>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('test_activity_timeline')
        .insert({
          program_id: params.programId || null,
          entity_type: params.entityType,
          entity_id: params.entityId,
          entity_key: params.entityKey || null,
          actor_id: user?.id || null,
          actor_name: user?.email || null,
          action: params.action,
          action_category: params.actionCategory || null,
          old_values: params.oldValues || null,
          new_values: params.newValues || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
  });
}

// Get activity timeline for entity
export function useEntityActivityTimeline(entityType: string, entityId: string) {
  return useQuery({
    queryKey: ['activity-timeline', entityType, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_activity_timeline')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as ActivityTimelineEntry[];
    },
    enabled: !!entityType && !!entityId,
  });
}

// Get activity timeline for program
export function useProgramActivityTimeline(programId?: string, options?: {
  entityType?: string;
  actionCategory?: string;
  actorId?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['program-activity-timeline', programId, options],
    queryFn: async () => {
      let query = supabase
        .from('test_activity_timeline')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(options?.limit || 100);
      
      if (programId) query = query.eq('program_id', programId);
      if (options?.entityType) query = query.eq('entity_type', options.entityType);
      if (options?.actionCategory) query = query.eq('action_category', options.actionCategory);
      if (options?.actorId) query = query.eq('actor_id', options.actorId);
      
      const { data, error } = await query;
      if (error) throw error;
      
      return data as ActivityTimelineEntry[];
    },
  });
}

// Log permission denial
export function useLogPermissionDenial() {
  return useMutation({
    mutationFn: async (params: {
      attemptedAction: string;
      resourceType: string;
      resourceId?: string;
      denialReason?: string;
      requiredPermission?: string;
      requestPath?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { error } = await supabase
        .from('test_permission_denials')
        .insert({
          user_id: user.id,
          attempted_action: params.attemptedAction,
          resource_type: params.resourceType,
          resource_id: params.resourceId || null,
          denial_reason: params.denialReason || null,
          required_permission: params.requiredPermission || null,
          request_path: params.requestPath || window.location.pathname,
        });
      
      if (error) console.error('Failed to log permission denial:', error);
    },
  });
}

// Get permission denials
export function usePermissionDenials(options?: { userId?: string; limit?: number }) {
  return useQuery({
    queryKey: ['permission-denials', options],
    queryFn: async () => {
      let query = supabase
        .from('test_permission_denials')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(options?.limit || 50);
      
      if (options?.userId) query = query.eq('user_id', options.userId);
      
      const { data, error } = await query;
      if (error) throw error;
      
      return data as PermissionDenial[];
    },
  });
}

// Governance audit hook - wraps mutations to auto-log
export function useAuditedMutation<TData, TVariables>(
  options: {
    mutationFn: (variables: TVariables) => Promise<TData>;
    entityType: string;
    getEntityId: (variables: TVariables) => string;
    getEntityKey?: (variables: TVariables) => string;
    getAction: (variables: TVariables) => string;
    getActionCategory?: (variables: TVariables) => string;
    getOldValues?: (variables: TVariables) => Record<string, any>;
    getNewValues?: (variables: TVariables, data: TData) => Record<string, any>;
    programId?: string;
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: Error) => void;
  }
) {
  const logActivity = useLogActivity();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: options.mutationFn,
    onSuccess: async (data, variables) => {
      // Log the activity
      try {
        await logActivity.mutateAsync({
          programId: options.programId,
          entityType: options.entityType,
          entityId: options.getEntityId(variables),
          entityKey: options.getEntityKey?.(variables),
          action: options.getAction(variables),
          actionCategory: options.getActionCategory?.(variables),
          oldValues: options.getOldValues?.(variables),
          newValues: options.getNewValues?.(variables, data),
        });
      } catch (e) {
        console.error('Failed to log activity:', e);
      }
      
      options.onSuccess?.(data, variables);
    },
    onError: (error) => {
      options.onError?.(error as Error);
    },
  });
}

// RLS Error Handler
export function handleRLSError(error: any, action: string, resourceType: string) {
  const logDenial = useLogPermissionDenial();
  
  if (error?.code === '42501' || error?.message?.includes('permission denied')) {
    logDenial.mutate({
      attemptedAction: action,
      resourceType: resourceType,
      denialReason: error.message,
    });
    
    toast.error('Permission Denied', {
      description: `You don't have permission to ${action.toLowerCase()} this ${resourceType}.`,
    });
    
    return true;
  }
  
  return false;
}

// Governance Stats
export function useGovernanceStats(programId?: string) {
  return useQuery({
    queryKey: ['governance-stats', programId],
    queryFn: async () => {
      // Get activity count by category
      const { data: activityData } = await supabase
        .from('test_activity_timeline')
        .select('action_category')
        .eq('program_id', programId || '')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
      
      // Get permission denial count
      const { count: denialCount } = await supabase
        .from('test_permission_denials')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
      
      // Get AI action count
      const { count: aiActionCount } = await supabase
        .from('test_ai_audit_log')
        .select('*', { count: 'exact', head: true })
        .eq('program_id', programId || '')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
      
      const activityByCategory: Record<string, number> = {};
      (activityData || []).forEach(item => {
        const cat = item.action_category || 'other';
        activityByCategory[cat] = (activityByCategory[cat] || 0) + 1;
      });
      
      return {
        totalActivities: activityData?.length || 0,
        activityByCategory,
        permissionDenials: denialCount || 0,
        aiActions: aiActionCount || 0,
      };
    },
  });
}
