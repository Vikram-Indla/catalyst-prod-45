import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  TestParameter,
  TestDataRow,
  CreateParameterInput,
  UpdateParameterInput,
  CreateDataRowInput,
  UpdateDataRowInput,
} from '@/types/testData.types';

// Parameters hooks
export const useTestParameters = (testCaseId: string) => {
  return useQuery({
    queryKey: ['test-parameters', testCaseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_data_parameters')
        .select('*')
        .eq('test_case_id', testCaseId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as TestParameter[];
    },
    enabled: !!testCaseId,
  });
};

export const useCreateParameter = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateParameterInput) => {
      const { data, error } = await supabase
        .from('test_data_parameters')
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data as TestParameter;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['test-parameters', variables.test_case_id] });
    },
  });
};

export const useUpdateParameter = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, testCaseId, ...input }: UpdateParameterInput & { id: string; testCaseId: string }) => {
      const { data, error } = await supabase
        .from('test_data_parameters')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as TestParameter;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['test-parameters', variables.testCaseId] });
    },
  });
};

export const useDeleteParameter = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, testCaseId }: { id: string; testCaseId: string }) => {
      const { error } = await supabase
        .from('test_data_parameters')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['test-parameters', variables.testCaseId] });
    },
  });
};

// Data rows hooks
export const useTestDataRows = (testCaseId: string) => {
  return useQuery({
    queryKey: ['test-data-rows', testCaseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_data_rows')
        .select('*')
        .eq('test_case_id', testCaseId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as TestDataRow[];
    },
    enabled: !!testCaseId,
  });
};

export const useCreateDataRow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateDataRowInput) => {
      const { data, error } = await supabase
        .from('test_data_rows')
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data as TestDataRow;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['test-data-rows', variables.test_case_id] });
    },
  });
};

export const useUpdateDataRow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, testCaseId, ...input }: UpdateDataRowInput & { id: string; testCaseId: string }) => {
      const { data, error } = await supabase
        .from('test_data_rows')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as TestDataRow;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['test-data-rows', variables.testCaseId] });
    },
  });
};

export const useDeleteDataRow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, testCaseId }: { id: string; testCaseId: string }) => {
      const { error } = await supabase
        .from('test_data_rows')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['test-data-rows', variables.testCaseId] });
    },
  });
};

// Bulk import
export const useBulkImportDataRows = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ testCaseId, rows }: { testCaseId: string; rows: Record<string, any>[] }) => {
      const dataRows = rows.map(row => ({
        test_case_id: testCaseId,
        row_data: row,
      }));

      const { data, error } = await supabase
        .from('test_data_rows')
        .insert(dataRows)
        .select();

      if (error) throw error;
      return data as TestDataRow[];
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['test-data-rows', variables.testCaseId] });
    },
  });
};
