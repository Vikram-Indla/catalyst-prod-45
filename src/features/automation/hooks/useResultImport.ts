/**
 * Module 5A-2: Result Import & Mapping - Hooks
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';
import type { 
  ImportJob, 
  UnmappedTest, 
  ParsedResult, 
  SourceFormat 
} from '../types/import';

// ─────────────────────────────────────────────────────────────────────────────
// Hook: useResultImport - Import automation results
// ─────────────────────────────────────────────────────────────────────────────

export function useResultImport() {
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const importResults = useCallback(async (
    connectorId: string,
    results: ParsedResult[],
    sourceFileName?: string,
    sourceFormat: SourceFormat = 'junit'
  ) => {
    setIsImporting(true);
    setProgress(0);
    
    try {
      const { data, error } = await supabase.rpc('import_automation_results', {
        p_connector_id: connectorId,
        p_results: results as unknown as Json,
        p_source_file_name: sourceFileName || null,
        p_source_format: sourceFormat
      });

      if (error) throw error;
      
      const result = data as unknown as { 
        success: boolean; 
        job_id: string; 
        imported: number; 
        mapped: number 
      } | null;
      
      if (result?.success) {
        setProgress(100);
        toast({ 
          title: 'Import Complete', 
          description: `Imported ${result.imported} results (${result.mapped} auto-mapped)` 
        });
        return result;
      }
    } catch (err) {
      toast({ title: 'Import Failed', description: 'Failed to import results', variant: 'destructive' });
    } finally {
      setIsImporting(false);
    }
  }, []);

  return { importResults, isImporting, progress };
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: useTestMapping - Manage test mappings
// ─────────────────────────────────────────────────────────────────────────────

export function useTestMapping(connectorId: string) {
  const [unmappedTests, setUnmappedTests] = useState<UnmappedTest[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchUnmapped = useCallback(async () => {
    if (!connectorId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_unmapped_tests', {
        p_connector_id: connectorId
      });
      
      if (error) throw error;
      const result = data as unknown as { success: boolean; unmapped: UnmappedTest[] } | null;
      if (result?.success) {
        setUnmappedTests(result.unmapped || []);
      }
    } catch (err) {
      console.error('Failed to fetch unmapped tests:', err);
    } finally {
      setIsLoading(false);
    }
  }, [connectorId]);

  const mapTest = useCallback(async (externalTestId: string, testCaseId: string) => {
    try {
      const { data, error } = await supabase.rpc('map_test_to_case', {
        p_connector_id: connectorId,
        p_external_test_id: externalTestId,
        p_test_case_id: testCaseId
      });

      if (error) throw error;
      
      const result = data as unknown as { success: boolean } | null;
      if (result?.success) {
        toast({ title: 'Test Mapped', description: 'Test mapped to test case successfully' });
        await fetchUnmapped();
        return true;
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to map test', variant: 'destructive' });
    }
    return false;
  }, [connectorId, fetchUnmapped]);

  const bulkMapTests = useCallback(async (mappings: Array<{ external_test_id: string; test_case_id: string }>) => {
    try {
      const { data, error } = await supabase.rpc('bulk_map_tests', {
        p_connector_id: connectorId,
        p_mappings: mappings as unknown as Json
      });

      if (error) throw error;
      
      const result = data as unknown as { success: boolean; mapped_count: number } | null;
      if (result?.success) {
        toast({ title: 'Bulk Mapping Complete', description: `Mapped ${result.mapped_count} tests` });
        await fetchUnmapped();
        return true;
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to bulk map tests', variant: 'destructive' });
    }
    return false;
  }, [connectorId, fetchUnmapped]);

  return { unmappedTests, isLoading, fetchUnmapped, mapTest, bulkMapTests };
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: useImportHistory - Track import history
// ─────────────────────────────────────────────────────────────────────────────

export function useImportHistory(connectorId: string) {
  const [imports, setImports] = useState<ImportJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!connectorId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_import_history', {
        p_connector_id: connectorId,
        p_limit: 20
      });
      
      if (error) throw error;
      const result = data as unknown as { success: boolean; imports: ImportJob[] } | null;
      if (result?.success) {
        setImports(result.imports || []);
      }
    } catch (err) {
      console.error('Failed to fetch import history:', err);
    } finally {
      setIsLoading(false);
    }
  }, [connectorId]);

  return { imports, isLoading, fetchHistory };
}
