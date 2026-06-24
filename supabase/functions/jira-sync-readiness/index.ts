// jira-sync-readiness — single source of truth for whether Jira sync is allowed.
// Reads real tables (no fabrication) and returns a readiness state + blockers + allowed actions.
// The frontend renders from THIS; sync functions enforce it server-side.
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function resolveEnvironment(url: string): string {
  if (url.includes('cyijbdeuehohvhnsywig')) return 'staging';
  if (url.includes('lmqwtldpfacrrlvdnmld')) return 'production';
  return 'local';
}

type Readiness =
  | 'NOT_CONFIGURED'
  | 'CONNECTED_NOT_DISCOVERED'
  | 'NEEDS_MAPPING'
  | 'DRY_RUN_ALLOWED'
  | 'READY_TO_SYNC';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const environment = resolveEnvironment(supabaseUrl);
  const supabase = createClient(supabaseUrl, supabaseKey);

  const reasons: string[] = [];

  // Connection (authoritative UI record)
  const { data: conn } = await supabase
    .from('ph_jira_connection')
    .select('status, site_url, project_count, last_tested_at')
    .maybeSingle();
  const connectionValid = conn?.status === 'connected';
  const jiraConfigured = !!conn?.site_url;

  if (!jiraConfigured) reasons.push('No Jira connection saved.');
  else if (!connectionValid) reasons.push(`Connection status is "${conn?.status ?? 'unknown'}", not "connected". Test the connection.`);

  // Discovery / synced data (real counts)
  const { count: discoveredProjects } = await supabase
    .from('ph_jira_projects')
    .select('project_key', { count: 'exact', head: true });
  const { count: syncedIssues } = await supabase
    .from('ph_issues')
    .select('id', { count: 'exact', head: true })
    .eq('source', 'jira');
  const { count: enabledProjects } = await supabase
    .from('ph_jira_projects')
    .select('project_key', { count: 'exact', head: true })
    .eq('is_active', true);

  if (connectionValid && (discoveredProjects ?? 0) === 0 && (syncedIssues ?? 0) === 0) {
    reasons.push('No projects discovered and no issues synced yet.');
  }

  // Last sync
  const { data: lastSync } = await supabase
    .from('ph_sync_log')
    .select('started_at, status, sync_type')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Derive readiness
  let readiness: Readiness;
  if (!connectionValid) {
    readiness = 'NOT_CONFIGURED';
  } else if ((discoveredProjects ?? 0) === 0 && (syncedIssues ?? 0) === 0) {
    readiness = 'CONNECTED_NOT_DISCOVERED';
  } else if ((syncedIssues ?? 0) === 0) {
    readiness = 'NEEDS_MAPPING';
  } else {
    readiness = 'READY_TO_SYNC';
  }

  const allowedActions = {
    configure: true,
    test: jiraConfigured,
    discover: connectionValid,
    dryRun: connectionValid,
    incrementalSync: connectionValid,
    fullSync: readiness === 'READY_TO_SYNC',
    refresh: readiness === 'READY_TO_SYNC',
  };

  return new Response(
    JSON.stringify({
      environment,
      jiraConfigured,
      connectionValid,
      siteUrl: conn?.site_url ?? null,
      lastTestedAt: conn?.last_tested_at ?? null,
      discoveredProjects: discoveredProjects ?? 0,
      syncedIssues: syncedIssues ?? 0,
      enabledProjects: enabledProjects ?? 0,
      lastSync: lastSync ?? null,
      readiness,
      reasons,
      allowedActions,
    }),
    { headers: { ...cors, 'Content-Type': 'application/json' } },
  );
});
