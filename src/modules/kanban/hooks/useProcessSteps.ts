/**
 * useProcessSteps - Business Request process steps for Kanban columns.
 * Source of truth: ph_workflow_type_statuses via useTypeWorkflow('BAU','Business Request').
 * Legacy demand_process_steps table is no longer consulted.
 */

import { useMemo } from 'react';
import { useTypeWorkflow } from '@/hooks/useTypeWorkflow';
import type { DynamicColumnConfig } from '../types';

export interface ProcessStep {
  id: string;
  value: string;
  label: string;
  sort_order: number;
  is_active: boolean;
}

// Category → ADS-token column color
const CATEGORY_COLOR: Record<string, string> = {
  todo:        'var(--ds-text-subtlest)',
  in_progress: 'var(--ds-text-information)',
  done:        'var(--ds-text-success)',
};

export function useProcessSteps() {
  const { data: brWorkflow, isLoading, error } = useTypeWorkflow('BAU', 'Business Request');

  const data = useMemo<ProcessStep[]>(
    () => (brWorkflow?.statuses ?? []).map(s => ({
      id: s.id,
      value: s.name,
      label: s.name,
      sort_order: s.position,
      is_active: true,
    })),
    [brWorkflow?.statuses],
  );

  return { data, isLoading, error };
}

/**
 * Converts workflow statuses to column configuration for Kanban.
 * Adds an "Uncategorized" column at the end for items with no/invalid process_step.
 */
export function useKanbanColumns() {
  const { data: processSteps, isLoading, error } = useProcessSteps();

  const columns: DynamicColumnConfig[] = useMemo(() => {
    const cols: DynamicColumnConfig[] = (processSteps ?? []).map((step) => ({
      id: step.value,
      label: step.label,
      color: CATEGORY_COLOR['in_progress'], // default; consumers can override per category
      order: step.sort_order,
    }));

    if (cols.length > 0) {
      cols.push({
        id: '_uncategorized',
        label: 'Uncategorized',
        color: CATEGORY_COLOR['todo'],
        order: 9999,
      });
    }

    return cols;
  }, [processSteps]);

  return { columns, isLoading, error };
}
