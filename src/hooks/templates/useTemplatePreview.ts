/**
 * useTemplatePreview Hook — ZERO MOCK DATA
 * All data from database. Returns empty results when no data exists.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TestCriteria, TemplatePreview } from '@/types/template.types';

export function useTemplatePreview(projectId: string, criteria: TestCriteria) {
  return useQuery({
    queryKey: ['template-preview', projectId, criteria],
    queryFn: async (): Promise<TemplatePreview> => {
      // Query actual test cases from DB
      let query = supabase
        .from('tm_test_cases')
        .select('id, module, priority, estimated_duration_minutes')
        .eq('project_id', projectId);

      const { data: testCases } = await query;
      let filtered = testCases || [];

      // Apply criteria filters in-memory (DB may not have all filter columns)
      if (criteria.modules?.length) {
        filtered = filtered.filter((t: any) => criteria.modules!.includes(t.module));
      }
      if (criteria.priorities?.length) {
        filtered = filtered.filter((t: any) => criteria.priorities!.includes(t.priority));
      }

      const preview: TemplatePreview = {
        totalTests: filtered.length,
        criticalCount: filtered.filter((t: any) => t.priority === 'critical').length,
        highCount: filtered.filter((t: any) => t.priority === 'high').length,
        mediumCount: filtered.filter((t: any) => t.priority === 'medium').length,
        lowCount: filtered.filter((t: any) => t.priority === 'low').length,
        totalDurationMinutes: filtered.reduce((sum: number, t: any) => sum + (t.estimated_duration_minutes || 0), 0),
        modules: [...new Set(filtered.map((t: any) => t.module).filter(Boolean))],
        types: [],
      };

      return preview;
    },
    enabled: !!projectId,
  });
}

// Get available filter options from actual DB data
export function useFilterOptions(projectId: string) {
  return useQuery({
    queryKey: ['template-filter-options', projectId],
    queryFn: async () => {
      const { data: testCases } = await supabase
        .from('tm_test_cases')
        .select('module, priority')
        .eq('project_id', projectId);

      const rows = testCases || [];

      return {
        modules: [...new Set(rows.map((r: any) => r.module).filter(Boolean))],
        types: [] as string[],
        priorities: ['critical', 'high', 'medium', 'low'],
        tags: [] as string[],
      };
    },
    enabled: !!projectId,
  });
}
