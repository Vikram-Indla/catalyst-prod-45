/**
 * Auto-syncs MDT Jira issues (non-Done) into ph_initiatives.
 * Runs once per session on the backlog page.
 * Skips issues that already have a matching ph_initiative (by jira_issue_key).
 */
import { useEffect, useRef } from 'react';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

const BUSINESS_REQUEST_TYPE_ID = '0bd8d5df-70e1-4f1c-8db1-f9b217fac1de';

/** Map Jira status to initiative_status enum (valid: new_demand, under_review, approved, in_progress, on_hold, delivered, closed, cancelled) */
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
        // 1. Get all MDT issues from Jira (exclude Done Business Requests only)
        const { data: mdtIssues, error: issErr } = await supabase
          .from('ph_issues')
          .select('issue_key, summary, status, status_category, priority, assignee_display_name, issue_type, jira_created_at, jira_updated_at')
          .eq('project_key', 'MDT')
          .limit(2000);

        if (issErr || !mdtIssues?.length) return;

        // ── 2026 GUARDRAIL — only sync items created or updated in 2026+ ──
        const YEAR_2026 = 2026;
        const issues2026 = mdtIssues.filter((i: any) => {
          const createdYear = i.jira_created_at ? new Date(i.jira_created_at).getFullYear() : null;
          const updatedYear = i.jira_updated_at ? new Date(i.jira_updated_at).getFullYear() : null;
          return (createdYear !== null && createdYear >= YEAR_2026) ||
                 (updatedYear !== null && updatedYear >= YEAR_2026);
        });

        // Filter out Done Business Requests only
        const filteredIssues = issues2026.filter((i: any) => {
          const isDoneBusinessRequest = i.status_category === 'Done' &&
            (i.issue_type || '').toLowerCase().includes('business request');
          return !isDoneBusinessRequest;
        });

        // 2. Get existing initiatives with jira_issue_key set
        const { data: existing } = await typedQuery('ph_initiatives')
          .select('jira_issue_key')
          .not('jira_issue_key', 'is', null);

        const existingKeys = new Set((existing || []).map((r: any) => r.jira_issue_key));

        // 3. Filter to only new issues
        const newIssues = filteredIssues.filter((i: any) => !existingKeys.has(i.issue_key));
        if (!newIssues.length) return;

        // 4. Insert as ph_initiatives
        const rows = newIssues.map((issue: any) => ({
          initiative_key: issue.issue_key,
          title: issue.summary,
          status: mapJiraStatus(issue.status, issue.status_category),
          source: 'jira',
          jira_issue_key: issue.issue_key,
          initiative_type_id: BUSINESS_REQUEST_TYPE_ID,
          priority: issue.priority?.toLowerCase() || null,
        }));

        // Batch insert in chunks of 50
        for (let i = 0; i < rows.length; i += 50) {
          const chunk = rows.slice(i, i + 50);
          await typedQuery('ph_initiatives').insert(chunk);
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
