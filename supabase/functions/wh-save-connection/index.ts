import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const body = await req.json().catch(() => ({}));
  const { site_url, auth_method, auth_email, auth_token } = body;

  if (!site_url || !auth_email || !auth_token) {
    return new Response(JSON.stringify({ error: 'site_url, auth_email, and auth_token are required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { data: existing } = await supabase
      .from('ph_jira_connection')
      .select('id')
      .limit(1)
      .single();

    if (existing) {
      const { error } = await supabase
        .from('ph_jira_connection')
        .update({
          site_url,
          auth_method: auth_method || 'api_token',
          auth_email,
          auth_token_encrypted: auth_token,
          status: 'testing',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('ph_jira_connection')
        .insert({
          site_url,
          auth_method: auth_method || 'api_token',
          auth_email,
          auth_token_encrypted: auth_token,
          status: 'testing',
        });

      if (error) throw error;
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
