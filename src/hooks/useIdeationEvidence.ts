/**
 * Ideation · Evidence — CAT-IDEATION-REBUILD-20260709-001 Phase 3 S6.
 *
 * "Decisions cite sources" (P0). Snippet + link kinds only this slice —
 * document/voice_transcript/image need separate infra (docintel upload,
 * voice-flow pipeline, attachments) not built yet. RLS clean, no
 * self-referential lock bug (idn_evidence_insert only checks added_by +
 * the idea's current lock state, unlike idn_ideas_update).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { typedQuery } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type EvidenceKind = 'snippet' | 'link';

export interface IdeaEvidenceRow {
  id: string;
  idea_id: string;
  kind: string;
  body: string | null;
  url: string | null;
  source_attribution: string | null;
  added_by: string;
  added_by_name: string | null;
  created_at: string;
}

export const ideaEvidenceKey = (ideaId: string) => ['ideation', 'idea-evidence', ideaId] as const;

export function useIdeationEvidence(ideaId: string | undefined) {
  return useQuery({
    queryKey: ideaEvidenceKey(ideaId ?? ''),
    queryFn: async (): Promise<IdeaEvidenceRow[]> => {
      const { data, error } = await typedQuery('idn_evidence')
        .select('id, idea_id, kind, body, url, source_attribution, added_by, created_at')
        .eq('idea_id', ideaId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as Array<Omit<IdeaEvidenceRow, 'added_by_name'>>;
      if (rows.length === 0) return [];

      const userIds = [...new Set(rows.map((r) => r.added_by))];
      const { data: profiles } = await typedQuery('profiles').select('id, full_name').in('id', userIds);
      const nameById = new Map((profiles ?? []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name]));

      return rows.map((r) => ({ ...r, added_by_name: nameById.get(r.added_by) ?? null }));
    },
    enabled: !!ideaId,
    staleTime: 10_000,
  });
}

export function useAddIdeationEvidence(ideaId: string | undefined) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { kind: EvidenceKind; body?: string; url?: string; sourceAttribution?: string }) => {
      if (!ideaId) throw new Error('No idea to attach evidence to');
      if (!user?.id) throw new Error('Not signed in');
      if (input.kind === 'snippet' && !input.body?.trim()) throw new Error('Enter the snippet text.');
      if (input.kind === 'link' && !input.url?.trim()) throw new Error('Enter a URL.');

      const { error } = await typedQuery('idn_evidence').insert({
        idea_id: ideaId,
        kind: input.kind,
        body: input.kind === 'snippet' ? input.body?.trim() : null,
        url: input.kind === 'link' ? input.url?.trim() : null,
        source_attribution: input.sourceAttribution?.trim() || null,
        added_by: user.id,
      });
      if (error) throw new Error(error.message ?? 'Could not add evidence.');
    },
    onSuccess: () => {
      if (ideaId) queryClient.invalidateQueries({ queryKey: ideaEvidenceKey(ideaId) });
    },
  });
}

export function useDeleteIdeationEvidence(ideaId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (evidenceId: string) => {
      const { error } = await typedQuery('idn_evidence').delete().eq('id', evidenceId);
      if (error) throw new Error(error.message ?? 'Could not remove this evidence item.');
    },
    onSuccess: () => {
      if (ideaId) queryClient.invalidateQueries({ queryKey: ideaEvidenceKey(ideaId) });
    },
  });
}
