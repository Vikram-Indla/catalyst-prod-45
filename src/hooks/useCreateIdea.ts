/**
 * Ideation · Create idea mutation — CAT-IDEATION-REBUILD-20260709-001 Phase 2 S2.
 *
 * Write path per D13 (09_DECISIONS.md): INSERT lands as 'draft' (DB default);
 * "Submit idea" is a SECOND update to 'submitted' plus an idn_audit_log
 * transition row — never a row born 'submitted' (RLS has no status WITH CHECK,
 * so honesty here is app discipline; full ph_wf guard evaluation is Phase 3).
 *
 * Insert contract (Data/Safety Guard over 20260709130000_idn_core_schema.sql):
 * send only title / idea_class / optional ADF + product_id. NEVER send
 * idea_key or slug — the BEFORE INSERT triggers only fill when NULL/'' (soft
 * guard), so a client value would be honored and break the IDEA-N contract.
 * submitter_id is omitted: the auth.uid() default satisfies the RLS
 * WITH CHECK (approved user + self-attribution).
 *
 * Zero legacy carryover: idn_* only — never ph_ideas / ideationService.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { IDEATION_INBOX_KEY } from '@/hooks/useIdeationInbox';
import type { CreateIdeaInput, IdeaStatusKey } from '@/modules/ideation/types';

export interface CreatedIdea {
  id: string;
  idea_key: string;
  slug: string;
  workflow_status_key: IdeaStatusKey;
}

export interface CreateIdeaArgs {
  input: CreateIdeaInput;
  /** true = Submit idea (draft → submitted, audited). false = Save draft. */
  submit: boolean;
}

export function useCreateIdea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ input, submit }: CreateIdeaArgs): Promise<CreatedIdea> => {
      // 1. Insert — trigger fills idea_key/slug; defaults fill submitter/status.
      const { data: created, error } = await typedQuery('idn_ideas')
        .insert([
          {
            title: input.title,
            idea_class: input.idea_class,
            problem_statement: input.problem_statement ?? null,
            proposed_value: input.proposed_value ?? null,
            product_id: input.product_id ?? null,
          },
        ])
        .select('id, idea_key, slug, workflow_status_key')
        .single();
      if (error) throw error;
      const idea = created as unknown as CreatedIdea;

      // 2. Self-watch (reason 'submitter'). No DB trigger does this — app
      //    obligation. Non-fatal: the idea exists either way.
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await typedQuery('idn_watchers').insert([
            { idea_id: idea.id, user_id: user.id, reason: 'submitter' },
          ]);
        }
        await typedQuery('idn_audit_log').insert([
          { idea_id: idea.id, action: 'created', changed_fields: { title: input.title } },
        ]);
      } catch (e) {
        console.error('idn create side-rows:', e);
      }

      // 3. Submit = audited draft → submitted transition (D13).
      if (submit) {
        const { error: statusError } = await typedQuery('idn_ideas')
          .update({ workflow_status_key: 'submitted' })
          .eq('id', idea.id);
        if (statusError) throw statusError;
        const { error: auditError } = await typedQuery('idn_audit_log').insert([
          {
            idea_id: idea.id,
            action: 'status_changed',
            changed_fields: { workflow_status_key: { from: 'draft', to: 'submitted' } },
          },
        ]);
        if (auditError) throw auditError;
        idea.workflow_status_key = 'submitted';
      }

      return idea;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: IDEATION_INBOX_KEY });
    },
  });
}
