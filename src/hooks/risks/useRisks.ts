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

export function useRisks(programId?: string, programIncrementId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: risks = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['risks', programId, programIncrementId],
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

      if (programIncrementId) {
        query = query.eq('program_increment_id', programIncrementId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch all departments and business owners for lookup
      const [deptRes, ownerRes] = await Promise.all([
        supabase.from('departments').select('id, name'),
        supabase.from('business_owners').select('id, name')
      ]);
      
      const deptMap = new Map((deptRes.data || []).map(d => [d.id, d.name]));
      const ownerMap = new Map((ownerRes.data || []).map(o => [o.id, o.name]));

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
      const { data, error } = await supabase
        .from('risks')
        .insert([{
          ...formData,
          created_by: user.data.user?.id || ''
        }] as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risks'] });
      toast({
        title: "Success",
        description: "Risk created successfully",
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

  const updateRiskMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Risk> & { id: string }) => {
      const { data, error } = await supabase
        .from('risks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risks'] });
      toast({
        title: "Success",
        description: "Risk updated successfully",
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
