/**
 * wh-jira-issue-activity
 *
 * On-demand fetch of a single Jira issue's changelog + comments.
 * Used by the Activity panel in detail views when the bulk sync
 * (which skips changelog expansion to save CPU) hasn't populated
 * `jira_sync_changelog` / `jira_sync_comments` for an issue yet.
 *
 * POST { issue_key: 'BAU-5389' }
 * → upserts into jira_sync_changelog + jira_sync_comments
 * → returns { changelog_count, comment_count }
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function adfToPlainText(adf: any): string {
  if (!adf) return ''
  if (typeof adf === 'string') return adf
  let out = ''
  const walk = (n: any) => {
    if (!n) return
    if (Array.isArray(n)) { n.forEach(walk); return }
    if (n.text) out += n.text
    if (n.content) walk(n.content)
    if (n.type === 'paragraph' || n.type === 'heading') out += '\n'
  }
  walk(adf)
  return out.trim()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const { issue_key } = await req.json()
    if (!issue_key || typeof issue_key !== 'string') {
      return new Response(JSON.stringify({ error: 'issue_key required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: conn } = await supabase.from('ph_jira_connection').select('*').single()
    if (!conn || conn.status !== 'connected') {
      return new Response(JSON.stringify({ error: 'Jira not connected' }), {
        status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const base = conn.site_url.replace(/\/$/, '')
    const authHeader = 'Basic ' + btoa(`${conn.auth_email}:${conn.auth_token_encrypted}`)
    const headers = { 'Authorization': authHeader, 'Accept': 'application/json' }

    // 1. Fetch issue with changelog + comments expanded
    const url = `${base}/rest/api/3/issue/${encodeURIComponent(issue_key)}?expand=changelog&fields=comment`
    const res = await fetch(url, { headers })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return new Response(JSON.stringify({ error: `Jira ${res.status}`, detail: text.slice(0, 300) }), {
        status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    const issue = await res.json()

    // 2. Build changelog rows
    const changelogRows: any[] = []
    const histories = issue.changelog?.histories || []
    for (const history of histories) {
      for (const item of (history.items || [])) {
        changelogRows.push({
          issue_key,
          jira_history_id: history.id,
          author_display_name: history.author?.displayName || null,
          author_account_id: history.author?.accountId || null,
          author_avatar_url: history.author?.avatarUrls?.['24x24'] || history.author?.avatarUrls?.['48x48'] || null,
          field_name: item.field || null,
          field_type: item.fieldtype || null,
          from_value: item.from || null,
          to_value: item.to || null,
          from_string: item.fromString || null,
          to_string: item.toString || null,
          jira_created_at: history.created,
        })
      }
    }

    // 3. Build comment rows
    const commentRows: any[] = []
    const rawComments = issue.fields?.comment?.comments || []
    for (const c of rawComments) {
      commentRows.push({
        issue_key,
        jira_comment_id: c.id,
        author_display_name: c.author?.displayName || null,
        author_account_id: c.author?.accountId || null,
        author_avatar_url: c.author?.avatarUrls?.['24x24'] || c.author?.avatarUrls?.['48x48'] || null,
        body: c.body ? adfToPlainText(c.body) : '',
        jira_created_at: c.created,
        jira_updated_at: c.updated,
      })
    }

    // 4. Replace-by-issue_key (delete-then-insert pattern from bulk sync)
    if (changelogRows.length > 0) {
      await supabase.from('jira_sync_changelog').delete().eq('issue_key', issue_key)
      await supabase.from('jira_sync_changelog').insert(changelogRows)
    }
    if (commentRows.length > 0) {
      await supabase.from('jira_sync_comments').delete().eq('issue_key', issue_key)
      await supabase.from('jira_sync_comments').insert(commentRows)
    }

    return new Response(JSON.stringify({
      ok: true,
      issue_key,
      changelog_count: changelogRows.length,
      comment_count: commentRows.length,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err: any) {
    console.error('[wh-jira-issue-activity] error', err)
    return new Response(JSON.stringify({ error: err?.message || 'unknown' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
