/**
 * useImproveApplyHandlers — small hook that gives each CatalystView*
 * the four callback props the `<ImproveIssueDropdown>` expects, all
 * preconfigured to update `ph_issues` and invalidate the detail
 * cache. Saves ~40 lines of duplication across 7 issue-type views.
 *
 * Apr 28, 2026 (jira-compare cycle 3 — Phase B B2).
 */

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { plainTextToAdfDoc } from './improve-config';

interface IssueLike {
  id?: string;
  issue_key?: string | null;
}

export function useImproveApplyHandlers(issue: IssueLike | null | undefined) {
  const queryClient = useQueryClient();

  const onApplyDescription = useCallback(
    async (newDesc: string) => {
      if (!issue?.issue_key) return;
      await supabase
        .from('ph_issues')
        .update({ description_adf: plainTextToAdfDoc(newDesc) })
        .eq('issue_key', issue.issue_key);
      await queryClient.invalidateQueries({ queryKey: ['cv-issue-detail', issue.id] });
    },
    [issue?.id, issue?.issue_key, queryClient],
  );

  const onApplyAcceptanceCriteria = useCallback(
    async (newAC: string) => {
      if (!issue?.issue_key) return;
      await supabase
        .from('ph_issues')
        .update({ acceptance_criteria: newAC })
        .eq('issue_key', issue.issue_key);
      await queryClient.invalidateQueries({ queryKey: ['cv-issue-detail', issue.id] });
    },
    [issue?.id, issue?.issue_key, queryClient],
  );

  const onChildrenCreated = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['cv-issue-detail', issue?.id] });
  }, [issue?.id, queryClient]);

  const onLinked = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['cv-issue-detail', issue?.id] });
  }, [issue?.id, queryClient]);

  return { onApplyDescription, onApplyAcceptanceCriteria, onChildrenCreated, onLinked };
}
