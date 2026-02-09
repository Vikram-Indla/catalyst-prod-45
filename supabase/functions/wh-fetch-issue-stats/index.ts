import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: conn } = await supabase
      .from('wh_jira_connection')
      .select('*')
      .single()

    if (!conn || !conn.site_url || !conn.auth_email || !conn.auth_token_encrypted) {
      return new Response(JSON.stringify({ error: 'Connection not configured' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (conn.status !== 'connected') {
      return new Response(JSON.stringify({ error: 'Jira not connected' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const base = conn.site_url.replace(/\/$/, '')
    const authHeader = 'Basic ' + btoa(`${conn.auth_email}:${conn.auth_token_encrypted}`)
    const headers = { 'Authorization': authHeader, 'Accept': 'application/json', 'Content-Type': 'application/json' }

    const jql = 'updated >= -90d ORDER BY updated DESC'
    const fetchFields = ['issuetype', 'status', 'project', 'parent', 'summary']

    // Collect all raw issues
    const allIssues: any[] = []
    let startAt = 0
    const maxResults = 100
    let hasMore = true
    let apiTotal = 0

    while (hasMore) {
      const searchApproaches = [
        () => fetch(`${base}/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}&startAt=${startAt}&fields=${fetchFields.join(',')}`, { headers }),
        () => fetch(`${base}/rest/api/3/search/jql`, {
          method: 'POST', headers,
          body: JSON.stringify({ jql, maxResults, startAt, fields: fetchFields })
        }),
        () => fetch(`${base}/rest/api/3/search`, {
          method: 'POST', headers,
          body: JSON.stringify({ jql, maxResults, startAt, fields: fetchFields })
        }),
      ]

      let res: Response | null = null
      let body = ''
      for (const attempt of searchApproaches) {
        res = await attempt()
        body = await res.text()
        console.log(`Issue stats attempt: ${res.url} -> ${res.status}`)
        if (res.ok || res.status === 401 || res.status === 403) break
      }

      if (!res || !res.ok) {
        throw new Error(`Jira search failed: ${res?.status} ${body.substring(0, 200)}`)
      }

      const data = JSON.parse(body)
      const issues = data.issues || []
      allIssues.push(...issues)
      apiTotal = data.total || apiTotal
      startAt += maxResults
      hasMore = issues.length === maxResults && startAt < 500
    }

    // Build hierarchical project data
    const result = buildHierarchy(allIssues)

    // Update total counts in DB
    await supabase.from('wh_jira_connection').update({
      total_issue_count: apiTotal > 0 ? apiTotal : allIssues.length,
    }).eq('id', conn.id)

    return new Response(JSON.stringify({
      success: true,
      total: apiTotal > 0 ? apiTotal : allIssues.length,
      scanned: allIssues.length,
      projects: result.projects,
      statusSummary: result.statusSummary,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error fetching issue stats:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// Defect-like type names (case-insensitive matching)
const DEFECT_TYPES = ['production incident', 'qa bug', 'defect', 'bug']

function isDefectType(typeName: string): boolean {
  return DEFECT_TYPES.includes(typeName.toLowerCase())
}

// Hierarchy types in Jira: Epic > Story > Sub-task
const HIERARCHY_TYPES: Record<string, number> = {
  'epic': 0,
  'story': 1,
  'task': 1,
  'sub-task': 2,
  'subtask': 2,
}

function getHierarchyLevel(typeName: string): number {
  return HIERARCHY_TYPES[typeName.toLowerCase()] ?? 1 // default to story level
}

interface HierarchyIssue {
  key: string
  summary: string
  type: string
  status: string
  parentKey: string | null
  children: HierarchyIssue[]
}

interface ProjectHierarchy {
  name: string
  key: string
  totalCount: number
  epics: EpicNode[]
  defects: DefectSummary[]
  statusCounts: Array<{ status: string; count: number }>
  typeCounts: Array<{ type: string; count: number }>
}

interface EpicNode {
  key: string
  summary: string
  status: string
  storyCount: number
  subtaskCount: number
  stories: StoryNode[]
  statusCounts: Array<{ status: string; count: number }>
}

interface StoryNode {
  key: string
  summary: string
  type: string
  status: string
  subtaskCount: number
  subtasks: Array<{ key: string; summary: string; status: string }>
}

interface DefectSummary {
  type: string
  count: number
  statuses: Array<{ status: string; count: number }>
}

function buildHierarchy(issues: any[]) {
  // Index all issues by key
  const issueMap: Record<string, any> = {}
  for (const issue of issues) {
    issueMap[issue.key] = issue
  }

  // Group by project
  const projectMap: Record<string, any[]> = {}
  for (const issue of issues) {
    const projKey = issue.fields?.project?.key || '?'
    const projName = issue.fields?.project?.name || 'Unknown'
    const pk = `${projKey}::${projName}`
    if (!projectMap[pk]) projectMap[pk] = []
    projectMap[pk].push(issue)
  }

  // Global status counts
  const globalStatuses: Record<string, number> = {}

  const projects: ProjectHierarchy[] = []

  for (const [pk, projIssues] of Object.entries(projectMap)) {
    const [projKey, projName] = pk.split('::')

    const statusCounts: Record<string, number> = {}
    const typeCounts: Record<string, number> = {}
    const defectMap: Record<string, { count: number; statuses: Record<string, number> }> = {}

    // Separate epics, stories/tasks, subtasks, and defects
    const epics: any[] = []
    const storiesAndTasks: any[] = []
    const subtasks: any[] = []
    const defectIssues: any[] = []

    for (const issue of projIssues) {
      const typeName = issue.fields?.issuetype?.name || 'Unknown'
      const statusName = issue.fields?.status?.name || 'Unknown'
      const isSubtask = issue.fields?.issuetype?.subtask === true

      statusCounts[statusName] = (statusCounts[statusName] || 0) + 1
      typeCounts[typeName] = (typeCounts[typeName] || 0) + 1
      globalStatuses[statusName] = (globalStatuses[statusName] || 0) + 1

      if (isDefectType(typeName)) {
        defectIssues.push(issue)
        if (!defectMap[typeName]) defectMap[typeName] = { count: 0, statuses: {} }
        defectMap[typeName].count++
        defectMap[typeName].statuses[statusName] = (defectMap[typeName].statuses[statusName] || 0) + 1
      } else if (typeName.toLowerCase() === 'epic') {
        epics.push(issue)
      } else if (isSubtask) {
        subtasks.push(issue)
      } else {
        storiesAndTasks.push(issue)
      }
    }

    // Build epic nodes
    const epicNodes: EpicNode[] = []
    const epicKeys = new Set(epics.map(e => e.key))

    // Map stories to their parent epic
    const epicStoriesMap: Record<string, any[]> = {}
    const orphanStories: any[] = []

    for (const story of storiesAndTasks) {
      const parentKey = story.fields?.parent?.key
      if (parentKey && epicKeys.has(parentKey)) {
        if (!epicStoriesMap[parentKey]) epicStoriesMap[parentKey] = []
        epicStoriesMap[parentKey].push(story)
      } else {
        orphanStories.push(story)
      }
    }

    // Map subtasks to their parent story
    const storySubtaskMap: Record<string, any[]> = {}
    const orphanSubtasks: any[] = []
    const allStoryKeys = new Set([...storiesAndTasks.map(s => s.key)])

    for (const sub of subtasks) {
      const parentKey = sub.fields?.parent?.key
      if (parentKey && allStoryKeys.has(parentKey)) {
        if (!storySubtaskMap[parentKey]) storySubtaskMap[parentKey] = []
        storySubtaskMap[parentKey].push(sub)
      } else {
        orphanSubtasks.push(sub)
      }
    }

    // Build story nodes helper
    function buildStoryNodes(stories: any[]): StoryNode[] {
      return stories.map(s => {
        const subs = storySubtaskMap[s.key] || []
        return {
          key: s.key,
          summary: s.fields?.summary || '',
          type: s.fields?.issuetype?.name || 'Story',
          status: s.fields?.status?.name || 'Unknown',
          subtaskCount: subs.length,
          subtasks: subs.map(st => ({
            key: st.key,
            summary: st.fields?.summary || '',
            status: st.fields?.status?.name || 'Unknown',
          })),
        }
      })
    }

    for (const epic of epics) {
      const stories = epicStoriesMap[epic.key] || []
      const storyNodes = buildStoryNodes(stories)
      const totalSubtasks = storyNodes.reduce((s, n) => s + n.subtaskCount, 0)

      // Collect statuses for epic scope
      const epicStatuses: Record<string, number> = {}
      const epicStatus = epic.fields?.status?.name || 'Unknown'
      epicStatuses[epicStatus] = 1
      for (const st of stories) {
        const sn = st.fields?.status?.name || 'Unknown'
        epicStatuses[sn] = (epicStatuses[sn] || 0) + 1
      }
      for (const st of stories) {
        for (const sub of (storySubtaskMap[st.key] || [])) {
          const sn = sub.fields?.status?.name || 'Unknown'
          epicStatuses[sn] = (epicStatuses[sn] || 0) + 1
        }
      }

      epicNodes.push({
        key: epic.key,
        summary: epic.fields?.summary || '',
        status: epicStatus,
        storyCount: stories.length,
        subtaskCount: totalSubtasks,
        stories: storyNodes,
        statusCounts: Object.entries(epicStatuses)
          .map(([status, count]) => ({ status, count }))
          .sort((a, b) => b.count - a.count),
      })
    }

    // If there are orphan stories, group them under a virtual "Unlinked" epic
    if (orphanStories.length > 0) {
      const storyNodes = buildStoryNodes(orphanStories)
      const totalSubtasks = storyNodes.reduce((s, n) => s + n.subtaskCount, 0)
      const orphanStatuses: Record<string, number> = {}
      for (const s of orphanStories) {
        const sn = s.fields?.status?.name || 'Unknown'
        orphanStatuses[sn] = (orphanStatuses[sn] || 0) + 1
      }
      epicNodes.push({
        key: '_unlinked',
        summary: 'Stories without Epic',
        status: '-',
        storyCount: orphanStories.length,
        subtaskCount: totalSubtasks,
        stories: storyNodes,
        statusCounts: Object.entries(orphanStatuses)
          .map(([status, count]) => ({ status, count }))
          .sort((a, b) => b.count - a.count),
      })
    }

    // Build defect summary
    const defects: DefectSummary[] = Object.entries(defectMap)
      .map(([type, info]) => ({
        type,
        count: info.count,
        statuses: Object.entries(info.statuses)
          .map(([status, count]) => ({ status, count }))
          .sort((a, b) => b.count - a.count),
      }))
      .sort((a, b) => b.count - a.count)

    projects.push({
      name: projName,
      key: projKey,
      totalCount: projIssues.length,
      epics: epicNodes.sort((a, b) => b.storyCount - a.storyCount),
      defects,
      statusCounts: Object.entries(statusCounts)
        .map(([status, count]) => ({ status, count }))
        .sort((a, b) => b.count - a.count),
      typeCounts: Object.entries(typeCounts)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count),
    })
  }

  projects.sort((a, b) => b.totalCount - a.totalCount)

  const statusSummary = Object.entries(globalStatuses)
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count)

  return { projects, statusSummary }
}
