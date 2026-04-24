import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProjectConfig {
  lookback_months: number
  status_categories?: string[]
  statuses?: string[]  // legacy support
  issue_types?: string[]
  fix_versions?: string[]
}

Deno.serve(async (req) => {
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
  const overrideProjects: string[] | undefined = body.projects || body.projectKeys
  const overrideProjectConfigs: Record<string, ProjectConfig> | undefined = body.project_configs

  // Create log entry
  const { data: logEntry } = await supabase
    .from('ph_sync_log')
    .insert({ sync_type: syncType, status: 'running', projects_synced: overrideProjects || [] })
    .select()
    .single()
  const logId = logEntry?.id

  try {
    // 1. Get connection credentials
    const { data: conn } = await supabase.from('ph_jira_connection').select('*').single()
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

    // 3. Discover actual project keys from Jira and build name lookup
    let allProjectKeys: string[] = []
    const projectNameLookup: Record<string, string> = {}
    try {
      const projRes = await fetch(`${base}/rest/api/3/project`, { headers })
      if (projRes.ok) {
        const projects = await projRes.json()
        allProjectKeys = projects.map((p: any) => p.key)
        projects.forEach((p: any) => { projectNameLookup[p.key] = p.name })
        console.log(`[sync] Jira has ${allProjectKeys.length} accessible projects`)
      }
    } catch (e) {
      console.warn('Could not fetch Jira projects:', e)
    }

    // 4. Build per-project JQL queries and fetch issues
    let allIssues: any[] = []
    let hadSearchErrors = false
    const maxResults = 100
    const fields = ['summary','status','assignee','reporter','issuetype','parent','fixVersions','duedate','labels','components','priority','created','updated','resolution','customfield_10016','description','comment','attachment','issuelinks']
    const searchUrl = `${base}/rest/api/3/search/jql`
    const postHeaders = { ...headers, 'Content-Type': 'application/json' }

    // Determine projects to sync
    const projectsToSync = syncProjects.length > 0 ? syncProjects : allProjectKeys

    for (const projectKey of projectsToSync) {
      const pConfig = projectConfigs[projectKey] || { lookback_months: 3, status_categories: [], issue_types: [], fix_versions: [] }
      const lookbackMonths = pConfig.lookback_months ?? 3

      // Build JQL for this project
      const jqlParts: string[] = []
      jqlParts.push(`project = "${projectKey}"`)
      // Lifetime sync (0) skips the date filter entirely
      if (lookbackMonths > 0) {
        const lookbackDays = lookbackMonths * 30
        jqlParts.push(`updated >= -${lookbackDays}d`)
      }

      // Status category filter
      const statusCategories = pConfig.status_categories || []
      if (statusCategories.length > 0) {
        jqlParts.push(`statusCategory in (${statusCategories.map(c => `"${c}"`).join(',')})`)
      } else if (pConfig.statuses && pConfig.statuses.length > 0) {
        jqlParts.push(`status in (${pConfig.statuses.map(s => `"${s}"`).join(',')})`)
      }

      // Per-project issue type filter
      const projIssueTypes = pConfig.issue_types || []
      if (projIssueTypes.length > 0) {
        jqlParts.push(`issuetype in (${projIssueTypes.map(t => `"${t}"`).join(',')})`)
      } else if (syncIssueTypes.length > 0) {
        jqlParts.push(`issuetype in (${syncIssueTypes.map(t => `"${t}"`).join(',')})`)
      }

      // Per-project fix version filter
      const projFixVersions = (pConfig.fix_versions || []).filter(v => v !== '__NO_VERSION__')
      const includeNoVersion = (pConfig.fix_versions || []).includes('__NO_VERSION__')

      if (projFixVersions.length > 0 && includeNoVersion) {
        jqlParts.push(`(fixVersion in (${projFixVersions.map(v => `"${v}"`).join(',')}) OR fixVersion is EMPTY)`)
      } else if (projFixVersions.length > 0) {
        jqlParts.push(`fixVersion in (${projFixVersions.map(v => `"${v}"`).join(',')})`)
      } else if (includeNoVersion) {
        jqlParts.push(`fixVersion is EMPTY`)
      } else if (syncFixVersions.length > 0) {
        jqlParts.push(`fixVersion in (${syncFixVersions.map(v => `"${v}"`).join(',')})`)
      }

      const jql = `${jqlParts.join(' AND ')} ORDER BY updated DESC`
      console.log(`[sync] Project ${projectKey}: JQL = ${jql}`)

      // Paginate with cursor token (supported by /search/jql)
      let nextPageToken: string | undefined = undefined
      let projectIssueCount = 0

      do {
        const reqBody: Record<string, any> = { jql, fields, maxResults, expand: 'changelog' }
        if (nextPageToken) reqBody.nextPageToken = nextPageToken

        const res = await fetch(searchUrl, { method: 'POST', headers: postHeaders, body: JSON.stringify(reqBody) })

        if (!res.ok) {
          const errText = await res.text().catch(() => '')
          hadSearchErrors = true
          console.error(`[search] ${projectKey} Error ${res.status}: ${errText.slice(0, 300)}`)
          break
        }

        const data = await res.json()
        const issues = Array.isArray(data.issues) ? data.issues : []
        allIssues = allIssues.concat(issues)
        projectIssueCount += issues.length
        nextPageToken = data.nextPageToken || undefined
      } while (nextPageToken && projectIssueCount < 5000)

      console.log(`[sync] Project ${projectKey}: fetched ${projectIssueCount} issues`)
    }

    // Fail fast if search failed and returned no issues at all (protect existing data)
    if (hadSearchErrors && allIssues.length === 0) {
      throw new Error('Jira search failed: invalid search payload or permissions. No issues were synced.')
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

    // Helper: convert Jira ADF to plain text.
    //
    // CRITICAL: ADF mention nodes have NO `content` array — the display name
    // lives in `attrs.text` (e.g. "@vikram indla"). Without the explicit
    // mention branch the @-mention is silently dropped during sync, which
    // breaks every downstream feature that matches on "@name" in the body
    // (For You "Reply to mentions", comment search, notifications).
    // This must stay in lock-step with wh-jira-sync's adfToPlainText.
    // (RCA 2026-04-24 — BAU-5648 Muhammad Ayaz mention was invisible until
    //  this landed; deploy the pair together whenever either is touched.)
    function adfToPlainText(node: any): string {
      if (!node) return ''
      if (typeof node === 'string') return node
      if (node.type === 'text') return node.text || ''
      if (node.type === 'mention') {
        const t = node.attrs?.text
        if (t) return t
        const id = node.attrs?.id
        return id ? `@${id}` : ''
      }
      if (node.type === 'emoji') return node.attrs?.shortName || node.attrs?.text || ''
      if (node.type === 'hardBreak') return '\n'
      if (node.content && Array.isArray(node.content)) {
        return node.content.map(adfToPlainText).join(node.type === 'paragraph' ? '\n' : '')
      }
      return ''
    }

    // Helper: resolve parent key from issuelinks (for BRD Tasks and similar types without standard parent)
    function resolveParentFromLinks(issue: any): string | null {
      const links = issue.fields?.issuelinks || []
      for (const link of links) {
        if (link.inwardIssue && (
          link.type?.inward?.toLowerCase().includes('is caused by') ||
          link.type?.inward?.toLowerCase().includes('is child of') ||
          link.type?.inward?.toLowerCase().includes('is part of') ||
          link.type?.inward?.toLowerCase().includes('is subtask of') ||
          link.type?.name?.toLowerCase().includes('parent')
        )) {
          return link.inwardIssue.key
        }
        if (link.outwardIssue && (
          link.type?.outward?.toLowerCase().includes('is parent of') ||
          link.type?.outward?.toLowerCase().includes('causes')
        )) {
          return link.outwardIssue.key
        }
      }
      const issueType = (issue.fields?.issuetype?.name || '').toLowerCase()
      if (issueType.includes('brd') || issueType.includes('sub')) {
        for (const link of links) {
          if (link.inwardIssue) return link.inwardIssue.key
        }
      }
      return null
    }

    function resolveParentSummaryFromLinks(issue: any): string | null {
      const links = issue.fields?.issuelinks || []
      for (const link of links) {
        if (link.inwardIssue && (
          link.type?.inward?.toLowerCase().includes('is caused by') ||
          link.type?.inward?.toLowerCase().includes('is child of') ||
          link.type?.inward?.toLowerCase().includes('is part of') ||
          link.type?.inward?.toLowerCase().includes('is subtask of') ||
          link.type?.name?.toLowerCase().includes('parent')
        )) {
          return link.inwardIssue.fields?.summary || null
        }
        if (link.outwardIssue && (
          link.type?.outward?.toLowerCase().includes('is parent of') ||
          link.type?.outward?.toLowerCase().includes('causes')
        )) {
          return link.outwardIssue.fields?.summary || null
        }
      }
      const issueType = (issue.fields?.issuetype?.name || '').toLowerCase()
      if (issueType.includes('brd') || issueType.includes('sub')) {
        for (const link of links) {
          if (link.inwardIssue) return link.inwardIssue.fields?.summary || null
        }
      }
      return null
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
        project_name: projectNameLookup[issue.key.split('-')[0]] || null,
        issue_type: issue.fields.issuetype?.name || 'Task',
        summary: issue.fields.summary || '',
        status: issue.fields.status?.name || 'To Do',
        status_category: issue.fields.status?.statusCategory?.name || mapStatusCategory(issue.fields.status?.name || 'To Do'),
        assignee_account_id: issue.fields.assignee?.accountId || null,
        assignee_display_name: issue.fields.assignee?.displayName || null,
        reporter_account_id: issue.fields.reporter?.accountId || null,
        reporter_display_name: issue.fields.reporter?.displayName || null,
        parent_key: issue.fields.parent?.key || resolveParentFromLinks(issue) || null,
        parent_summary: issue.fields.parent?.fields?.summary || resolveParentSummaryFromLinks(issue) || null,
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
    // ── 2026 GUARDRAIL — only sync items created or updated in 2026+ ──
    .filter((r: any) => {
      const createdYear = r.jira_created_at ? new Date(r.jira_created_at).getFullYear() : null
      const updatedYear = r.jira_updated_at ? new Date(r.jira_updated_at).getFullYear() : null
      return (createdYear !== null && createdYear >= 2026) ||
             (updatedYear !== null && updatedYear >= 2026)
    })

    // Batch upsert (chunks of 500)
    let upsertedCount = 0
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500)
      const { error } = await supabase
        .from('ph_issues')
        .upsert(chunk, { onConflict: 'issue_key' })
      if (error) throw error
      upsertedCount += chunk.length
    }

    // 7b. Extract and upsert attachments
    const attachmentRows: any[] = []
    for (const issue of allIssues) {
      const attachments = issue.fields.attachment || []
      for (const att of attachments) {
        attachmentRows.push({
          issue_key: issue.key,
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
        })
      }
    }
    if (attachmentRows.length > 0) {
      for (let i = 0; i < attachmentRows.length; i += 500) {
        const chunk = attachmentRows.slice(i, i + 500)
        await supabase
          .from('ph_issue_attachments')
          .upsert(chunk, { onConflict: 'issue_key,jira_attachment_id' })
      }
      console.log(`[sync] Upserted ${attachmentRows.length} attachments`)
    }

    // 7c. Extract and upsert changelog entries → jira_sync_changelog
    const changelogRows: any[] = []
    for (const issue of allIssues) {
      const histories = issue.changelog?.histories || []
      for (const history of histories) {
        for (const item of (history.items || [])) {
          changelogRows.push({
            issue_key: issue.key,
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
    }
    if (changelogRows.length > 0) {
      const syncedKeys = [...new Set(changelogRows.map(r => r.issue_key))]
      for (let i = 0; i < syncedKeys.length; i += 500) {
        const batch = syncedKeys.slice(i, i + 500)
        await supabase.from('jira_sync_changelog').delete().in('issue_key', batch)
      }
      for (let i = 0; i < changelogRows.length; i += 500) {
        const chunk = changelogRows.slice(i, i + 500)
        await supabase.from('jira_sync_changelog').insert(chunk)
      }
      console.log(`[sync] Upserted ${changelogRows.length} changelog entries`)

      // Mirror to ph_activity_log (Catalyst-native) — single source of truth for Activity panel
      const { data: phIssues } = await supabase
        .from('ph_issues')
        .select('id, issue_key')
        .in('issue_key', syncedKeys)
      const issueKeyToId = new Map<string, string>((phIssues || []).map((r: any) => [r.issue_key, r.id]))

      const { data: userMappings } = await supabase
        .from('ph_user_mapping')
        .select('jira_account_id, catalyst_profile_id')
        .eq('is_mapped', true)
        .not('catalyst_profile_id', 'is', null)
      const userMap = new Map<string, string>((userMappings || []).map((m: any) => [m.jira_account_id, m.catalyst_profile_id]))

      const phActivityRows = changelogRows
        .filter(r => issueKeyToId.has(r.issue_key))
        .map(r => ({
          work_item_id: issueKeyToId.get(r.issue_key),
          user_id: r.author_account_id ? (userMap.get(r.author_account_id) || null) : null,
          action: 'update',
          field_name: r.field_name,
          field_type: r.field_type,
          old_value: r.from_string || r.from_value,
          new_value: r.to_string || r.to_value,
          created_at: r.jira_created_at,
          source: 'jira',
          jira_history_id: r.jira_history_id,
          jira_author_account_id: r.author_account_id,
          jira_author_display_name: r.author_display_name,
          jira_author_avatar_url: r.author_avatar_url,
          jira_created_at: r.jira_created_at,
        }))
      for (let i = 0; i < phActivityRows.length; i += 500) {
        const chunk = phActivityRows.slice(i, i + 500)
        const { error: phErr } = await supabase
          .from('ph_activity_log')
          .upsert(chunk, { onConflict: 'jira_history_id,field_name', ignoreDuplicates: false })
        if (phErr) console.error(`[sync] ph_activity_log upsert error: ${phErr.message}`)
      }
    }

    // 7d. Extract and upsert comments → jira_sync_comments
    const commentRows: any[] = []
    for (const issue of allIssues) {
      const rawComments = issue.fields.comment?.comments || []
      for (const c of rawComments) {
        commentRows.push({
          issue_key: issue.key,
          jira_comment_id: c.id,
          author_display_name: c.author?.displayName || null,
          author_account_id: c.author?.accountId || null,
          author_avatar_url: c.author?.avatarUrls?.['24x24'] || c.author?.avatarUrls?.['48x48'] || null,
          body: c.body ? adfToPlainText(c.body) : '',
          jira_created_at: c.created,
          jira_updated_at: c.updated,
        })
      }
    }
    if (commentRows.length > 0) {
      const syncedKeys = [...new Set(commentRows.map(r => r.issue_key))]
      for (let i = 0; i < syncedKeys.length; i += 500) {
        const batch = syncedKeys.slice(i, i + 500)
        await supabase.from('jira_sync_comments').delete().in('issue_key', batch)
      }
      for (let i = 0; i < commentRows.length; i += 500) {
        const chunk = commentRows.slice(i, i + 500)
        await supabase.from('jira_sync_comments').insert(chunk)
      }
      console.log(`[sync] Upserted ${commentRows.length} comments`)

      // Mirror to ph_comments (Catalyst-native) — single source of truth for Activity panel
      const { data: phIssues } = await supabase
        .from('ph_issues')
        .select('id, issue_key')
        .in('issue_key', syncedKeys)
      const issueKeyToId = new Map<string, string>((phIssues || []).map((r: any) => [r.issue_key, r.id]))

      const { data: userMappings } = await supabase
        .from('ph_user_mapping')
        .select('jira_account_id, catalyst_profile_id')
        .eq('is_mapped', true)
        .not('catalyst_profile_id', 'is', null)
      const userMap = new Map<string, string>((userMappings || []).map((m: any) => [m.jira_account_id, m.catalyst_profile_id]))

      const phCommentRows = commentRows
        .filter(r => issueKeyToId.has(r.issue_key))
        .map(r => ({
          work_item_id: issueKeyToId.get(r.issue_key),
          author_id: r.author_account_id ? (userMap.get(r.author_account_id) || null) : null,
          body: r.body,
          created_at: r.jira_created_at,
          updated_at: r.jira_updated_at || r.jira_created_at,
          source: 'jira',
          jira_comment_id: r.jira_comment_id,
          jira_author_account_id: r.author_account_id,
          jira_author_display_name: r.author_display_name,
          jira_author_avatar_url: r.author_avatar_url,
          jira_created_at: r.jira_created_at,
        }))
      for (let i = 0; i < phCommentRows.length; i += 500) {
        const chunk = phCommentRows.slice(i, i + 500)
        const { error: phErr } = await supabase
          .from('ph_comments')
          .upsert(chunk, { onConflict: 'jira_comment_id', ignoreDuplicates: false })
        if (phErr) console.error(`[sync] ph_comments upsert error: ${phErr.message}`)
      }
    }

    // 8. HARD DELETE — Remove issues not in the fetched set for synced projects
    const fetchedKeys = new Set(rows.map(r => r.issue_key))
    let pruned = 0

    if (syncType === 'full' && projectsToSync.length > 0 && !hadSearchErrors) {
      for (const projectKey of projectsToSync) {
        const { data: existingIssues } = await supabase
          .from('ph_issues')
          .select('issue_key')
          .eq('project_key', projectKey)

        if (existingIssues && existingIssues.length > 0) {
          const toDelete = existingIssues
            .map((i: any) => i.issue_key)
            .filter((k: string) => !fetchedKeys.has(k))

          if (toDelete.length > 0) {
            for (let i = 0; i < toDelete.length; i += 500) {
              const batch = toDelete.slice(i, i + 500)
              await supabase
                .from('ph_issues')
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
        .from('ph_user_mapping')
        .upsert(Array.from(uniqueUsers.values()), { onConflict: 'jira_account_id', ignoreDuplicates: false })

      // Propagate Jira avatars to profiles for already-mapped users
      const { data: mappedUsers } = await supabase
        .from('ph_user_mapping')
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
            await supabase.from('ph_versions').upsert(vRows, { onConflict: 'jira_id' })
            totalVersions += vRows.length
          }
        }
      } catch (e) {
        console.warn(`Failed to fetch versions for ${projectKey}: ${e}`)
      }
    }

    // 11. Parse version names for dates
    await supabase.rpc('ph_parse_and_update_versions')

    // 12. Recompute effective due dates
    await supabase.rpc('ph_recompute_all')

    // 13. Update connection totals
    await supabase.from('ph_jira_connection').update({
      total_issue_count: upsertedCount,
      total_version_count: totalVersions,
    }).neq('id', '00000000-0000-0000-0000-000000000000')

    // 14. Collect warnings
    const warnings: string[] = []
    const { data: unmapped } = await supabase
      .from('ph_user_mapping')
      .select('jira_display_name')
      .eq('is_mapped', false)
    if (unmapped && unmapped.length > 0) {
      warnings.push(`${unmapped.length} unmapped Jira users`)
    }
    if (hadSearchErrors) {
      warnings.push('Search errors occurred; prune step was skipped to protect existing data')
    }
    if (pruned > 0) {
      warnings.push(`${pruned} issues pruned (no longer match sync criteria)`)
    }

    // 15. Build max lookback for log
    const maxLookback = Object.values(projectConfigs).reduce((max, pc) => Math.max(max, pc.lookback_months || 3), 3)

    // 16. Update log entry
    const duration = Date.now() - startTime
    await supabase.from('ph_sync_log').update({
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
      await supabase.from('ph_sync_log').update({
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
