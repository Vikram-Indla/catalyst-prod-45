/**
 * jira-attachment-proxy — Proxies Jira attachment content through authenticated requests.
 * Accepts ?id=<jira_attachment_id> and streams the binary content back with proper MIME type.
 * Uses ph_jira_connection credentials for authentication.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const attachmentId = url.searchParams.get('id')

    if (!attachmentId) {
      return new Response(JSON.stringify({ error: 'Missing ?id= parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Get Jira connection credentials
    const { data: conn } = await supabase
      .from('ph_jira_connection')
      .select('site_url, auth_email, auth_token_encrypted')
      .eq('status', 'connected')
      .limit(1)
      .single()

    if (!conn?.site_url || !conn?.auth_email || !conn?.auth_token_encrypted) {
      return new Response(JSON.stringify({ error: 'Jira connection not configured' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const baseUrl = conn.site_url.replace(/\/+$/, '')
    const authHeader = 'Basic ' + btoa(`${conn.auth_email}:${conn.auth_token_encrypted}`)

    // Fetch the attachment content from Jira
    const jiraRes = await fetch(
      `${baseUrl}/rest/api/3/attachment/content/${attachmentId}`,
      {
        headers: {
          'Authorization': authHeader,
          'Accept': '*/*',
        },
        redirect: 'follow',
      },
    )

    if (!jiraRes.ok) {
      return new Response(JSON.stringify({ error: `Jira returned ${jiraRes.status}` }), {
        status: jiraRes.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const contentType = jiraRes.headers.get('content-type') || 'application/octet-stream'
    const body = await jiraRes.arrayBuffer()

    return new Response(body, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
