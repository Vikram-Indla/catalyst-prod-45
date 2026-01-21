/**
 * Module 3C-2: Main orchestration hook for batch export
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { generateExportFile } from '../lib/export-generator';
import { downloadFile } from '../lib/file-download';
import type {
  ExportWizardState,
  ExportFormat,
  ExportFilters,
  WizardStep,
  ExportResult,
} from '../types/batch-export';
import { AVAILABLE_FIELDS, DEFAULT_FILTERS } from '../types/batch-export';

const initialState: ExportWizardState = {
  currentStep: 1,
  format: 'csv',
  fields: [...AVAILABLE_FIELDS],
  filters: { ...DEFAULT_FILTERS },
  selectedTestCases: [],
  selectAll: true,
  progress: 0,
  status: 'pending',
  result: null,
};

export function useBatchExport(projectId: string) {
  const { toast } = useToast();
  const [state, setState] = useState<ExportWizardState>(initialState);
  const [jobId, setJobId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Step 1: Select format
  const selectFormat = useCallback((format: ExportFormat) => {
    setState(prev => ({ ...prev, format }));
  }, []);

  // Step 2: Toggle field selection
  const toggleField = useCallback((key: string) => {
    setState(prev => ({
      ...prev,
      fields: prev.fields.map(f =>
        f.key === key && !f.required ? { ...f, selected: !f.selected } : f
      ),
    }));
  }, []);

  const selectAllFields = useCallback(() => {
    setState(prev => ({
      ...prev,
      fields: prev.fields.map(f => ({ ...f, selected: true })),
    }));
  }, []);

  const selectRequiredOnly = useCallback(() => {
    setState(prev => ({
      ...prev,
      fields: prev.fields.map(f => ({ ...f, selected: f.required })),
    }));
  }, []);

  // Toggle test case selection
  const toggleTestCase = useCallback((id: string) => {
    setState(prev => {
      const selected = prev.selectedTestCases.includes(id)
        ? prev.selectedTestCases.filter(tcId => tcId !== id)
        : [...prev.selectedTestCases, id];
      return { ...prev, selectedTestCases: selected, selectAll: false };
    });
  }, []);

  const toggleSelectAll = useCallback((allIds: string[]) => {
    setState(prev => ({
      ...prev,
      selectAll: !prev.selectAll,
      selectedTestCases: prev.selectAll ? [] : allIds,
    }));
  }, []);

  // Update filters
  const updateFilters = useCallback((filters: Partial<ExportFilters>) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, ...filters },
    }));
  }, []);

  const setFilter = useCallback((type: keyof ExportFilters, value: string) => {
    setState(prev => {
      const current = prev.filters[type];
      if (Array.isArray(current)) {
        const updated = current.includes(value)
          ? current.filter(v => v !== value)
          : [...current, value];
        return { ...prev, filters: { ...prev.filters, [type]: updated } };
      }
      return prev;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setState(prev => ({ ...prev, filters: { ...DEFAULT_FILTERS } }));
  }, []);

  // Step 3: Execute export
  const executeExport = useCallback(async () => {
    if (isExporting) return;
    
    setIsExporting(true);
    try {
      setState(prev => ({ ...prev, currentStep: 3, status: 'processing', progress: 0 }));

      // Create job
      const selectedFields = state.fields.filter(f => f.selected).map(f => f.key);

      const { data: jobData, error: jobError } = await supabase
        .rpc('create_export_job', {
          p_project_id: projectId,
          p_format: state.format,
          p_fields: JSON.parse(JSON.stringify(selectedFields)),
          p_filters: JSON.parse(JSON.stringify(state.filters)),
          p_test_case_ids: JSON.parse(JSON.stringify(state.selectAll ? [] : state.selectedTestCases)),
        });

      if (jobError) throw jobError;
      
      const result = jobData as { success: boolean; job_id: string; total_records: number; error?: string };
      if (result.error) throw new Error(result.error);
      
      setJobId(result.job_id);
      setState(prev => ({ ...prev, progress: 20 }));

      // Get export data
      const { data: exportData, error: dataError } = await supabase
        .rpc('get_export_data', { p_job_id: result.job_id });

      if (dataError) throw dataError;
      
      const exportResult = exportData as { 
        success: boolean; 
        data: Record<string, unknown>[]; 
        fields: string[]; 
        format: ExportFormat;
        error?: string;
      };
      
      if (exportResult.error) throw new Error(exportResult.error);

      setState(prev => ({ ...prev, progress: 50 }));

      // Generate file
      const file = await generateExportFile(
        exportResult.data,
        selectedFields,
        state.format
      );

      setState(prev => ({ ...prev, progress: 80 }));

      // Complete job
      await supabase.rpc('complete_export_job', {
        p_job_id: result.job_id,
        p_file_name: file.name,
        p_file_size: file.size,
        p_file_url: null,
      });

      const exportResultData: ExportResult = {
        success: true,
        fileName: file.name,
        fileSize: file.size,
        recordCount: exportResult.data.length,
        fieldCount: selectedFields.length,
      };

      setState(prev => ({
        ...prev,
        status: 'completed',
        progress: 100,
        result: exportResultData,
      }));

      // Auto-download
      downloadFile(file.blob, file.name);

      toast({
        title: 'Export completed',
        description: `Successfully exported ${exportResult.data.length} test cases`,
      });
    } catch (error) {
      console.error('Export failed:', error);
      
      if (jobId) {
        await supabase.rpc('fail_export_job', {
          p_job_id: jobId,
          p_error_message: (error as Error).message,
        });
      }

      toast({
        title: 'Export failed',
        description: (error as Error).message,
        variant: 'destructive',
      });
      setState(prev => ({ ...prev, status: 'failed' }));
    } finally {
      setIsExporting(false);
    }
  }, [projectId, state.format, state.fields, state.filters, state.selectedTestCases, state.selectAll, toast, isExporting, jobId]);

  // Navigation
  const goToStep = useCallback((step: WizardStep) => {
    setState(prev => ({ ...prev, currentStep: step }));
  }, []);

  const nextStep = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: Math.min(prev.currentStep + 1, 3) as WizardStep,
    }));
  }, []);

  const prevStep = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 1) as WizardStep,
    }));
  }, []);

  // Reset
  const reset = useCallback(() => {
    setState(initialState);
    setJobId(null);
    setIsExporting(false);
  }, []);

  // Download result
  const downloadResult = useCallback(async () => {
    if (!state.result) return;
    
    // Re-execute to get fresh file
    await executeExport();
  }, [state.result, executeExport]);

  return {
    ...state,
    isExporting,
    jobId,
    selectFormat,
    toggleField,
    selectAllFields,
    selectRequiredOnly,
    toggleTestCase,
    toggleSelectAll,
    updateFilters,
    setFilter,
    clearFilters,
    executeExport,
    goToStep,
    nextStep,
    prevStep,
    reset,
    downloadResult,
    getSelectedFieldCount: () => state.fields.filter(f => f.selected).length,
    getSelectedCount: () => state.selectedTestCases.length,
    canProceed: state.fields.some(f => f.selected),
  };
}
