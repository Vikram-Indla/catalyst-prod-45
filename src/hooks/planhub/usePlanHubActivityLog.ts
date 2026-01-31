/**
 * PlanHub Activity Log Hook
 * Reads from planhub_activity_log table with user profiles
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database, Json } from '@/integrations/supabase/types';

type PlanhubAuditAction = Database["public"]["Enums"]["planhub_audit_action"];

export interface PlanHubActivityLogEntry {
  id: string;
  plan_id: string | null;
  user_id: string;
  action: PlanhubAuditAction;
  details: Json | null;
  created_at: string;
  // Joined data
  user_name?: string;
  user_email?: string;
  plan_name?: string;
}

export interface ActivityLogFilters {
  action?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export function usePlanHubActivityLog(filters: ActivityLogFilters = {}, limit = 50) {
  return useQuery({
    queryKey: ['planhub', 'activity-log', filters, limit],
    queryFn: async () => {
      let query = supabase
        .from('planhub_activity_log')
        .select(`
          id,
          plan_id,
          user_id,
          action,
          details,
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      // Apply filters
      if (filters.action && filters.action !== 'all') {
        query = query.eq('action', filters.action as PlanhubAuditAction);
      }
      
      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }
      
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch user profiles for the user_ids
      const userIds = [...new Set((data || []).map(d => d.user_id).filter(Boolean))];
      
      let profilesMap: Record<string, { full_name: string; email: string }> = {};
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds as string[]);
        
        profilesMap = (profiles || []).reduce((acc, p) => {
          acc[p.id] = { full_name: p.full_name || 'Unknown', email: p.email || '' };
          return acc;
        }, {} as Record<string, { full_name: string; email: string }>);
      }

      // Fetch plan names for the plan_ids
      const planIds = [...new Set((data || []).map(d => d.plan_id).filter(Boolean))];
      
      let plansMap: Record<string, string> = {};
      
      if (planIds.length > 0) {
        const { data: plans } = await supabase
          .from('planhub_plans')
          .select('id, name')
          .in('id', planIds as string[]);
        
        plansMap = (plans || []).reduce((acc, p) => {
          acc[p.id] = p.name;
          return acc;
        }, {} as Record<string, string>);
      }

      // Enrich entries with user and plan data
      const enriched: PlanHubActivityLogEntry[] = (data || []).map(entry => ({
        ...entry,
        user_name: entry.user_id ? profilesMap[entry.user_id]?.full_name : undefined,
        user_email: entry.user_id ? profilesMap[entry.user_id]?.email : undefined,
        plan_name: entry.plan_id ? plansMap[entry.plan_id] : undefined,
      }));

      // Apply search filter client-side
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return enriched.filter(entry => 
          entry.user_name?.toLowerCase().includes(searchLower) ||
          entry.plan_name?.toLowerCase().includes(searchLower) ||
          JSON.stringify(entry.details).toLowerCase().includes(searchLower)
        );
      }

      return enriched;
    },
    staleTime: 10000,
  });
}

export async function logPlanHubActivity(
  planId: string | null,
  action: PlanhubAuditAction,
  details: Record<string, unknown>
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  
  await supabase.from('planhub_activity_log').insert({
    plan_id: planId,
    user_id: user.id,
    action,
    details: details as Json,
  });
}
