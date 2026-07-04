/**
 * Auto-versioning helper - creates version snapshots on test case changes
 *
 * P1-S3: this used to fetch the case+steps and INSERT into
 * tm_test_case_versions itself, racing with three other independent client
 * writers doing the same MAX-scan-then-insert dance (useTestCaseVersions.ts
 * useCreateTestCaseVersion — zero callers, dead; testCaseAuditService.ts —
 * only reachable from the doomed test-case-detail folder, dead). All
 * snapshot writes now go through the one DB RPC, tm_create_version_snapshot,
 * which builds the same snapshot shape atomically AND keeps
 * tm_test_cases.version in sync (the client writer never did).
 */

import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

export interface CreateVersionParams {
  testCaseId: string;
  changeSummary: string;
}

/**
 * Creates a version snapshot of the current test case state via the
 * canonical tm_create_version_snapshot RPC.
 * Call this AFTER a successful mutation to record the change.
 *
 * TD-002: snapshot failures THROW so callers surface them — never swallow.
 */
export async function createVersionSnapshot(params: CreateVersionParams): Promise<void> {
  const { testCaseId, changeSummary } = params;

  const { error } = await supabase.rpc('tm_create_version_snapshot', {
    p_case_id: testCaseId,
    p_change_summary: changeSummary,
  });

  if (error) throw error;
}

/**
 * Hook that provides a version-creating wrapper
 */
export function useAutoVersioning() {
  const queryClient = useQueryClient();

  const createVersion = useCallback(async (params: CreateVersionParams) => {
    await createVersionSnapshot(params);
    // Invalidate version queries
    queryClient.invalidateQueries({ queryKey: ['tm-case-versions', params.testCaseId] });
    queryClient.invalidateQueries({ queryKey: ['tm-case-versions-count', params.testCaseId] });
  }, [queryClient]);

  return { createVersion };
}
