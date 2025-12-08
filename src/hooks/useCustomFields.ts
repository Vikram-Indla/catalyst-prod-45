import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type FieldType = 'text' | 'number' | 'date' | 'select' | 'multi_select' | 'boolean';

export interface CustomFieldDef {
  id: string;
  entity_type: string;
  name: string;
  field_type: FieldType;
  required: boolean;
  description?: string;
  display_order: number;
  is_active: boolean;
  options_json?: { options?: string[] };
  default_value?: any;
  placeholder?: string;
  validation_rules?: any;
  created_at?: string;
  updated_at?: string;
}

export interface CustomFieldValue {
  id: string;
  custom_field_def_id: string;
  entity_type: string;
  entity_id: string;
  value_json: any;
  created_at?: string;
  updated_at?: string;
}

export function useCustomFields(entityType: string, entityId: string) {
  const queryClient = useQueryClient();

  // Fetch field definitions for this entity type
  const { data: fieldDefs = [], isLoading: defsLoading } = useQuery({
    queryKey: ['custom-field-defs', entityType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_field_defs')
        .select('*')
        .eq('entity_type', entityType)
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      return data as CustomFieldDef[];
    },
    enabled: !!entityType,
  });

  // Fetch values for this specific entity
  const { data: fieldValues = [], isLoading: valuesLoading } = useQuery({
    queryKey: ['custom-field-values', entityType, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_field_values')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId);

      if (error) throw error;
      return data as CustomFieldValue[];
    },
    enabled: !!entityType && !!entityId,
  });

  // Get value for a specific field
  const getFieldValue = (fieldDefId: string): any => {
    const valueRecord = fieldValues.find(v => v.custom_field_def_id === fieldDefId);
    return valueRecord?.value_json;
  };

  // Update or create field value
  const updateFieldValue = useMutation({
    mutationFn: async ({ fieldDefId, value }: { fieldDefId: string; value: any }) => {
      const existingValue = fieldValues.find(v => v.custom_field_def_id === fieldDefId);

      if (existingValue) {
        const { error } = await supabase
          .from('custom_field_values')
          .update({ value_json: value, updated_at: new Date().toISOString() })
          .eq('id', existingValue.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('custom_field_values')
          .insert({
            custom_field_def_id: fieldDefId,
            entity_type: entityType,
            entity_id: entityId,
            value_json: value,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-field-values', entityType, entityId] });
    },
    onError: () => {
      toast.error('Failed to save custom field');
    },
  });

  // Combine definitions with values for display
  const fieldsWithValues = fieldDefs.map(def => ({
    ...def,
    value: getFieldValue(def.id),
  }));

  return {
    fieldDefs,
    fieldValues,
    fieldsWithValues,
    isLoading: defsLoading || valuesLoading,
    getFieldValue,
    updateFieldValue,
  };
}
