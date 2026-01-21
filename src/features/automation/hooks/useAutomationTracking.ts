/**
 * Module 5A-3: Automation Status Tracking - Hooks
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AutomationSyncStatus, AutomationResultHistory } from '../types/tracking';

// ─────────────────────────────────────────────────────────────────────────────
// Hook: useAutomationSyncStatus - Get overall automation sync metrics
// ─────────────────────────────────────────────────────────────────────────────

export function useAutomationSyncStatus(projectId?: string) {
  const [status, setStatus] = useState<AutomationSyncStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_automation_sync_status', {
        p_project_id: projectId || null
      });

      if (error) throw error;
      const result = data as unknown as { success: boolean } & AutomationSyncStatus | null;
      if (result?.success) {
        setStatus({
          total: result.total,
          automated: result.automated,
          manual: result.manual,
          candidate: result.candidate,
          mapped: result.mapped,
          with_recent_results: result.with_recent_results,
          automation_rate: result.automation_rate
        });
      }
    } catch (err) {
      console.error('Failed to fetch automation sync status:', err);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return { status, isLoading, refetch: fetchStatus };
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: useTestAutomationHistory - Get automation run history for a test case
// ─────────────────────────────────────────────────────────────────────────────

export function useTestAutomationHistory(testCaseId: string | null) {
  const [results, setResults] = useState<AutomationResultHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!testCaseId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_test_automation_history', {
        p_test_case_id: testCaseId,
        p_limit: 10
      });

      if (error) throw error;
      const result = data as unknown as { success: boolean; results: AutomationResultHistory[] } | null;
      if (result?.success) {
        setResults(result.results || []);
      }
    } catch (err) {
      console.error('Failed to fetch automation history:', err);
    } finally {
      setIsLoading(false);
    }
  }, [testCaseId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return { results, isLoading, refetch: fetchHistory };
}
