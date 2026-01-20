// ============================================================
// Hook for managing step evidence with CRUD operations
// ============================================================

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { EvidenceFile } from '../types/evidence';

export function useStepEvidence(stepResultId: string | null) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch evidence
  const query = useQuery({
    queryKey: ['step-evidence', stepResultId],
    queryFn: async () => {
      if (!stepResultId) return { evidence: [], count: 0 };

      const { data, error } = await supabase
        .rpc('get_step_evidence', { p_step_result_id: stepResultId });

      if (error) throw error;

      const resultData = data as unknown as { evidence: EvidenceFile[]; count: number } | null;

      // Add signed URLs for each evidence item
      const evidenceWithUrls = await Promise.all(
        (resultData?.evidence || []).map(async (ev: EvidenceFile) => {
          const { data: urlData } = await supabase.storage
            .from('evidence')
            .createSignedUrl(ev.storage_path, 3600); // 1 hour

          const thumbnailUrl = ev.thumbnail_path
            ? (await supabase.storage.from('evidence').createSignedUrl(ev.thumbnail_path, 3600)).data?.signedUrl
            : null;

          return {
            ...ev,
            url: urlData?.signedUrl,
            thumbnail_url: thumbnailUrl || urlData?.signedUrl,
          };
        })
      );

      return { evidence: evidenceWithUrls, count: resultData?.count ?? 0 };
    },
    enabled: !!stepResultId,
    staleTime: 30000,
  });

  // Delete evidence
  const deleteEvidence = useMutation({
    mutationFn: async (evidenceId: string) => {
      const { data, error } = await supabase
        .rpc('delete_evidence', { p_evidence_id: evidenceId });

      if (error) throw error;

      const resultData = data as { error?: string; storage_path?: string; thumbnail_path?: string } | null;
      if (resultData?.error) throw new Error(resultData.error);

      // Delete from storage
      if (resultData?.storage_path) {
        await supabase.storage.from('evidence').remove([resultData.storage_path]);
      }
      if (resultData?.thumbnail_path) {
        await supabase.storage.from('evidence').remove([resultData.thumbnail_path]);
      }

      return resultData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['step-evidence', stepResultId] });
      toast({ title: 'Evidence deleted' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to delete evidence',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Real-time subscription
  useEffect(() => {
    if (!stepResultId) return;

    const channel = supabase
      .channel(`evidence-${stepResultId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'test_step_evidence',
          filter: `step_result_id=eq.${stepResultId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['step-evidence', stepResultId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [stepResultId, queryClient]);

  return {
    evidence: query.data?.evidence ?? [],
    count: query.data?.count ?? 0,
    isLoading: query.isLoading,
    error: query.error,
    deleteEvidence,
    refetch: query.refetch,
  };
}
