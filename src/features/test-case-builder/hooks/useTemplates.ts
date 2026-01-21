/**
 * Test Case Template Hooks
 * Module 5A-1: CRUD operations for templates
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCatalystToast } from '@/components/ui/catalyst-toast';
import type {
  TestCaseTemplate,
  TemplateCategory,
  CreateTemplateInput,
  UpdateTemplateInput,
  TemplateFilters,
  TemplateData,
} from '../types/template';

// ============================================================
// Template Categories
// ============================================================

export function useTemplateCategories() {
  return useQuery({
    queryKey: ['template-categories'],
    queryFn: async (): Promise<TemplateCategory[]> => {
      const { data, error } = await (supabase
        .from('tm_template_categories') as any)
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================================
// Templates List
// ============================================================

export function useTemplates(projectId: string | null, filters?: TemplateFilters) {
  return useQuery({
    queryKey: ['test-case-templates', projectId, filters],
    queryFn: async (): Promise<TestCaseTemplate[]> => {
      let query = (supabase.from('tm_test_case_templates') as any)
        .select(`
          *,
          category:tm_template_categories(id, name, description, sort_order)
        `)
        .order('name', { ascending: true });

      // Filter by project (include global templates)
      if (projectId) {
        query = query.or(`project_id.eq.${projectId},is_global.eq.true`);
      } else {
        query = query.eq('is_global', true);
      }

      // Filter by category
      if (filters?.categoryId) {
        query = query.eq('category_id', filters.categoryId);
      }

      // Filter by global only
      if (filters?.isGlobal !== undefined) {
        query = query.eq('is_global', filters.isGlobal);
      }

      // Search filter
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []).map((t: any) => ({
        ...t,
        template_data: t.template_data as TemplateData,
      }));
    },
    enabled: true,
    staleTime: 30000,
  });
}

// ============================================================
// Single Template
// ============================================================

export function useTemplate(templateId: string | null) {
  return useQuery({
    queryKey: ['test-case-template', templateId],
    queryFn: async (): Promise<TestCaseTemplate | null> => {
      if (!templateId) return null;

      const { data, error } = await (supabase
        .from('tm_test_case_templates') as any)
        .select(`
          *,
          category:tm_template_categories(id, name, description, sort_order)
        `)
        .eq('id', templateId)
        .single();

      if (error) throw error;
      return {
        ...data,
        template_data: data.template_data as TemplateData,
      };
    },
    enabled: !!templateId,
  });
}

// ============================================================
// Template Mutations
// ============================================================

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  const { success, error: showError } = useCatalystToast();

  return useMutation({
    mutationFn: async (input: CreateTemplateInput): Promise<TestCaseTemplate> => {
      const { data: user } = await supabase.auth.getUser();

      const { data, error } = await (supabase
        .from('tm_test_case_templates') as any)
        .insert({
          name: input.name,
          description: input.description || null,
          category_id: input.category_id || null,
          template_data: input.template_data,
          is_global: input.is_global ?? false,
          project_id: input.project_id || null,
          created_by: user?.user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-case-templates'] });
      success('Template created');
    },
    onError: (err: Error) => {
      showError('Failed to create template', err.message);
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  const { success, error: showError } = useCatalystToast();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateTemplateInput & { id: string }): Promise<TestCaseTemplate> => {
      const { data, error } = await (supabase
        .from('tm_test_case_templates') as any)
        .update({
          ...input,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['test-case-templates'] });
      queryClient.invalidateQueries({ queryKey: ['test-case-template', data.id] });
      success('Template updated');
    },
    onError: (err: Error) => {
      showError('Failed to update template', err.message);
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  const { success, error: showError } = useCatalystToast();

  return useMutation({
    mutationFn: async (templateId: string): Promise<void> => {
      const { error } = await (supabase
        .from('tm_test_case_templates') as any)
        .delete()
        .eq('id', templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-case-templates'] });
      success('Template deleted');
    },
    onError: (err: Error) => {
      showError('Failed to delete template', err.message);
    },
  });
}

// ============================================================
// Apply Template to Test Case
// ============================================================

export function useApplyTemplate() {
  const { success, error: showError } = useCatalystToast();

  return useMutation({
    mutationFn: async ({
      templateId,
      testCaseId,
    }: {
      templateId: string;
      testCaseId: string;
    }): Promise<void> => {
      // Fetch template
      const { data: template, error: fetchError } = await (supabase
        .from('tm_test_case_templates') as any)
        .select('template_data')
        .eq('id', templateId)
        .single();

      if (fetchError) throw fetchError;

      const templateData = template.template_data as TemplateData;

      // Update test case with template data
      const updateFields: Record<string, any> = {};
      if (templateData.objective) updateFields.objective = templateData.objective;
      if (templateData.preconditions) updateFields.preconditions = templateData.preconditions;
      if (templateData.priority) updateFields.priority = templateData.priority;
      if (templateData.test_type) updateFields.test_type = templateData.test_type;
      if (templateData.tags) updateFields.tags = templateData.tags;

      if (Object.keys(updateFields).length > 0) {
        const { error: updateError } = await supabase
          .from('test_cases')
          .update(updateFields)
          .eq('id', testCaseId);

        if (updateError) throw updateError;
      }

      // Insert steps if provided
      if (templateData.steps && templateData.steps.length > 0) {
        // Delete existing steps
        await supabase.from('test_steps').delete().eq('test_case_id', testCaseId);

        // Insert new steps
        const stepsToInsert = templateData.steps.map((step) => ({
          test_case_id: testCaseId,
          step_order: step.order_index,
          action: step.action,
          expected_result: step.expected_result,
          test_data: step.test_data || null,
          notes: step.notes || null,
        }));

        const { error: stepsError } = await supabase
          .from('test_steps')
          .insert(stepsToInsert);

        if (stepsError) throw stepsError;
      }
    },
    onSuccess: () => {
      success('Template applied');
    },
    onError: (err: Error) => {
      showError('Failed to apply template', err.message);
    },
  });
}

// ============================================================
// Create Template from Test Case
// ============================================================

export function useCreateTemplateFromTestCase() {
  const queryClient = useQueryClient();
  const { success, error: showError } = useCatalystToast();

  return useMutation({
    mutationFn: async ({
      testCaseId,
      templateName,
      categoryId,
      isGlobal,
    }: {
      testCaseId: string;
      templateName: string;
      categoryId?: string;
      isGlobal?: boolean;
    }): Promise<TestCaseTemplate> => {
      // Fetch test case
      const { data: testCase, error: tcError } = await supabase
        .from('test_cases')
        .select('*, test_steps(*)')
        .eq('id', testCaseId)
        .single();

      if (tcError) throw tcError;

      // Fetch steps
      const { data: steps } = await supabase
        .from('test_steps')
        .select('*')
        .eq('test_case_id', testCaseId)
        .order('order_index', { ascending: true });

      const { data: user } = await supabase.auth.getUser();

      // Build template data
      const templateData: TemplateData = {
        objective: testCase.objective || undefined,
        preconditions: testCase.preconditions || undefined,
        priority: testCase.priority as TemplateData['priority'],
        test_type: testCase.test_type as TemplateData['test_type'],
        tags: testCase.tags || undefined,
        steps: (steps || []).map((s: any) => ({
          order_index: s.step_order || s.order_index,
          action: s.action,
          expected_result: s.expected_result,
          test_data: s.test_data || undefined,
          notes: s.notes || undefined,
        })),
      };

      const { data, error } = await (supabase
        .from('tm_test_case_templates') as any)
        .insert({
          name: templateName,
          description: `Template created from test case: ${testCase.title}`,
          category_id: categoryId || null,
          template_data: templateData,
          is_global: isGlobal ?? false,
          project_id: testCase.project_id,
          created_by: user?.user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-case-templates'] });
      success('Template created from test case');
    },
    onError: (err: Error) => {
      showError('Failed to create template', err.message);
    },
  });
}
