import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface ExecutionStepResult {
  id?: string;
  execution_id: string;
  step_order: number;
  step_description: string;
  expected_result: string | null;
  status: 'not_executed' | 'passed' | 'failed' | 'blocked' | 'skipped';
  actual_result: string | null;
  comments: string | null;
  executed_at?: string;
}

export interface EvidenceFile {
  id?: string;
  execution_id: string;
  step_order: number | null;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size_bytes: number;
  uploaded_at?: string;
  uploaded_by?: string;
}

export interface ExecuteRequest {
  execution_id: string;
  steps: ExecutionStepResult[];
  overall_status: 'not_executed' | 'passed' | 'failed' | 'blocked' | 'skipped';
  override_status: boolean;
  manual_status?: string;
  effort_actual: number; // minutes
  comments: string;
  assigned_to?: string;
}

export async function executeTestCase(request: ExecuteRequest): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Update execution record
    const { error: execError } = await supabase
      .from('test_cycle_executions')
      .update({
        status: request.overall_status,
        overall_status_override: request.override_status,
        manual_status: request.manual_status,
        effort_actual: request.effort_actual,
        comments: request.comments,
        executed_at: new Date().toISOString(),
        executed_by: user.id,
        assigned_to: request.assigned_to,
      })
      .eq('id', request.execution_id);

    if (execError) throw execError;

    // Delete existing step results
    await supabase
      .from('test_execution_step_results')
      .delete()
      .eq('execution_id', request.execution_id);

    // Insert new step results
    const { error: stepsError } = await supabase
      .from('test_execution_step_results')
      .insert(
        request.steps.map(step => ({
          execution_id: request.execution_id,
          step_order: step.step_order,
          step_description: step.step_description,
          expected_result: step.expected_result,
          status: step.status,
          actual_result: step.actual_result,
          comments: step.comments,
        }))
      );

    if (stepsError) throw stepsError;

    toast({
      title: 'Execution Complete',
      description: 'Test case executed successfully',
    });
  } catch (error) {
    console.error('Execute error:', error);
    toast({
      title: 'Execution Failed',
      description: error instanceof Error ? error.message : 'Failed to execute test case',
      variant: 'destructive',
    });
    throw error;
  }
}

export async function uploadEvidence(
  executionId: string,
  file: File,
  stepOrder: number | null
): Promise<EvidenceFile> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Upload file to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${executionId}/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('test-evidence')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('test-evidence')
      .getPublicUrl(fileName);

    // Determine file type
    let fileType = 'document';
    if (file.type.startsWith('image/')) fileType = 'image';
    else if (file.type.startsWith('video/')) fileType = 'video';
    else if (file.type.includes('pdf')) fileType = 'document';
    else if (file.type.includes('text') || file.name.endsWith('.log')) fileType = 'log';

    // Create evidence record
    const { data: evidence, error: dbError } = await supabase
      .from('test_execution_evidence')
      .insert({
        execution_id: executionId,
        step_order: stepOrder,
        file_name: file.name,
        file_url: publicUrl,
        file_type: fileType,
        file_size_bytes: file.size,
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (dbError) throw dbError;

    // Update evidence count
    const { count } = await supabase
      .from('test_execution_evidence')
      .select('*', { count: 'exact', head: true })
      .eq('execution_id', executionId);

    await supabase
      .from('test_cycle_executions')
      .update({ evidence_count: count || 0 })
      .eq('id', executionId);

    return evidence;
  } catch (error) {
    console.error('Upload evidence error:', error);
    toast({
      title: 'Upload Failed',
      description: error instanceof Error ? error.message : 'Failed to upload evidence',
      variant: 'destructive',
    });
    throw error;
  }
}

export async function getExecutionWithDetails(executionId: string): Promise<any> {
  const { data: execution, error: execError } = await supabase
    .from('test_cycle_executions')
    .select(`
      *,
      test_cases (key, title, objective, priority),
      test_cycles (name, key)
    `)
    .eq('id', executionId)
    .single();

  if (execError) throw execError;

  const { data: steps, error: stepsError } = await supabase
    .from('test_execution_step_results')
    .select('*')
    .eq('execution_id', executionId)
    .order('step_order');

  if (stepsError) throw stepsError;

  const { data: evidence, error: evidenceError } = await supabase
    .from('test_execution_evidence')
    .select('*')
    .eq('execution_id', executionId)
    .order('uploaded_at');

  if (evidenceError) throw evidenceError;

  return {
    ...execution,
    steps: steps || [],
    evidence: evidence || [],
  };
}

export async function updateExecutionTimer(
  executionId: string,
  action: 'start' | 'pause' | 'reset',
  accumulatedSeconds?: number
): Promise<void> {
  const updates: any = {};
  
  if (action === 'start') {
    updates.timer_start_at = new Date().toISOString();
    updates.timer_paused_at = null;
  } else if (action === 'pause') {
    updates.timer_paused_at = new Date().toISOString();
    if (accumulatedSeconds !== undefined) {
      updates.timer_accumulated_seconds = accumulatedSeconds;
    }
  } else if (action === 'reset') {
    updates.timer_start_at = null;
    updates.timer_paused_at = null;
    updates.timer_accumulated_seconds = 0;
  }

  const { error } = await supabase
    .from('test_cycle_executions')
    .update(updates)
    .eq('id', executionId);

  if (error) throw error;
}

export function calculateOverallStatus(
  steps: ExecutionStepResult[]
): 'not_executed' | 'passed' | 'failed' | 'blocked' | 'skipped' {
  if (steps.length === 0) return 'not_executed';
  
  const statuses = steps.map(s => s.status);
  
  if (statuses.some(s => s === 'failed')) return 'failed';
  if (statuses.some(s => s === 'blocked')) return 'blocked';
  if (statuses.every(s => s === 'skipped')) return 'skipped';
  if (statuses.every(s => s === 'passed')) return 'passed';
  
  return 'not_executed';
}
