/**
 * Test Data Hooks
 * CRUD operations for test_data_parameters and test_data_rows
 * Phase 1: Persistence for Create Dialog
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ============================================================================
// Types
// ============================================================================

export interface TestDataParameter {
  id: string;
  test_case_id: string;
  parameter_name: string;
  parameter_type: string;
  column_order: number;
  created_at: string;
  updated_at: string;
}

export interface TestDataRow {
  id: string;
  test_case_id: string;
  row_data: Record<string, string>;
  row_order: number;
  created_at: string;
  updated_at: string;
}

export interface SaveTestDataInput {
  testCaseId: string;
  /** Column headers in order */
  parameterHeaders: string[];
  /** Row values - each row maps column names to cell values */
  rows: Array<{ id: string; values: Record<string, string> }>;
}

interface SaveTestDataResult {
  success: boolean;
  parameters_saved: number;
  rows_saved: number;
}

// ============================================================================
// Query Keys
// ============================================================================

const testDataKeys = {
  all: ['test-data'] as const,
  parameters: (testCaseId: string) => [...testDataKeys.all, 'parameters', testCaseId] as const,
  rows: (testCaseId: string) => [...testDataKeys.all, 'rows', testCaseId] as const,
};

// ============================================================================
// Read Hooks
// ============================================================================

/**
 * Fetch test data parameters (columns) for a test case
 */
export function useTestDataParameters(testCaseId: string | undefined) {
  return useQuery({
    queryKey: testDataKeys.parameters(testCaseId || ''),
    queryFn: async (): Promise<TestDataParameter[]> => {
      if (!testCaseId) return [];
      
      const { data, error } = await supabase
        .from('test_data_parameters')
        .select('*')
        .eq('test_case_id', testCaseId)
        .order('column_order', { ascending: true });
      
      if (error) {
        console.error('[useTestDataParameters] Query failed:', error);
        throw new Error(error.message);
      }
      
      return (data || []) as TestDataParameter[];
    },
    enabled: Boolean(testCaseId),
    staleTime: 30_000,
  });
}

/**
 * Fetch test data rows for a test case
 */
export function useTestDataRows(testCaseId: string | undefined) {
  return useQuery({
    queryKey: testDataKeys.rows(testCaseId || ''),
    queryFn: async (): Promise<TestDataRow[]> => {
      if (!testCaseId) return [];
      
      const { data, error } = await supabase
        .from('test_data_rows')
        .select('*')
        .eq('test_case_id', testCaseId)
        .order('row_order', { ascending: true });
      
      if (error) {
        console.error('[useTestDataRows] Query failed:', error);
        throw new Error(error.message);
      }
      
      return (data || []).map(row => ({
        ...row,
        row_data: row.row_data as Record<string, string>,
      })) as TestDataRow[];
    },
    enabled: Boolean(testCaseId),
    staleTime: 30_000,
  });
}

// ============================================================================
// Save Mutation (Atomic via RPC)
// ============================================================================

/**
 * Save test data atomically - replaces all parameters and rows
 * Uses RPC function to ensure no partial writes
 */
export function useSaveTestData() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: SaveTestDataInput): Promise<SaveTestDataResult> => {
      const { testCaseId, parameterHeaders, rows } = input;
      
      if (!testCaseId) {
        throw new Error('Test case ID is required');
      }
      
      // Filter out empty headers and get the final valid headers list
      const validHeaders = parameterHeaders.filter(h => h.trim() !== '');
      
      if (validHeaders.length === 0 && rows.length === 0) {
        // Nothing to save - return success with 0 counts
        return { success: true, parameters_saved: 0, rows_saved: 0 };
      }
      
      // Transform headers to parameters array
      const parameters = validHeaders.map((name, index) => ({
        parameter_name: name,
        parameter_type: 'text', // Default type for now
        column_order: index,
      }));
      
      // Transform rows to row_data array
      // CRITICAL: Rebuild row_data to only include valid headers (prevents key desync)
      const rowsData = rows.map((row, index) => {
        // Only keep values for headers that exist in the final validHeaders list
        const normalizedRowData: Record<string, string> = {};
        for (const header of validHeaders) {
          normalizedRowData[header] = row.values[header] ?? '';
        }
        return {
          row_data: normalizedRowData,
          row_order: index,
        };
      });
      
      // Call atomic RPC function
      const { data, error } = await supabase.rpc('save_test_data', {
        p_test_case_id: testCaseId,
        p_parameters: parameters,
        p_rows: rowsData,
      });
      
      if (error) {
        console.error('[useSaveTestData] RPC failed:', error);
        throw new Error(error.message);
      }
      
      const result = data as unknown as SaveTestDataResult;
      
      if (!result?.success) {
        throw new Error('Failed to save test data');
      }
      
      return result;
    },
    onSuccess: (result, variables) => {
      // Invalidate queries for the test case
      queryClient.invalidateQueries({ 
        queryKey: testDataKeys.parameters(variables.testCaseId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: testDataKeys.rows(variables.testCaseId) 
      });
      
      console.log('[useSaveTestData] Success:', result);
    },
    onError: (error) => {
      console.error('[useSaveTestData] Error:', error);
      // Don't toast here - let caller handle it for proper UX
    },
  });
}

// ============================================================================
// Helper: Check if form has test data to save
// ============================================================================

export function hasTestDataToSave(
  parameterHeaders: string[], 
  parameters: Array<{ id: string; values: Record<string, string> }>
): boolean {
  // Filter to only non-empty headers
  const validHeaders = parameterHeaders.filter(h => h.trim() !== '');
  
  // Has data if there are valid headers AND at least one row with non-empty values
  if (validHeaders.length === 0) return false;
  if (parameters.length === 0) return false;
  
  // Check if any row has any non-empty cell value
  const hasAnyData = parameters.some(row => 
    validHeaders.some(header => (row.values[header] ?? '').trim() !== '')
  );
  
  return hasAnyData;
}
