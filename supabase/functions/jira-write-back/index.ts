import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const { identity_map_id, action } = await req.json();

    if (!identity_map_id || !action) {
      return new Response(
        JSON.stringify({ error: 'identity_map_id and action required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's Jira account ID and connection info
    const { data: identity, error: identityErr } = await supabase
      .from('jira_identity_map')
      .select('jira_account_id, jira_connection_id')
      .eq('id', identity_map_id)
      .single();

    if (identityErr || !identity) {
      return new Response(
        JSON.stringify({ error: 'User not found', detail: identityErr?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try ph_jira_connection first (active connection), then jira_connections (legacy)
    let jiraUrl: string | null = null;
    let authHeader: string | null = null;

    // Check ph_jira_connection (WorkHub active connection)
    const { data: phConn } = await supabase
      .from('ph_jira_connection')
      .select('jira_url, jira_email, api_token')
      .limit(1)
      .single();

    if (phConn?.jira_url && phConn?.jira_email && phConn?.api_token) {
      jiraUrl = phConn.jira_url.replace(/\/$/, '');
      authHeader = 'Basic ' + btoa(`${phConn.jira_email}:${phConn.api_token}`);
    }

    if (!jiraUrl || !authHeader) {
      // Fallback: try jira_connections table
      const connQuery = identity.jira_connection_id
        ? supabase.from('jira_connections').select('*').eq('id', identity.jira_connection_id).single()
        : supabase.from('jira_connections').select('*').limit(1).single();

      const { data: conn } = await connQuery;
      if (conn) {
        const url = conn.jira_url || conn.base_url;
        const email = conn.admin_email || conn.jira_email;
        const token = conn.api_token || conn.api_token_encrypted;
        if (url && email && token) {
          jiraUrl = url.replace(/\/$/, '');
          authHeader = 'Basic ' + btoa(`${email}:${token}`);
        }
      }
    }

    if (!jiraUrl || !authHeader) {
      return new Response(
        JSON.stringify({ error: 'No Jira connection found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let jiraResponse: Response | null = null;

    if (action === 'deactivate' || action === 'reactivate') {
      // Note: Jira Cloud doesn't support user deactivation via REST API directly.
      // This requires Atlassian Admin API or SCIM provisioning.
      // We'll attempt the standard approach and log the result.
      const activeState = action === 'reactivate';

      // Attempt via Atlassian Admin API (org-level)
      // This will likely return 403 unless SCIM is configured
      jiraResponse = await fetch(
        `${jiraUrl}/rest/api/3/user?accountId=${identity.jira_account_id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({ active: activeState }),
        }
      );

      // Log the attempt regardless of outcome
      console.log(`Write-back ${action} for ${identity.jira_account_id}: ${jiraResponse.status}`);
    }

    const responseOk = jiraResponse?.ok ?? false;
    const responseStatus = jiraResponse?.status ?? 0;

    // Log the write-back attempt in activity
    await supabase.from('jira_sync_user_events').insert({
      identity_map_id,
      event_type: `write_back_${action}`,
      direction: 'catalyst_to_jira',
      changed_fields: { action, jira_status: responseStatus, success: responseOk },
    });

    return new Response(
      JSON.stringify({
        ok: responseOk,
        status: responseStatus,
        action,
        note: responseOk
          ? 'Successfully pushed to Jira'
          : 'Jira API may not support this operation via REST. User deactivation typically requires Atlassian Admin/SCIM.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('jira-write-back error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal error', detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
