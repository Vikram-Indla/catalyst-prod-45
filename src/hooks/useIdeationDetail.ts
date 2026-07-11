/**
 * Ideation · Idea Detail — CAT-IDEATION-REBUILD-20260709-001 Phase 2 S3.
 *
 * Reads idn_ideas + idn_comments directly (greenfield idn_* schema). Zero
 * legacy carryover: never import/query ph_ideas or ph_idea_comments here.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { gateTransition, resolveCanonicalVersion } from '@/lib/workflow/canonical/runtime';
import type { GuardEvaluation } from '@/lib/workflow/canonical/contracts';
import type { IdeaCommentRow, IdeaDetailRow } from '@/modules/ideation/types';

export const ideaDetailKey = (slug: string) => ['ideation', 'idea', slug] as const;
export const ideaCommentsKey = (ideaId: string) => ['ideation', 'idea-comments', ideaId] as const;

export function useIdeationIdea(slug: string | undefined) {
  return useQuery({
    queryKey: ideaDetailKey(slug ?? ''),
    queryFn: async (): Promise<IdeaDetailRow | null> => {
      const { data, error } = await typedQuery('idn_ideas')
        .select(
          'id, idea_key, slug, title, problem_statement, proposed_value, idea_class, workflow_status_key, submitter_id, product_id, strategy_element_id, decision, decision_reason, converted_business_request_id, products(name)'
        )
        .eq('slug', slug)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;

      const { data: submitterProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', data.submitter_id)
        .maybeSingle();

      return {
        id: data.id,
        idea_key: data.idea_key,
        slug: data.slug,
        title: data.title,
        problem_statement: data.problem_statement,
        proposed_value: data.proposed_value,
        idea_class: data.idea_class,
        workflow_status_key: data.workflow_status_key,
        submitter_id: data.submitter_id,
        submitter_name: submitterProfile?.full_name ?? null,
        product_id: data.product_id,
        product_name: (data as { products?: { name: string } | null }).products?.name ?? null,
        strategy_element_id: data.strategy_element_id,
        decision: data.decision,
        decision_reason: data.decision_reason,
        converted_business_request_id: data.converted_business_request_id,
        created_at: data.created_at,
      } as IdeaDetailRow;
    },
    enabled: !!slug,
    staleTime: 15_000,
  });
}

export function useIdeationComments(ideaId: string | undefined) {
  return useQuery({
    queryKey: ideaCommentsKey(ideaId ?? ''),
    queryFn: async (): Promise<IdeaCommentRow[]> => {
      const { data, error } = await typedQuery('idn_comments')
        .select('id, idea_id, user_id, content, parent_comment_id, created_at')
        .eq('idea_id', ideaId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      const rows = (data ?? []) as Array<Omit<IdeaCommentRow, 'author_name'>>;
      if (rows.length === 0) return [];

      const userIds = [...new Set(rows.map((r) => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);
      const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name as string | null]));

      return rows.map((r) => ({ ...r, author_name: nameById.get(r.user_id) ?? null }));
    },
    enabled: !!ideaId,
    staleTime: 10_000,
  });
}

/** Canonical ph_wf_* version for entity_key 'ideation' (S3 seed) — same
 *  resolveCanonicalVersion every other entity uses, no project scoping. */
export function useIdeationWorkflowVersion() {
  return useQuery({
    queryKey: ['ideation', 'workflow-version'],
    queryFn: () => resolveCanonicalVersion('ideation', null),
    staleTime: 5 * 60_000,
  });
}

const DECISION_STATUSES = new Set(['approved', 'declined', 'parked']);

/** Pre-check the 'approved' transition's guard evidence without deciding
 *  anything — lets the Detail rail show pass/fail state before the reviewer
 *  clicks a button (gateTransition doesn't write to idn_ideas, only reads +
 *  audits, so this is safe to run read-only on every evaluation-stage idea). */
export function useIdeaApprovalGuardCheck(idea: IdeaDetailRow | null | undefined) {
  return useQuery({
    queryKey: ['ideation', 'guard-check', idea?.id],
    queryFn: async (): Promise<GuardEvaluation[]> => {
      if (!idea) return [];
      const gate = await gateTransition({
        entityKey: 'ideation',
        issueRow: { ...idea, status: idea.workflow_status_key },
        toStatusRaw: 'approved',
        sourceSurface: 'ideation_detail_rail_precheck',
      });
      return gate.guardResults ?? [];
    },
    enabled: !!idea && idea.workflow_status_key === 'evaluation',
    staleTime: 30_000,
  });
}

/** Evaluation → decision transition (Approve/Decline/Park), gated through the
 *  canonical runtime (advisory-only for ideation — see Plan Lock non-scope).
 *  Merge is excluded — needs a merge-target picker, its own C.6 surface. */
export function useDecideIdeaTransition(idea: IdeaDetailRow | null | undefined) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      toStatusKey,
      reasonCode,
      reasonText,
    }: {
      toStatusKey: string;
      reasonCode?: string | null;
      reasonText?: string | null;
    }) => {
      if (!idea) throw new Error('No idea loaded');

      const gate = await gateTransition({
        entityKey: 'ideation',
        // gateTransition's fromKey resolution reads issueRow.status by
        // convention (matches every other entity's row shape) — idn_ideas
        // calls that column workflow_status_key, so alias it here.
        issueRow: { ...idea, status: idea.workflow_status_key },
        toStatusRaw: toStatusKey,
        reasonCode: reasonCode ?? null,
        reasonText: reasonText ?? null,
        sourceSurface: 'ideation_detail_rail',
      });
      if (gate.blocked) throw new Error(gate.message ?? 'Transition blocked by workflow guards.');
      if (gate.reasonRequired && !reasonCode && !reasonText) {
        throw new Error('This transition requires a reason.');
      }

      const patch: Record<string, unknown> = { workflow_status_key: toStatusKey };
      if (DECISION_STATUSES.has(toStatusKey)) {
        patch.decision = toStatusKey;
        patch.decision_reason = reasonText ?? reasonCode ?? null;
        patch.decided_by = user?.id ?? null;
        patch.decided_at = new Date().toISOString();
      } else if (toStatusKey === 'evaluation' && idea.decision) {
        // Reopen (declined/parked → evaluation): clear the prior decision so
        // it doesn't read as still-decided while back in evaluation.
        patch.decision = null;
        patch.decision_reason = null;
      }

      const { error } = await typedQuery('idn_ideas').update(patch).eq('id', idea.id);
      if (error) throw error;
      return gate;
    },
    onSuccess: () => {
      if (idea) queryClient.invalidateQueries({ queryKey: ideaDetailKey(idea.slug) });
    },
  });
}

export function useAddIdeationComment(ideaId: string | undefined) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (adfContent: string) => {
      if (!ideaId) throw new Error('No idea to comment on');
      const { error } = await typedQuery('idn_comments').insert({
        idea_id: ideaId,
        user_id: user?.id,
        content: JSON.parse(adfContent),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      if (ideaId) queryClient.invalidateQueries({ queryKey: ideaCommentsKey(ideaId) });
    },
  });
}
