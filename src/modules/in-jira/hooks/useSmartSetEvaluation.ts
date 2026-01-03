/**
 * Smart Set Evaluation Hook
 * Dynamically computes which test cases match smart set criteria
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase as supabaseClient } from '@/integrations/supabase/client';
import { SmartSetCriteria, TestSetWithCount } from './useTestSets';
import { TestCase } from './useTestCases';

const supabase = supabaseClient as any;

export interface SmartSetMatch {
  caseId: string;
  matchedCriteria: string[];
}

export function useSmartSetEvaluation(
  testSet: TestSetWithCount | null,
  allCases: TestCase[]
) {
  // Evaluate smart set criteria against all cases
  const matchingCases = useMemo(() => {
    if (!testSet?.is_smart_set || !testSet.smart_set_criteria) {
      return [];
    }

    const criteria = testSet.smart_set_criteria as SmartSetCriteria;

    return allCases.filter(tc => {
      // Status filter
      if (criteria.status?.length && !criteria.status.includes(tc.status)) {
        return false;
      }

      // Priority filter
      if (criteria.priority?.length && !criteria.priority.includes(tc.priority)) {
        return false;
      }

      // Labels filter (any match)
      if (criteria.labels?.length && tc.labels) {
        const hasMatch = criteria.labels.some(l => tc.labels?.includes(l));
        if (!hasMatch) return false;
      }

      // Component filter
      if (criteria.component?.length && tc.component) {
        if (!criteria.component.includes(tc.component)) return false;
      }

      // Folder filter
      if (criteria.folder_id?.length && tc.folder_id) {
        if (!criteria.folder_id.includes(tc.folder_id)) return false;
      }

      // Linked story filter
      if (criteria.linked_story_id?.length) {
        // Would need to check work item links - for now just pass
      }

      return true;
    });
  }, [testSet, allCases]);

  // Get summary of matched criteria
  const matchSummary = useMemo(() => {
    if (!testSet?.smart_set_criteria) return null;

    const criteria = testSet.smart_set_criteria as SmartSetCriteria;
    const summary: { field: string; values: string[] }[] = [];

    if (criteria.status?.length) {
      summary.push({ field: 'Status', values: criteria.status });
    }
    if (criteria.priority?.length) {
      summary.push({ field: 'Priority', values: criteria.priority });
    }
    if (criteria.labels?.length) {
      summary.push({ field: 'Labels', values: criteria.labels });
    }
    if (criteria.component?.length) {
      summary.push({ field: 'Component', values: criteria.component });
    }

    return summary;
  }, [testSet?.smart_set_criteria]);

  return {
    matchingCases,
    matchCount: matchingCases.length,
    matchSummary,
    isSmartSet: testSet?.is_smart_set || false,
  };
}

// Hook to sync smart set cases (called on changes)
export function useSyncSmartSetCases() {
  return useMemo(() => {
    return async (setId: string, matchingCaseIds: string[], userId: string) => {
      // Get current cases in set
      const { data: currentCases } = await supabase
        .from('test_set_cases')
        .select('case_id')
        .eq('set_id', setId);

      const currentIds = new Set<string>((currentCases || []).map((c: any) => String(c.case_id)));
      const newIds = new Set<string>(matchingCaseIds);

      // Cases to add
      const toAdd = matchingCaseIds.filter((id) => !currentIds.has(id));

      // Cases to remove
      const toRemove = Array.from(currentIds).filter((id) => !newIds.has(id));

      // Add new matches
      if (toAdd.length > 0) {
        const inserts = toAdd.map((caseId, index) => ({
          set_id: setId,
          case_id: caseId,
          sort_order: currentIds.size + index,
          added_by: userId,
        }));

        await supabase.from('test_set_cases').insert(inserts);
      }

      // Remove unmatched
      if (toRemove.length > 0) {
        await supabase
          .from('test_set_cases')
          .delete()
          .eq('set_id', setId)
          .in('case_id', toRemove);
      }

      return { added: toAdd.length, removed: toRemove.length };
    };
  }, []);
}
