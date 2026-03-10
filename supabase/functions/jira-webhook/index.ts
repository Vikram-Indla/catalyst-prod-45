/**
 * jira-webhook — Real-time Jira → Catalyst sync via Jira Webhooks
 * 
 * Receives POST events from Jira (issue_created, issue_updated, issue_deleted)
 * and upserts/deletes the corresponding records in ph_issues, jira_sync_changelog,
 * jira_sync_comments, and ph_issue_attachments.
 * 
 * Security: Validates a shared secret header (X-Jira-Webhook-Secret).
 * 
 * Jira Webhook Setup:
 *   1. Go to Jira Admin → System → Webhooks
 *   2. Create webhook pointing to: https://<project-ref>.supabase.co/functions/v1/jira-webhook
 *   3. Add header: X-Jira-Webhook-Secret = <your secret>
 *   4. Select events: Issue → created, updated, deleted
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-jira-webhook-secret',
}

// Convert Jira ADF (Atlassian Document Format) to plain text
function adfToPlainText(node: any): string {
  if (!node) return ''
  if (typeof node === 'string') return node
  if (node.type === 'text') return node.text || ''
  if (node.content && Array.isArray(node.content)) {
    return node.content.map(adfToPlainText).join(node.type === 'paragraph' ? '\n' : '')
  }
  return ''
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    // Debug: log all incoming headers to diagnose Jira webhook format
    const allHeaders: Record<string, string> = {}
    req.headers.forEach((v, k) => { allHeaders[k] = k.toLowerCase().includes('secret') || k.toLowerCase().includes('auth') ? '***' : v })
    console.log('[jira-webhook] Incoming headers:', JSON.stringify(allHeaders))
    // ── Security: validate webhook secret ──
    // Jira can send the secret either as:
    //   1. Custom header X-Jira-Webhook-Secret (manual setup)
    //   2. HMAC signature via X-Hub-Signature (Jira native webhook secret)
    const webhookSecret = Deno.env.get('JIRA_WEBHOOK_SECRET')
    if (!webhookSecret) {
      console.error('[jira-webhook] JIRA_WEBHOOK_SECRET is not configured')
      return new Response(JSON.stringify({ error: 'Webhook secret not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const bodyBytes = await req.arrayBuffer()
    const bodyText = new TextDecoder().decode(bodyBytes)

    {
      const customHeader = req.headers.get('x-jira-webhook-secret') || ''
      const hubSignature = req.headers.get('x-hub-signature') || ''

      let valid = false

      // Method 1: Direct header match
      if (customHeader && customHeader === webhookSecret) {
        valid = true
      }

      // Method 2: Jira HMAC-SHA256 signature validation
      if (!valid && hubSignature) {
        try {
          const key = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(webhookSecret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
          )
          const sig = await crypto.subtle.sign('HMAC', key, new Uint8Array(bodyBytes))
          const computed = 'sha256=' + Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
          valid = computed === hubSignature
        } catch (e) {
          console.error('[jira-webhook] HMAC validation error:', e)
        }
      }

      if (!valid) {
        console.error('[jira-webhook] Invalid webhook secret. Headers:', JSON.stringify({
          'x-jira-webhook-secret': customHeader || '(none)',
          'x-hub-signature': hubSignature || '(none)',
        }))
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    const payload = JSON.parse(bodyText)
    const webhookEvent = payload.webhookEvent || ''
    const issue = payload.issue
    const changelog = payload.changelog // Present on issue_updated

    console.log(`[jira-webhook] Event: ${webhookEvent}, Issue: ${issue?.key || 'N/A'}`)

    if (!issue?.key) {
      return new Response(JSON.stringify({ ok: true, skipped: 'no issue key' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const issueKey = issue.key as string
    const projectKey = issueKey.split('-')[0]

    // ── Handle DELETE ──
    if (webhookEvent === 'jira:issue_deleted') {
      await Promise.all([
        supabase.from('ph_issues').delete().eq('issue_key', issueKey),
        supabase.from('jira_sync_changelog').delete().eq('issue_key', issueKey),
        supabase.from('jira_sync_comments').delete().eq('issue_key', issueKey),
        supabase.from('ph_issue_attachments').delete().eq('issue_key', issueKey),
      ])
      console.log(`[jira-webhook] Deleted ${issueKey}`)
      return new Response(JSON.stringify({ ok: true, action: 'deleted', issue_key: issueKey }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ── Handle CREATE / UPDATE ──
    if (webhookEvent === 'jira:issue_created' || webhookEvent === 'jira:issue_updated') {

      // Load status mapping + hierarchy from wh_config
      const { data: configs } = await supabase.from('wh_config').select('key, value')
      const cfg: Record<string, any> = {}
      configs?.forEach((c: any) => {
        try { cfg[c.key] = typeof c.value === 'string' ? JSON.parse(c.value) : c.value } catch { cfg[c.key] = c.value }
      })
      const statusMapping: Record<string, string[]> = cfg.status_mapping || {}
      const hierarchyLevels: Array<{ level: number; name: string; jiraTypes: string[] }> = cfg.hierarchy_levels || []

      function mapStatusCategory(jiraStatus: string): string {
        for (const [category, statuses] of Object.entries(statusMapping)) {
          if (statuses.some(s => s.toLowerCase() === jiraStatus.toLowerCase())) return category
        }
        return 'To Do'
      }

      function getHierarchyLevel(issueType: string): number {
        for (const hl of hierarchyLevels) {
          if (hl.jiraTypes.some(t => t.toLowerCase() === issueType.toLowerCase())) return hl.level
        }
        return 2
      }

      // Get project name lookup
      const { data: conn } = await supabase.from('ph_jira_connection').select('site_url, auth_email, auth_token_encrypted').single()
      let projectName: string | null = null
      if (conn) {
        const base = conn.site_url.replace(/\/$/, '')
        const authHeader = 'Basic ' + btoa(`${conn.auth_email}:${conn.auth_token_encrypted}`)
        try {
          const projRes = await fetch(`${base}/rest/api/3/project/${projectKey}`, {
            headers: { 'Authorization': authHeader, 'Accept': 'application/json' }
          })
          if (projRes.ok) {
            const proj = await projRes.json()
            projectName = proj.name || null
          }
        } catch { /* ignore */ }
      }

      // Build issue row (same shape as wh-jira-sync)
      const f = issue.fields || {}
      const descAdf = f.description || null
      const descText = descAdf ? adfToPlainText(descAdf) : null
      const rawComments = f.comment?.comments || []
      const comments = rawComments.slice(-20).map((c: any) => ({
        id: c.id,
        author: c.author?.displayName || 'Unknown',
        authorAvatar: c.author?.avatarUrls?.['24x24'] || null,
        body: c.body ? adfToPlainText(c.body) : '',
        created: c.created,
        updated: c.updated,
      }))

      const row = {
        issue_key: issueKey,
        project_key: projectKey,
        project_name: projectName,
        issue_type: f.issuetype?.name || 'Task',
        summary: f.summary || '',
        status: f.status?.name || 'To Do',
        status_category: f.status?.statusCategory?.name || mapStatusCategory(f.status?.name || 'To Do'),
        assignee_account_id: f.assignee?.accountId || null,
        assignee_display_name: f.assignee?.displayName || null,
        reporter_account_id: f.reporter?.accountId || null,
        reporter_display_name: f.reporter?.displayName || null,
        parent_key: f.parent?.key || null,
        parent_summary: f.parent?.fields?.summary || null,
        hierarchy_level: getHierarchyLevel(f.issuetype?.name || 'Task'),
        fix_versions: (f.fixVersions || []).map((v: any) => ({ id: v.id, name: v.name, releaseDate: v.releaseDate })),
        due_date: f.duedate || null,
        labels: f.labels || [],
        components: (f.components || []).map((c: any) => c.name),
        priority: f.priority?.name || 'Medium',
        story_points: f.customfield_10016 || null,
        sprint_name: null,
        resolution: f.resolution?.name || null,
        jira_created_at: f.created,
        jira_updated_at: f.updated,
        synced_at: new Date().toISOString(),
        type_icon_url: f.issuetype?.iconUrl || null,
        description_adf: descAdf,
        description_text: descText,
        comments,
        changelog: [],
        raw_json: issue,
      }

      // Upsert issue
      const { error: upsertErr } = await supabase
        .from('ph_issues')
        .upsert(row, { onConflict: 'issue_key' })
      if (upsertErr) console.error('[jira-webhook] Issue upsert error:', upsertErr)

      // ── Process changelog from webhook payload ──
      // On issue_updated, Jira sends changelog.items with the CURRENT change
      // On issue_created, there's typically no changelog
      if (changelog?.items && changelog.items.length > 0) {
        const changelogRows = changelog.items.map((item: any) => ({
          issue_key: issueKey,
          jira_history_id: changelog.id || `wh-${Date.now()}`,
          author_display_name: payload.user?.displayName || null,
          author_account_id: payload.user?.accountId || null,
          author_avatar_url: payload.user?.avatarUrls?.['24x24'] || payload.user?.avatarUrls?.['48x48'] || null,
          field_name: item.field || null,
          field_type: item.fieldtype || null,
          from_value: item.from || null,
          to_value: item.to || null,
          from_string: item.fromString || null,
          to_string: item.toString || null,
          jira_created_at: payload.timestamp ? new Date(payload.timestamp).toISOString() : new Date().toISOString(),
        }))

        const { error: clErr } = await supabase.from('jira_sync_changelog').insert(changelogRows)
        if (clErr) console.error('[jira-webhook] Changelog insert error:', clErr)
        else console.log(`[jira-webhook] Inserted ${changelogRows.length} changelog entries for ${issueKey}`)
      }

      // ── Sync comments (replace all for this issue) ──
      if (rawComments.length > 0) {
        await supabase.from('jira_sync_comments').delete().eq('issue_key', issueKey)
        const commentRows = rawComments.map((c: any) => ({
          issue_key: issueKey,
          jira_comment_id: c.id,
          author_display_name: c.author?.displayName || null,
          author_account_id: c.author?.accountId || null,
          author_avatar_url: c.author?.avatarUrls?.['24x24'] || c.author?.avatarUrls?.['48x48'] || null,
          body: c.body ? adfToPlainText(c.body) : '',
          jira_created_at: c.created,
          jira_updated_at: c.updated,
        }))
        const { error: cmErr } = await supabase.from('jira_sync_comments').insert(commentRows)
        if (cmErr) console.error('[jira-webhook] Comments insert error:', cmErr)
      }

      // ── Sync attachments ──
      const attachments = f.attachment || []
      if (attachments.length > 0) {
        const attRows = attachments.map((att: any) => ({
          issue_key: issueKey,
          jira_attachment_id: att.id,
          filename: att.filename || 'unknown',
          mime_type: att.mimeType || null,
          file_size: att.size || null,
          thumbnail_url: att.thumbnail || null,
          content_url: att.content || '',
          author_display_name: att.author?.displayName || null,
          author_account_id: att.author?.accountId || null,
          jira_created_at: att.created || null,
          synced_at: new Date().toISOString(),
        }))
        await supabase.from('ph_issue_attachments').delete().eq('issue_key', issueKey)
        await supabase.from('ph_issue_attachments').insert(attRows)
      }

      // ── Upsert user mapping ──
      const assignee = f.assignee
      if (assignee?.accountId) {
        await supabase.from('ph_user_mapping').upsert({
          jira_account_id: assignee.accountId,
          jira_display_name: assignee.displayName || '',
          jira_email: assignee.emailAddress || '',
          jira_avatar_url: assignee.avatarUrls?.['48x48'] || '',
        }, { onConflict: 'jira_account_id', ignoreDuplicates: false })

        // Propagate avatar to profile
        const { data: mapped } = await supabase
          .from('ph_user_mapping')
          .select('catalyst_profile_id, jira_avatar_url')
          .eq('jira_account_id', assignee.accountId)
          .eq('is_mapped', true)
          .not('catalyst_profile_id', 'is', null)
          .single()
        if (mapped?.catalyst_profile_id && mapped?.jira_avatar_url) {
          await supabase.from('profiles')
            .update({ avatar_url: mapped.jira_avatar_url })
            .eq('id', mapped.catalyst_profile_id)
        }
      }

      console.log(`[jira-webhook] Upserted ${issueKey} (${webhookEvent})`)
      return new Response(JSON.stringify({
        ok: true,
        action: webhookEvent === 'jira:issue_created' ? 'created' : 'updated',
        issue_key: issueKey,
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Unknown event — acknowledge but skip
    console.log(`[jira-webhook] Skipping unhandled event: ${webhookEvent}`)
    return new Response(JSON.stringify({ ok: true, skipped: webhookEvent }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('[jira-webhook] Error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
