import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type FieldSection = 'description' | 'context' | 'hidden';

export interface FieldLayoutRow {
  id: string;
  project_key: string | null;
  issue_type: string;
  section: FieldSection;
  field_key: string;
  field_label: string;
  field_type: string;
  position: number;
  is_required: boolean;
  is_pinned: boolean;
  is_system_field: boolean;
  custom_field_def_id: string | null;
}

export interface CustomFieldDef {
  id: string;
  name: string;
  field_type: string;
  description: string | null;
  is_active: boolean;
  is_global: boolean;
  applicable_issue_types: string[];
  options_json: unknown;
  help_text: string | null;
}

const LAYOUT_QUERY_KEY = 'catalyst_field_layouts';
const CUSTOM_FIELDS_QUERY_KEY = 'custom_field_defs';

export function useFieldLayout(issueType: string, projectKey?: string | null) {
  return useQuery({
    queryKey: [LAYOUT_QUERY_KEY, issueType, projectKey ?? null],
    queryFn: async () => {
      // Try project-level override first, then fall back to master
      if (projectKey) {
        const { data: projectRows } = await supabase
          .from('catalyst_field_layouts')
          .select('*')
          .eq('issue_type', issueType)
          .eq('project_key', projectKey)
          .order('section')
          .order('position');
        if (projectRows && projectRows.length > 0) {
          return projectRows as FieldLayoutRow[];
        }
      }
      const { data, error } = await supabase
        .from('catalyst_field_layouts')
        .select('*')
        .eq('issue_type', issueType)
        .is('project_key', null)
        .order('section')
        .order('position');
      if (error) throw error;
      return (data ?? []) as FieldLayoutRow[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useAllFieldLayouts(issueType: string) {
  return useQuery({
    queryKey: [LAYOUT_QUERY_KEY, issueType, 'master'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('catalyst_field_layouts')
        .select('*')
        .eq('issue_type', issueType)
        .is('project_key', null)
        .order('section')
        .order('position');
      if (error) throw error;
      return (data ?? []) as FieldLayoutRow[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCustomFieldDefs() {
  return useQuery({
    queryKey: [CUSTOM_FIELDS_QUERY_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_field_defs')
        .select('id, name, field_type, description, is_active, is_global, applicable_issue_types, options_json, help_text')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return (data ?? []) as CustomFieldDef[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useAllCustomFieldDefs() {
  return useQuery({
    queryKey: [CUSTOM_FIELDS_QUERY_KEY, 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_field_defs')
        .select('id, name, field_type, description, is_active, is_global, applicable_issue_types, options_json, help_text')
        .order('name');
      if (error) throw error;
      return (data ?? []) as CustomFieldDef[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Reorder a field within its section
export function useUpdateFieldPosition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, position, section }: { id: string; position: number; section: FieldSection }) => {
      const { error } = await supabase
        .from('catalyst_field_layouts')
        .update({ position, section })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [LAYOUT_QUERY_KEY] }),
  });
}

// Move a field to a different section
export function useMoveFieldToSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, section, position }: { id: string; section: FieldSection; position: number }) => {
      const { error } = await supabase
        .from('catalyst_field_layouts')
        .update({ section, position })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [LAYOUT_QUERY_KEY] }),
  });
}

// Remove a field from layout (set to hidden)
export function useRemoveFieldFromLayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('catalyst_field_layouts')
        .update({ section: 'hidden' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [LAYOUT_QUERY_KEY] }),
  });
}

// Add a field to a layout section
export function useAddFieldToLayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Omit<FieldLayoutRow, 'id'>) => {
      const { error } = await supabase
        .from('catalyst_field_layouts')
        .upsert({
          ...row,
          section: row.section as string,
        }, { onConflict: 'issue_type,field_key' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [LAYOUT_QUERY_KEY] }),
  });
}

// Batch save: replace entire layout for an issue type (master)
export function useSaveLayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      issueType,
      projectKey,
      rows,
    }: {
      issueType: string;
      projectKey: string | null;
      rows: Pick<FieldLayoutRow, 'id' | 'section' | 'position'>[];
    }) => {
      const updates = rows.map(r =>
        supabase
          .from('catalyst_field_layouts')
          .update({ section: r.section, position: r.position })
          .eq('id', r.id)
      );
      await Promise.all(updates);
    },
    onSuccess: (_d, vars) =>
      qc.invalidateQueries({ queryKey: [LAYOUT_QUERY_KEY, vars.issueType] }),
  });
}

// Create a custom field def
export function useCreateCustomField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: Pick<CustomFieldDef, 'name' | 'field_type' | 'description' | 'is_global' | 'applicable_issue_types' | 'help_text'> & {
        options_json?: unknown;
        placeholder?: string;
        required?: boolean;
      }
    ) => {
      const { data, error } = await supabase
        .from('custom_field_defs')
        .insert({
          name: payload.name,
          field_type: payload.field_type as never,
          description: payload.description,
          is_global: payload.is_global,
          applicable_issue_types: payload.applicable_issue_types,
          help_text: payload.help_text,
          options_json: payload.options_json ?? null,
          required: payload.required ?? false,
          is_active: true,
          entity_type: 'test_case' as never,
        })
        .select('id')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [CUSTOM_FIELDS_QUERY_KEY] }),
  });
}

// Update a custom field def
export function useUpdateCustomField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: Partial<CustomFieldDef> & { id: string }
    ) => {
      const { error } = await supabase
        .from('custom_field_defs')
        .update({
          name: payload.name,
          description: payload.description,
          is_global: payload.is_global,
          applicable_issue_types: payload.applicable_issue_types,
          help_text: payload.help_text,
          options_json: payload.options_json ?? null,
          is_active: payload.is_active,
        })
        .eq('id', payload.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [CUSTOM_FIELDS_QUERY_KEY] }),
  });
}

export function useDeactivateCustomField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('custom_field_defs')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [CUSTOM_FIELDS_QUERY_KEY] }),
  });
}
