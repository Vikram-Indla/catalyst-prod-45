import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Rule 4: Projects that belong to the Products module (Business Requests).
// These MUST NEVER be synced into ph_issues (Projects module).
// This block is permanent and cannot be overridden via wh_config.sync_projects.
const PRODUCTS_MODULE_PROJECTS = new Set(['MDT'])

interface ProjectConfig {
  lookback_months: number
  status_categories?: string[]
  statuses?: string[]
  issue_types?: string[]
  sprint_release?: string[]
  field_map?: Record<string, string>  // ph_issues column -> jira field id, per-project remap
}

// Coerce a raw Jira field value into the shape ph_issues expects for `target`.
function coerceJiraValue(raw: any, target: string): any {
  if (raw === null || raw === undefined) return null
  const scalar = (v: any) => typeof v === 'string' ? v : (v?.name ?? v?.value ?? v?.key ?? v?.accountId ?? null)
  switch (target) {
    case 'assignee_account_id': return typeof raw === 'string' ? raw : (raw?.accountId ?? null)
    case 'parent_key':          return typeof raw === 'string' ? raw : (raw?.key ?? null)
    case 'due_date':            return typeof raw === 'string' ? raw : null
    case 'labels':              return Array.isArray(raw) ? raw.map((x: any) => typeof x === 'string' ? x : scalar(x)).filter(Boolean) : []
    case 'components':          return Array.isArray(raw) ? raw.map((x: any) => scalar(x)).filter(Boolean) : []
    case 'fix_versions':        return Array.isArray(raw) ? raw.map((v: any) => ({ id: v?.id, name: v?.name ?? scalar(v), releaseDate: v?.releaseDate })) : []
    default:                    return scalar(raw)  // priority, status, other text columns
  }
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
  const overrideSprintRelease: string[] | undefined = body.sprint_release
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
    const includedProjects: string[] = cfg.included_projects || []
    const hierarchyLevels: Array<{ level: number; name: string; jiraTypes: string[] }> = cfg.hierarchy_levels || []
    const statusMapping: Record<string, string[]> = cfg.status_mapping || {}
    const syncIssueTypes: string[] = overrideIssueTypes || cfg.sync_issue_types || []
    const syncSprintRelease: string[] = overrideSprintRelease || cfg.sync_sprint_release || []
    const syncProjects: string[] = overrideProjects || cfg.sync_projects || []

    const base = conn.site_url.replace(/\/$/, '')
    const authHeader = 'Basic ' + btoa(`${conn.auth_email}:${conn.auth_token_encrypted}`)
    const headers = { 'Authorization': authHeader, 'Accept': 'application/json' }

    // ── Strategy 2: Load per-project sync state for smart incremental JQL ──────
    // Replaces the fixed updated >= "-30m" window with the actual last_synced_at
    // per project. If a sync was late or failed, the next run covers the full gap.
    const { data: syncStates } = await supabase
      .from('ph_project_sync_state')
      .select('project_key, last_synced_at, consecutive_failures')
    const syncStateMap = new Map<string, { last_synced_at: string | null; consecutive_failures: number }>(
      (syncStates || []).map((s: any) => [s.project_key, s])
    )

    // ── Pre-sync authentication check (2026-05-24) ──
    // A 401 here means the token is expired or revoked. Throwing early prevents
    // the search call from silently returning 200+0 results (Jira's anonymous
    // fallback), which would trigger the prune and delete all synced data.
    const myselfRes = await fetch(`${base}/rest/api/3/myself`, { headers })
    if (!myselfRes.ok) {
      throw new Error(
        `Jira authentication failed (HTTP ${myselfRes.status}). ` +
        `The API token stored in ph_jira_connection may be expired or revoked. ` +
        `Go to admin → Jira Connection and update the API token from ` +
        `https://id.atlassian.com/manage-profile/security/api-tokens`
      )
    }
    const myselfData = await myselfRes.json().catch(() => ({}))
    console.log(`[sync] Authenticated as ${myselfData.displayName || 'unknown'} (${myselfData.emailAddress || conn.auth_email})`)

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
      // ADF mention nodes have NO `content` array — the display name lives
      // in node.attrs.text (e.g. "@vikram indla"). Without this branch the
      // @-mention was silently dropped during sync, which broke the For You
      // "Reply to mentions" feed. (RCA 2026-04-24.)
      if (node.type === 'mention') {
        const t = node.attrs?.text
        if (t) return t
        const id = node.attrs?.id
        return id ? `@${id}` : ''
      }
      // ADF emoji nodes — surface the shortName so search/display doesn't
      // silently drop them. Example: { type:'emoji', attrs:{ shortName:':+1:' } }
      if (node.type === 'emoji') return node.attrs?.shortName || node.attrs?.text || ''
      // ADF hardBreak / inline breaks — preserve line boundary.
      if (node.type === 'hardBreak') return '\n'
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
    // Rule 4: strip Products-module projects from every sync run, regardless of config.
    const projectsToSync = (syncProjects.length > 0 ? syncProjects : allProjectKeys)
      .filter(k => !PRODUCTS_MODULE_PROJECTS.has(k))

    let totalFetched = 0
    let totalUpserted = 0
    let totalDefectsSynced = 0
    let totalAttachments = 0
    let totalPruned = 0
    let hadSearchErrors = false
    const allFetchedKeys = new Set<string>()
    const uniqueUsers = new Map<string, any>()
    const completedProjects: string[] = []
    // Tracks parent keys referenced by synced 2026 issues (for parent pull-through step)
    const parentKeysSeen = new Set<string>()

    for (const projectKey of projectsToSync) {
      const pConfig = projectConfigs[projectKey] || { lookback_months: 3, status_categories: [], issue_types: [], sprint_release: [] }
      const lookbackMonths = pConfig.lookback_months ?? 3
      // Per-project field remap: { [ph_issues column]: jira_field }. Ensure mapped fields are requested.
      const fieldMap: Record<string, string> = pConfig.field_map || {}
      const projectFields = [...new Set([...fields, ...Object.values(fieldMap).filter(Boolean)])]

      // Build JQL — SUPER STRICT GUARDRAIL: enforce 2026+ data window
      const jqlParts: string[] = [`project = "${projectKey}"`]
      jqlParts.push(`(created >= "2026/01/01" OR updated >= "2026/01/01")`)
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
      const projSprintRelease = (pConfig.sprint_release || []).filter(v => v !== '__NO_VERSION__')
      const includeNoVersion = (pConfig.sprint_release || []).includes('__NO_VERSION__')
      if (projSprintRelease.length > 0 && includeNoVersion) {
        jqlParts.push(`(fixVersion in (${projSprintRelease.map(v => `"${v}"`).join(',')}) OR fixVersion is EMPTY)`)
      } else if (projSprintRelease.length > 0) {
        jqlParts.push(`fixVersion in (${projSprintRelease.map(v => `"${v}"`).join(',')})`)
      } else if (includeNoVersion) {
        jqlParts.push(`fixVersion is EMPTY`)
      } else if (syncSprintRelease.length > 0) {
        jqlParts.push(`fixVersion in (${syncSprintRelease.map(v => `"${v}"`).join(',')})`)
      }

      // ── Strategy 2: Smart incremental — per-project timestamp, not fixed window ──
      // Full sync skips this clause and fetches everything (for recovery / backfill).
      // Incremental sync uses the actual last_synced_at from ph_project_sync_state
      // with a 2-minute buffer to handle Jira clock skew and boundary misses.
      // Falls back to a configurable lookback window for projects with no prior state.
      if (syncType === 'incremental') {
        const state = syncStateMap.get(projectKey)
        if (state?.last_synced_at) {
          const bufferMs = 2 * 60 * 1000 // 2-min boundary buffer
          const since = new Date(new Date(state.last_synced_at).getTime() - bufferMs)
          // Jira JQL timestamp format: "YYYY/MM/DD HH:mm"
          const jiraTs = since.toISOString().replace('T', ' ').substring(0, 16).replace(/-/g, '/')
          jqlParts.push(`updated >= "${jiraTs}"`)
          console.log(`[sync] ${projectKey}: smart-incremental since ${jiraTs} (prev state: ${state.last_synced_at})`)
        } else {
          // Bootstrap: no prior state for this project → use lookback_minutes
          const lookbackMinutes: number = (body.lookback_minutes as number) || 30
          jqlParts.push(`updated >= "-${lookbackMinutes}m"`)
          console.log(`[sync] ${projectKey}: bootstrap incremental -${lookbackMinutes}m (no prior state)`)
        }
      }

      const jql = `${jqlParts.join(' AND ')} ORDER BY updated DESC`
      console.log(`[sync] Project ${projectKey}: JQL = ${jql}`)

      // Paginate and process in PAGE-SIZED batches
      let nextPageToken: string | undefined = undefined
      let projectIssueCount = 0
      let projectError = false

      do {
        // NOTE: No 'expand: changelog' — this was causing CPU Time exceeded for large projects
        const reqBody: Record<string, any> = { jql, fields: projectFields, maxResults }
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

          const row: Record<string, any> = {
            issue_key: issue.key,
            project_key: issue.key.split('-')[0],
            project_name: projectNameLookup[issue.key.split('-')[0]] || null,
            issue_type: issue.fields.issuetype?.name || 'Task',
            summary: issue.fields.summary || '',
            status: issue.fields.status?.name || 'To Do',
            status_category: issue.fields.status?.statusCategory?.name || mapStatusCategory(issue.fields.status?.name || 'To Do'),
            assignee_account_id: issue.fields.assignee?.accountId || null,
            assignee_display_name: issue.fields.assignee?.displayName || null,
            // assignee_user_id intentionally null: useDirectFromSync resolves via assignee_account_id.
            // ph_user_mapping catalyst_profile_ids may reference stale Lovable UUIDs not in profiles.
            assignee_user_id: null,
            reporter_account_id: issue.fields.reporter?.accountId || null,
            reporter_display_name: issue.fields.reporter?.displayName || null,
            reporter_user_id: null,
            parent_key: issue.fields.parent?.key || resolveParentFromLinks(issue) || null,
            parent_summary: issue.fields.parent?.fields?.summary || resolveParentSummaryFromLinks(issue) || null,
            hierarchy_level: getHierarchyLevel(issue.fields.issuetype?.name || 'Task'),
            sprint_release: (issue.fields.fixVersions || []).map((v: any) => ({ id: v.id, name: v.name, releaseDate: v.releaseDate })),
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
          // Per-project field remap: override only when the mapped Jira field is actually present
          // (undefined => field not returned; keep the engine default, never null it out).
          for (const [target, jiraField] of Object.entries(fieldMap)) {
            if (!jiraField) continue
            const raw = issue.fields?.[jiraField]
            if (raw === undefined) continue
            const rowKey = target === 'fix_versions' ? 'sprint_release' : target
            row[rowKey] = coerceJiraValue(raw, target)
          }
          return row
        })
        // ── 2026 GUARDRAIL — only sync items created or updated in 2026+ ──
        .filter((r: any) => {
          const createdYear = r.jira_created_at ? new Date(r.jira_created_at).getFullYear() : null
          const updatedYear = r.jira_updated_at ? new Date(r.jira_updated_at).getFullYear() : null
          return (createdYear !== null && createdYear >= 2026) ||
                 (updatedYear !== null && updatedYear >= 2026)
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

        // Track fetched keys for pruning + parent pull-through
        for (const r of rows) {
          allFetchedKeys.add(r.issue_key)
          if (r.parent_key) parentKeysSeen.add(r.parent_key)
        }

        // ── Defects (bugs) ──
        const bugIssues = issues.filter((issue: any) => {
          const t = (issue.fields.issuetype?.name || '').toLowerCase()
          return t === 'bug' || t === 'defect' || t === 'qa bug'
        })
        if (bugIssues.length > 0 && tmProjectMap.size > 0) {
          const defectRows = bugIssues
            .filter((issue: any) => tmProjectMap.has(issue.key.split('-')[0]))
            // 2026 GUARDRAIL — skip pre-2026 defects (allow if updated in 2026+)
            .filter((issue: any) => {
              const created = issue.fields.created
              const updated = issue.fields.updated
              const createdYear = created ? new Date(created).getFullYear() : null
              const updatedYear = updated ? new Date(updated).getFullYear() : null
              return (createdYear !== null && createdYear >= 2026) ||
                     (updatedYear !== null && updatedYear >= 2026)
            })
            .map((issue: any) => {
              const projKey = issue.key.split('-')[0]
              const statusCat = issue.fields.status?.statusCategory?.name || ''
              const descText = issue.fields.description ? adfToPlainText(issue.fields.description) : null
              const components = (issue.fields.components || []).map((c: any) => c.name).join(', ')
              const sprintRelease = (issue.fields.fixVersions || []).map((v: any) => v.name).join(', ')
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
                sprint_release: sprintRelease || null,
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

          // Mirror to ph_comments (Catalyst-native) — single source of truth for Activity panel
          const issueKeyToId = new Map<string, string>()
          const { data: phIssues } = await supabase
            .from('ph_issues')
            .select('id, issue_key')
            .in('issue_key', pageKeys)
          for (const r of (phIssues || [])) issueKeyToId.set(r.issue_key, r.id)

          const phCommentRows = commentRows
            .filter(r => issueKeyToId.has(r.issue_key))
            .map(r => ({
              work_item_id: issueKeyToId.get(r.issue_key),
              author_id: userMap.get(r.author_account_id) || null,
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
          if (phCommentRows.length > 0) {
            const { error: phErr } = await supabase
              .from('ph_comments')
              .upsert(phCommentRows, { onConflict: 'jira_comment_id', ignoreDuplicates: false })
            if (phErr) console.error(`[sync] ph_comments upsert error: ${phErr.message}`)
          }
        }

        // ── Watching notifications — emit for all mapped team members who are not the assignee ──
        // This populates the Watching tab in Catalyst, matching Jira's project-level watch behaviour.
        // Only fires for newly-created issues (created in the last 48h) to avoid backfill spam.
        if (userMap.size > 0) {
          const cutoff48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
          const newIssues = issues.filter((issue: any) => {
            const created = issue.fields.created
            return created && created >= cutoff48h
          })

          if (newIssues.length > 0) {
            const watchingNotifRows: any[] = []
            const allCatalystIds = [...userMap.values()]

            for (const issue of newIssues) {
              const assigneeAccountId = issue.fields.assignee?.accountId
              const assigneeCatalystId = assigneeAccountId ? userMap.get(assigneeAccountId) : null
              const creatorAccountId = issue.fields.reporter?.accountId
              const creatorCatalystId = creatorAccountId ? userMap.get(creatorAccountId) : null

              // Map issue type to Catalyst icon
              const issueTypeName = (issue.fields.issuetype?.name || '').toLowerCase()
              let watchIcon = 'task'
              if (issueTypeName.includes('bug') || issueTypeName.includes('defect')) watchIcon = 'qa bug'
              else if (issueTypeName.includes('story') || issueTypeName.includes('feature')) watchIcon = 'story'
              else if (issueTypeName.includes('epic')) watchIcon = 'epic'

              const statusCat = (issue.fields.status?.statusCategory?.name || '').toLowerCase()
              const statusType = statusCat === 'done' ? 'green' : statusCat === 'in progress' ? 'blue' : 'gray'

              // Direct notification for assignee (tab: 'direct' → shows badge + appears in Direct tab)
              if (assigneeCatalystId) {
                watchingNotifRows.push({
                  recipient_user_id: assigneeCatalystId,
                  actor_user_id: creatorCatalystId || null,
                  notification_type: 'assigned',
                  entity_id: issue.id,
                  entity_type: 'issue',
                  entity_key: issue.key,
                  entity_title: issue.fields.summary || '',
                  hub_source: 'ProjectHub',
                  entity_icon_type: watchIcon,
                  status: issue.fields.status?.name || 'To Do',
                  status_type: statusType,
                  tab: 'direct',
                  metadata: {},
                })
              }

              // Watching notification for all other mapped team members
              for (const catalystId of allCatalystIds) {
                if (catalystId === assigneeCatalystId) continue  // already got direct
                if (catalystId === creatorCatalystId) continue   // they created it
                watchingNotifRows.push({
                  recipient_user_id: catalystId,
                  actor_user_id: creatorCatalystId || null,
                  notification_type: 'assigned',
                  entity_id: issue.id,
                  entity_type: 'issue',
                  entity_key: issue.key,
                  entity_title: issue.fields.summary || '',
                  hub_source: 'ProjectHub',
                  entity_icon_type: watchIcon,
                  status: issue.fields.status?.name || 'To Do',
                  status_type: statusType,
                  tab: 'watching',
                  metadata: {},
                })
              }
            }

            if (watchingNotifRows.length > 0) {
              const { error: wErr } = await supabase
                .from('notifications')
                .insert(watchingNotifRows)
              if (wErr && wErr.code !== '23505') {
                console.warn(`[sync] notifications insert: ${wErr.message}`)
              } else {
                console.log(`[sync] Emitted ${watchingNotifRows.length} notifications for ${newIssues.length} new issues`)
              }
            }
          }
        }

        // ── Users ──
        // Rule 2: only capture active Jira users.
        // Jira user objects include active:boolean — inactive accounts are deactivated
        // but may still appear as assignee/reporter on old issues.
        for (const issue of issues) {
          const assignee = issue.fields.assignee
          if (assignee?.accountId && assignee.active !== false && !uniqueUsers.has(assignee.accountId)) {
            uniqueUsers.set(assignee.accountId, {
              jira_account_id: assignee.accountId,
              jira_display_name: assignee.displayName || '',
              jira_email: assignee.emailAddress || '',
              jira_avatar_url: assignee.avatarUrls?.['48x48'] || '',
              jira_active: assignee.active !== false,
            })
          }
          const reporter = issue.fields.reporter
          if (reporter?.accountId && reporter.active !== false && !uniqueUsers.has(reporter.accountId)) {
            uniqueUsers.set(reporter.accountId, {
              jira_account_id: reporter.accountId,
              jira_display_name: reporter.displayName || '',
              jira_email: reporter.emailAddress || '',
              jira_avatar_url: reporter.avatarUrls?.['48x48'] || '',
              jira_active: reporter.active !== false,
            })
          }
        }

        totalFetched += issues.length
        nextPageToken = data.nextPageToken || undefined
      } while (nextPageToken && projectIssueCount < 5000)

      console.log(`[sync] Project ${projectKey}: fetched ${projectIssueCount}, upserted OK`)
      completedProjects.push(projectKey)

      // ── Per-project prune ──
      // SAFETY GUARD: never prune when 0 issues fetched (2026-05-24 RCA).
      // A 0-result response almost always means a Jira auth/network failure that
      // returned HTTP 200 + empty list. Pruning on 0 would silently wipe all data.
      if (syncType === 'full' && !projectError && projectIssueCount > 0) {
        // Paginate the existing-issues select to avoid the implicit 1000-row cap.
        // Without pagination, a project with >1000 issues would only read the
        // first 1000, compute a partial toDelete set, and leave stale rows behind.
        const allExistingKeys: string[] = []
        let page = 0
        const PAGE = 1000
        while (true) {
          const { data: batch } = await supabase
            .from('ph_issues')
            .select('issue_key')
            .eq('project_key', projectKey)
            .range(page * PAGE, (page + 1) * PAGE - 1)
          if (!batch || batch.length === 0) break
          for (const r of batch) allExistingKeys.push(r.issue_key)
          if (batch.length < PAGE) break
          page++
        }

        if (allExistingKeys.length > 0) {
          const projectFetchedKeys = new Set(
            [...allFetchedKeys].filter(k => k.startsWith(projectKey + '-'))
          )
          const toDelete = allExistingKeys.filter((k: string) => !projectFetchedKeys.has(k))

          if (toDelete.length > 0) {
            // Soft-delete: set jira_removed_at + deleted_at instead of hard DELETE.
            // guard_ph_issues_no_delete blocks physical deletes by design;
            // guard_2026_ph_issues now allows this specific UPDATE path.
            const removedAt = new Date().toISOString()
            for (let i = 0; i < toDelete.length; i += 500) {
              const { error: pruneErr } = await supabase
                .from('ph_issues')
                .update({ jira_removed_at: removedAt, deleted_at: removedAt })
                .in('issue_key', toDelete.slice(i, i + 500))
                .is('jira_removed_at', null) // idempotent — only mark once
              if (pruneErr) console.warn(`[sync] prune soft-delete error ${projectKey}: ${pruneErr.message}`)
            }
            totalPruned += toDelete.length
            console.log(`[sync] Soft-deleted ${toDelete.length} stale issues from ${projectKey}`)
          }
        }
      }

      // ── Strategy 2: Update per-project sync state ──────────────────────────────
      // On success: advance last_synced_at to now so next incremental starts here.
      // On error:   preserve last_synced_at so next run covers the full gap.
      // consecutive_failures resets to 0 on any non-error outcome.
      {
        const syncNow = new Date().toISOString()
        const prevState = syncStateMap.get(projectKey)
        const prevFailures = prevState?.consecutive_failures ?? 0
        await supabase.from('ph_project_sync_state').upsert({
          project_key:             projectKey,
          last_synced_at:          projectError ? (prevState?.last_synced_at ?? null) : syncNow,
          last_successful_sync_at: projectError ? undefined : syncNow,
          last_sync_status:        projectError ? 'error' : 'success',
          issues_synced:           projectIssueCount,
          consecutive_failures:    projectError ? prevFailures + 1 : 0,
          updated_at:              syncNow,
        }, { onConflict: 'project_key', ignoreDuplicates: false })
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

    // ── PARENT PULL-THROUGH (2026-06-12) ─────────────────────────────────────────
    // Rule: when a 2026 issue references a pre-2026 parent (via parent_key),
    // fetch that parent from Jira and upsert as a reference row — even though
    // it would fail the 2026 date gate. Fixes missing icons in Parent column.
    {
      const missingCandidates = [...parentKeysSeen].filter(k => !allFetchedKeys.has(k))
      if (missingCandidates.length > 0) {
        const { data: existingParents } = await supabase
          .from('ph_issues')
          .select('issue_key')
          .in('issue_key', missingCandidates)
        const alreadyInDb = new Set((existingParents || []).map((r: any) => r.issue_key))
        const missingParentKeys = missingCandidates.filter(k => !alreadyInDb.has(k))

        if (missingParentKeys.length > 0) {
          console.log(`[parent-pullthrough] Fetching ${missingParentKeys.length} pre-2026 parent(s): ${missingParentKeys.join(', ')}`)
          const parentJql = `issue in (${missingParentKeys.join(',')})`
          const parentRes = await fetch(searchUrl, {
            method: 'POST',
            headers: postHeaders,
            body: JSON.stringify({
              jql: parentJql,
              fields: ['summary', 'status', 'issuetype', 'assignee', 'reporter', 'priority', 'parent', 'created', 'updated', 'fixVersions', 'labels', 'duedate'],
              maxResults: missingParentKeys.length + 5,
            }),
          })
          if (parentRes.ok) {
            const parentData = await parentRes.json()
            const parentIssues = Array.isArray(parentData.issues) ? parentData.issues : []
            const parentRows = parentIssues.map((issue: any) => ({
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
              parent_key: issue.fields.parent?.key || null,
              parent_summary: issue.fields.parent?.fields?.summary || null,
              hierarchy_level: getHierarchyLevel(issue.fields.issuetype?.name || 'Task'),
              sprint_release: (issue.fields.fixVersions || []).map((v: any) => ({ id: v.id, name: v.name, releaseDate: v.releaseDate })),
              due_date: issue.fields.duedate || null,
              labels: issue.fields.labels || [],
              components: [],
              priority: issue.fields.priority?.name || null,
              story_points: null,
              sprint_name: null,
              resolution: null,
              jira_created_at: issue.fields.created,
              jira_updated_at: issue.fields.updated,
              synced_at: new Date().toISOString(),
              type_icon_url: issue.fields.issuetype?.iconUrl || null,
              description_adf: null,
              description_text: null,
              comments: [],
              changelog: [],
              raw_json: null,
              source: 'jira',
            }))
            if (parentRows.length > 0) {
              const { error: parentErr } = await supabase.from('ph_issues').upsert(parentRows, { onConflict: 'issue_key' })
              if (parentErr) {
                console.error(`[parent-pullthrough] Upsert error: ${parentErr.message}`)
              } else {
                console.log(`[parent-pullthrough] Upserted ${parentRows.length} pre-2026 parent row(s)`)
                totalUpserted += parentRows.length
              }
            }
          } else {
            console.error(`[parent-pullthrough] Jira fetch failed: ${parentRes.status}`)
          }
        }
      }
    }
    // ─────────────────────────────────────────────────────────────────────────────

    // 9. Upsert user mappings — Rule 2: active users only
    if (uniqueUsers.size > 0) {
      await supabase
        .from('ph_user_mapping')
        .upsert(Array.from(uniqueUsers.values()), { onConflict: 'jira_account_id', ignoreDuplicates: false })

      // Purge unmapped inactive users: they have no Catalyst profile and are no
      // longer active in Jira — no value keeping them in the table.
      await supabase
        .from('ph_user_mapping')
        .delete()
        .eq('is_mapped', false)
        .eq('jira_active', false)

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
    // Only warn about active unmapped users — inactive ones were already purged above.
    const { data: unmapped } = await supabase
      .from('ph_user_mapping')
      .select('jira_display_name')
      .eq('is_mapped', false)
      .neq('jira_active', false)
    if (unmapped && unmapped.length > 0) warnings.push(`${unmapped.length} active Jira users not yet matched to Catalyst profiles`)
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
