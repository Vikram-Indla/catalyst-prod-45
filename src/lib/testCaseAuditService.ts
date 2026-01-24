/**
 * Test Case Audit Service
 * Centralized service for audit logging and versioning of test case changes
 * 
 * CRITICAL: All test case mutations should use this service to ensure
 * consistent audit logging and versioning.
 */

import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';

export type AuditAction = 'create' | 'update' | 'delete' | 'assign' | 'execute' | 'clone';

// Fields that trigger version creation (content-significant changes)
const VERSION_TRIGGERING_FIELDS = [
  'title',
  'description', 
  'objective',
  'preconditions',
  'postconditions',
  'status',
  'priority_id',
  'case_type_id',
  'steps', // Step changes
];

// Fields that only need audit log (not versions)
const AUDIT_ONLY_FIELDS = [
  'assigned_to',
  'folder_id',
  'release_id',
  'tags',
  'labels',
];

interface AuditLogParams {
  projectId?: string;
  entityType: 'test_case' | 'test_step';
  entityId: string;
  action: AuditAction;
  changes?: Record<string, { from: unknown; to: unknown }>;
}

interface VersionSnapshotParams {
  testCaseId: string;
  changeSummary: string;
}

/**
 * Log an entry to tm_audit_log
 * Returns success/failure - does NOT throw to prevent blocking main operation
 */
export async function logAuditEntry(params: AuditLogParams): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('Audit log skipped: no authenticated user');
      return false;
    }

    const { error } = await (supabase as any)
      .from('tm_audit_log')
      .insert({
        project_id: params.projectId || null,
        entity_type: params.entityType,
        entity_id: params.entityId,
        action: params.action,
        actor_id: user.id,
        changes: params.changes || null,
      });

    if (error) {
      console.error('Failed to log audit entry:', error);
      // Show error to user for critical audit failures
      if (error.code === '42501') {
        catalystToast.error('Permission denied', 'You may not be a project member');
      }
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in audit logging:', error);
    return false;
  }
}

/**
 * Create a version snapshot of the current test case state
 * Returns the new version number or null on failure
 */
export async function createVersionSnapshot(params: VersionSnapshotParams): Promise<number | null> {
  const { testCaseId, changeSummary } = params;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('Version snapshot skipped: no authenticated user');
      return null;
    }

    // Fetch current test case state
    const { data: testCase, error: caseError } = await supabase
      .from('tm_test_cases')
      .select('*')
      .eq('id', testCaseId)
      .single();

    if (caseError || !testCase) {
      console.error('Failed to fetch test case for versioning:', caseError);
      catalystToast.error('Version snapshot failed', 'Could not read test case');
      return null;
    }

    // Fetch current steps
    const { data: steps, error: stepsError } = await supabase
      .from('tm_test_steps')
      .select('step_number, action, expected_result, test_data')
      .eq('test_case_id', testCaseId)
      .order('step_number', { ascending: true });

    if (stepsError) {
      console.error('Failed to fetch steps for versioning:', stepsError);
    }

    // Get next version number atomically
    const { data: existingVersions, error: versionError } = await (supabase as any)
      .from('tm_test_case_versions')
      .select('version_number')
      .eq('test_case_id', testCaseId)
      .order('version_number', { ascending: false })
      .limit(1);

    if (versionError) {
      console.error('Failed to get version number:', versionError);
    }

    const nextVersion = (existingVersions?.[0]?.version_number || 0) + 1;

    // Create snapshot
    const snapshot = {
      title: testCase.title,
      description: testCase.description,
      preconditions: testCase.preconditions,
      status: testCase.status,
      priority_id: testCase.priority_id,
      case_type_id: testCase.case_type_id,
      folder_id: testCase.folder_id,
      steps: (steps || []).map((s: any) => ({
        step_number: s.step_number,
        action: s.action,
        expected_result: s.expected_result || '',
        test_data: s.test_data,
      })),
    };

    // Insert version with conflict handling
    const { data: insertedVersion, error: insertError } = await (supabase as any)
      .from('tm_test_case_versions')
      .insert({
        test_case_id: testCaseId,
        version_number: nextVersion,
        snapshot,
        change_summary: changeSummary,
        changed_by: user.id,
      })
      .select('version_number')
      .single();

    if (insertError) {
      // Check for unique constraint violation (concurrent insert)
      if (insertError.code === '23505') {
        console.warn('Version conflict detected, retrying with incremented number');
        // Retry with incremented version
        const retryVersion = nextVersion + 1;
        const { data: retryData, error: retryError } = await (supabase as any)
          .from('tm_test_case_versions')
          .insert({
            test_case_id: testCaseId,
            version_number: retryVersion,
            snapshot,
            change_summary: changeSummary,
            changed_by: user.id,
          })
          .select('version_number')
          .single();

        if (retryError) {
          console.error('Retry failed:', retryError);
          catalystToast.error('Version snapshot failed', retryError.message);
          return null;
        }
        return retryData.version_number;
      }

      // Check for RLS violation
      if (insertError.code === '42501') {
        catalystToast.error('Permission denied', 'You must be a project member to create versions');
        return null;
      }

      console.error('Failed to create version snapshot:', insertError);
      catalystToast.error('Version snapshot failed', insertError.message);
      return null;
    }

    return insertedVersion?.version_number || nextVersion;
  } catch (error) {
    console.error('Error in createVersionSnapshot:', error);
    catalystToast.error('Version error', 'An unexpected error occurred');
    return null;
  }
}

/**
 * Determine if a change should trigger a version snapshot
 */
export function shouldCreateVersion(changedFields: string[]): boolean {
  return changedFields.some(field => VERSION_TRIGGERING_FIELDS.includes(field));
}

/**
 * Combined handler for test case property changes
 * Handles both audit logging and conditional versioning
 */
export async function handleTestCaseChange(params: {
  testCaseId: string;
  projectId?: string;
  changedField: string;
  oldValue: unknown;
  newValue: unknown;
  changeSummary: string;
}): Promise<{ auditLogged: boolean; versionCreated: boolean; versionNumber: number | null }> {
  const { testCaseId, projectId, changedField, oldValue, newValue, changeSummary } = params;

  const result = {
    auditLogged: false,
    versionCreated: false,
    versionNumber: null as number | null,
  };

  // Always log to audit
  result.auditLogged = await logAuditEntry({
    projectId,
    entityType: 'test_case',
    entityId: testCaseId,
    action: 'update',
    changes: { [changedField]: { from: oldValue, to: newValue } },
  });

  // Only create version for content-significant changes
  if (shouldCreateVersion([changedField])) {
    result.versionNumber = await createVersionSnapshot({
      testCaseId,
      changeSummary,
    });
    result.versionCreated = result.versionNumber !== null;
  }

  return result;
}

/**
 * Handle step changes (add/edit/delete/reorder)
 * Always creates a version since steps are content-significant
 */
export async function handleStepChange(params: {
  testCaseId: string;
  projectId?: string;
  action: 'add' | 'edit' | 'delete' | 'reorder';
  changeSummary: string;
}): Promise<{ auditLogged: boolean; versionCreated: boolean; versionNumber: number | null }> {
  const { testCaseId, projectId, action, changeSummary } = params;

  const result = {
    auditLogged: false,
    versionCreated: false,
    versionNumber: null as number | null,
  };

  // Log to audit
  result.auditLogged = await logAuditEntry({
    projectId,
    entityType: 'test_case',
    entityId: testCaseId,
    action: 'update',
    changes: { steps: { from: null, to: action } },
  });

  // Always create version for step changes
  result.versionNumber = await createVersionSnapshot({
    testCaseId,
    changeSummary,
  });
  result.versionCreated = result.versionNumber !== null;

  return result;
}
