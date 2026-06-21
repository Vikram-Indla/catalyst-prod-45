/**
 * workItemPlannerService — write-through audit for AI planner runs.
 *
 * Creates ai_agent_runs records before generation and updates them after.
 * Inserts ai_generated_work_items for each issue created by the wizard.
 *
 * All methods are fire-and-forget on error — audit failures must never
 * block the planner's primary create flow.
 */
import { supabase } from '@/integrations/supabase/client';

export type PlannerRunType =
  | 'epic_generation'
  | 'story_generation'
  | 'subtask_generation'
  | 'full_planner';

export interface StartRunInput {
  runType: PlannerRunType;
  brId?: string;
  parentKey?: string;
  projectKey?: string;
  proposalsCount: number;
  metadata?: Record<string, unknown>;
}

export interface CompleteRunInput {
  runId: string;
  createdCount: number;
  status?: 'completed' | 'failed';
  error?: string;
}

export interface AuditWorkItemInput {
  runId: string;
  issueKey: string;
  issueType: string;
  parentKey?: string;
  summary: string;
  assigneeId?: string | null;
}

/**
 * Opens an ai_agent_runs record. Returns the run ID or null on failure.
 */
export async function startPlannerRun(input: StartRunInput): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('ai_agent_runs' as any)
      .insert({
        run_type: input.runType,
        triggered_by: user.id,
        br_id: input.brId ?? null,
        parent_key: input.parentKey ?? null,
        project_key: input.projectKey ?? null,
        proposals_count: input.proposalsCount,
        status: 'running',
        metadata: input.metadata ?? {},
      })
      .select('id')
      .single();

    if (error || !data) return null;
    return (data as any).id as string;
  } catch {
    return null;
  }
}

/**
 * Closes an ai_agent_runs record with final count and status.
 */
export async function completePlannerRun(input: CompleteRunInput): Promise<void> {
  try {
    await supabase
      .from('ai_agent_runs' as any)
      .update({
        status: input.status ?? 'completed',
        created_count: input.createdCount,
        error: input.error ?? null,
        completed_at: new Date().toISOString(),
      })
      .eq('id', input.runId);
  } catch {
    // fire-and-forget
  }
}

/**
 * Records one created work item against a planner run.
 */
export async function auditCreatedWorkItem(input: AuditWorkItemInput): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('ai_generated_work_items' as any)
      .insert({
        run_id: input.runId,
        issue_key: input.issueKey,
        issue_type: input.issueType,
        parent_key: input.parentKey ?? null,
        summary: input.summary,
        assignee_id: input.assigneeId ?? null,
        created_by: user.id,
      });
  } catch {
    // fire-and-forget
  }
}

/**
 * Convenience: records an array of created items in parallel.
 */
export async function auditCreatedWorkItems(
  runId: string,
  items: Omit<AuditWorkItemInput, 'runId'>[],
): Promise<void> {
  await Promise.allSettled(
    items.map((item) => auditCreatedWorkItem({ ...item, runId })),
  );
}
