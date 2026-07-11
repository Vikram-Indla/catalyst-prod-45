/**
 * Ideation · Conversion — CAT-IDEATION-REBUILD-20260709-001 Phase 5 S1.
 *
 * Approved idea -> real business_requests row, audited via idn_conversions,
 * idn_ideas advances to 'converted'. Direct single-step conversion — see
 * Plan Lock non-scope for why this isn't the full AI-draft wizard.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { adfToPlainText } from '@/hooks/useIdeationInbox';
import { ideaDetailKey } from '@/hooks/useIdeationDetail';
import type { IdeaDetailRow } from '@/modules/ideation/types';

export interface ConversionResult {
  businessRequestId: string;
  requestKey: string;
}

export function useConvertIdeaToBusinessRequest(idea: IdeaDetailRow | null | undefined) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (): Promise<ConversionResult> => {
      if (!idea) throw new Error('No idea loaded');
      if (!user?.id) throw new Error('Not signed in');

      const description = adfToPlainText(idea.problem_statement);

      const { data: br, error: brError } = await supabase
        .from('business_requests')
        .insert({
          title: idea.title,
          description,
          source_idea_id: idea.id,
        } as never)
        .select('id, request_key')
        .single();
      if (brError) throw new Error(brError.message ?? 'Could not create the Business Request.');
      const businessRequestId = (br as { id: string }).id;
      const requestKey = (br as { request_key: string }).request_key;

      const { error: convError } = await typedQuery('idn_conversions').insert({
        idea_id: idea.id,
        business_request_id: businessRequestId,
        mode: 'manual',
        converted_by: user.id,
      });
      if (convError) {
        // Compensate: don't leave an orphaned BR with no audit trail or idea
        // link (best-effort — no cross-table transaction available client-side).
        await supabase.from('business_requests').delete().eq('id', businessRequestId);
        throw new Error(convError.message ?? 'Could not record the conversion audit.');
      }

      const { error: ideaError } = await typedQuery('idn_ideas')
        .update({
          workflow_status_key: 'converted',
          converted_business_request_id: businessRequestId,
          converted_at: new Date().toISOString(),
          converted_by: user.id,
        })
        .eq('id', idea.id);
      if (ideaError) {
        // CONFIRMED pre-existing RLS bug (reproduced live, not theoretical):
        // idn_ideas_update has no explicit WITH CHECK, so Postgres reuses
        // USING evaluated against the NEW row — "converted_business_request_id
        // IS NULL" then fails against the very value this update sets. Every
        // conversion attempt hits this; needs a migration to fix (split the
        // policy into a real USING on the OLD row + a permissive role-based
        // WITH CHECK), out of scope for this slice to apply unilaterally.
        //
        // Best-effort compensation attempted below, but ALSO confirmed
        // non-functional: idn_conversions has no DELETE RLS policy at all
        // (only SELECT + INSERT exist), so this delete silently affects 0
        // rows, which then blocks the business_requests delete via its
        // ON DELETE RESTRICT FK. Net effect: a failed conversion currently
        // leaves an orphaned business_requests + idn_conversions row that
        // needs manual cleanup until both RLS gaps are fixed in one
        // migration. Left the attempt in (harmless, forward-compatible if
        // a DELETE policy is added later) rather than deleting dead code
        // that documents the real gap.
        await typedQuery('idn_conversions').delete().eq('business_request_id', businessRequestId);
        await supabase.from('business_requests').delete().eq('id', businessRequestId);
        throw new Error(ideaError.message ?? 'Could not mark the idea as converted.');
      }

      return { businessRequestId, requestKey };
    },
    onSuccess: () => {
      if (idea) queryClient.invalidateQueries({ queryKey: ideaDetailKey(idea.slug) });
    },
  });
}
