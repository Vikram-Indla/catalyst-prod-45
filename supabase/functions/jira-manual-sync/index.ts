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

  const url = `${JIRA_BASE_URL}/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&maxResults=100`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Jira API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    return data.issues || [];
  } catch (error) {
    console.error('Jira fetch failed:', error);
    return [];
  }
}

function transformJiraIssue(issue: any): any {
  return {
    issue_key: issue.key,
    project_key: issue.fields.project.key,
    summary: issue.fields.summary,
    issue_type: issue.fields.issuetype.name,
    status: issue.fields.status?.name || 'Unknown',
    status_category: issue.fields.status?.statusCategory?.name || 'To Do',
    assignee_account_id: issue.fields.assignee?.accountId || null,
    reporter_account_id: issue.fields.reporter?.accountId || null,
    parent_key: issue.fields.parent?.key || null,
    jira_issue_id: issue.id,
    jira_created_at: issue.fields.created,
    jira_updated_at: issue.fields.updated,
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

    // Transform and insert into ph_issues
    const rows = jiraIssues.map(transformJiraIssue);
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
        recordsSkipped: 0,
        errors: [],
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
