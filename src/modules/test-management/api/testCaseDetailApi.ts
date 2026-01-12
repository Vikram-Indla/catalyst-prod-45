/**
 * Test Case Detail API Layer - Section 3
 * Abstracts edge function calls for test case detail operations
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  TestCaseDetail,
  UpdateTestCaseForm,
  CreateStepForm,
  UpdateStepForm,
  Attachment,
  LinkedRequirement,
  LinkedDefect,
} from '../types/test-case-detail';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// =============================================
// HELPER
// =============================================

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
    'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  };
}

// =============================================
// TEST CASE DETAIL
// =============================================

export interface FetchTestCaseDetailParams {
  caseId: string;
  projectId: string;
  historyLimit?: number;
  activityLimit?: number;
}

export async function fetchTestCaseDetailApi(
  params: FetchTestCaseDetailParams
): Promise<TestCaseDetail | null> {
  const { caseId, projectId, historyLimit = 5, activityLimit = 10 } = params;

  try {
    const headers = await getAuthHeaders();
    const url = new URL(`${SUPABASE_URL}/functions/v1/get-test-case-detail`);
    url.searchParams.set('caseId', caseId);
    url.searchParams.set('projectId', projectId);
    url.searchParams.set('historyLimit', String(historyLimit));
    url.searchParams.set('activityLimit', String(activityLimit));

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Failed to fetch test case: ${response.statusText}`);
    }

    const result = await response.json();
    return result.testCase || null;
  } catch (error) {
    console.error('fetchTestCaseDetailApi error:', error);
    // Fallback to direct Supabase query
    return fetchTestCaseDetailDirect(params);
  }
}

// Direct Supabase fallback
async function fetchTestCaseDetailDirect(
  params: FetchTestCaseDetailParams
): Promise<TestCaseDetail | null> {
  const { caseId, projectId, activityLimit = 10 } = params;

  const { data: testCase, error } = await supabase
    .from('tm_test_cases')
    .select(`
      *,
      folder:tm_folders(id, name, path),
      priority:tm_case_priorities(id, name, color),
      case_type:tm_case_types(id, name, color),
      created_by_profile:profiles!tm_test_cases_created_by_fkey(id, full_name, avatar_url, email),
      steps:tm_test_steps(*)
    `)
    .eq('id', caseId)
    .eq('project_id', projectId)
    .maybeSingle();

  if (error || !testCase) {
    console.error('Error fetching test case:', error);
    return null;
  }

  // Fetch labels
  const { data: labels } = await supabase
    .from('tm_case_labels')
    .select('label:tm_labels(id, name, color)')
    .eq('test_case_id', caseId);

  // Fetch audit log for activities
  const { data: activities } = await supabase
    .from('tm_audit_log')
    .select('*, actor:profiles!tm_audit_log_actor_id_fkey(id, full_name, avatar_url)')
    .eq('entity_type', 'test_case')
    .eq('entity_id', caseId)
    .order('created_at', { ascending: false })
    .limit(activityLimit);

  // Fetch attachments from generic attachments table
  const { data: attachments } = await supabase
    .from('attachments')
    .select('*')
    .eq('entity_type', 'test_case')
    .eq('entity_id', caseId)
    .order('created_at', { ascending: false });

  // Note: tm_test_case_defects and tm_execution_runs tables created by migration
  // Using empty arrays as fallback until types are regenerated
  const linkedDefects: any[] = [];
  const executions: any[] = [];

  const createdByProfile = testCase.created_by_profile as any;
  const createdByName = createdByProfile?.full_name || 'Unknown';

  const getInitials = (name: string) => 
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const result: TestCaseDetail = {
    id: testCase.id,
    key: testCase.case_key,
    title: testCase.title,
    description: testCase.description,
    type: null,
    priority: null,
    status: testCase.status as any,
    preconditions: testCase.preconditions,
    estimatedTime: testCase.estimated_time,
    tags: labels?.map((l: any) => l.label?.name).filter(Boolean) || [],

    assigneeId: testCase.assigned_to,
    assignee: null,

    folderId: testCase.folder_id,
    folder: testCase.folder as any,

    releaseId: null,
    release: null,

    priorityId: testCase.priority_id,
    typeId: testCase.case_type_id,

    steps: (testCase.steps || [])
      .sort((a: any, b: any) => a.step_number - b.step_number)
      .map((s: any) => ({
        id: s.id,
        testCaseId: s.test_case_id,
        order: s.step_number,
        action: s.action,
        expectedResult: s.expected_result,
        notes: null,
        testData: s.test_data,
        attachments: [],
        createdAt: s.created_at,
        updatedAt: s.updated_at,
      })),

    attachments: (attachments || []).map((a: any) => ({
      id: a.id,
      name: a.file_name,
      storagePath: a.file_path,
      url: '', // Would need to generate signed URL
      type: a.mime_type?.startsWith('image/') ? 'image' : 'document',
      mimeType: a.mime_type,
      size: a.file_size,
      uploadedAt: a.created_at,
      uploadedById: a.uploaded_by,
      uploadedByName: undefined,
    })),

    linkedRequirements: [],
    linkedDefects: (linkedDefects || []).map((ld: any) => ({
      id: ld.id,
      defectId: ld.defect_id,
      key: ld.defect?.defect_key || '',
      title: ld.defect?.title || '',
      severity: ld.defect?.severity || 'minor',
      status: ld.defect?.status || 'open',
      stepId: ld.step_id,
      linkedAt: ld.linked_at || ld.created_at,
      linkedById: '',
      linkedByName: undefined,
    })),

    executionCount: executions?.length || 0,
    passRate: null,
    lastExecutedAt: executions?.[0]?.executed_at || null,
    executionHistory: (executions || []).map((e: any) => ({
      id: e.id,
      testCaseId: caseId,
      cycleId: e.cycle?.id || null,
      cycleName: e.cycle?.name || null,
      status: e.status || 'not_run',
      environment: null,
      duration: e.duration_seconds,
      notes: e.notes,
      stepResults: [],
      executedAt: e.executed_at,
      executedById: e.executed_by,
      executedByName: 'User',
      executedByInitials: 'U',
    })),

    activities: (activities || []).map((a: any) => ({
      id: a.id,
      testCaseId: caseId,
      action: a.action as any,
      description: JSON.stringify(a.changes || {}),
      metadata: a.changes,
      createdAt: a.created_at,
      createdById: a.actor_id,
      createdByName: a.actor?.full_name || 'System',
      createdByInitials: getInitials(a.actor?.full_name || 'SY'),
    })),

    version: testCase.version || 1,

    createdAt: testCase.created_at,
    createdById: testCase.created_by,
    createdByName,
    updatedAt: testCase.updated_at,
    updatedById: testCase.created_by,
    updatedByName: createdByName,
  };

  return result;
}

// =============================================
// UPDATE TEST CASE
// =============================================

export interface UpdateTestCaseParams {
  caseId: string;
  projectId: string;
  data: Partial<UpdateTestCaseForm>;
  version?: number;
}

export async function updateTestCaseApi(params: UpdateTestCaseParams): Promise<void> {
  const { caseId, projectId, data, version } = params;

  const headers = await getAuthHeaders();
  const response = await fetch(`${SUPABASE_URL}/functions/v1/update-test-case`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ caseId, projectId, data, version }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to update test case');
  }
}

// =============================================
// STEP OPERATIONS
// =============================================

export interface AddStepParams {
  caseId: string;
  data: CreateStepForm;
}

export async function addStepApi(params: AddStepParams): Promise<{ id: string }> {
  const { caseId, data } = params;

  const headers = await getAuthHeaders();
  const response = await fetch(`${SUPABASE_URL}/functions/v1/manage-steps`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action: 'add', caseId, step: data }),
  });

  if (!response.ok) {
    throw new Error('Failed to add step');
  }

  return response.json();
}

export interface UpdateStepParams {
  caseId: string;
  stepId: string;
  data: UpdateStepForm;
}

export async function updateStepApi(params: UpdateStepParams): Promise<void> {
  const { caseId, stepId, data } = params;

  const headers = await getAuthHeaders();
  const response = await fetch(`${SUPABASE_URL}/functions/v1/manage-steps`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action: 'update', caseId, stepId, step: data }),
  });

  if (!response.ok) {
    throw new Error('Failed to update step');
  }
}

export interface DeleteStepParams {
  caseId: string;
  stepId: string;
}

export async function deleteStepApi(params: DeleteStepParams): Promise<void> {
  const { caseId, stepId } = params;

  const headers = await getAuthHeaders();
  const response = await fetch(`${SUPABASE_URL}/functions/v1/manage-steps`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action: 'delete', caseId, stepId }),
  });

  if (!response.ok) {
    throw new Error('Failed to delete step');
  }
}

export interface ReorderStepsParams {
  caseId: string;
  stepIds: string[];
}

export async function reorderStepsApi(params: ReorderStepsParams): Promise<void> {
  const { caseId, stepIds } = params;

  const headers = await getAuthHeaders();
  const response = await fetch(`${SUPABASE_URL}/functions/v1/manage-steps`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action: 'reorder', caseId, stepIds }),
  });

  if (!response.ok) {
    throw new Error('Failed to reorder steps');
  }
}

export interface DuplicateStepParams {
  caseId: string;
  stepId: string;
}

export async function duplicateStepApi(params: DuplicateStepParams): Promise<{ id: string }> {
  const { caseId, stepId } = params;

  const headers = await getAuthHeaders();
  const response = await fetch(`${SUPABASE_URL}/functions/v1/manage-steps`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action: 'duplicate', caseId, stepId }),
  });

  if (!response.ok) {
    throw new Error('Failed to duplicate step');
  }

  return response.json();
}

// =============================================
// ATTACHMENTS
// =============================================

export interface UploadAttachmentParams {
  entityType: 'test_case' | 'test_step';
  entityId: string;
  file: File;
}

export async function uploadAttachmentApi(params: UploadAttachmentParams): Promise<Attachment> {
  const { entityType, entityId, file } = params;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  // Upload to storage
  const filePath = `${entityType}/${entityId}/${Date.now()}_${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from('test-attachments')
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('test-attachments')
    .getPublicUrl(filePath);

  // Create attachment record
  const { data: attachment, error: insertError } = await supabase
    .from('attachments')
    .insert({
      entity_type: entityType,
      entity_id: entityId,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.type,
      uploaded_by: session.user.id,
    })
    .select()
    .single();

  if (insertError) throw insertError;

  return {
    id: attachment.id,
    name: attachment.file_name,
    storagePath: attachment.file_path,
    url: publicUrl,
    type: file.type.startsWith('image/') ? 'image' : 'document',
    mimeType: attachment.mime_type,
    size: attachment.file_size,
    uploadedAt: attachment.created_at,
    uploadedById: attachment.uploaded_by,
  };
}

export interface DeleteAttachmentParams {
  attachmentId: string;
  storagePath: string;
}

export async function deleteAttachmentApi(params: DeleteAttachmentParams): Promise<void> {
  const { attachmentId, storagePath } = params;

  // Delete from storage
  await supabase.storage.from('test-attachments').remove([storagePath]);

  // Delete record
  const { error } = await supabase
    .from('attachments')
    .delete()
    .eq('id', attachmentId);

  if (error) throw error;
}

// =============================================
// LINKED ITEMS
// =============================================

export interface LinkDefectParams {
  testCaseId: string;
  defectId: string;
  stepId?: string;
}

export async function linkDefectApi(params: LinkDefectParams): Promise<void> {
  // Will use edge function or direct RPC call once types are regenerated
  console.log('Link defect:', params);
  // TODO: Implement after types regeneration
}

export interface UnlinkDefectParams {
  testCaseId: string;
  defectId: string;
}

export async function unlinkDefectApi(params: UnlinkDefectParams): Promise<void> {
  // Will use edge function or direct RPC call once types are regenerated
  console.log('Unlink defect:', params);
  // TODO: Implement after types regeneration
}
