import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { 
  SharedTestStep, 
  TestCaseSharedStep, 
  CreateSharedStepRequest, 
  UpdateSharedStepRequest,
  SharedStepSearchParams,
  SharedStepUsage
} from '@/types/sharedSteps.types';

export const useSharedSteps = (params?: SharedStepSearchParams) => {
  return useQuery({
    queryKey: ['shared-steps', params],
    queryFn: async () => {
      let query = supabase
        .from('shared_test_steps')
        .select('*');

      // Apply search
      if (params?.search) {
        query = query.or(`title.ilike.%${params.search}%,description.ilike.%${params.search}%`);
      }

      // Apply sorting
      switch (params?.sort) {
        case 'usage_desc':
          query = query.order('usage_count', { ascending: false });
          break;
        case 'usage_asc':
          query = query.order('usage_count', { ascending: true });
          break;
        case 'title_asc':
          query = query.order('title', { ascending: true });
          break;
        case 'title_desc':
          query = query.order('title', { ascending: false });
          break;
        case 'recent':
          query = query.order('created_at', { ascending: false });
          break;
        default:
          query = query.order('usage_count', { ascending: false });
      }

      // Apply pagination
      const page = params?.page || 1;
      const limit = params?.limit || 20;
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error } = await query;
      if (error) throw error;
      return data as SharedTestStep[];
    },
  });
};

export const useSharedStep = (id: string) => {
  return useQuery({
    queryKey: ['shared-step', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shared_test_steps')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as SharedTestStep;
    },
    enabled: !!id,
  });
};

export const useSharedStepUsage = (sharedStepId: string) => {
  return useQuery({
    queryKey: ['shared-step-usage', sharedStepId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_case_shared_steps')
        .select(`
          step_order,
          test_cases!inner(id, title, status)
        `)
        .eq('shared_step_id', sharedStepId);

      if (error) throw error;

      return (data || []).map((item: any) => ({
        test_case_id: item.test_cases.id,
        test_case_title: item.test_cases.title,
        test_case_status: item.test_cases.status,
        step_order: item.step_order,
      })) as SharedStepUsage[];
    },
    enabled: !!sharedStepId,
  });
};

export const useCreateSharedStep = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateSharedStepRequest) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('shared_test_steps')
        .insert({
          title: request.title,
          description: request.description,
          expected_result: request.expected_result,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as SharedTestStep;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-steps'] });
    },
  });
};

export const useUpdateSharedStep = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: UpdateSharedStepRequest) => {
      const { data, error } = await supabase
        .from('shared_test_steps')
        .update({
          title: request.title,
          description: request.description,
          expected_result: request.expected_result,
          updated_at: new Date().toISOString(),
        })
        .eq('id', request.id)
        .select()
        .single();

      if (error) throw error;
      return data as SharedTestStep;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shared-steps'] });
      queryClient.invalidateQueries({ queryKey: ['shared-step', data.id] });
    },
  });
};

export const useDeleteSharedStep = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('shared_test_steps')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-steps'] });
    },
  });
};

export const useAddSharedStepToTestCase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      testCaseId, 
      sharedStepId, 
      stepOrder 
    }: { 
      testCaseId: string; 
      sharedStepId: string; 
      stepOrder: number;
    }) => {
      const { data, error } = await supabase
        .from('test_case_shared_steps')
        .insert({
          test_case_id: testCaseId,
          shared_step_id: sharedStepId,
          step_order: stepOrder,
        })
        .select()
        .single();

      if (error) throw error;
      return data as TestCaseSharedStep;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['test-steps', variables.testCaseId] });
      queryClient.invalidateQueries({ queryKey: ['shared-step-usage', variables.sharedStepId] });
    },
  });
};

export const useRemoveSharedStepFromTestCase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      testCaseId, 
      sharedStepId 
    }: { 
      testCaseId: string; 
      sharedStepId: string;
    }) => {
      const { error } = await supabase
        .from('test_case_shared_steps')
        .delete()
        .eq('test_case_id', testCaseId)
        .eq('shared_step_id', sharedStepId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['test-steps', variables.testCaseId] });
      queryClient.invalidateQueries({ queryKey: ['shared-step-usage', variables.sharedStepId] });
    },
  });
};

export const useConvertToSharedStep = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      stepId, 
      title 
    }: { 
      stepId: string; 
      title: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get the step details
      const { data: step, error: stepError } = await supabase
        .from('test_steps')
        .select('*')
        .eq('id', stepId)
        .single();

      if (stepError) throw stepError;

      // Create shared step
      const { data: sharedStep, error: sharedError } = await supabase
        .from('shared_test_steps')
        .insert({
          title,
          description: step.action, // test_steps uses 'action' field
          expected_result: step.expected_result,
          created_by: user.id,
        })
        .select()
        .single();

      if (sharedError) throw sharedError;

      // Update original step to link to shared step
      const { error: updateError } = await supabase
        .from('test_steps')
        .update({
          is_shared: true,
          library_step_id: sharedStep.id,
        })
        .eq('id', stepId);

      if (updateError) throw updateError;

      return sharedStep as SharedTestStep;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-steps'] });
      queryClient.invalidateQueries({ queryKey: ['test-steps'] });
    },
  });
};
