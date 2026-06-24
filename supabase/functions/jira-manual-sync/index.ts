import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const JIRA_BASE_URL = Deno.env.get('JIRA_BASE_URL') || 'https://digital-transformation.atlassian.net';
const JIRA_EMAIL = Deno.env.get('JIRA_EMAIL');
const JIRA_API_TOKEN = Deno.env.get('JIRA_API_TOKEN');

interface ManualSyncRequest {
  projectKey?: string;
  mode: 'full' | 'incremental' | 'dry-run';
}

interface SyncResult {
  environment: string;
  recordsAdded: number;
  recordsSkipped: number;
  errors: Array<{ issue: string; reason: string }>;
  estimatedCount?: number;
}

function resolveEnvironment(supabaseUrl: string): string {
  if (supabaseUrl.includes('cyijbdeuehohvhnsywig')) return 'staging';
  if (supabaseUrl.includes('lmqwtldpfacrrlvdnmld')) return 'production';
  return 'local';
}

async function fetchJiraIssues(
  projectKey?: string,
  filters?: Record<string, string>
): Promise<any[]> {
  const auth = btoa(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`);

  let jql = 'created >= -30d';
  if (projectKey) jql += ` AND project = ${projectKey}`;
  if (filters?.typeFilter) jql += ` AND type IN (${filters.typeFilter})`;
  if (filters?.statusFilter) jql += ` AND status IN (${filters.statusFilter})`;

  // /rest/api/3/search/jql requires an explicit `fields` list in a POST body —
  // GET without fields returns issues with NO fields object (all would be skipped).
  const fields = [
    'project', 'summary', 'status', 'assignee', 'reporter', 'issuetype', 'parent',
    'priority', 'created', 'updated', 'fixVersions', 'labels', 'duedate',
  ];

  try {
    const response = await fetch(`${JIRA_BASE_URL}/rest/api/3/search/jql`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ jql, fields, maxResults: 100 }),
    });

    if (!response.ok) {
      console.error(`Jira API error: ${response.status} ${await response.text()}`);
      return [];
    }

    const data = await response.json();
    return data.issues || [];
  } catch (error) {
    console.error('Jira fetch failed:', error);
    return [];
  }
}

// Returns a ph_issues row, or null when the issue is missing required fields.
// Never throws — a single malformed issue must not 500 the whole batch.
function transformJiraIssue(issue: any): any | null {
  const f = issue?.fields;
  const projectKey = f?.project?.key;
  const issueType = f?.issuetype?.name;
  if (!issue?.key || !f || !projectKey || !issueType) {
    return null;
  }
  return {
    issue_key: issue.key,
    project_key: projectKey,
    summary: f.summary ?? null,
    issue_type: issueType,
    status: f.status?.name || 'Unknown',
    status_category: f.status?.statusCategory?.name || 'To Do',
    assignee_account_id: f.assignee?.accountId || null,
    reporter_account_id: f.reporter?.accountId || null,
    parent_key: f.parent?.key || null,
    jira_issue_id: issue.id,
    jira_created_at: f.created,
    jira_updated_at: f.updated,
    source: 'jira' as const,
    raw_json: issue,
  };
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), { status: 405 });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const environment = resolveEnvironment(supabaseUrl);

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { projectKey, mode }: ManualSyncRequest = await req.json();

    console.log(`[jira-manual-sync] ${environment} mode=${mode} projectKey=${projectKey}`);

    // Fetch sync filters for this environment
    const { data: filters } = await supabase
      .from('jira_project_sync_filters')
      .select('*')
      .eq('environment', environment)
      .eq('project_key', projectKey || '')
      .maybeSingle();

    if (projectKey && !filters) {
      return new Response(
        JSON.stringify({
          environment,
          recordsAdded: 0,
          recordsSkipped: 0,
          errors: [{ issue: projectKey, reason: 'No sync filter configured' }],
        }),
        { status: 400 }
      );
    }

    // Fetch Jira issues
    const jiraIssues = await fetchJiraIssues(projectKey, {
      typeFilter: filters?.include_types?.join(','),
      statusFilter: filters?.include_statuses?.join(','),
    });

    console.log(`[jira-manual-sync] fetched ${jiraIssues.length} from Jira`);

    if (mode === 'dry-run') {
      return new Response(
        JSON.stringify({
          environment,
          recordsAdded: 0,
          recordsSkipped: 0,
          errors: [],
          estimatedCount: jiraIssues.length,
        })
      );
    }

    // Transform and insert into ph_issues. Skip (don't crash on) malformed issues.
    const rows = jiraIssues.map(transformJiraIssue).filter((r) => r !== null);
    const skippedTransform = jiraIssues.length - rows.length;

    if (rows.length === 0) {
      return new Response(
        JSON.stringify({
          environment,
          recordsAdded: 0,
          recordsSkipped: skippedTransform,
          errors: skippedTransform > 0 ? [{ issue: 'batch', reason: `${skippedTransform} issues missing required fields` }] : [],
        })
      );
    }

    const { data: inserted, error: insertError } = await supabase
      .from('ph_issues')
      .upsert(rows, { onConflict: 'issue_key' })
      .select('id');

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(
        JSON.stringify({
          environment,
          recordsAdded: 0,
          recordsSkipped: jiraIssues.length,
          errors: [{ issue: 'batch', reason: insertError.message }],
        })
      );
    }

    return new Response(
      JSON.stringify({
        environment,
        recordsAdded: inserted?.length || 0,
        recordsSkipped: skippedTransform,
        errors: skippedTransform > 0 ? [{ issue: 'batch', reason: `${skippedTransform} issues skipped (missing required fields)` }] : [],
      })
    );
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({
        environment: 'unknown',
        recordsAdded: 0,
        recordsSkipped: 0,
        errors: [{ issue: 'system', reason: error instanceof Error ? error.message : 'Unknown error' }],
      }),
      { status: 500 }
    );
  }
});
