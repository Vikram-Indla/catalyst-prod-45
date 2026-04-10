import { supabase } from '@/integrations/supabase/client';

export interface ForceClosePayload {
  issueId:        string;
  itemKey:        string;
  closedBy:       string;
  category:       string;
  staleDays:      number;
  closureReason:  string;
  originalStatus: string;
}

export interface ForceCloseResult {
  logId:         string;
  jiraAttempted: boolean;
  jiraSuccess:   boolean;
  jiraError:     string | null;
}

/**
 * Execute a governance Force Close.
 * 1. Best-effort Jira transition (fire-and-forget — Jira refusal does NOT block Catalyst)
 * 2. Write governance lock via RPC (always fires)
 */
export async function executeForceClose(
  payload: ForceClosePayload
): Promise<ForceCloseResult> {
  let jiraAttempted = false;
  let jiraSuccess   = false;
  let jiraError: string | null = null;

  // Step 1: Best-effort Jira transition
  try {
    const { data: connData } = await supabase
      .from('ph_jira_connection')
      .select('site_url, auth_email, auth_token_encrypted')
      .eq('status', 'connected')
      .limit(1)
      .single();

    if (connData?.site_url && connData?.auth_token_encrypted) {
      jiraAttempted = true;
      const baseUrl = connData.site_url.replace(/\/$/, '');
      const authHeader = 'Basic ' + btoa(`${connData.auth_email}:${connData.auth_token_encrypted}`);

      const transRes = await fetch(
        `${baseUrl}/rest/api/3/issue/${payload.itemKey}/transitions`,
        {
          headers: {
            'Authorization': authHeader,
            'Accept': 'application/json',
          },
        }
      );

      if (transRes.ok) {
        const transData = await transRes.json();
        const closedTransition = transData.transitions?.find((t: { name: string }) =>
          ['Done', 'Closed', 'Resolved', "Won't Do", 'Cancelled'].includes(t.name)
        );

        if (closedTransition) {
          const moveRes = await fetch(
            `${baseUrl}/rest/api/3/issue/${payload.itemKey}/transitions`,
            {
              method: 'POST',
              headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ transition: { id: closedTransition.id } }),
            }
          );
          jiraSuccess = moveRes.ok;
          if (!moveRes.ok) jiraError = `Jira HTTP ${moveRes.status}`;
        } else {
          jiraError = 'No closed transition in Jira workflow';
        }
      } else {
        jiraError = `Jira transitions fetch failed: ${transRes.status}`;
      }
    }
  } catch (err: unknown) {
    jiraError = err instanceof Error ? err.message : 'Jira unreachable';
  }

  // Step 2: Write governance lock — ALWAYS fires regardless of Jira
  const { data: logId, error: fnErr } = await supabase.rpc(
    'governance_force_close',
    {
      p_issue_id:        payload.issueId,
      p_item_key:        payload.itemKey,
      p_closed_by:       payload.closedBy,
      p_category:        payload.category,
      p_stale_days:      payload.staleDays,
      p_closure_reason:  payload.closureReason,
      p_original_status: payload.originalStatus,
      p_jira_attempted:  jiraAttempted,
      p_jira_success:    jiraSuccess,
      p_jira_error:      jiraError,
    }
  );

  if (fnErr) {
    throw new Error(`Governance lock failed: ${fnErr.message}`);
  }

  console.log('[GOVERNANCE] Force close locked:', payload.itemKey, '→ log:', logId);
  return { logId: logId as string, jiraAttempted, jiraSuccess, jiraError };
}

/**
 * Restore a governance-closed item.
 * Unlocks the governance entry and restores original status.
 */
export async function executeRestore(
  logId: string,
  restoredBy: string
): Promise<void> {
  const { error } = await supabase.rpc('governance_restore', {
    p_log_id:      logId,
    p_restored_by: restoredBy,
  });
  if (error) throw new Error(`Restore failed: ${error.message}`);
  console.log('[GOVERNANCE] Restored log:', logId);
}
