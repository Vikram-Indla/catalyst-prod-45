/**
 * Phase 5C: Test Data Sets Hook
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { TestDataSet, DataSetFormData } from '../types/test-data-management';

export function useDataSets(projectId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const queryKey = ['test-data-sets', projectId];

  const { data: dataSets = [], isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      let query = supabase
        .from('test_data_sets')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as TestDataSet[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (formData: DataSetFormData & { project_id?: string }) => {
      const { data: user } = await supabase.auth.getUser();
      
      let parsedContent = null;
      if (formData.data_content) {
        try {
          parsedContent = formData.data_type === 'json' 
            ? JSON.parse(formData.data_content)
            : { raw: formData.data_content };
        } catch {
          parsedContent = { raw: formData.data_content };
        }
      }

      const { data, error } = await supabase
        .from('test_data_sets')
        .insert({
          name: formData.name,
          description: formData.description || null,
          data_type: formData.data_type,
          data_content: parsedContent,
          is_sensitive: formData.is_sensitive,
          project_id: formData.project_id || null,
          created_by: user?.user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Data set created successfully' });
    },
    onError: (error) => {
      toast({ 
        title: 'Failed to create data set', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...formData }: Partial<DataSetFormData> & { id: string }) => {
      let parsedContent = undefined;
      if (formData.data_content !== undefined) {
        try {
          parsedContent = formData.data_type === 'json' 
            ? JSON.parse(formData.data_content)
            : { raw: formData.data_content };
        } catch {
          parsedContent = { raw: formData.data_content };
        }
      }

      const { data, error } = await supabase
        .from('test_data_sets')
        .update({
          ...(formData.name && { name: formData.name }),
          ...(formData.description !== undefined && { description: formData.description }),
          ...(formData.data_type && { data_type: formData.data_type }),
          ...(parsedContent !== undefined && { data_content: parsedContent }),
          ...(formData.is_sensitive !== undefined && { is_sensitive: formData.is_sensitive }),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Data set updated successfully' });
    },
    onError: (error) => {
      toast({ 
        title: 'Failed to update data set', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('test_data_sets')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Data set deleted successfully' });
    },
    onError: (error) => {
      toast({ 
        title: 'Failed to delete data set', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  return {
    dataSets,
    isLoading,
    error,
    createDataSet: createMutation.mutateAsync,
    updateDataSet: updateMutation.mutateAsync,
    deleteDataSet: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
