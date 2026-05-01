/**
 * useProcessSteps - Fetches active process steps from demand_process_steps table
 * These are used to dynamically build Kanban columns
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DynamicColumnConfig } from '../types';

export interface ProcessStep {
  id: string;
  value: string;
  label: string;
  sort_order: number;
  is_active: boolean;
}

// Color palette for dynamic columns
const COLUMN_COLORS = [
  'var(--ds-text-brand, #3b82f6)', // Blue
  'var(--ds-text-brand, #2563eb)', // Blue-600
  'var(--ds-background-brand-bold-hovered, #1d4ed8)', // Blue-700
  '#0d9488', // Teal
  'var(--ds-text-danger, #ef4444)', // Red
  '#f97316', // Orange
  '#0f766e', // Teal-dark
  '#6b7280', // Gray
  '#78716c', // Stone
  '#9ca3af', // Gray Light
];

export function useProcessSteps() {
  return useQuery({
    queryKey: ['demand-process-steps'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('demand_process_steps')
        .select('id, value, label, sort_order, is_active')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data as ProcessStep[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
}

/**
 * Converts process steps to column configuration for Kanban
 * Adds an "Uncategorized" column at the end for items with no/invalid process_step
 */
export function useKanbanColumns() {
  const { data: processSteps, isLoading, error } = useProcessSteps();
  
  const columns: DynamicColumnConfig[] = processSteps?.map((step, index) => ({
    id: step.value,
    label: step.label,
    color: COLUMN_COLORS[index % COLUMN_COLORS.length],
    order: step.sort_order,
  })) || [];
  
  // Add Uncategorized column at the end
  if (columns.length > 0) {
    columns.push({
      id: '_uncategorized',
      label: 'Uncategorized',
      color: '#9ca3af', // Gray
      order: 9999,
    });
  }
  
  return { columns, isLoading, error };
}
