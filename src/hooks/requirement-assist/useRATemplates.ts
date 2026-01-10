import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { 
  RATemplate, 
  CreateRATemplate, 
  UpdateRATemplate,
  TemplateType 
} from '@/types/requirement-assist';

// Fetch all active templates
export function useRATemplates(type?: TemplateType) {
  return useQuery({
    queryKey: ['ra-templates', type],
    queryFn: async () => {
      let query = supabase
        .from('ra_templates')
        .select('*')
        .eq('is_active', true)
        .order('template_type', { ascending: true })
        .order('is_default', { ascending: false });

      if (type) {
        query = query.eq('template_type', type);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as RATemplate[];
    },
  });
}

// Fetch all templates (including inactive) for admin
export function useRAAllTemplates() {
  return useQuery({
    queryKey: ['ra-templates-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ra_templates')
        .select('*')
        .order('template_type', { ascending: true })
        .order('is_default', { ascending: false });

      if (error) throw error;
      return data as RATemplate[];
    },
  });
}

// Fetch single template
export function useRATemplate(id: string | undefined) {
  return useQuery({
    queryKey: ['ra-template', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('ra_templates')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data as RATemplate | null;
    },
    enabled: !!id,
  });
}

// Get default template for a type
export function useRADefaultTemplate(type: TemplateType) {
  return useQuery({
    queryKey: ['ra-template-default', type],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ra_templates')
        .select('*')
        .eq('template_type', type)
        .eq('is_default', true)
        .eq('is_active', true)
        .maybeSingle();
      if (error) throw error;
      return data as RATemplate | null;
    },
  });
}

// Create template
export function useCreateRATemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: CreateRATemplate) => {
      const { data, error } = await supabase
        .from('ra_templates')
        .insert(template)
        .select()
        .single();
      if (error) throw error;
      return data as RATemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ra-templates'] });
      queryClient.invalidateQueries({ queryKey: ['ra-templates-all'] });
      toast.success('Template created');
    },
    onError: (error) => {
      console.error('Error creating template:', error);
      toast.error('Failed to create template');
    },
  });
}

// Update template
export function useUpdateRATemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateRATemplate & { id: string }) => {
      const { data, error } = await supabase
        .from('ra_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as RATemplate;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ra-templates'] });
      queryClient.invalidateQueries({ queryKey: ['ra-templates-all'] });
      queryClient.invalidateQueries({ queryKey: ['ra-template', data.id] });
      toast.success('Template updated');
    },
    onError: (error) => {
      console.error('Error updating template:', error);
      toast.error('Failed to update template');
    },
  });
}

// Delete/deactivate template
export function useDeleteRATemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ra_templates')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ra-templates'] });
      queryClient.invalidateQueries({ queryKey: ['ra-templates-all'] });
      toast.success('Template deleted');
    },
    onError: (error) => {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    },
  });
}
