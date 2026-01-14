/**
 * useTemplates Hook - CRUD operations for cycle templates
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { 
  CycleTemplate, 
  CreateTemplateInput, 
  UpdateTemplateInput,
  TemplateFilters,
  TemplateConfig,
} from '@/types/template.types';

// Mock data for development
const MOCK_TEMPLATES: CycleTemplate[] = [
  {
    id: '1',
    project_id: 'proj-1',
    name: 'Weekly Regression Suite',
    description: 'Comprehensive regression testing covering all critical modules',
    config: {
      testCriteria: { modules: ['Auth', 'Payments', 'Orders'], priorities: ['critical', 'high'] },
      assignmentRules: { method: 'smart', balanceWorkload: true, respectSkills: true },
      defaultDurationDays: 5,
      includeWeekends: false,
      milestones: [
        { id: '1', name: 'Midpoint Review', day: 3, type: 'review' },
        { id: '2', name: 'Final Review', day: 5, type: 'deadline' },
      ],
    },
    is_global: false,
    created_by: 'user-1',
    created_at: '2026-01-10T10:00:00Z',
    updated_at: '2026-01-10T10:00:00Z',
    created_by_name: 'Ahmed S.',
    usage_count: 12,
    last_used_at: '2026-01-12T14:30:00Z',
    matching_tests_count: 142,
  },
  {
    id: '2',
    project_id: 'proj-1',
    name: 'Smoke Test - Quick Validation',
    description: 'Fast smoke testing for build validation',
    config: {
      testCriteria: { tags: ['smoke'], priorities: ['critical'] },
      assignmentRules: { method: 'round_robin', balanceWorkload: true, respectSkills: false },
      defaultDurationDays: 1,
      includeWeekends: false,
      milestones: [
        { id: '1', name: 'Complete', day: 1, type: 'deadline' },
      ],
    },
    is_global: false,
    created_by: 'user-2',
    created_at: '2026-01-08T09:00:00Z',
    updated_at: '2026-01-08T09:00:00Z',
    created_by_name: 'Sara M.',
    usage_count: 28,
    last_used_at: '2026-01-13T08:00:00Z',
    matching_tests_count: 24,
  },
  {
    id: '3',
    project_id: null,
    name: 'Standard Regression Template',
    description: 'System-provided template for standard regression cycles',
    config: {
      testCriteria: { types: ['functional', 'integration'] },
      assignmentRules: { method: 'smart', balanceWorkload: true, respectSkills: true },
      defaultDurationDays: 7,
      includeWeekends: false,
      milestones: [
        { id: '1', name: 'Midpoint', day: 4, type: 'checkpoint' },
        { id: '2', name: 'Final Review', day: 7, type: 'review' },
      ],
    },
    is_global: true,
    created_by: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    created_by_name: 'System',
    usage_count: 156,
    matching_tests_count: 200,
  },
  {
    id: '4',
    project_id: 'proj-1',
    name: 'UAT Cycle - Stakeholder Review',
    description: 'User acceptance testing with business stakeholders',
    config: {
      testCriteria: { tags: ['uat', 'business-critical'] },
      assignmentRules: { method: 'manual', balanceWorkload: false, respectSkills: false },
      defaultDurationDays: 5,
      includeWeekends: false,
      milestones: [
        { id: '1', name: 'Initial Feedback', day: 2, type: 'checkpoint' },
        { id: '2', name: 'Sign-off', day: 5, type: 'deadline' },
      ],
    },
    is_global: false,
    created_by: 'user-1',
    created_at: '2026-01-05T11:00:00Z',
    updated_at: '2026-01-05T11:00:00Z',
    created_by_name: 'Ahmed S.',
    usage_count: 5,
    last_used_at: '2026-01-10T16:00:00Z',
    matching_tests_count: 45,
  },
];

export function useTemplates(projectId: string, filters?: TemplateFilters) {
  return useQuery({
    queryKey: ['templates', projectId, filters],
    queryFn: async () => {
      // TODO: Replace with actual Supabase query
      // const { data, error } = await supabase
      //   .from('test_cycle_templates')
      //   .select('*')
      //   .or(`project_id.eq.${projectId},is_global.eq.true`)
      //   .order('name');
      
      let templates = [...MOCK_TEMPLATES];
      
      // Apply filters
      if (filters?.type) {
        templates = templates.filter(t => {
          const config = t.config as TemplateConfig;
          // Infer type from config
          if (filters.type === 'smoke' && config.testCriteria.tags?.includes('smoke')) return true;
          if (filters.type === 'uat' && config.testCriteria.tags?.includes('uat')) return true;
          if (filters.type === 'regression' && config.testCriteria.types?.includes('functional')) return true;
          if (filters.type === 'custom') return true;
          return false;
        });
      }
      
      if (filters?.search) {
        const search = filters.search.toLowerCase();
        templates = templates.filter(t => 
          t.name.toLowerCase().includes(search) ||
          t.description?.toLowerCase().includes(search)
        );
      }
      
      if (filters?.showSystemOnly) {
        templates = templates.filter(t => t.is_global);
      }
      
      // Sort by usage count descending
      templates.sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0));
      
      return templates;
    },
    enabled: !!projectId,
  });
}

export function useTemplate(templateId: string) {
  return useQuery({
    queryKey: ['template', templateId],
    queryFn: async () => {
      // TODO: Replace with actual Supabase query
      const template = MOCK_TEMPLATES.find(t => t.id === templateId);
      if (!template) throw new Error('Template not found');
      return template;
    },
    enabled: !!templateId,
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateTemplateInput) => {
      // TODO: Replace with actual Supabase insert
      // const { data, error } = await supabase
      //   .from('test_cycle_templates')
      //   .insert({
      //     project_id: input.project_id,
      //     name: input.name,
      //     description: input.description,
      //     config: input.config,
      //     is_global: input.is_global || false,
      //   })
      //   .select()
      //   .single();
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const newTemplate: CycleTemplate = {
        id: `temp-${Date.now()}`,
        project_id: input.project_id,
        name: input.name,
        description: input.description || null,
        config: input.config,
        is_global: input.is_global || false,
        created_by: 'current-user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by_name: 'Current User',
        usage_count: 0,
        matching_tests_count: 0,
      };
      
      return newTemplate;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Template created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create template');
      console.error('Create template error:', error);
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: UpdateTemplateInput) => {
      // TODO: Replace with actual Supabase update
      await new Promise(resolve => setTimeout(resolve, 500));
      return input;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      queryClient.invalidateQueries({ queryKey: ['template', data.id] });
      toast.success('Template updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update template');
      console.error('Update template error:', error);
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (templateId: string) => {
      // TODO: Replace with actual Supabase delete
      await new Promise(resolve => setTimeout(resolve, 500));
      return templateId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Template deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete template');
      console.error('Delete template error:', error);
    },
  });
}

export function useDuplicateTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ templateId, newName }: { templateId: string; newName: string }) => {
      // TODO: Replace with actual Supabase operations
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const original = MOCK_TEMPLATES.find(t => t.id === templateId);
      if (!original) throw new Error('Template not found');
      
      const duplicate: CycleTemplate = {
        ...original,
        id: `temp-${Date.now()}`,
        name: newName,
        is_global: false,
        usage_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      return duplicate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Template duplicated');
    },
    onError: (error) => {
      toast.error('Failed to duplicate template');
      console.error('Duplicate template error:', error);
    },
  });
}
