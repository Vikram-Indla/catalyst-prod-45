/**
 * Jira write-back helpers — best-effort, never-throws enqueuers.
 *
 * Two helpers, two schemas:
 *
 *   enqueueWriteBack         → ph_issues field-edit writes
 *                              (ph_issue_id / field_name / new_value, status='approved')
 *
 *   enqueueWorkItemOperation → ph_work_items create/update/delete operations
 *                              (ph_work_item_id / operation / operation_payload, status='pending')
 *
 * Contract:
 *   - Never throws.
 *   - Logs via console.warn on enqueue failure.
 *   - created_by populated from auth.uid() when available.
 */
import { supabase } from '@/integrations/supabase/client';

async function getActorId(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

// ─── Field-edit enqueue (ph_issues) ──────────────────────────
export async function enqueueWriteBack({
  phIssueId,
  fieldName,
  newValue,
}: {
  phIssueId: string;
  fieldName: string;
  newValue: string;
}): Promise<void> {
  try {
    const created_by = await getActorId();
    const { error } = await (supabase
      .from('jira_write_back_queue') as any)
      .insert({
        ph_issue_id: phIssueId,
        field_name: fieldName,
        new_value: newValue,
        status: 'approved',
        created_by,
      });
    if (error) console.warn('[WB] enqueue failed', { err: error, fieldName });
  } catch (err) {
    console.warn('[WB] enqueue failed', { err, fieldName });
  }
}

// ─── Operation enqueue (ph_work_items) ───────────────────────
export async function enqueueWorkItemOperation({
  phWorkItemId,
  operation,
  operationPayload,
}: {
  phWorkItemId: string;
  operation: 'create' | 'update' | 'delete';
  operationPayload: unknown;
}): Promise<void> {
  try {
    const created_by = await getActorId();
    const { error } = await (supabase
      .from('jira_write_back_queue') as any)
      .insert({
        ph_work_item_id: phWorkItemId,
        operation,
        operation_payload: operationPayload,
        status: 'pending',
        created_by,
      });
    if (error) console.warn('[WB-op] enqueue failed', { err: error, operation });
  } catch (err) {
    console.warn('[WB-op] enqueue failed', { err, operation });
  }
}
