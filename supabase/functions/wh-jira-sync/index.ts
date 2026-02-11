import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProjectConfig {
  lookback_months: number
  statuses: string[]
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const startTime = Date.now()
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const body = await req.json().catch(() => ({}))
  const syncType: string = body.sync_type || 'full'
  const overrideIssueTypes: string[] | undefined = body.issue_types
  const overrideFixVersions: string[] | undefined = body.fix_versions
  const overrideProjects: string[] | undefined = body.projects
  const overrideProjectConfigs: Record<string, ProjectConfig> | undefined = body.project_configs

  // Create log entry
  const { data: logEntry } = await supabase
    .from('wh_sync_log')
    .insert({ sync_type: syncType, status: 'running', projects_synced: overrideProjects || [] })
    .select()
    .single()
  const logId = logEntry?.id

  try {
    // 1. Get connection credentials
    const { data: conn } = await supabase.from('wh_jira_connection').select('*').single()
    if (!conn || conn.status !== 'connected') {
      throw new Error('Jira connection not configured or not connected')
    }

    // 2. Get config
    const { data: configs } = await supabase.from('wh_config').select('key, value')
    const cfg: Record<string, any> = {}
    configs?.forEach((c: any) => {
      try {
        cfg[c.key] = typeof c.value === 'string' ? JSON.parse(c.value) : c.value
      } catch {
        cfg[c.key] = c.value
      }
    })

    // Per-project configs: from request body or saved config
    const projectConfigs: Record<string, ProjectConfig> = overrideProjectConfigs || cfg.sync_project_config || {}
    let includedProjects: string[] = cfg.included_projects || []
    const hierarchyLevels: Array<{ level: number; name: string; jiraTypes: string[] }> = cfg.hierarchy_levels || []
    const statusMapping: Record<string, string[]> = cfg.status_mapping || {}
    const syncIssueTypes: string[] = overrideIssueTypes || cfg.sync_issue_types || []
    const syncFixVersions: string[] = overrideFixVersions || cfg.sync_fix_versions || []
    const syncProjects: string[] = overrideProjects || cfg.sync_projects || []

    const base = conn.site_url.replace(/\/$/, '')
    const authHeader = 'Basic ' + btoa(`${conn.auth_email}:${conn.auth_token_encrypted}`)
    const headers = { 'Authorization': authHeader, 'Accept': 'application/json' }

    // 3. Discover actual project keys from Jira
    let allProjectKeys: string[] = []
    try {
      const projRes = await fetch(`${base}/rest/api/3/project`, { headers })
      if (projRes.ok) {
        const projects = await projRes.json()
        allProjectKeys = projects.map((p: any) => p.key)
        console.log(`[sync] Jira has ${allProjectKeys.length} accessible projects`)
      }
    } catch (e) {
      console.warn('Could not fetch Jira projects:', e)
    }

    // 4. Build per-project JQL queries and fetch issues
    let allIssues: any[] = []
    const maxResults = 100
    const fields = ['summary','status','assignee','issuetype','parent','fixVersions','duedate','labels','components','priority','created','updated','resolution','customfield_10016','description','comment']
    const searchUrl = `${base}/rest/api/3/search/jql`
    const postHeaders = { ...headers, 'Content-Type': 'application/json' }

    // Determine projects to sync
    const projectsToSync = syncProjects.length > 0 ? syncProjects : allProjectKeys

    for (const projectKey of projectsToSync) {
      const pConfig = projectConfigs[projectKey] || { lookback_months: 3, statuses: [] }
      const lookbackDays = pConfig.lookback_months * 30

      // Build JQL for this project
      const jqlParts: string[] = []
      jqlParts.push(`project = "${projectKey}"`)
      jqlParts.push(`updated >= -${lookbackDays}d`)

      if (pConfig.statuses.length > 0) {
        jqlParts.push(`status in (${pConfig.statuses.map(s => `"${s}"`).join(',')})`)
      }
      if (syncIssueTypes.length > 0) {
        jqlParts.push(`issuetype in (${syncIssueTypes.map(t => `"${t}"`).join(',')})`)
      }
      if (syncFixVersions.length > 0) {
        jqlParts.push(`fixVersion in (${syncFixVersions.map(v => `"${v}"`).join(',')})`)
      }

      const jql = `${jqlParts.join(' AND ')} ORDER BY updated DESC`
      console.log(`[sync] Project ${projectKey}: JQL = ${jql}`)

      // Paginate with cursor-based pagination
      let nextPageToken: string | undefined = undefined
      let projectIssueCount = 0

      do {
        const reqBody: Record<string, any> = { jql, fields, maxResults }
        if (nextPageToken) reqBody.nextPageToken = nextPageToken

        const res = await fetch(searchUrl, { method: 'POST', headers: postHeaders, body: JSON.stringify(reqBody) })

        if (!res.ok) {
          const errText = await res.text().catch(() => '')
          console.error(`[search] ${projectKey} Error ${res.status}: ${errText.slice(0, 300)}`)
          // Skip this project on error rather than failing entire sync
          break
        }

        const data = await res.json()
        const issues = data.issues || []
        allIssues = allIssues.concat(issues)
        projectIssueCount += issues.length
        nextPageToken = data.nextPageToken || undefined
      } while (nextPageToken && projectIssueCount < 5000)

      console.log(`[sync] Project ${projectKey}: fetched ${projectIssueCount} issues`)
    }

    // 5. Map Jira status to Catalyst category
    function mapStatusCategory(jiraStatus: string): string {
      for (const [category, statuses] of Object.entries(statusMapping)) {
        if (statuses.some(s => s.toLowerCase() === jiraStatus.toLowerCase())) {
          return category
        }
      }
      return 'To Do'
    }

    // 6. Determine hierarchy level
    function getHierarchyLevel(issueType: string): number {
      for (const hl of hierarchyLevels) {
        if (hl.jiraTypes.some(t => t.toLowerCase() === issueType.toLowerCase())) {
          return hl.level
        }
      }
      return 2
    }

    // Helper: convert Jira ADF to plain text
    function adfToPlainText(node: any): string {
      if (!node) return ''
      if (typeof node === 'string') return node
      if (node.type === 'text') return node.text || ''
      if (node.content && Array.isArray(node.content)) {
        return node.content.map(adfToPlainText).join(node.type === 'paragraph' ? '\n' : '')
      }
      return ''
    }

    // 7. Transform and upsert issues
    const rows = allIssues.map((issue: any) => {
      const descAdf = issue.fields.description || null
      const descText = descAdf ? adfToPlainText(descAdf) : null
      const rawComments = issue.fields.comment?.comments || []
      const comments = rawComments.slice(-20).map((c: any) => ({
        id: c.id,
        author: c.author?.displayName || 'Unknown',
        authorAvatar: c.author?.avatarUrls?.['24x24'] || null,
        body: c.body ? adfToPlainText(c.body) : '',
        created: c.created,
        updated: c.updated,
      }))

      return {
        issue_key: issue.key,
        project_key: issue.key.split('-')[0],
        issue_type: issue.fields.issuetype?.name || 'Task',
        summary: issue.fields.summary || '',
        status: issue.fields.status?.name || 'To Do',
        status_category: mapStatusCategory(issue.fields.status?.name || 'To Do'),
        assignee_account_id: issue.fields.assignee?.accountId || null,
        assignee_display_name: issue.fields.assignee?.displayName || null,
        parent_key: issue.fields.parent?.key || null,
        parent_summary: issue.fields.parent?.fields?.summary || null,
        hierarchy_level: getHierarchyLevel(issue.fields.issuetype?.name || 'Task'),
        fix_versions: (issue.fields.fixVersions || []).map((v: any) => ({
          id: v.id, name: v.name, releaseDate: v.releaseDate
        })),
        due_date: issue.fields.duedate || null,
        labels: issue.fields.labels || [],
        components: (issue.fields.components || []).map((c: any) => c.name),
        priority: issue.fields.priority?.name || 'Medium',
        story_points: issue.fields.customfield_10016 || null,
        sprint_name: null,
        resolution: issue.fields.resolution?.name || null,
        jira_created_at: issue.fields.created,
        jira_updated_at: issue.fields.updated,
        synced_at: new Date().toISOString(),
        type_icon_url: issue.fields.issuetype?.iconUrl || null,
        description_adf: descAdf,
        description_text: descText,
        comments,
        changelog: [],
        raw_json: issue,
      }
    })

    // Batch upsert (chunks of 500)
    let upsertedCount = 0
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500)
      const { error } = await supabase
        .from('wh_issues')
        .upsert(chunk, { onConflict: 'issue_key' })
      if (error) throw error
      upsertedCount += chunk.length
    }

    // 8. HARD DELETE — Remove issues not in the fetched set for synced projects
    // This ensures only items matching the sync criteria remain
    const fetchedKeys = new Set(rows.map(r => r.issue_key))
    let pruned = 0

    if (syncType === 'full' && projectsToSync.length > 0) {
      // For each synced project, delete issues that weren't fetched
      for (const projectKey of projectsToSync) {
        // Get all existing issue keys for this project
        const { data: existingIssues } = await supabase
          .from('wh_issues')
          .select('issue_key')
          .eq('project_key', projectKey)

        if (existingIssues && existingIssues.length > 0) {
          const toDelete = existingIssues
            .map((i: any) => i.issue_key)
            .filter((k: string) => !fetchedKeys.has(k))

          if (toDelete.length > 0) {
            // Delete in batches
            for (let i = 0; i < toDelete.length; i += 500) {
              const batch = toDelete.slice(i, i + 500)
              await supabase
                .from('wh_issues')
                .delete()
                .in('issue_key', batch)
            }
            pruned += toDelete.length
            console.log(`[sync] Pruned ${toDelete.length} issues from ${projectKey}`)
          }
        }
      }
    }

    // 9. Upsert user mappings
    const uniqueUsers = new Map<string, any>()
    allIssues.forEach((issue: any) => {
      const assignee = issue.fields.assignee
      if (assignee?.accountId && !uniqueUsers.has(assignee.accountId)) {
        uniqueUsers.set(assignee.accountId, {
          jira_account_id: assignee.accountId,
          jira_display_name: assignee.displayName || '',
          jira_email: assignee.emailAddress || '',
          jira_avatar_url: assignee.avatarUrls?.['48x48'] || '',
        })
      }
    })
    if (uniqueUsers.size > 0) {
      await supabase
        .from('wh_user_mapping')
        .upsert(Array.from(uniqueUsers.values()), { onConflict: 'jira_account_id', ignoreDuplicates: false })

      // Propagate Jira avatars to profiles for already-mapped users
      const { data: mappedUsers } = await supabase
        .from('wh_user_mapping')
        .select('catalyst_profile_id, jira_avatar_url')
        .eq('is_mapped', true)
        .not('jira_avatar_url', 'eq', '')
        .not('catalyst_profile_id', 'is', null)

      if (mappedUsers && mappedUsers.length > 0) {
        for (const mu of mappedUsers) {
          await supabase.from('profiles')
            .update({ avatar_url: mu.jira_avatar_url })
            .eq('id', mu.catalyst_profile_id)
        }
      }
    }

    // 10. Fetch and upsert versions
    includedProjects = allProjectKeys.length > 0 ? allProjectKeys : includedProjects
    let totalVersions = 0
    for (const projectKey of includedProjects) {
      try {
        const vRes = await fetch(`${base}/rest/api/3/project/${projectKey}/versions`, { headers })
        if (vRes.ok) {
          const versions = await vRes.json()
          const vRows = versions.map((v: any) => ({
            jira_id: v.id,
            name: v.name,
            project_key: projectKey,
            description: v.description || '',
            release_date: v.releaseDate || null,
            start_date: v.startDate || null,
            released: v.released || false,
            archived: v.archived || false,
            synced_at: new Date().toISOString(),
          }))
          if (vRows.length > 0) {
            await supabase.from('wh_versions').upsert(vRows, { onConflict: 'jira_id' })
            totalVersions += vRows.length
          }
        }
      } catch (e) {
        console.warn(`Failed to fetch versions for ${projectKey}: ${e}`)
      }
    }

    // 11. Parse version names for dates
    await supabase.rpc('wh_parse_and_update_versions')

    // 12. Recompute effective due dates
    await supabase.rpc('wh_recompute_all')

    // 13. Update connection totals
    await supabase.from('wh_jira_connection').update({
      total_issue_count: upsertedCount,
      total_version_count: totalVersions,
    }).neq('id', '00000000-0000-0000-0000-000000000000')

    // 14. Collect warnings
    const warnings: string[] = []
    const { data: unmapped } = await supabase
      .from('wh_user_mapping')
      .select('jira_display_name')
      .eq('is_mapped', false)
    if (unmapped && unmapped.length > 0) {
      warnings.push(`${unmapped.length} unmapped Jira users`)
    }
    if (pruned > 0) {
      warnings.push(`${pruned} issues pruned (no longer match sync criteria)`)
    }

    // 15. Build max lookback for log
    const maxLookback = Object.values(projectConfigs).reduce((max, pc) => Math.max(max, pc.lookback_months || 3), 3)

    // 16. Update log entry
    const duration = Date.now() - startTime
    await supabase.from('wh_sync_log').update({
      status: warnings.length > 0 ? 'warning' : 'success',
      lookback_months: maxLookback,
      jql_query: `Per-project JQL (${projectsToSync.length} projects)`,
      issues_fetched: allIssues.length,
      issues_upserted: upsertedCount,
      issues_pruned: pruned,
      versions_fetched: totalVersions,
      warnings,
      duration_ms: duration,
      completed_at: new Date().toISOString(),
    }).eq('id', logId)

    return new Response(JSON.stringify({
      success: true,
      sync_type: syncType,
      issues_fetched: allIssues.length,
      issues_upserted: upsertedCount,
      versions_fetched: totalVersions,
      pruned,
      warnings,
      duration_ms: duration,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    const duration = Date.now() - startTime
    if (logId) {
      await supabase.from('wh_sync_log').update({
        status: 'error',
        error_message: (error as Error).message,
        duration_ms: duration,
        completed_at: new Date().toISOString(),
      }).eq('id', logId)
    }

    return new Response(JSON.stringify({
      success: false,
      error: (error as Error).message,
      duration_ms: duration,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
