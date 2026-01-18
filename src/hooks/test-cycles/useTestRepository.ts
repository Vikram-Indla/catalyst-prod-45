/**
 * Hook to fetch test cases from repository for adding to a cycle
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TestCase, TestCaseFilters } from '@/types/add-tests.types';

export function useTestRepository(
  projectId: string, 
  cycleId: string, 
  filters: TestCaseFilters
) {
  return useQuery({
    queryKey: ['test-repository', projectId, cycleId, filters],
    queryFn: async () => {
      // First, get test cases already in this cycle
      const { data: cycleScope } = await supabase
        .from('tm_cycle_scope')
        .select('test_case_id')
        .eq('cycle_id', cycleId);
      
      const alreadyInCycleIds = new Set(cycleScope?.map(cs => cs.test_case_id) || []);

      // Get priorities for mapping
      const { data: priorities } = await supabase
        .from('tm_case_priorities')
        .select('id, name');
      
      const priorityMap = new Map(priorities?.map(p => [p.id, p.name]) || []);

      // Build the main query for test cases
      let query = supabase
        .from('tm_test_cases')
        .select(`
          id,
          case_key,
          title,
          test_type,
          priority_id,
          estimated_time,
          automation_status,
          created_at,
          folder_id,
          tm_folders(name)
        `)
        .eq('project_id', projectId);

      // Apply search filter
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,case_key.ilike.%${filters.search}%`);
      }

      // Apply test type filter
      if (filters.testType) {
        query = query.eq('test_type', filters.testType);
      }

      // Apply automation status filter
      if (filters.automationStatus) {
        query = query.eq('automation_status', filters.automationStatus);
      }

      // Order by case_key
      query = query.order('case_key', { ascending: true });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching test cases:', error);
        throw error;
      }

      // Transform to match expected TestCase interface
      let testCases: TestCase[] = (data || []).map(tc => {
        const folderData = tc.tm_folders as { name: string } | null;
        const priorityName = tc.priority_id ? priorityMap.get(tc.priority_id) : undefined;
        
        return {
          id: tc.id,
          test_case_id: tc.case_key,
          title: tc.title,
          module: folderData?.name || 'Uncategorized',
          test_type: (tc.test_type || 'functional') as TestCase['test_type'],
          priority: mapPriorityName(priorityName) as TestCase['priority'],
          estimated_duration_minutes: tc.estimated_time,
          automation_status: (tc.automation_status || 'manual') as TestCase['automation_status'],
          created_at: tc.created_at || '',
          alreadyInCycle: alreadyInCycleIds.has(tc.id),
        };
      });

      // Apply module filter (folder name) - done client-side since we need the joined data
      if (filters.module) {
        testCases = testCases.filter(tc => tc.module === filters.module);
      }

      // Apply priority filter - done client-side since we need the joined data
      if (filters.priority) {
        testCases = testCases.filter(tc => tc.priority === filters.priority);
      }

      // Hide already added if filter is on
      if (filters.hideAlreadyAdded) {
        testCases = testCases.filter(tc => !tc.alreadyInCycle);
      }

      return testCases;
    },
    enabled: !!projectId && !!cycleId,
  });
}

// Map priority name from database to expected format
function mapPriorityName(name: string | undefined): string {
  if (!name) return 'medium';
  const normalized = name.toLowerCase();
  if (normalized.includes('critical')) return 'critical';
  if (normalized.includes('high')) return 'high';
  if (normalized.includes('medium')) return 'medium';
  if (normalized.includes('low')) return 'low';
  return 'medium';
}

// Get unique modules (folders) for filter dropdown
export function useTestModules(projectId: string) {
  return useQuery({
    queryKey: ['test-modules', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tm_folders')
        .select('name')
        .eq('project_id', projectId)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching folders:', error);
        throw error;
      }

      return data?.map(f => f.name) || [];
    },
    enabled: !!projectId,
  });
}
