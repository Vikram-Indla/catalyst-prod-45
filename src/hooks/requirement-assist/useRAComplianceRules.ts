import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { 
  RAComplianceRule, 
  UpdateRAComplianceRule,
  ComplianceFramework 
} from '@/types/requirement-assist';

// Fetch all compliance rules
export function useRAComplianceRules(framework?: ComplianceFramework) {
  return useQuery({
    queryKey: ['ra-compliance-rules', framework],
    queryFn: async () => {
      let query = supabase
        .from('ra_compliance_rules')
        .select('*')
        .order('framework', { ascending: true })
        .order('sort_order', { ascending: true });

      if (framework) {
        query = query.eq('framework', framework);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as RAComplianceRule[];
    },
  });
}

// Fetch active rules only
export function useRAActiveComplianceRules(framework?: ComplianceFramework) {
  return useQuery({
    queryKey: ['ra-compliance-rules-active', framework],
    queryFn: async () => {
      let query = supabase
        .from('ra_compliance_rules')
        .select('*')
        .eq('is_active', true)
        .order('framework', { ascending: true })
        .order('sort_order', { ascending: true });

      if (framework) {
        query = query.eq('framework', framework);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as RAComplianceRule[];
    },
  });
}

// Group rules by framework
export function useRAComplianceRulesGrouped() {
  return useQuery({
    queryKey: ['ra-compliance-rules-grouped'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ra_compliance_rules')
        .select('*')
        .order('framework', { ascending: true })
        .order('sort_order', { ascending: true });

      if (error) throw error;

      const grouped: Record<ComplianceFramework, RAComplianceRule[]> = {
        dga: [],
        nca: [],
        babok: [],
      };

      for (const rule of data as RAComplianceRule[]) {
        grouped[rule.framework].push(rule);
      }

      return grouped;
    },
  });
}

// Update rule
export function useUpdateRAComplianceRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateRAComplianceRule & { id: string }) => {
      const { data, error } = await supabase
        .from('ra_compliance_rules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as RAComplianceRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ra-compliance-rules'] });
      queryClient.invalidateQueries({ queryKey: ['ra-compliance-rules-active'] });
      queryClient.invalidateQueries({ queryKey: ['ra-compliance-rules-grouped'] });
      toast.success('Rule updated');
    },
    onError: (error) => {
      console.error('Error updating rule:', error);
      toast.error('Failed to update rule');
    },
  });
}

// Toggle rule active status
export function useToggleRAComplianceRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from('ra_compliance_rules')
        .update({ is_active })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as RAComplianceRule;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ra-compliance-rules'] });
      queryClient.invalidateQueries({ queryKey: ['ra-compliance-rules-active'] });
      queryClient.invalidateQueries({ queryKey: ['ra-compliance-rules-grouped'] });
      toast.success(`Rule ${data.is_active ? 'enabled' : 'disabled'}`);
    },
    onError: (error) => {
      console.error('Error toggling rule:', error);
      toast.error('Failed to toggle rule');
    },
  });
}
