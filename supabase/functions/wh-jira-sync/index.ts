import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProjectConfig {
  lookback_months: number
  status_categories?: string[]
  statuses?: string[]
  issue_types?: string[]
  fix_versions?: string[]
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
  const overrideProjects: string[] | undefined = body.projects || body.projectKeys
  const overrideProjectConfigs: Record<string, ProjectConfig> | undefined = body.project_configs

  // ── Clean up stuck "running" entries older than 10 minutes ──
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  await supabase.from('ph_sync_log').update({
    status: 'timeout',
    completed_at: new Date().toISOString(),
    error_message: 'Sync timed out (CPU limit)',
  }).eq('status', 'running').lt('started_at', tenMinAgo)

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

    // 3. Discover project keys
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

    // Helper functions
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

    function adfToPlainText(node: any): string {
      if (!node) return ''
      if (typeof node === 'string') return node
      if (node.type === 'text') return node.text || ''
      if (node.content && Array.isArray(node.content)) {
        return node.content.map(adfToPlainText).join(node.type === 'paragraph' ? '\n' : '')
      }
      return ''
    }

    function resolveParentFromLinks(issue: any): string | null {
      const links = issue.fields?.issuelinks || []
      for (const link of links) {
        if (link.inwardIssue && (
          link.type?.inward?.toLowerCase().includes('is caused by') ||
          link.type?.inward?.toLowerCase().includes('is child of') ||
          link.type?.inward?.toLowerCase().includes('is part of') ||
          link.type?.inward?.toLowerCase().includes('is subtask of') ||
          link.type?.name?.toLowerCase().includes('parent')
        )) return link.inwardIssue.key
        if (link.outwardIssue && (
          link.type?.outward?.toLowerCase().includes('is parent of') ||
          link.type?.outward?.toLowerCase().includes('causes')
        )) return link.outwardIssue.key
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
        )) return link.inwardIssue.fields?.summary || null
        if (link.outwardIssue && (
          link.type?.outward?.toLowerCase().includes('is parent of') ||
          link.type?.outward?.toLowerCase().includes('causes')
        )) return link.outwardIssue.fields?.summary || null
      }
      const issueType = (issue.fields?.issuetype?.name || '').toLowerCase()
      if (issueType.includes('brd') || issueType.includes('sub')) {
        for (const link of links) {
          if (link.inwardIssue) return link.inwardIssue.fields?.summary || null
        }
      }
      return null
    }

    function mapSeverity(jiraPriority: string): string {
      const p = (jiraPriority || '').toLowerCase()
      if (p === 'highest' || p === 'blocker' || p === 'critical') return 'critical'
      if (p === 'high' || p === 'major') return 'major'
      if (p === 'low' || p === 'minor' || p === 'trivial') return 'trivial'
      return 'minor'
    }

    function mapDefectStatus(jiraStatus: string, statusCat: string): string {
      const s = (jiraStatus || '').toLowerCase()
      const cat = (statusCat || '').toLowerCase()
      if (s === 'closed' || s === 'done' || s === 'verified') return 'closed'
      if (s === 'resolved' || s === 'fixed') return 'resolved'
      if (s === 'reopened' || s === 're-opened') return 'reopened'
      if (cat === 'in progress' || s === 'in progress' || s === 'in review') return 'in_progress'
      return 'open'
    }

    // Build tm_project lookup once
    const { data: tmProjects } = await supabase.from('tm_projects').select('id, key')
    const tmProjectMap = new Map((tmProjects || []).map((p: any) => [p.key, p.id]))

    // Build user mapping lookup once
    const { data: userMappings } = await supabase
      .from('ph_user_mapping')
      .select('jira_account_id, catalyst_profile_id')
      .eq('is_mapped', true)
      .not('catalyst_profile_id', 'is', null)
    const userMap = new Map((userMappings || []).map((m: any) => [m.jira_account_id, m.catalyst_profile_id]))

    // 4. STREAMING per-project sync — NO changelog expansion to save CPU
    const maxResults = 100
    const fields = ['summary','status','assignee','reporter','issuetype','parent','fixVersions','duedate','labels','components','priority','created','updated','resolution','customfield_10016','description','comment','attachment','issuelinks']
    const searchUrl = `${base}/rest/api/3/search/jql`
    const postHeaders = { ...headers, 'Content-Type': 'application/json' }
    const projectsToSync = syncProjects.length > 0 ? syncProjects : allProjectKeys

    let totalFetched = 0
    let totalUpserted = 0
    let totalDefectsSynced = 0
    let totalAttachments = 0
    let totalPruned = 0
    let hadSearchErrors = false
    const allFetchedKeys = new Set<string>()
    const uniqueUsers = new Map<string, any>()
    const completedProjects: string[] = []

    for (const projectKey of projectsToSync) {
      const pConfig = projectConfigs[projectKey] || { lookback_months: 3, status_categories: [], issue_types: [], fix_versions: [] }
      const lookbackMonths = pConfig.lookback_months ?? 3

      // Build JQL
      const jqlParts: string[] = [`project = "${projectKey}"`]
      if (lookbackMonths > 0) {
        jqlParts.push(`updated >= -${lookbackMonths * 30}d`)
      }
      const statusCategories = pConfig.status_categories || []
      if (statusCategories.length > 0) {
        jqlParts.push(`statusCategory in (${statusCategories.map(c => `"${c}"`).join(',')})`)
      } else if (pConfig.statuses && pConfig.statuses.length > 0) {
        jqlParts.push(`status in (${pConfig.statuses.map(s => `"${s}"`).join(',')})`)
      }
      const projIssueTypes = pConfig.issue_types || []
      if (projIssueTypes.length > 0) {
        jqlParts.push(`issuetype in (${projIssueTypes.map(t => `"${t}"`).join(',')})`)
      } else if (syncIssueTypes.length > 0) {
        jqlParts.push(`issuetype in (${syncIssueTypes.map(t => `"${t}"`).join(',')})`)
      }
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

      // Paginate and process in PAGE-SIZED batches
      let nextPageToken: string | undefined = undefined
      let projectIssueCount = 0
      let projectError = false

      do {
        // NOTE: No 'expand: changelog' — this was causing CPU Time exceeded for large projects
        const reqBody: Record<string, any> = { jql, fields, maxResults }
        if (nextPageToken) reqBody.nextPageToken = nextPageToken

        const res = await fetch(searchUrl, { method: 'POST', headers: postHeaders, body: JSON.stringify(reqBody) })

        if (!res.ok) {
          const errText = await res.text().catch(() => '')
          hadSearchErrors = true
          projectError = true
          console.error(`[search] ${projectKey} Error ${res.status}: ${errText.slice(0, 300)}`)
          break
        }

        const data = await res.json()
        const issues: any[] = Array.isArray(data.issues) ? data.issues : []
        projectIssueCount += issues.length

        // ── Transform this page's issues into ph_issues rows ──
        const rows = issues.map((issue: any) => {
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
            fix_versions: (issue.fields.fixVersions || []).map((v: any) => ({ id: v.id, name: v.name, releaseDate: v.releaseDate })),
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
            last_synced_at: new Date().toISOString(),
            type_icon_url: issue.fields.issuetype?.iconUrl || null,
            description_adf: descAdf,
            description_text: descText,
            comments,
            changelog: [],
            raw_json: null,
          }
        })
        // ── 2026 GUARDRAIL — only sync items created in 2026+ ──
        .filter((r: any) => {
          if (!r.jira_created_at) return false
          return new Date(r.jira_created_at).getFullYear() >= 2026
        })

        // ── GOVERNANCE LOCK CHECK — filter out governance-closed items ──
        const rowKeys = rows.map((r: any) => r.issue_key)
        const { data: lockedRows } = await supabase
          .rpc('governance_locked_keys', { p_item_keys: rowKeys })
        const lockedKeys = new Set((lockedRows ?? []).map((r: any) => r.locked_key))

        if (lockedKeys.size > 0) {
          // Log skipped items
          await supabase.from('governance_sync_skip_log').insert(
            [...lockedKeys].map(key => ({
              item_key:    key,
              skip_source: 'cron_batch',
            }))
          )
          console.log(`[GOVERNANCE] Batch sync skipped ${lockedKeys.size} locked items in ${projectKey}`)
        }

        const filteredRows = lockedKeys.size > 0
          ? rows.filter((r: any) => !lockedKeys.has(r.issue_key))
          : rows

        // Upsert this page immediately (excluding governance-locked)
        if (filteredRows.length > 0) {
          const { error } = await supabase.from('ph_issues').upsert(filteredRows, { onConflict: 'issue_key' })
          if (error) console.error(`[sync] upsert error for ${projectKey}: ${error.message}`)
          else totalUpserted += filteredRows.length
        }

        // Track fetched keys for pruning
        for (const r of rows) allFetchedKeys.add(r.issue_key)

        // ── Defects (bugs) ──
        const bugIssues = issues.filter((issue: any) => {
          const t = (issue.fields.issuetype?.name || '').toLowerCase()
          return t === 'bug' || t === 'defect' || t === 'qa bug'
        })
        if (bugIssues.length > 0 && tmProjectMap.size > 0) {
          const defectRows = bugIssues
            .filter((issue: any) => tmProjectMap.has(issue.key.split('-')[0]))
            .map((issue: any) => {
              const projKey = issue.key.split('-')[0]
              const statusCat = issue.fields.status?.statusCategory?.name || ''
              const descText = issue.fields.description ? adfToPlainText(issue.fields.description) : null
              const components = (issue.fields.components || []).map((c: any) => c.name).join(', ')
              const fixVers = (issue.fields.fixVersions || []).map((v: any) => v.name).join(', ')
              return {
                defect_key: issue.key,
                project_id: tmProjectMap.get(projKey),
                title: issue.fields.summary || '',
                description: descText,
                severity: mapSeverity(issue.fields.priority?.name || 'Medium'),
                priority: issue.fields.priority?.name || 'Medium',
                status: mapDefectStatus(issue.fields.status?.name || '', statusCat),
                assignee_id: userMap.get(issue.fields.assignee?.accountId) || null,
                reporter_id: userMap.get(issue.fields.reporter?.accountId) || null,
                external_id: issue.id,
                external_url: `${base}/browse/${issue.key}`,
                component: components || null,
                fix_version: fixVers || null,
                labels: issue.fields.labels || [],
                due_date: issue.fields.duedate || null,
                created_at: issue.fields.created,
                updated_at: issue.fields.updated,
                resolved_at: issue.fields.resolutiondate || null,
              }
            })
          if (defectRows.length > 0) {
            const { error: defErr } = await supabase.from('tm_defects').upsert(defectRows, { onConflict: 'defect_key,project_id' })
            if (defErr) console.error(`[sync] tm_defects upsert error: ${defErr.message}`)
            else totalDefectsSynced += defectRows.length
          }
        }

        // ── Attachments ──
        const attachmentRows: any[] = []
        for (const issue of issues) {
          for (const att of (issue.fields.attachment || [])) {
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
          await supabase.from('ph_issue_attachments').upsert(attachmentRows, { onConflict: 'issue_key,jira_attachment_id' })
          totalAttachments += attachmentRows.length
        }

        // ── Comments (dedicated table) ──
        const commentRows: any[] = []
        for (const issue of issues) {
          for (const c of (issue.fields.comment?.comments || [])) {
            commentRows.push({
              issue_key: issue.key,
              jira_comment_id: c.id,
              author_display_name: c.author?.displayName || null,
              author_account_id: c.author?.accountId || null,
              author_avatar_url: c.author?.avatarUrls?.['24x24'] || null,
              body: c.body ? adfToPlainText(c.body) : '',
              jira_created_at: c.created,
              jira_updated_at: c.updated,
            })
          }
        }
        if (commentRows.length > 0) {
          const pageKeys = [...new Set(commentRows.map(r => r.issue_key))]
          await supabase.from('jira_sync_comments').delete().in('issue_key', pageKeys)
          await supabase.from('jira_sync_comments').insert(commentRows)
        }

        // ── Users ──
        for (const issue of issues) {
          const assignee = issue.fields.assignee
          if (assignee?.accountId && !uniqueUsers.has(assignee.accountId)) {
            uniqueUsers.set(assignee.accountId, {
              jira_account_id: assignee.accountId,
              jira_display_name: assignee.displayName || '',
              jira_email: assignee.emailAddress || '',
              jira_avatar_url: assignee.avatarUrls?.['48x48'] || '',
            })
          }
          const reporter = issue.fields.reporter
          if (reporter?.accountId && !uniqueUsers.has(reporter.accountId)) {
            uniqueUsers.set(reporter.accountId, {
              jira_account_id: reporter.accountId,
              jira_display_name: reporter.displayName || '',
              jira_email: reporter.emailAddress || '',
              jira_avatar_url: reporter.avatarUrls?.['48x48'] || '',
            })
          }
        }

        totalFetched += issues.length
        nextPageToken = data.nextPageToken || undefined
      } while (nextPageToken && projectIssueCount < 5000)

      console.log(`[sync] Project ${projectKey}: fetched ${projectIssueCount}, upserted OK`)
      completedProjects.push(projectKey)

      // ── Per-project prune ──
      if (syncType === 'full' && !projectError) {
        const { data: existingIssues } = await supabase
          .from('ph_issues')
          .select('issue_key')
          .eq('project_key', projectKey)

        if (existingIssues && existingIssues.length > 0) {
          const projectFetchedKeys = new Set(
            [...allFetchedKeys].filter(k => k.startsWith(projectKey + '-'))
          )
          const toDelete = existingIssues
            .map((i: any) => i.issue_key)
            .filter((k: string) => !projectFetchedKeys.has(k))

          if (toDelete.length > 0) {
            for (let i = 0; i < toDelete.length; i += 500) {
              await supabase.from('ph_issues').delete().in('issue_key', toDelete.slice(i, i + 500))
            }
            totalPruned += toDelete.length
            console.log(`[sync] Pruned ${toDelete.length} issues from ${projectKey}`)
          }
        }
      }

      // ── Progressive log update after EACH project (prevents stale "15 hours ago") ──
      if (logId) {
        await supabase.from('ph_sync_log').update({
          issues_fetched: totalFetched,
          issues_upserted: totalUpserted,
          projects_synced: completedProjects,
          completed_at: new Date().toISOString(),
          status: 'running',
        }).eq('id', logId)
      }
    }

    // 9. Upsert user mappings
    if (uniqueUsers.size > 0) {
      await supabase
        .from('ph_user_mapping')
        .upsert(Array.from(uniqueUsers.values()), { onConflict: 'jira_account_id', ignoreDuplicates: false })

      const { data: mappedUsers } = await supabase
        .from('ph_user_mapping')
        .select('catalyst_profile_id, jira_avatar_url')
        .eq('is_mapped', true)
        .not('jira_avatar_url', 'eq', '')
        .not('catalyst_profile_id', 'is', null)

      if (mappedUsers && mappedUsers.length > 0) {
        for (const mu of mappedUsers) {
          await supabase.from('profiles').update({ avatar_url: mu.jira_avatar_url }).eq('id', mu.catalyst_profile_id)
        }
      }
    }

    // 10. Fetch and upsert versions — only for synced projects (not all 55)
    let totalVersions = 0
    for (const projectKey of completedProjects) {
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

    // 11-12. Post-processing RPCs
    try { await supabase.rpc('ph_parse_and_update_versions') } catch (_) { /* ignore */ }
    try { await supabase.rpc('ph_recompute_all') } catch (_) { /* ignore */ }

    // 13. Update connection totals
    await supabase.from('ph_jira_connection').update({
      total_issue_count: totalUpserted,
      total_version_count: totalVersions,
    }).neq('id', '00000000-0000-0000-0000-000000000000')

    // 14. Warnings
    const warnings: string[] = []
    const { data: unmapped } = await supabase
      .from('ph_user_mapping')
      .select('jira_display_name')
      .eq('is_mapped', false)
    if (unmapped && unmapped.length > 0) warnings.push(`${unmapped.length} unmapped Jira users`)
    if (hadSearchErrors) warnings.push('Search errors occurred; prune step was skipped for affected projects')
    if (totalPruned > 0) warnings.push(`${totalPruned} issues pruned`)

    // 15. Final log update
    const maxLookback = Object.values(projectConfigs).reduce((max, pc) => Math.max(max, pc.lookback_months || 3), 3)
    const duration = Date.now() - startTime
    await supabase.from('ph_sync_log').update({
      status: warnings.length > 0 ? 'warning' : 'success',
      lookback_months: maxLookback,
      jql_query: `Per-project JQL (${projectsToSync.length} projects)`,
      issues_fetched: totalFetched,
      issues_upserted: totalUpserted,
      issues_pruned: totalPruned,
      versions_fetched: totalVersions,
      warnings,
      duration_ms: duration,
      completed_at: new Date().toISOString(),
      projects_synced: completedProjects,
    }).eq('id', logId)

    return new Response(JSON.stringify({
      success: true,
      sync_type: syncType,
      issues_fetched: totalFetched,
      issues_upserted: totalUpserted,
      defects_synced: totalDefectsSynced,
      versions_fetched: totalVersions,
      pruned: totalPruned,
      warnings,
      duration_ms: duration,
      projects_synced: completedProjects,
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
