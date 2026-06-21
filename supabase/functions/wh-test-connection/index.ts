import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
  duration_ms: number;
}

async function runCheck(name: string, fn: () => Promise<string>): Promise<CheckResult> {
  const start = Date.now();
  try {
    const message = await fn();
    return { name, passed: true, message, duration_ms: Date.now() - start };
  } catch (err) {
    return { name, passed: false, message: (err as Error).message, duration_ms: Date.now() - start };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: conn, error: connErr } = await supabase
    .from('ph_jira_connection')
    .select('id, site_url, auth_email, auth_token_encrypted, auth_method')
    .limit(1)
    .single();

  if (connErr || !conn) {
    return new Response(JSON.stringify({ error: 'No Jira connection configured' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const base = conn.site_url.replace(/\/+$/, '');
  const encoded = btoa(`${conn.auth_email}:${conn.auth_token_encrypted}`);
  const authHeader = `Basic ${encoded}`;

  const jira = async (path: string) => {
    const res = await fetch(`${base}${path}`, {
      headers: { Authorization: authHeader, Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  };

  let firstProjectKey: string | null = null;

  const checks: CheckResult[] = [];

  // 1. Authentication
  const authCheck = await runCheck('Authentication', async () => {
    const me = await jira('/rest/api/3/myself');
    return `Authenticated as ${me.displayName || me.emailAddress}`;
  });
  checks.push(authCheck);
  if (!authCheck.passed) {
    // Can't continue without auth
    await supabase.from('ph_jira_connection').update({
      status: 'error',
      last_tested_at: new Date().toISOString(),
      last_test_result: { checks },
    }).eq('id', conn.id);
    return new Response(JSON.stringify({ checks }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 2. Project Access
  const projectCheck = await runCheck('Project Access', async () => {
    const data = await jira('/rest/api/3/project?maxResults=50');
    const projects = Array.isArray(data) ? data : data.values ?? [];
    if (projects.length === 0) throw new Error('No accessible projects');
    firstProjectKey = projects[0].key;
    return `${projects.length} project${projects.length !== 1 ? 's' : ''} accessible`;
  });
  checks.push(projectCheck);

  // 3. Issue Read
  const issueCheck = await runCheck('Issue Read', async () => {
    const data = await jira('/rest/api/3/search/jql?jql=ORDER+BY+created+DESC&maxResults=1&fields=summary');
    const total = data.total ?? 0;
    return `${total.toLocaleString()} issue${total !== 1 ? 's' : ''} readable`;
  });
  checks.push(issueCheck);

  // 4. Version Read
  const versionCheck = await runCheck('Version Read', async () => {
    if (!firstProjectKey) throw new Error('No project available to check versions');
    const data = await jira(`/rest/api/3/project/${firstProjectKey}/version?maxResults=1`);
    const total = data.total ?? (Array.isArray(data) ? data.length : 0);
    return `Versions readable for ${firstProjectKey}`;
  });
  checks.push(versionCheck);

  // 5. Write Detection
  const writeCheck = await runCheck('Write Detection', async () => {
    const data = await jira('/rest/api/3/mypermissions?permissions=CREATE_ISSUES,EDIT_ISSUES');
    const perms = data.permissions ?? {};
    const canCreate = perms.CREATE_ISSUES?.havePermission === true;
    const canEdit = perms.EDIT_ISSUES?.havePermission === true;
    if (canCreate || canEdit) {
      return 'Write access available (read-only mode enforced by Catalyst)';
    }
    return 'Read-only token confirmed';
  });
  checks.push(writeCheck);

  const allPassed = checks.every(c => c.passed);
  const accessibleProjects: Array<{ key: string; name: string; type: string }> = [];

  if (projectCheck.passed) {
    const data = await jira('/rest/api/3/project?maxResults=50').catch(() => []);
    const projects = Array.isArray(data) ? data : data.values ?? [];
    for (const p of projects) {
      accessibleProjects.push({ key: p.key, name: p.name, type: p.projectTypeKey ?? 'software' });
    }
  }

  // Count issues
  let totalIssueCount = 0;
  if (issueCheck.passed) {
    const data = await jira('/rest/api/3/search/jql?jql=ORDER+BY+created+DESC&maxResults=1').catch(() => null);
    totalIssueCount = data?.total ?? 0;
  }

  await supabase.from('ph_jira_connection').update({
    status: allPassed ? 'connected' : 'error',
    last_tested_at: new Date().toISOString(),
    last_test_result: { checks },
    project_count: accessibleProjects.length,
    accessible_projects: accessibleProjects,
    total_issue_count: totalIssueCount,
    permissions_level: 'read_only',
    updated_at: new Date().toISOString(),
  }).eq('id', conn.id);

  return new Response(JSON.stringify({ checks, success: allPassed }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
