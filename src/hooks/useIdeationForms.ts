// ==============================================
// IDEATION FORMS HOOKS
// Per Jira Align Form Builder specification
// ==============================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { IdeationForm, IdeationFormField, FormFieldType } from '@/types/ideation';
import { toast } from 'sonner';

export function useIdeationForms() {
  return useQuery({
    queryKey: ['ideation-forms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ideation_forms')
        .select('*, ideation_form_fields(*)')
        .order('name', { ascending: true });
      if (error) throw error;
      return (data || []).map((form: any) => ({
        ...form,
        fields: form.ideation_form_fields || [],
      })) as IdeationForm[];
    },
  });
}

export function useIdeationForm(formId: string | null) {
  return useQuery({
    queryKey: ['ideation-form', formId],
    queryFn: async () => {
      if (!formId) return null;
      const { data, error } = await supabase
        .from('ideation_forms')
        .select('*, ideation_form_fields(*)')
        .eq('id', formId)
        .single();
      if (error) throw error;
      return {
        ...data,
        fields: (data.ideation_form_fields || []).sort(
          (a: IdeationFormField, b: IdeationFormField) => a.sort_order - b.sort_order
        ),
      } as IdeationForm;
    },
    enabled: !!formId,
  });
}

export function useCreateIdeationForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const { data: form, error } = await supabase
        .from('ideation_forms')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return form as IdeationForm;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ideation-forms'] });
      toast.success('Form created');
    },
    onError: (error: any) => {
      toast.error(`Failed to create form: ${error.message}`);
    },
  });
}

export function useUpdateIdeationForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; description?: string }) => {
      const { data, error } = await supabase
        .from('ideation_forms')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as IdeationForm;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ideation-forms'] });
      queryClient.invalidateQueries({ queryKey: ['ideation-form', data.id] });
      toast.success('Form updated');
    },
    onError: (error: any) => {
      toast.error(`Failed to update form: ${error.message}`);
    },
  });
}

export function useDeleteIdeationForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formId: string) => {
      const { error } = await supabase
        .from('ideation_forms')
        .delete()
        .eq('id', formId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ideation-forms'] });
      toast.success('Form deleted');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete form: ${error.message}`);
    },
  });
}

// Form Fields
export function useCreateFormField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      form_id: string;
      label: string;
      field_type: FormFieldType;
      options?: string[];
      is_required?: boolean;
      is_external?: boolean;
      help_text?: string;
      sort_order: number;
    }) => {
      const { data: field, error } = await supabase
        .from('ideation_form_fields')
        .insert({
          ...data,
          options: data.options || [],
          is_active: true,
        })
        .select()
        .single();
      if (error) throw error;
      return field as IdeationFormField;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ideation-form', data.form_id] });
      queryClient.invalidateQueries({ queryKey: ['ideation-forms'] });
      toast.success('Field added');
    },
    onError: (error: any) => {
      toast.error(`Failed to add field: ${error.message}`);
    },
  });
}

export function useUpdateFormField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      form_id,
      ...updates
    }: {
      id: string;
      form_id: string;
      label?: string;
      field_type?: FormFieldType;
      options?: string[];
      is_required?: boolean;
      is_external?: boolean;
      is_active?: boolean;
      help_text?: string;
      sort_order?: number;
    }) => {
      const { data, error } = await supabase
        .from('ideation_form_fields')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return { ...data, form_id } as IdeationFormField;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ideation-form', data.form_id] });
      queryClient.invalidateQueries({ queryKey: ['ideation-forms'] });
      toast.success('Field updated');
    },
    onError: (error: any) => {
      toast.error(`Failed to update field: ${error.message}`);
    },
  });
}

export function useDeleteFormField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, form_id }: { id: string; form_id: string }) => {
      const { error } = await supabase
        .from('ideation_form_fields')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { form_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ideation-form', data.form_id] });
      queryClient.invalidateQueries({ queryKey: ['ideation-forms'] });
      toast.success('Field deleted');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete field: ${error.message}`);
    },
  });
}

export function useReorderFormFields() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ form_id, fields }: { form_id: string; fields: { id: string; sort_order: number }[] }) => {
      const updates = fields.map((f) =>
        supabase
          .from('ideation_form_fields')
          .update({ sort_order: f.sort_order })
          .eq('id', f.id)
      );
      await Promise.all(updates);
      return { form_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ideation-form', data.form_id] });
    },
    onError: (error: any) => {
      toast.error(`Failed to reorder fields: ${error.message}`);
    },
  });
}
