// Risks data fetching hook
// Source: Implementation Spec Section 5

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Risk, RiskFormData } from "@/types/risks";
import { useToast } from "@/hooks/use-toast";

// Extended Risk type with joined Business Request fields
export type RiskWithBR = Risk & {
  department?: string | null;
  business_owner?: string | null;
};

export function useRisks(programId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: risks = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['risks', programId],
    queryFn: async () => {
      // Fetch risks with business_requests join
      let query = supabase
        .from('risks')
        .select(`
          *,
          business_requests (
            department,
            business_owner,
            department_id,
            business_owner_id
          )
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (programId) {
        query = query.eq('program_id', programId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch all departments and business owners for lookup
      const [deptRes, ownerRes] = await Promise.all([
        supabase.from('departments').select('id, name'),
        (supabase as any).from('business_owners').select('id, name')
      ]);
      
      const deptMap = new Map((deptRes.data || []).map((d: any) => [d.id, d.name]));
      const ownerMap = new Map((ownerRes.data as any[] || []).map((o: any) => [o.id, o.name]));

      // Flatten the joined data - resolve UUIDs to names
      return (data || []).map((risk: any) => {
        const br = risk.business_requests;
        let deptName: string | null = null;
        let ownerName: string | null = null;

        if (br) {
          // Try department_id first, then legacy department field (which may contain UUID)
          if (br.department_id) {
            deptName = deptMap.get(br.department_id) || null;
          } else if (br.department) {
            // Legacy field might contain UUID or text - try lookup
            deptName = deptMap.get(br.department) || null;
          }

          // Try business_owner_id first, then legacy business_owner field
          if (br.business_owner_id) {
            ownerName = ownerMap.get(br.business_owner_id) || null;
          } else if (br.business_owner) {
            // Legacy field might contain name or UUID - try lookup first
            ownerName = ownerMap.get(br.business_owner) || br.business_owner;
          }
        }

        return {
          ...risk,
          department: deptName,
          business_owner: ownerName,
          business_requests: undefined,
        };
      }) as RiskWithBR[];
    }
  });

  const createRiskMutation = useMutation({
    mutationFn: async (formData: Partial<RiskFormData>) => {
      const user = await supabase.auth.getUser();
      
      // Build clean payload - explicitly remove any PI-related fields
      const { program_increment_id, ...cleanFormData } = formData as any;
      const payload = {
        ...cleanFormData,
        created_by: user.data.user?.id || ''
      };
      
      // INSTRUMENTATION: Log payload keys before insert
      console.log('[RISK CREATE] Payload keys:', Object.keys(payload));
      console.log('[RISK CREATE] Full payload:', JSON.stringify(payload, null, 2));
      
      // Insert with minimal select to guarantee success
      const { data: insertResult, error: insertError } = await supabase
        .from('risks')
        .insert([payload] as any)
        .select('id')
        .single();

      console.log('[RISK CREATE] Select string used: .select("id")');
      
      if (insertError) {
        console.error('[RISK CREATE] Insert error:', insertError);
        throw insertError;
      }
      
      console.log('[RISK CREATE] Insert succeeded, id:', insertResult?.id);
      
      // Refetch the full risk in a separate query
      if (insertResult?.id) {
        const { data: refetchedRisk, error: refetchError } = await supabase
          .from('risks')
          .select('*')
          .eq('id', insertResult.id)
          .single();
        
        console.log('[RISK CREATE] Refetch result:', refetchedRisk?.id);
        if (refetchError) console.warn('[RISK CREATE] Refetch warning:', refetchError);
        return refetchedRisk || insertResult;
      }
      
      return insertResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risks'] });
      toast({
        title: "Success",
        description: "Risk created successfully",
      });
    },
    onError: (error: Error) => {
      console.error('[RISK CREATE] Mutation error:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const updateRiskMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Risk> & { id: string }) => {
      // Build clean payload - explicitly remove any PI-related fields
      const { program_increment_id, ...cleanUpdates } = updates as any;
      
      // INSTRUMENTATION: Log payload keys before update
      console.log('[RISK UPDATE] Payload keys:', Object.keys(cleanUpdates));
      console.log('[RISK UPDATE] Full payload:', JSON.stringify(cleanUpdates, null, 2));
      console.log('[RISK UPDATE] Risk ID:', id);
      
      // Update with minimal select to guarantee success
      const { data: updateResult, error: updateError } = await supabase
        .from('risks')
        .update(cleanUpdates)
        .eq('id', id)
        .select('id')
        .single();

      console.log('[RISK UPDATE] Select string used: .select("id")');
      
      if (updateError) {
        console.error('[RISK UPDATE] Update error:', updateError);
        throw updateError;
      }
      
      console.log('[RISK UPDATE] Update succeeded, id:', updateResult?.id);
      
      // Refetch the full risk in a separate query
      const { data: refetchedRisk, error: refetchError } = await supabase
        .from('risks')
        .select('*')
        .eq('id', id)
        .single();
      
      console.log('[RISK UPDATE] Refetch result:', refetchedRisk?.id);
      if (refetchError) console.warn('[RISK UPDATE] Refetch warning:', refetchError);
      
      return refetchedRisk || updateResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risks'] });
      toast({
        title: "Success",
        description: "Risk updated successfully",
      });
    },
    onError: (error: Error) => {
      console.error('[RISK UPDATE] Mutation error:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const deleteRiskMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('risks')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risks'] });
      toast({
        title: "Success",
        description: "Risk deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  return {
    risks,
    isLoading,
    error,
    createRisk: createRiskMutation.mutate,
    updateRisk: updateRiskMutation.mutate,
    deleteRisk: deleteRiskMutation.mutate,
    isCreating: createRiskMutation.isPending,
    isUpdating: updateRiskMutation.isPending,
    isDeleting: deleteRiskMutation.isPending,
  };
}
