/**
 * CATALYST TESTS - Case Management Service
 * API functions for copy, move, delete, archive, and version control
 */

import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import type {
  CopyTestCaseRequest,
  MoveTestCaseRequest,
  ArchiveTestCaseRequest,
  DeleteTestCaseRequest,
  RestoreTestCaseRequest,
  VersionComparisonResult,
  CreateVersionRequest,
  TestCaseVersion,
} from '@/types/caseManagement';

type TestCase = Database['public']['Tables']['test_cases']['Row'];

export const caseManagementService = {
  /**
   * Copy a test case with optional version selection
   */
  async copyTestCase(request: CopyTestCaseRequest) {
    // Get source case
    const { data: sourceCase, error: fetchError } = await supabase
      .from('test_cases')
      .select('*')
      .eq('id', request.source_case_id)
      .single();

    if (fetchError) throw fetchError;

    // Create new case with copied data
    const { data: newCase, error: createError } = await supabase
      .from('test_cases')
      .insert({
        title: request.new_title,
        objective: sourceCase.objective,
        preconditions: sourceCase.preconditions,
        status: 'draft',
        priority: sourceCase.priority,
        folder_id: request.target_folder_id || sourceCase.folder_id,
        case_type: sourceCase.case_type,
        component: sourceCase.component,
        release: sourceCase.release,
        labels: sourceCase.labels,
        automation_status: sourceCase.automation_status,
        automation_key: sourceCase.automation_key,
        estimated_effort: sourceCase.estimated_effort,
        test_type: sourceCase.test_type,
        program_id: sourceCase.program_id,
        created_by: sourceCase.created_by,
      })
      .select()
      .single();

    if (createError) throw createError;

    return { case: newCase, version: 1 };
  },

  /**
   * Move test cases to a different folder (batch operation)
   */
  async moveTestCases(request: MoveTestCaseRequest) {
    const { case_ids, target_folder_id } = request;
    
    const { data, error } = await supabase
      .from('test_cases')
      .update({ folder_id: target_folder_id })
      .in('id', case_ids)
      .select();

    if (error) throw error;
    return { moved_count: data.length, cases: data };
  },

  /**
   * Archive test cases (recoverable soft delete)
   */
  async archiveTestCases(request: ArchiveTestCaseRequest) {
    const { case_ids } = request;
    
    // Note: These fields need to be added via migration
    // For now, we'll use a custom approach
    const { error } = await supabase
      .from('test_cases')
      .update({
        status: 'deprecated' as any, // Use deprecated status as archive
      } as any)
      .in('id', case_ids);

    if (error) throw error;
    return { archived_count: case_ids.length };
  },

  /**
   * Restore archived test cases
   */
  async restoreTestCases(request: RestoreTestCaseRequest) {
    const { case_ids, target_folder_id } = request;
    
    const updates: any = {
      status: 'draft',
    };

    if (target_folder_id) {
      updates.folder_id = target_folder_id;
    }

    const { data, error } = await supabase
      .from('test_cases')
      .update(updates)
      .in('id', case_ids)
      .select();

    if (error) throw error;
    return { restored_count: data.length };
  },

  /**
   * Delete test cases (soft delete with optional hard delete)
   */
  async deleteTestCases(request: DeleteTestCaseRequest) {
    const { case_ids, cascade_delete_executions, confirmation_text } = request;

    if (confirmation_text !== 'DELETE') {
      throw new Error('Confirmation text must be "DELETE"');
    }

    // Always hard delete for now until soft delete columns are added
    const { error } = await supabase
      .from('test_cases')
      .delete()
      .in('id', case_ids);

    if (error) throw error;
    return { deleted_count: case_ids.length };
  },

  /**
   * Get version history for a test case
   */
  async getVersionHistory(caseId: string): Promise<TestCaseVersion[]> {
    const { data, error } = await supabase
      .from('test_case_versions')
      .select('*')
      .eq('case_id', caseId)
      .order('version_number', { ascending: false });

    if (error) throw error;
    return (data as any) || [];
  },

  /**
   * Create a new version of a test case
   */
  async createVersion(caseId: string, request: CreateVersionRequest) {
    // Get current case data
    const { data: currentCase, error: caseError } = await supabase
      .from('test_cases')
      .select('*')
      .eq('id', caseId)
      .single();

    if (caseError) throw caseError;

    const newVersion = (currentCase.version || 1) + 1;

    // Create version snapshot (cast to any to avoid type errors until migration completes)
    const { error: versionError } = await supabase
      .from('test_case_versions' as any)
      .insert({
        case_id: caseId,
        version_number: newVersion,
        title: currentCase.title,
        objective: currentCase.objective,
        preconditions: currentCase.preconditions,
        status: currentCase.status,
        priority: currentCase.priority,
        owner_id: currentCase.owner_id,
        folder_id: currentCase.folder_id,
        component: currentCase.component,
        release: currentCase.release,
        labels: currentCase.labels,
        change_summary: request.change_summary || 'Manual version created',
        snapshot_data: currentCase,
      } as any);

    if (versionError) throw versionError;

    // Update case version number
    const { data: updatedCase, error: updateError } = await supabase
      .from('test_cases')
      .update({ version: newVersion })
      .eq('id', caseId)
      .select()
      .single();

    if (updateError) throw updateError;

    return { case: updatedCase, version: newVersion };
  },

  /**
   * Compare two versions of a test case
   */
  async compareVersions(
    caseId: string,
    version1: number,
    version2: number
  ): Promise<VersionComparisonResult> {
    // Get both versions (cast to any until migration completes)
    const { data: versions, error } = await supabase
      .from('test_case_versions' as any)
      .select('*')
      .eq('case_id', caseId)
      .in('version_number', [version1, version2]);

    if (error) throw error;

    if (!versions || versions.length !== 2) {
      throw new Error('Could not find both versions for comparison');
    }

    const v1: any = versions.find((v: any) => v.version_number === version1);
    const v2: any = versions.find((v: any) => v.version_number === version2);

    if (!v1 || !v2) {
      throw new Error('Version data incomplete');
    }

    // Get field changes (cast to any until migration completes)
    const { data: changes, error: changesError } = await supabase
      .from('test_case_version_changes' as any)
      .select('*')
      .eq('case_id', caseId)
      .gte('to_version', Math.min(version1, version2))
      .lte('to_version', Math.max(version1, version2));

    if (changesError) throw changesError;

    // Calculate steps diff
    const steps1 = v1.snapshot_data?.test_case_steps || [];
    const steps2 = v2.snapshot_data?.test_case_steps || [];

    const stepsDiff = {
      added: steps2.filter((s2: any) => !steps1.find((s1: any) => s1.id === s2.id)),
      modified: steps2.filter((s2: any) => {
        const s1 = steps1.find((s1: any) => s1.id === s2.id);
        return s1 && JSON.stringify(s1) !== JSON.stringify(s2);
      }),
      deleted: steps1.filter((s1: any) => !steps2.find((s2: any) => s2.id === s1.id)),
    };

    return {
      case_id: caseId,
      version1,
      version2,
      field_changes: (changes as any) || [],
      steps_diff: stepsDiff,
    };
  },

  /**
   * Restore a test case to a previous version
   */
  async restoreVersion(caseId: string, versionNumber: number) {
    // Get the version to restore (cast to any until migration completes)
    const { data: version, error: versionError } = await supabase
      .from('test_case_versions' as any)
      .select('*')
      .eq('case_id', caseId)
      .eq('version_number', versionNumber)
      .single();

    if (versionError) throw versionError;

    const snapshotData: any = version.snapshot_data;

    // Update current case with old version data
    const { data: updatedCase, error: updateError } = await supabase
      .from('test_cases')
      .update({
        title: snapshotData.title,
        objective: snapshotData.objective,
        preconditions: snapshotData.preconditions,
        status: snapshotData.status,
        priority: snapshotData.priority,
        folder_id: snapshotData.folder_id,
        component: snapshotData.component,
        release: snapshotData.release,
        labels: snapshotData.labels,
        version: (snapshotData.version || 1) + 1,
      })
      .eq('id', caseId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Create new version for the restoration
    await this.createVersion(caseId, {
      change_summary: `Restored to version ${versionNumber} state`,
    });

    return { case: updatedCase, version: updatedCase.version };
  },

  /**
   * Check if case can be deleted (has executions, etc.)
   */
  async checkDeleteImpact(caseIds: string[]) {
    const { data: executions, error } = await supabase
      .from('test_executions')
      .select('id')
      .in('case_id', caseIds);

    if (error) throw error;

    return {
      execution_count: executions?.length || 0,
      can_delete: true, // Always allow but warn
    };
  },
};
