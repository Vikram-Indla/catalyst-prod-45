/**
 * Auto-syncs MDT Jira issues into ph_initiatives.
 * HARD GUARDRAIL: Only issues assigned to the 5 approved assignees are synced.
 * Runs once per session on the backlog page.
 * Skips issues that already have a matching ph_initiative (by jira_issue_key).
 * Subtasks are explicitly excluded.
 */
import { useEffect, useRef } from 'react';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

const BUSINESS_REQUEST_TYPE_ID = '0bd8d5df-70e1-4f1c-8db1-f9b217fac1de';

/**
 * HARD GUARDRAIL — Only these 5 Jira account IDs are allowed into the Product Backlog.
 * Abdullah Alshamari, Neda/Nada, Yahya, Vikram, Yazid
 */
const ALLOWED_ASSIGNEE_IDS = [
  '557058:93d1c663-e044-429d-b230-0be303c91a83',
  '712020:551b810b-5bca-4eb9-8f8c-c4dc7305e177',
  '70121:cda609ff-0c5b-4c06-8b1c-1ef1634e55e4',
  '5be3fef965364b69de240fe8',
  '712020:e7978026-c881-4f7b-9014-73ca62c41b0a',
];

/** Map Jira status to initiative_status enum */
function mapJiraStatus(status: string, statusCategory: string): string {
  const s = status.toLowerCase();
  if (statusCategory === 'Done') return 'closed';
  if (s.includes('backlog') || s.includes('open') || s.includes('to do') || s.includes('new')) return 'new_demand';
  if (s.includes('brd preparation') || s.includes('brd sign off') || s.includes('brd under review')) return 'under_review';
  if (s.includes('brd backlog')) return 'new_demand';
  if (s.includes('implementation review') || s.includes('review')) return 'in_progress';
  if (s.includes('under implementation') || s.includes('in progress') || s.includes('development') || s.includes('ready for implementation') || s.includes('figma') || s.includes('technical validation')) return 'in_progress';
  if (s.includes('in support')) return 'delivered';
  if (s.includes('cancel')) return 'cancelled';
  if (s.includes('hold') || s.includes('blocked')) return 'on_hold';
  return 'new_demand';
}

export function useSyncMDTToInitiatives() {
  const didSync = useRef(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (didSync.current) return;
    didSync.current = true;

    (async () => {
      try {
        // 1. Get MDT issues ONLY for allowed assignees, exclude Sub-tasks
        const { data: mdtIssues, error: issErr } = await supabase
          .from('ph_issues')
          .select('issue_key, summary, status, status_category, priority, assignee_display_name, assignee_account_id, issue_type, jira_created_at, jira_updated_at')
          .eq('project_key', 'MDT')
          .in('assignee_account_id', ALLOWED_ASSIGNEE_IDS)
          .is('jira_removed_at', null)
          .limit(5000);

        if (issErr || !mdtIssues?.length) {
          console.log('[MDT Sync] No qualifying issues found for allowed assignees');
          return;
        }

        // Filter out Sub-tasks (only parent-level items)
        const parentIssues = mdtIssues.filter((i: any) => {
          const type = (i.issue_type || '').toLowerCase();
          return type !== 'sub-task' && type !== 'subtask';
        });

        // Filter out Done Business Requests only
        const filteredIssues = parentIssues.filter((i: any) => {
          const isDoneBusinessRequest = i.status_category === 'Done' &&
            (i.issue_type || '').toLowerCase().includes('business request');
          return !isDoneBusinessRequest;
        });

        if (!filteredIssues.length) {
          console.log('[MDT Sync] All qualifying issues already filtered out');
          return;
        }

        // 2. Resolve Jira account IDs → Catalyst profile UUIDs
        const uniqueAccountIds = [...new Set(filteredIssues.map((i: any) => i.assignee_account_id).filter(Boolean))];
        const { data: identityRows } = await supabase
          .from('jira_identity_map')
          .select('jira_account_id, catalyst_user_id')
          .in('jira_account_id', uniqueAccountIds);

        const assigneeMap = new Map<string, string>();
        (identityRows || []).forEach((r: any) => {
          if (r.catalyst_user_id) assigneeMap.set(r.jira_account_id, r.catalyst_user_id);
        });

        // 3. Get existing initiatives with jira_issue_key set
        const { data: existing } = await typedQuery('ph_initiatives')
          .select('jira_issue_key')
          .not('jira_issue_key', 'is', null);

        const existingKeys = new Set((existing || []).map((r: any) => r.jira_issue_key));

        // 4. Filter to only new issues
        const newIssues = filteredIssues.filter((i: any) => !existingKeys.has(i.issue_key));
        if (!newIssues.length) {
          console.log('[MDT Sync] All qualifying issues already synced');
          return;
        }

        // 5. Insert as ph_initiatives with resolved assignee
        const rows = newIssues.map((issue: any) => ({
          initiative_key: issue.issue_key,
          title: issue.summary,
          status: mapJiraStatus(issue.status, issue.status_category),
          source: 'jira',
          jira_issue_key: issue.issue_key,
          initiative_type_id: BUSINESS_REQUEST_TYPE_ID,
          priority: issue.priority?.toLowerCase() || null,
          assignee_id: assigneeMap.get(issue.assignee_account_id) || null,
        }));

        // Batch insert in chunks of 50
        for (let i = 0; i < rows.length; i += 50) {
          const chunk = rows.slice(i, i + 50);
          await typedQuery('ph_initiatives').insert(chunk);
        }

        // 5. Invalidate queries
        queryClient.invalidateQueries({ queryKey: ['mdt-backlog'] });
        queryClient.invalidateQueries({ queryKey: ['backlog-initiatives'] });

        console.log(`[MDT Sync] Created ${newIssues.length} initiatives from MDT (guardrail: ${ALLOWED_ASSIGNEE_IDS.length} assignees)`);
      } catch (err) {
        console.error('[MDT Sync] Error:', err);
      }
    })();
  }, [queryClient]);
}

/** Export for use in other modules */
export { ALLOWED_ASSIGNEE_IDS };
