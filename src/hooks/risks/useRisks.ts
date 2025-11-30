// Risks data fetching hook
// Source: Implementation Spec Section 5

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Risk, RiskFormData } from "@/types/risks";
import { useToast } from "@/hooks/use-toast";

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
      let query = supabase
        .from('risks')
        .select('*')
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
      return data as Risk[];
    },
    enabled: !!programId
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
