/**
 * useTemplatePreview Hook - Preview matching tests for criteria
 */

import { useQuery } from '@tanstack/react-query';
import type { TestCriteria, TemplatePreview } from '@/types/template.types';

// Mock test data for preview calculations
const MOCK_TESTS = [
  { id: '1', module: 'Auth', type: 'functional', priority: 'critical', duration: 30, tags: ['smoke', 'regression'] },
  { id: '2', module: 'Auth', type: 'functional', priority: 'high', duration: 45, tags: ['regression'] },
  { id: '3', module: 'Auth', type: 'integration', priority: 'medium', duration: 60, tags: ['regression'] },
  { id: '4', module: 'Payments', type: 'functional', priority: 'critical', duration: 40, tags: ['smoke', 'regression'] },
  { id: '5', module: 'Payments', type: 'functional', priority: 'high', duration: 35, tags: ['regression'] },
  { id: '6', module: 'Payments', type: 'e2e', priority: 'critical', duration: 90, tags: ['regression', 'uat'] },
  { id: '7', module: 'Orders', type: 'functional', priority: 'high', duration: 25, tags: ['smoke', 'regression'] },
  { id: '8', module: 'Orders', type: 'functional', priority: 'medium', duration: 30, tags: ['regression'] },
  { id: '9', module: 'Orders', type: 'integration', priority: 'low', duration: 45, tags: ['regression'] },
  { id: '10', module: 'Inventory', type: 'functional', priority: 'high', duration: 35, tags: ['regression'] },
  { id: '11', module: 'Inventory', type: 'functional', priority: 'medium', duration: 40, tags: ['regression'] },
  { id: '12', module: 'Reporting', type: 'functional', priority: 'low', duration: 20, tags: ['regression'] },
  { id: '13', module: 'Users', type: 'functional', priority: 'critical', duration: 30, tags: ['smoke'] },
  { id: '14', module: 'Users', type: 'integration', priority: 'high', duration: 50, tags: ['regression'] },
  { id: '15', module: 'Dashboard', type: 'e2e', priority: 'medium', duration: 60, tags: ['uat'] },
];

export function useTemplatePreview(projectId: string, criteria: TestCriteria) {
  return useQuery({
    queryKey: ['template-preview', projectId, criteria],
    queryFn: async (): Promise<TemplatePreview> => {
      // TODO: Replace with actual Supabase RPC call
      // const { data, error } = await supabase
      //   .rpc('preview_template_criteria', {
      //     p_project_id: projectId,
      //     p_modules: criteria.modules || null,
      //     p_types: criteria.types || null,
      //     p_priorities: criteria.priorities || null
      //   });
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Filter tests based on criteria
      let filteredTests = [...MOCK_TESTS];
      
      if (criteria.modules?.length) {
        filteredTests = filteredTests.filter(t => criteria.modules!.includes(t.module));
      }
      
      if (criteria.types?.length) {
        filteredTests = filteredTests.filter(t => criteria.types!.includes(t.type));
      }
      
      if (criteria.priorities?.length) {
        filteredTests = filteredTests.filter(t => criteria.priorities!.includes(t.priority));
      }
      
      if (criteria.tags?.length) {
        filteredTests = filteredTests.filter(t => 
          t.tags.some(tag => criteria.tags!.includes(tag))
        );
      }
      
      // Calculate preview data
      const preview: TemplatePreview = {
        totalTests: filteredTests.length,
        criticalCount: filteredTests.filter(t => t.priority === 'critical').length,
        highCount: filteredTests.filter(t => t.priority === 'high').length,
        mediumCount: filteredTests.filter(t => t.priority === 'medium').length,
        lowCount: filteredTests.filter(t => t.priority === 'low').length,
        totalDurationMinutes: filteredTests.reduce((sum, t) => sum + t.duration, 0),
        modules: [...new Set(filteredTests.map(t => t.module))],
        types: [...new Set(filteredTests.map(t => t.type))],
      };
      
      return preview;
    },
    enabled: !!projectId,
  });
}

// Get available filter options
export function useFilterOptions(projectId: string) {
  return useQuery({
    queryKey: ['template-filter-options', projectId],
    queryFn: async () => {
      // TODO: Replace with actual Supabase queries
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return {
        modules: ['Auth', 'Payments', 'Orders', 'Inventory', 'Reporting', 'Users', 'Dashboard'],
        types: ['functional', 'integration', 'e2e', 'performance', 'security'],
        priorities: ['critical', 'high', 'medium', 'low'],
        tags: ['smoke', 'regression', 'uat', 'business-critical', 'api', 'ui'],
      };
    },
    enabled: !!projectId,
  });
}
