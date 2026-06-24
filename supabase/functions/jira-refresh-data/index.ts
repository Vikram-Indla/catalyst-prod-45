import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const JIRA_BASE_URL = Deno.env.get('JIRA_BASE_URL') || 'https://digital-transformation.atlassian.net';
const JIRA_EMAIL = Deno.env.get('JIRA_EMAIL');
const JIRA_API_TOKEN = Deno.env.get('JIRA_API_TOKEN');

interface RefreshDataRequest {
  projectKeys: string[];
  confirmationPhrase: string;
  mode: 'dry-run' | 'confirmed';
}

interface RefreshResult {
  environment: string;
  recordsDeleted: number;
  recordsReloaded: number;
  errors: Array<{ reason: string }>;
}

function resolveEnvironment(supabaseUrl: string): string {
  if (supabaseUrl.includes('cyijbdeuehohvhnsywig')) return 'staging';
  if (supabaseUrl.includes('lmqwtldpfacrrlvdnmld')) return 'production';
  return 'local';
}

async function fetchAndTransformJiraIssues(projectKeys: string[]): Promise<any[]> {
  const auth = btoa(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`);
  const issues: any[] = [];

  const fields = [
    'project', 'summary', 'status', 'assignee', 'reporter', 'issuetype', 'parent',
    'priority', 'created', 'updated', 'fixVersions', 'labels', 'duedate',
  ];

  for (const projectKey of projectKeys) {
    const jql = `project = ${projectKey} AND created >= -30d`;

    try {
      // POST with explicit fields — /search/jql returns field-less issues otherwise.
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
        console.error(`Jira API error for ${projectKey}: ${response.status} ${await response.text()}`);
        continue;
      }

      const data = await response.json();
      const projectIssues = (data.issues || [])
        .map((issue: any) => {
          const f = issue?.fields;
          const pk = f?.project?.key;
          const it = f?.issuetype?.name;
          if (!issue?.key || !f || !pk || !it) return null;
          return {
            issue_key: issue.key,
            project_key: pk,
            summary: f.summary ?? null,
            issue_type: it,
            status: f.status?.name || 'Unknown',
            status_category: f.status?.statusCategory?.name || 'To Do',
            assignee_account_id: f.assignee?.accountId || null,
            reporter_account_id: f.reporter?.accountId || null,
            parent_key: f.parent?.key || null,
            jira_created_at: f.created,
            jira_updated_at: f.updated,
            source: 'jira' as const,
            raw_json: issue,
          };
        })
        .filter((r: any) => r !== null);

      issues.push(...projectIssues);
    } catch (error) {
      console.error(`Fetch failed for ${projectKey}:`, error);
    }
  }

  return issues;
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

    const { projectKeys, confirmationPhrase, mode }: RefreshDataRequest = await req.json();

    console.log(`[jira-refresh-data] ${environment} mode=${mode} projects=${projectKeys.join(',')}`);

    // Verify confirmation phrase for non-dry-run
    if (mode === 'confirmed') {
      const requiredPhrase =
        environment === 'production' ? 'REFRESH PRODUCTION JIRA DATA' : 'REFRESH STAGING JIRA DATA';

      if (confirmationPhrase !== requiredPhrase) {
        return new Response(
          JSON.stringify({
            environment,
            recordsDeleted: 0,
            recordsReloaded: 0,
            errors: [{ reason: 'Invalid confirmation phrase' }],
          }),
          { status: 400 }
        );
      }
    }

    // Dry-run: estimate
    if (mode === 'dry-run') {
      const { data: existingCount } = await supabase
        .from('ph_issues')
        .select('id', { count: 'exact', head: true })
        .eq('source', 'jira')
        .in('project_key', projectKeys);

      return new Response(
        JSON.stringify({
          environment,
          recordsDeleted: existingCount || 0,
          recordsReloaded: 0,
          errors: [],
        })
      );
    }

    // Confirmed: delete + reload
    const { error: deleteError } = await supabase
      .from('ph_issues')
      .delete()
      .eq('source', 'jira')
      .in('project_key', projectKeys);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return new Response(
        JSON.stringify({
          environment,
          recordsDeleted: 0,
          recordsReloaded: 0,
          errors: [{ reason: deleteError.message }],
        }),
        { status: 500 }
      );
    }

    // Fetch fresh from Jira
    const freshIssues = await fetchAndTransformJiraIssues(projectKeys);

    // Insert fresh data
    const { data: reloaded, error: insertError } = await supabase
      .from('ph_issues')
      .insert(freshIssues)
      .select('id');

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(
        JSON.stringify({
          environment,
          recordsDeleted: projectKeys.length,
          recordsReloaded: 0,
          errors: [{ reason: insertError.message }],
        }),
        { status: 500 }
      );
    }

    // Log to audit trail
    await supabase.from('jira_refresh_data_audit').insert({
      environment,
      triggered_by: 'admin', // Would be auth.uid() in production
      project_keys: projectKeys,
      records_deleted: projectKeys.length,
      records_reloaded: reloaded?.length || 0,
    });

    return new Response(
      JSON.stringify({
        environment,
        recordsDeleted: projectKeys.length,
        recordsReloaded: reloaded?.length || 0,
        errors: [],
      })
    );
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({
        environment: 'unknown',
        recordsDeleted: 0,
        recordsReloaded: 0,
        errors: [{ reason: error instanceof Error ? error.message : 'Unknown error' }],
      }),
      { status: 500 }
    );
  }
});
