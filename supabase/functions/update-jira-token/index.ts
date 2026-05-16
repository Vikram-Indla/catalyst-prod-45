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
  const newToken = body.token;

  if (!newToken) {
    return new Response(JSON.stringify({ error: 'token required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    // Try to update existing row
    const { data: existing } = await supabase
      .from('ph_jira_connection')
      .select('id')
      .eq('status', 'connected')
      .single()
      .catch(() => ({ data: null }));

    if (existing) {
      // Update existing
      await supabase
        .from('ph_jira_connection')
        .update({ auth_token_encrypted: newToken })
        .eq('id', existing.id);

      return new Response(JSON.stringify({ success: true, action: 'updated' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else {
      // Insert new
      await supabase.from('ph_jira_connection').insert({
        site_url: 'https://digital-transformation.atlassian.net',
        auth_email: 'vikramataol@gmail.com',
        auth_token_encrypted: newToken,
        status: 'connected'
      });

      return new Response(JSON.stringify({ success: true, action: 'inserted' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
