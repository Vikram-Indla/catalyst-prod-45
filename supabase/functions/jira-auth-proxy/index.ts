import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from 'https://esm.sh/@supabase/supabase-js@2/cors'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const { email, password } = await req.json()

  // ─── Step 1: Find the user in Catalyst ────────────────────────
  const { data: identity } = await supabase
    .from('jira_identity_map')
    .select('id, catalyst_user_id, jira_account_id, catalyst_only, auth_mode, is_active_in_catalyst')
    .eq('email', email)
    .single()

  if (!identity) {
    return new Response(
      JSON.stringify({ error: 'No Catalyst account found for this email.' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (!identity.is_active_in_catalyst) {
    return new Response(
      JSON.stringify({ error: 'Your Catalyst account has been deactivated.' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (identity.catalyst_only) {
    return new Response(
      JSON.stringify({ error: 'Use the standard Catalyst login for this account.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // ─── Step 2: Get Jira connection ──────────────────────────────
  const { data: conn } = await supabase
    .from('ph_jira_connection')
    .select('site_url')
    .eq('status', 'connected')
    .limit(1)
    .single()

  if (!conn) {
    return new Response(
      JSON.stringify({ error: 'Jira connection not configured.' }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // ─── Step 3: Validate credentials against Jira ───────────────
  const baseUrl = conn.site_url.replace(/\/+$/, '')
  const jiraRes = await fetch(
    `${baseUrl}/rest/auth/1/session`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ username: email, password }),
    }
  )

  if (!jiraRes.ok) {
    await jiraRes.text() // consume body
    return new Response(
      JSON.stringify({ error: 'Invalid Jira credentials.' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
  await jiraRes.text() // consume body

  // ─── Step 4: Jira accepted — issue Supabase session ──────────
  const { data: sessionData, error: sessionErr } =
    await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
    })

  if (sessionErr) {
    return new Response(
      JSON.stringify({ error: 'Failed to create Catalyst session.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // ─── Step 5: Record the auth session ─────────────────────────
  await supabase.from('jira_auth_sessions').insert({
    catalyst_user_id: identity.catalyst_user_id,
    jira_account_id: identity.jira_account_id,
    session_token_hash: crypto.randomUUID(),
    jira_session_valid: true,
    expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
  })

  // ─── Step 6: Update last login timestamp ─────────────────────
  await supabase
    .from('jira_identity_map')
    .update({
      last_jira_login_at: new Date().toISOString(),
      last_catalyst_login_at: new Date().toISOString(),
    })
    .eq('id', identity.id)

  return new Response(
    JSON.stringify({
      success: true,
      userId: identity.catalyst_user_id,
      sessionLink: sessionData.properties?.action_link,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
