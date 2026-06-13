/**
 * ProcessStepsContext - Provides dynamic process steps data throughout the app
 *
 * Source of truth: ph_workflow_type_statuses (via useTypeWorkflow('BAU', 'Business Request'))
 * Legacy demand_process_steps table is no longer the source — all status changes
 * must go through /admin/workflows.
 */

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { useTypeWorkflow } from '@/hooks/useTypeWorkflow';
import { getBrandColorHex } from '@/components/admin/BrandColorPicker';

// Category → default color fallback when no explicit color is set on the status
const CATEGORY_COLOR: Record<string, string> = {
  todo:        'olive',
  in_progress: 'blue',
  done:        'green',
};

export interface ProcessStep {
  id: string;
  value: string;
  label: string;
  sort_order: number;
  is_active: boolean;
  color: string | null;
}

export interface ProcessStepOption {
  value: string;
  label: string;
}

interface ProcessStepsContextValue {
  processSteps: ProcessStep[];
  processStepOptions: ProcessStepOption[];
  getProcessStepLabel: (value: string | null | undefined) => string;
  getProcessStepColor: (value: string | null | undefined) => string;
  getProcessStepInfo: (value: string | null | undefined) => { label: string; color: string };
  isLoading: boolean;
}

const ProcessStepsContext = createContext<ProcessStepsContextValue | undefined>(undefined);

interface ProcessStepsProviderProps {
  children: ReactNode;
}

export function ProcessStepsProvider({ children }: ProcessStepsProviderProps) {
  // Single source of truth: ph_workflow_type_statuses for Business Request via BAU project
  const { data: brWorkflow, isLoading } = useTypeWorkflow('BAU', 'Business Request');

  // Map TypeStatus[] → ProcessStep[] so all consumers work unchanged
  const processSteps = useMemo<ProcessStep[]>(
    () => (brWorkflow?.statuses ?? []).map(s => ({
      id: s.id,
      value: s.name,
      label: s.name,
      sort_order: s.position,
      is_active: true,
      color: s.color ?? CATEGORY_COLOR[s.category] ?? 'olive',
    })),
    [brWorkflow?.statuses],
  );

  // Build lookup map for O(1) access
  const processStepMap = useMemo(() => {
    const map = new Map<string, ProcessStep>();
    processSteps.forEach(step => {
      map.set(step.value.toLowerCase(), step);
    });
    return map;
  }, [processSteps]);

  // Options array for dropdowns (compatible with existing PROCESS_STEPS format)
  const processStepOptions = useMemo(() => 
    processSteps.map(step => ({
      value: step.value,
      label: step.label,
    })),
    [processSteps]
  );

  // Get label for a value (case-insensitive)
  const getProcessStepLabel = useMemo(() => 
    (value: string | null | undefined): string => {
      if (!value) return 'Unknown';
      const step = processStepMap.get(value.toLowerCase());
      if (step) return step.label;
      // Fallback: format the value nicely
      return value.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
    },
    [processStepMap]
  );

  // Get color hex for a value (case-insensitive)
  const getProcessStepColor = useMemo(() =>
    (value: string | null | undefined): string => {
      if (!value) return getBrandColorHex('olive');
      const step = processStepMap.get(value.toLowerCase());
      return getBrandColorHex(step?.color);
    },
    [processStepMap]
  );

  // Get process step info (compatible with getProcessStepInfo from business-request.ts)
  // Now includes color from database
  const getProcessStepInfo = useMemo(() =>
    (value: string | null | undefined): { label: string; color: string } => {
      return { 
        label: getProcessStepLabel(value),
        color: getProcessStepColor(value),
      };
    },
    [getProcessStepLabel, getProcessStepColor]
  );

  const contextValue = useMemo<ProcessStepsContextValue>(() => ({
    processSteps,
    processStepOptions,
    getProcessStepLabel,
    getProcessStepColor,
    getProcessStepInfo,
    isLoading,
  }), [processSteps, processStepOptions, getProcessStepLabel, getProcessStepColor, getProcessStepInfo, isLoading]);

  return (
    <ProcessStepsContext.Provider value={contextValue}>
      {children}
    </ProcessStepsContext.Provider>
  );
}

/**
 * Hook to access process steps context
 * Throws if used outside of ProcessStepsProvider
 */
export function useProcessSteps(): ProcessStepsContextValue {
  const context = useContext(ProcessStepsContext);
  if (context === undefined) {
    throw new Error('useProcessSteps must be used within a ProcessStepsProvider');
  }
  return context;
}

/**
 * Hook that returns just the options array (drop-in replacement for PROCESS_STEPS import)
 * Can be used in components that only need the dropdown options
 */
export function useProcessStepOptions(): ProcessStepOption[] {
  const { processStepOptions } = useProcessSteps();
  return processStepOptions;
}

/**
 * Hook that returns a function to get label and color (enhanced replacement for getProcessStepInfo)
 */
export function useProcessStepInfo(): (value: string | null | undefined) => { label: string; color: string } {
  const { getProcessStepInfo } = useProcessSteps();
  return getProcessStepInfo;
}
