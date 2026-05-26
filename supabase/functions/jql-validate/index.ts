/**
 * jql-validate — P0-52
 * Validates a JQL string by calling Jira's /rest/api/3/jql/parse endpoint.
 * Returns { valid: boolean; errors: string[] }
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { jql } = await req.json() as { jql: string };
    if (!jql?.trim()) {
      return new Response(JSON.stringify({ valid: true, errors: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: conn } = await supabase
      .from('ph_jira_connection')
      .select('base_url, email, api_token')
      .limit(1)
      .single();

    if (!conn) {
      return new Response(JSON.stringify({ valid: true, errors: [], warning: 'No Jira connection configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const basicAuth = btoa(`${conn.email}:${conn.api_token}`);
    const jiraRes = await fetch(
      `${conn.base_url}/rest/api/3/jql/parse?validation=strict`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ queries: [jql] }),
      },
    );

    if (!jiraRes.ok) {
      return new Response(JSON.stringify({ valid: true, errors: [], warning: `Jira returned ${jiraRes.status}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await jiraRes.json() as {
      queries: Array<{ query: string; errors?: string[] }>;
    };

    const queryResult = body.queries?.[0];
    const errors: string[] = queryResult?.errors ?? [];

    return new Response(
      JSON.stringify({ valid: errors.length === 0, errors }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ valid: true, errors: [], warning: String(err) }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
