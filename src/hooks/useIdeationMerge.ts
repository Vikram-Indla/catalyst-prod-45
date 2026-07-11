/**
 * Ideation · Merge — CAT-IDEATION-REBUILD-20260709-001 Phase 3 S5.
 *
 * Winner-takes V1: status transition + terminal lock only. Vote/evidence/
 * watcher transfer needs a SECURITY DEFINER RPC (RLS blocks a client
 * session from touching another user's vote/watch rows) — flagged as a
 * follow-up requiring a migration, not silently faked here. See Plan Lock.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { typedQuery } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { gateTransition } from '@/lib/workflow/canonical/runtime';
import { ideaDetailKey } from '@/hooks/useIdeationDetail';
import type { IdeaDetailRow } from '@/modules/ideation/types';

export function useMergeIdea(idea: IdeaDetailRow | null | undefined) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ targetIdeaKey, reason }: { targetIdeaKey: string; reason: string }) => {
      if (!idea) throw new Error('No idea loaded');
      if (!user?.id) throw new Error('Not signed in');

      const key = targetIdeaKey.trim().toUpperCase();
      if (!key) throw new Error('Enter the idea key to merge into (e.g. IDEA-9).');

      const { data: target, error: targetError } = await typedQuery('idn_ideas')
        .select('id, idea_key')
        .eq('idea_key', key)
        .maybeSingle();
      if (targetError) throw targetError;
      if (!target) throw new Error(`No idea found with key ${key}.`);
      if ((target as { id: string }).id === idea.id) {
        throw new Error("Can't merge an idea into itself.");
      }

      const gate = await gateTransition({
        entityKey: 'ideation',
        issueRow: { ...idea, status: idea.workflow_status_key },
        toStatusRaw: 'merged',
        reasonText: reason,
        sourceSurface: 'ideation_detail_merge',
      });
      if (gate.blocked) throw new Error(gate.message ?? 'Merge blocked by workflow guards.');
      if (gate.reasonRequired && !reason.trim()) throw new Error('This transition requires a reason.');

      const { error } = await typedQuery('idn_ideas')
        .update({
          workflow_status_key: 'merged',
          decision: 'merged',
          decision_reason: reason,
          merged_into_id: (target as { id: string }).id,
          decided_by: user.id,
          decided_at: new Date().toISOString(),
        })
        .eq('id', idea.id);
      if (error) throw error;

      return { targetIdeaKey: (target as { idea_key: string }).idea_key };
    },
    onSuccess: () => {
      if (idea) queryClient.invalidateQueries({ queryKey: ideaDetailKey(idea.slug) });
    },
  });
}
