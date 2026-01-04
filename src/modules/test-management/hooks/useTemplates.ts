/**
 * Template Hooks for Test Management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { casesApi } from '../api';
import type { CreateTestCaseInput } from '../api/types';
import { useToast } from '@/hooks/use-toast';
import { parseApiError } from '../api/client';
import { caseKeys } from './useCases';

// Query Keys
export const templateKeys = {
  all: ['tm-templates'] as const,
  list: (projectId: string) => [...templateKeys.all, 'list', projectId] as const,
};

/**
 * List all templates for a project
 */
export function useTemplates(projectId: string) {
  return useQuery({
    queryKey: templateKeys.list(projectId),
    queryFn: async () => {
      const response = await casesApi.list({
        project_id: projectId,
        is_template: true,
        limit: 100,
      });
      return response.data;
    },
    enabled: !!projectId,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Create test case from template
 */
export function useCreateFromTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      templateId,
      data,
    }: {
      templateId: string;
      data: Partial<CreateTestCaseInput>;
    }) => casesApi.createFromTemplate(templateId, data),
    onSuccess: (newCase) => {
      queryClient.invalidateQueries({ queryKey: caseKeys.lists() });
      toast({
        title: 'Test case created from template',
        description: `${newCase.case_key} has been created.`,
      });
    },
    onError: (error) => {
      const apiError = parseApiError(error);
      toast({
        title: 'Failed to create from template',
        description: apiError.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Convert existing case to template
 */
export function useConvertToTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (caseId: string) => {
      return casesApi.update({ id: caseId, is_template: true });
    },
    onSuccess: (updatedCase, caseId) => {
      queryClient.invalidateQueries({ queryKey: caseKeys.detail(caseId) });
      queryClient.invalidateQueries({ queryKey: templateKeys.all });
      toast({ title: 'Case converted to template' });
    },
    onError: (error) => {
      const apiError = parseApiError(error);
      toast({
        title: 'Failed to convert to template',
        description: apiError.message,
        variant: 'destructive',
      });
    },
  });
}
