/**
 * Auto-syncs MDT Jira issues (non-Done) into ph_initiatives.
 * Runs once per session on the backlog page.
 * Skips issues that already have a matching ph_initiative (by jira_issue_key).
 */
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

const ENHANCEMENT_TYPE_ID = '00242328-979a-4ecb-8f02-5d3b982966d1';

/** Map Jira status to initiative_status enum */
function mapJiraStatus(status: string, statusCategory: string): string {
  const s = status.toLowerCase();
  if (statusCategory === 'Done') return 'done';
  if (s.includes('backlog') || s.includes('open') || s.includes('to do') || s.includes('new')) return 'new_demand';
  if (s.includes('brd preparation') || s.includes('brd sign off')) return 'analysis';
  if (s.includes('brd backlog')) return 'new_demand';
  if (s.includes('implementation review')) return 'implementation_review';
  if (s.includes('in progress') || s.includes('development')) return 'under_implementation';
  if (s.includes('in support')) return 'in_support';
  if (s.includes('cancel')) return 'cancelled';
  if (s.includes('hold')) return 'on_hold';
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
        // 1. Get all non-Done MDT issues from Jira
        const { data: mdtIssues, error: issErr } = await supabase
          .from('ph_issues')
          .select('issue_key, summary, status, status_category, priority, assignee_display_name')
          .eq('project_key', 'MDT')
          .neq('status_category', 'Done')
          .limit(2000);

        if (issErr || !mdtIssues?.length) return;

        // 2. Get existing initiatives with jira_issue_key set
        const { data: existing } = await (supabase as any)
          .from('ph_initiatives')
          .select('jira_issue_key')
          .not('jira_issue_key', 'is', null);

        const existingKeys = new Set((existing || []).map((r: any) => r.jira_issue_key));

        // 3. Filter to only new issues
        const newIssues = mdtIssues.filter(i => !existingKeys.has(i.issue_key));
        if (!newIssues.length) return;

        // 4. Insert as ph_initiatives
        const rows = newIssues.map(issue => ({
          initiative_key: issue.issue_key,
          title: issue.summary,
          status: mapJiraStatus(issue.status, issue.status_category),
          source: 'jira',
          jira_issue_key: issue.issue_key,
          initiative_type_id: ENHANCEMENT_TYPE_ID,
          priority: issue.priority?.toLowerCase() || null,
        }));

        // Batch insert in chunks of 50
        for (let i = 0; i < rows.length; i += 50) {
          const chunk = rows.slice(i, i + 50);
          await (supabase as any).from('ph_initiatives').insert(chunk);
        }

        // 5. Invalidate queries
        queryClient.invalidateQueries({ queryKey: ['mdt-backlog'] });
        queryClient.invalidateQueries({ queryKey: ['backlog-initiatives'] });

        console.log(`[MDT Sync] Created ${newIssues.length} initiatives from Jira MDT issues`);
      } catch (err) {
        console.error('[MDT Sync] Error:', err);
      }
    })();
  }, [queryClient]);
}
