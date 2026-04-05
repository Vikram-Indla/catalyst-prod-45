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

  const { trigger, direction } = await req.json()
  const startedAt = new Date().toISOString()

  // ─── Step 1: Get active Jira connection from ph_jira_connection ──
  const { data: conn, error: connErr } = await supabase
    .from('ph_jira_connection')
    .select('id, site_url, auth_email, auth_token_encrypted')
    .eq('status', 'connected')
    .limit(1)
    .single()

  if (connErr || !conn) {
    return new Response(
      JSON.stringify({ error: 'No active Jira connection configured.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // ─── Step 2: Create sync run record ───────────────────────────
  const { data: run, error: runErr } = await supabase
    .from('jira_sync_runs')
    .insert({
      run_type: trigger ?? 'manual',
      direction: direction ?? 'both',
      status: 'running',
      started_at: startedAt,
    })
    .select()
    .single()

  if (runErr) {
    return new Response(
      JSON.stringify({ error: runErr.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const stats = {
    usersDiscovered: 0,
    usersCreated: 0,
    usersUpdated: 0,
    usersDeactivated: 0,
    usersFailed: 0,
    conflictsDetected: 0,
  }

  try {
    // ─── Step 3: Pull ALL users from Jira ──────────────────────
    const jiraUsers: any[] = []
    const seenIds = new Set<string>()
    let startAt = 0
    const maxResults = 50
    const baseUrl = conn.site_url.replace(/\/+$/, '')
    const authHeader = 'Basic ' + btoa(`${conn.auth_email}:${conn.auth_token_encrypted}`)

    // Only pull ACTIVE users from Jira
    while (true) {
      const res = await fetch(
        `${baseUrl}/rest/api/3/users/search` +
        `?maxResults=${maxResults}&startAt=${startAt}&includeActive=true&includeInactive=false`,
        {
          headers: {
            'Authorization': authHeader,
            'Accept': 'application/json',
          },
        }
      )

      if (!res.ok) {
        const errText = await res.text()
        throw new Error(`Jira API error ${res.status}: ${errText}`)
      }

      const page: any[] = await res.json()
      if (!page.length) break

      for (const u of page) {
        if (u.accountType === 'atlassian' && u.active && !seenIds.has(u.accountId)) {
          seenIds.add(u.accountId)
          jiraUsers.push(u)
        }
      }

      if (page.length < maxResults) break
      startAt += maxResults
    }

    // Also try group-based fetch for 'jira-software-users' to catch missed users
    try {
      let groupStart = 0
      while (true) {
        const gRes = await fetch(
          `${baseUrl}/rest/api/3/group/member?groupname=jira-software-users` +
          `&maxResults=${maxResults}&startAt=${groupStart}&includeInactiveUsers=true`,
          {
            headers: {
              'Authorization': authHeader,
              'Accept': 'application/json',
            },
          }
        )
        if (!gRes.ok) break
        const gData = await gRes.json()
        const members = gData.values ?? []
        if (!members.length) break

        for (const u of members) {
          if (u.accountType === 'atlassian' && !seenIds.has(u.accountId)) {
            seenIds.add(u.accountId)
            jiraUsers.push(u)
          }
        }

        if (gData.isLast || members.length < maxResults) break
        groupStart += maxResults
      }
    } catch (_groupErr) {
      // Group fetch is best-effort — continue with users already found
    }

    stats.usersDiscovered = jiraUsers.length

    // ─── Step 4: Fetch existing Catalyst identity records ────────
    const { data: existingRecords } = await supabase
      .from('jira_identity_map')
      .select('id, jira_account_id, email, display_name, is_active_in_jira, sync_version')
      .eq('catalyst_only', false)

    const existingByAccountId = new Map(
      (existingRecords ?? []).map((r: any) => [r.jira_account_id, r])
    )
    const existingByEmail = new Map(
      (existingRecords ?? []).map((r: any) => [r.email, r])
    )

    // ─── Step 5: Diff and upsert ─────────────────────────────────
    for (const jiraUser of jiraUsers) {
      try {
        const existing =
          existingByAccountId.get(jiraUser.accountId) ??
          existingByEmail.get(jiraUser.emailAddress)

          const payload = {
            jira_account_id:     jiraUser.accountId,
            email:               jiraUser.emailAddress ?? `${jiraUser.accountId}@jira.placeholder`,
            display_name:        jiraUser.displayName,
            avatar_url:          jiraUser.avatarUrls?.['48x48'] ?? null,
            is_active_in_jira:   jiraUser.active ?? true,
            is_active_in_catalyst: jiraUser.active ?? true,
            auth_mode:           'jira_proxy',
            catalyst_only:       false,
            last_synced_at:      new Date().toISOString(),
            sync_version:        (existing?.sync_version ?? 0) + 1,
          }

        if (!existing) {
          const { error } = await supabase
            .from('jira_identity_map')
            .insert(payload)

          if (error) {
            stats.usersFailed++
            await supabase.from('jira_sync_user_events').insert({
              sync_run_id: run.id,
              email: jiraUser.emailAddress,
              event_type: 'failed',
              error_message: error.message,
            })
          } else {
            stats.usersCreated++
            await supabase.from('jira_sync_user_events').insert({
              sync_run_id: run.id,
              email: jiraUser.emailAddress,
              event_type: 'created',
              direction: 'jira_to_catalyst',
            })
          }
        } else {
          const conflicts: string[] = []
          if (existing.display_name !== jiraUser.displayName)
            conflicts.push('display_name')

          if (conflicts.length) stats.conflictsDetected++

          const { error } = await supabase
            .from('jira_identity_map')
            .update({
              ...payload,
              conflict_fields: conflicts,
            })
            .eq('id', existing.id)

          if (error) {
            stats.usersFailed++
          } else {
            stats.usersUpdated++
            await supabase.from('jira_sync_user_events').insert({
              sync_run_id: run.id,
              email: jiraUser.emailAddress,
              event_type: 'updated',
              direction: 'jira_to_catalyst',
              changed_fields: conflicts.length ? conflicts : ['last_synced_at'],
            })
          }
        }
      } catch (_userErr) {
        stats.usersFailed++
      }
    }

    // ─── Step 6: Deactivate users no longer in Jira ─────────────
    if (direction !== 'catalyst_to_jira') {
      const activeJiraAccountIds = new Set(jiraUsers.map((u: any) => u.accountId))

      const { data: toDeactivate } = await supabase
        .from('jira_identity_map')
        .select('id, email, jira_account_id')
        .eq('catalyst_only', false)
        .eq('is_active_in_catalyst', true)

      for (const record of toDeactivate ?? []) {
        if (record.jira_account_id && !activeJiraAccountIds.has(record.jira_account_id)) {
          await supabase
            .from('jira_identity_map')
            .update({
              is_active_in_jira: false,
              is_active_in_catalyst: false,
              last_synced_at: new Date().toISOString(),
            })
            .eq('id', record.id)

          await supabase.from('jira_sync_user_events').insert({
            sync_run_id: run.id,
            email: record.email,
            event_type: 'deactivated',
            direction: 'jira_to_catalyst',
          })

          stats.usersDeactivated++
        }
      }
    }

    // ─── Step 7: Mark sync run complete ──────────────────────────
    await supabase.from('jira_sync_runs').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      duration_ms: Date.now() - new Date(startedAt).getTime(),
      users_created: stats.usersCreated,
      users_updated: stats.usersUpdated,
      users_deactivated: stats.usersDeactivated,
      users_failed: stats.usersFailed,
      conflicts_detected: stats.conflictsDetected,
    }).eq('id', run.id)

    return new Response(
      JSON.stringify({ success: true, runId: run.id, stats }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    await supabase.from('jira_sync_runs').update({
      status: 'failed',
      completed_at: new Date().toISOString(),
      duration_ms: Date.now() - new Date(startedAt).getTime(),
    }).eq('id', run.id)

    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
