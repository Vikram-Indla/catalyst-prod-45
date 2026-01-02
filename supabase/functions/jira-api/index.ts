import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Jira-like error response
function jiraError(status: number, messages: string[], errorCode?: string) {
  return new Response(
    JSON.stringify({
      errorMessages: messages,
      errors: {},
      ...(errorCode && { errorCode }),
    }),
    { 
      status, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  )
}

// Success response with Jira-like structure
function jiraSuccess(data: unknown, status = 200) {
  return new Response(
    JSON.stringify(data),
    { 
      status, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  )
}

// Parse cursor for pagination
function parseCursor(cursor?: string): { offset: number; limit: number } {
  if (!cursor) return { offset: 0, limit: 50 }
  try {
    const decoded = atob(cursor)
    const [offset, limit] = decoded.split(':').map(Number)
    return { offset: offset || 0, limit: limit || 50 }
  } catch {
    return { offset: 0, limit: 50 }
  }
}

// Create cursor for next page
function createCursor(offset: number, limit: number): string {
  return btoa(`${offset}:${limit}`)
}

// Transform issue from DB to Jira format
function transformIssueToJira(issue: any, issueType: any, status: any, project: any) {
  return {
    id: issue.id,
    key: issue.issue_key,
    self: `/rest/api/3/issue/${issue.issue_key}`,
    fields: {
      summary: issue.summary,
      description: issue.description_adf,
      issuetype: issueType ? {
        id: issueType.id,
        name: issueType.name,
        description: issueType.description,
        iconUrl: issueType.icon_url,
        subtask: issueType.category === 'subtask',
      } : null,
      status: status ? {
        id: status.id,
        name: status.name,
        description: status.description,
        statusCategory: {
          id: status.category,
          key: status.category,
          name: status.category,
        },
      } : null,
      project: project ? {
        id: project.id,
        key: project.project_key,
        name: project.name,
        self: `/rest/api/3/project/${project.project_key}`,
      } : null,
      priority: issue.priority ? {
        id: issue.priority,
        name: issue.priority,
      } : null,
      assignee: issue.assignee_id ? {
        accountId: issue.assignee_id,
      } : null,
      reporter: issue.reporter_id ? {
        accountId: issue.reporter_id,
      } : null,
      created: issue.created_at,
      updated: issue.updated_at,
      duedate: issue.due_date,
      labels: issue.labels || [],
      parent: issue.parent_id ? {
        id: issue.parent_id,
      } : null,
      customfield_epic: issue.parent_feature_id,
      customfield_program_epic: issue.program_epic_id,
      resolution: issue.resolution_id,
      resolutiondate: issue.resolved_at,
      story_points: issue.story_points,
    },
    changelog: {
      histories: [],
    },
  }
}

// Transform board to Jira Agile format
function transformBoardToJira(board: any, project: any) {
  return {
    id: board.id,
    self: `/rest/agile/1.0/board/${board.id}`,
    name: board.name,
    type: board.board_type,
    location: project ? {
      projectId: project.id,
      projectKey: project.project_key,
      projectName: project.name,
    } : null,
  }
}

// Transform sprint to Jira Agile format
function transformSprintToJira(sprint: any) {
  return {
    id: sprint.id,
    self: `/rest/agile/1.0/sprint/${sprint.id}`,
    state: sprint.state,
    name: sprint.name,
    startDate: sprint.start_date,
    endDate: sprint.end_date,
    completeDate: sprint.complete_date,
    originBoardId: sprint.board_id,
    goal: sprint.goal,
  }
}

// Transform version to Jira format
function transformVersionToJira(version: any) {
  return {
    id: version.id,
    self: `/rest/api/3/version/${version.id}`,
    name: version.name,
    description: version.description,
    archived: version.archived,
    released: version.released,
    startDate: version.start_date,
    releaseDate: version.release_date,
    projectId: version.project_id,
  }
}

// Create changelog entry
async function createChangelog(
  supabase: any,
  issueId: string,
  authorId: string,
  changes: Array<{ field: string; oldValue: string | null; newValue: string | null }>
) {
  // Create changelog group
  const { data: group, error: groupError } = await supabase
    .from('injira_changelog_groups')
    .insert({
      issue_id: issueId,
      author_id: authorId,
    })
    .select()
    .single()

  if (groupError) {
    console.error('Failed to create changelog group:', groupError)
    return
  }

  // Create changelog items
  for (const change of changes) {
    await supabase.from('injira_changelog_items').insert({
      changelog_group_id: group.id,
      field_id: change.field,
      field_name: change.field,
      old_value: change.oldValue,
      new_value: change.newValue,
      old_string: change.oldValue,
      new_string: change.newValue,
    })
  }
}

// Route handlers
async function handleGetIssue(supabase: any, issueKey: string, tenantId: string) {
  console.log(`[GET /issue/${issueKey}] Fetching issue`)

  const { data: issue, error } = await supabase
    .from('injira_issues')
    .select(`
      *,
      issue_type:injira_issue_types(*),
      status:injira_statuses(*),
      project:injira_projects(*)
    `)
    .eq('issue_key', issueKey)
    .eq('tenant_id', tenantId)
    .single()

  if (error || !issue) {
    console.error(`[GET /issue/${issueKey}] Not found:`, error)
    return jiraError(404, [`Issue does not exist or you do not have permission to see it.`])
  }

  return jiraSuccess(transformIssueToJira(issue, issue.issue_type, issue.status, issue.project))
}

async function handleCreateIssue(supabase: any, body: any, tenantId: string, userId: string) {
  console.log('[POST /issue] Creating issue:', body)

  const { fields } = body
  if (!fields) {
    return jiraError(400, ['Field "fields" is required'])
  }

  // Validate required fields
  if (!fields.project?.id && !fields.project?.key) {
    return jiraError(400, ['Project is required'])
  }
  if (!fields.summary) {
    return jiraError(400, ['Summary is required'])
  }
  if (!fields.issuetype?.id && !fields.issuetype?.name) {
    return jiraError(400, ['Issue type is required'])
  }

  // Get project
  let projectQuery = supabase.from('injira_projects').select().eq('tenant_id', tenantId)
  if (fields.project.key) {
    projectQuery = projectQuery.eq('project_key', fields.project.key)
  } else {
    projectQuery = projectQuery.eq('id', fields.project.id)
  }
  const { data: project, error: projectError } = await projectQuery.single()
  
  if (projectError || !project) {
    return jiraError(404, ['Project not found'])
  }

  // Get issue type
  let typeQuery = supabase.from('injira_issue_types').select().eq('tenant_id', tenantId)
  if (fields.issuetype.name) {
    typeQuery = typeQuery.eq('name', fields.issuetype.name)
  } else {
    typeQuery = typeQuery.eq('id', fields.issuetype.id)
  }
  const { data: issueType, error: typeError } = await typeQuery.single()
  
  if (typeError || !issueType) {
    return jiraError(404, ['Issue type not found'])
  }

  // Get default status
  const { data: defaultStatus } = await supabase
    .from('injira_statuses')
    .select()
    .eq('tenant_id', tenantId)
    .eq('category', 'todo')
    .limit(1)
    .single()

  // Create issue
  const { data: issue, error: createError } = await supabase
    .from('injira_issues')
    .insert({
      tenant_id: tenantId,
      project_id: project.id,
      issue_type_id: issueType.id,
      status_id: defaultStatus?.id,
      summary: fields.summary,
      description_adf: fields.description,
      priority: fields.priority?.name || 'Medium',
      assignee_id: fields.assignee?.accountId,
      reporter_id: userId,
      labels: fields.labels || [],
      parent_id: fields.parent?.id,
      parent_feature_id: fields.customfield_epic,
      program_epic_id: fields.customfield_program_epic,
      due_date: fields.duedate,
      story_points: fields.story_points,
    })
    .select(`
      *,
      issue_type:injira_issue_types(*),
      status:injira_statuses(*),
      project:injira_projects(*)
    `)
    .single()

  if (createError) {
    console.error('[POST /issue] Create failed:', createError)
    return jiraError(400, [createError.message])
  }

  console.log(`[POST /issue] Created issue: ${issue.issue_key}`)
  return jiraSuccess(transformIssueToJira(issue, issue.issue_type, issue.status, issue.project), 201)
}

async function handleUpdateIssue(supabase: any, issueKey: string, body: any, tenantId: string, userId: string) {
  console.log(`[PUT /issue/${issueKey}] Updating issue:`, body)

  // Get current issue
  const { data: currentIssue, error: fetchError } = await supabase
    .from('injira_issues')
    .select('*')
    .eq('issue_key', issueKey)
    .eq('tenant_id', tenantId)
    .single()

  if (fetchError || !currentIssue) {
    return jiraError(404, ['Issue does not exist or you do not have permission to see it.'])
  }

  const { fields } = body
  if (!fields) {
    return jiraError(400, ['Field "fields" is required'])
  }

  const updates: Record<string, any> = {}
  const changes: Array<{ field: string; oldValue: string | null; newValue: string | null }> = []

  // Track changes for changelog
  if (fields.summary !== undefined) {
    changes.push({ field: 'summary', oldValue: currentIssue.summary, newValue: fields.summary })
    updates.summary = fields.summary
  }
  if (fields.description !== undefined) {
    changes.push({ field: 'description', oldValue: JSON.stringify(currentIssue.description_adf), newValue: JSON.stringify(fields.description) })
    updates.description_adf = fields.description
  }
  if (fields.priority !== undefined) {
    changes.push({ field: 'priority', oldValue: currentIssue.priority, newValue: fields.priority?.name })
    updates.priority = fields.priority?.name
  }
  if (fields.assignee !== undefined) {
    changes.push({ field: 'assignee', oldValue: currentIssue.assignee_id, newValue: fields.assignee?.accountId })
    updates.assignee_id = fields.assignee?.accountId
  }
  if (fields.labels !== undefined) {
    changes.push({ field: 'labels', oldValue: JSON.stringify(currentIssue.labels), newValue: JSON.stringify(fields.labels) })
    updates.labels = fields.labels
  }
  if (fields.duedate !== undefined) {
    changes.push({ field: 'duedate', oldValue: currentIssue.due_date, newValue: fields.duedate })
    updates.due_date = fields.duedate
  }
  if (fields.story_points !== undefined) {
    changes.push({ field: 'story_points', oldValue: String(currentIssue.story_points), newValue: String(fields.story_points) })
    updates.story_points = fields.story_points
  }

  if (Object.keys(updates).length === 0) {
    return jiraSuccess({ key: issueKey }, 204)
  }

  const { error: updateError } = await supabase
    .from('injira_issues')
    .update(updates)
    .eq('id', currentIssue.id)
    .eq('optimistic_lock_version', currentIssue.optimistic_lock_version)

  if (updateError) {
    console.error(`[PUT /issue/${issueKey}] Update failed:`, updateError)
    return jiraError(409, ['The issue has been modified by another user. Please refresh and try again.'])
  }

  // Create changelog entries
  await createChangelog(supabase, currentIssue.id, userId, changes)

  console.log(`[PUT /issue/${issueKey}] Updated successfully`)
  return jiraSuccess({ key: issueKey }, 204)
}

async function handleSearch(supabase: any, body: any, tenantId: string) {
  console.log('[POST /search] Searching:', body)

  const { jql, startAt = 0, maxResults = 50, fields = ['*all'] } = body
  
  let query = supabase
    .from('injira_issues')
    .select(`
      *,
      issue_type:injira_issue_types(*),
      status:injira_statuses(*),
      project:injira_projects(*)
    `, { count: 'exact' })
    .eq('tenant_id', tenantId)
    .range(startAt, startAt + maxResults - 1)

  // Parse simple JQL (basic implementation)
  if (jql) {
    const projectMatch = jql.match(/project\s*=\s*["']?(\w+)["']?/i)
    if (projectMatch) {
      const { data: project } = await supabase
        .from('injira_projects')
        .select('id')
        .eq('project_key', projectMatch[1])
        .eq('tenant_id', tenantId)
        .single()
      if (project) {
        query = query.eq('project_id', project.id)
      }
    }

    const statusMatch = jql.match(/status\s*=\s*["']?([^"']+)["']?/i)
    if (statusMatch) {
      const { data: status } = await supabase
        .from('injira_statuses')
        .select('id')
        .eq('name', statusMatch[1])
        .eq('tenant_id', tenantId)
        .single()
      if (status) {
        query = query.eq('status_id', status.id)
      }
    }

    const assigneeMatch = jql.match(/assignee\s*=\s*["']?([^"']+)["']?/i)
    if (assigneeMatch) {
      query = query.eq('assignee_id', assigneeMatch[1])
    }

    // Order by
    const orderMatch = jql.match(/ORDER BY\s+(\w+)\s*(ASC|DESC)?/i)
    if (orderMatch) {
      const field = orderMatch[1].toLowerCase()
      const ascending = orderMatch[2]?.toUpperCase() !== 'DESC'
      const fieldMap: Record<string, string> = {
        created: 'created_at',
        updated: 'updated_at',
        priority: 'priority',
        key: 'issue_key',
        rank: 'rank_lexo',
      }
      if (fieldMap[field]) {
        query = query.order(fieldMap[field], { ascending })
      }
    }
  }

  const { data: issues, error, count } = await query

  if (error) {
    console.error('[POST /search] Search failed:', error)
    return jiraError(400, [error.message])
  }

  const transformedIssues = (issues || []).map((issue: any) => 
    transformIssueToJira(issue, issue.issue_type, issue.status, issue.project)
  )

  return jiraSuccess({
    expand: 'schema,names',
    startAt,
    maxResults,
    total: count || 0,
    issues: transformedIssues,
  })
}

async function handleAddComment(supabase: any, issueKey: string, body: any, tenantId: string, userId: string) {
  console.log(`[POST /issue/${issueKey}/comment] Adding comment:`, body)

  // Get issue
  const { data: issue, error: issueError } = await supabase
    .from('injira_issues')
    .select('id')
    .eq('issue_key', issueKey)
    .eq('tenant_id', tenantId)
    .single()

  if (issueError || !issue) {
    return jiraError(404, ['Issue not found'])
  }

  const { data: comment, error: commentError } = await supabase
    .from('injira_comments')
    .insert({
      tenant_id: tenantId,
      issue_id: issue.id,
      author_id: userId,
      body_adf: body.body,
      visibility_type: body.visibility?.type,
      visibility_value: body.visibility?.value,
    })
    .select()
    .single()

  if (commentError) {
    console.error(`[POST /issue/${issueKey}/comment] Failed:`, commentError)
    return jiraError(400, [commentError.message])
  }

  return jiraSuccess({
    id: comment.id,
    self: `/rest/api/3/issue/${issueKey}/comment/${comment.id}`,
    author: { accountId: userId },
    body: comment.body_adf,
    created: comment.created_at,
    updated: comment.updated_at,
  }, 201)
}

async function handleUpdateAssignee(supabase: any, issueKey: string, body: any, tenantId: string, userId: string) {
  console.log(`[PUT /issue/${issueKey}/assignee] Updating assignee:`, body)

  const { data: issue, error: fetchError } = await supabase
    .from('injira_issues')
    .select('id, assignee_id')
    .eq('issue_key', issueKey)
    .eq('tenant_id', tenantId)
    .single()

  if (fetchError || !issue) {
    return jiraError(404, ['Issue not found'])
  }

  const newAssignee = body.accountId || null
  
  const { error: updateError } = await supabase
    .from('injira_issues')
    .update({ assignee_id: newAssignee })
    .eq('id', issue.id)

  if (updateError) {
    return jiraError(400, [updateError.message])
  }

  await createChangelog(supabase, issue.id, userId, [
    { field: 'assignee', oldValue: issue.assignee_id, newValue: newAssignee }
  ])

  return jiraSuccess({}, 204)
}

async function handleGetBoards(supabase: any, tenantId: string, cursor?: string) {
  console.log('[GET /board] Fetching boards')

  const { offset, limit } = parseCursor(cursor)

  const { data: boards, error, count } = await supabase
    .from('injira_boards')
    .select(`
      *,
      project:injira_projects(*)
    `, { count: 'exact' })
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('[GET /board] Failed:', error)
    return jiraError(400, [error.message])
  }

  const transformedBoards = (boards || []).map((board: any) => 
    transformBoardToJira(board, board.project)
  )

  const hasMore = (count || 0) > offset + limit
  
  return jiraSuccess({
    maxResults: limit,
    startAt: offset,
    total: count || 0,
    isLast: !hasMore,
    values: transformedBoards,
    ...(hasMore && { nextCursor: createCursor(offset + limit, limit) }),
  })
}

async function handleGetBoardIssues(supabase: any, boardId: string, tenantId: string, cursor?: string) {
  console.log(`[GET /board/${boardId}/issue] Fetching board issues`)

  const { offset, limit } = parseCursor(cursor)

  // Get board to find project
  const { data: board, error: boardError } = await supabase
    .from('injira_boards')
    .select('project_id')
    .eq('id', boardId)
    .eq('tenant_id', tenantId)
    .single()

  if (boardError || !board) {
    return jiraError(404, ['Board not found'])
  }

  const { data: issues, error, count } = await supabase
    .from('injira_issues')
    .select(`
      *,
      issue_type:injira_issue_types(*),
      status:injira_statuses(*),
      project:injira_projects(*)
    `, { count: 'exact' })
    .eq('tenant_id', tenantId)
    .eq('project_id', board.project_id)
    .order('rank_lexo', { ascending: true, nullsFirst: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error(`[GET /board/${boardId}/issue] Failed:`, error)
    return jiraError(400, [error.message])
  }

  const transformedIssues = (issues || []).map((issue: any) => 
    transformIssueToJira(issue, issue.issue_type, issue.status, issue.project)
  )

  const hasMore = (count || 0) > offset + limit

  return jiraSuccess({
    maxResults: limit,
    startAt: offset,
    total: count || 0,
    issues: transformedIssues,
    ...(hasMore && { nextCursor: createCursor(offset + limit, limit) }),
  })
}

async function handleGetBoardConfiguration(supabase: any, boardId: string, tenantId: string) {
  console.log(`[GET /board/${boardId}/configuration] Fetching board config`)

  const { data: board, error: boardError } = await supabase
    .from('injira_boards')
    .select(`
      *,
      columns:injira_board_columns(*)
    `)
    .eq('id', boardId)
    .eq('tenant_id', tenantId)
    .single()

  if (boardError || !board) {
    return jiraError(404, ['Board not found'])
  }

  // Sort columns by position
  const sortedColumns = (board.columns || []).sort((a: any, b: any) => a.position - b.position)

  return jiraSuccess({
    id: board.id,
    name: board.name,
    type: board.board_type,
    self: `/rest/agile/1.0/board/${board.id}/configuration`,
    columnConfig: {
      columns: sortedColumns.map((col: any) => ({
        name: col.name,
        statuses: col.status_ids || [],
        min: col.wip_limit_min,
        max: col.wip_limit_max,
      })),
    },
    filter: board.filter_jql ? {
      id: `board-${board.id}-filter`,
      self: `/rest/api/3/filter/board-${board.id}-filter`,
      query: board.filter_jql,
    } : null,
    ranking: {
      rankCustomFieldId: 'rank_lexo',
    },
  })
}

async function handleGetBoardSprints(supabase: any, boardId: string, tenantId: string, state?: string, cursor?: string) {
  console.log(`[GET /board/${boardId}/sprint] Fetching sprints`)

  const { offset, limit } = parseCursor(cursor)

  let query = supabase
    .from('injira_sprints')
    .select('*', { count: 'exact' })
    .eq('board_id', boardId)
    .eq('tenant_id', tenantId)
    .order('start_date', { ascending: false })
    .range(offset, offset + limit - 1)

  if (state) {
    query = query.eq('state', state)
  }

  const { data: sprints, error, count } = await query

  if (error) {
    console.error(`[GET /board/${boardId}/sprint] Failed:`, error)
    return jiraError(400, [error.message])
  }

  const transformedSprints = (sprints || []).map(transformSprintToJira)
  const hasMore = (count || 0) > offset + limit

  return jiraSuccess({
    maxResults: limit,
    startAt: offset,
    total: count || 0,
    isLast: !hasMore,
    values: transformedSprints,
    ...(hasMore && { nextCursor: createCursor(offset + limit, limit) }),
  })
}

async function handleCreateSprint(supabase: any, body: any, tenantId: string) {
  console.log('[POST /sprint] Creating sprint:', body)

  if (!body.name) {
    return jiraError(400, ['Sprint name is required'])
  }
  if (!body.originBoardId) {
    return jiraError(400, ['Board ID is required'])
  }

  const { data: sprint, error } = await supabase
    .from('injira_sprints')
    .insert({
      tenant_id: tenantId,
      board_id: body.originBoardId,
      name: body.name,
      goal: body.goal,
      start_date: body.startDate,
      end_date: body.endDate,
      state: 'future',
    })
    .select()
    .single()

  if (error) {
    console.error('[POST /sprint] Failed:', error)
    return jiraError(400, [error.message])
  }

  return jiraSuccess(transformSprintToJira(sprint), 201)
}

async function handleUpdateSprint(supabase: any, sprintId: string, body: any, tenantId: string) {
  console.log(`[PUT /sprint/${sprintId}] Updating sprint:`, body)

  const { data: currentSprint, error: fetchError } = await supabase
    .from('injira_sprints')
    .select('*')
    .eq('id', sprintId)
    .eq('tenant_id', tenantId)
    .single()

  if (fetchError || !currentSprint) {
    return jiraError(404, ['Sprint not found'])
  }

  const updates: Record<string, any> = {}
  
  if (body.name !== undefined) updates.name = body.name
  if (body.goal !== undefined) updates.goal = body.goal
  if (body.startDate !== undefined) updates.start_date = body.startDate
  if (body.endDate !== undefined) updates.end_date = body.endDate
  if (body.state !== undefined) {
    updates.state = body.state
    if (body.state === 'closed') {
      updates.complete_date = new Date().toISOString()
    }
  }

  const { data: sprint, error } = await supabase
    .from('injira_sprints')
    .update(updates)
    .eq('id', sprintId)
    .select()
    .single()

  if (error) {
    console.error(`[PUT /sprint/${sprintId}] Failed:`, error)
    return jiraError(400, [error.message])
  }

  return jiraSuccess(transformSprintToJira(sprint))
}

async function handleGetProjectVersions(supabase: any, projectKey: string, tenantId: string, cursor?: string) {
  console.log(`[GET /project/${projectKey}/versions] Fetching versions`)

  const { offset, limit } = parseCursor(cursor)

  // Get project
  const { data: project, error: projectError } = await supabase
    .from('injira_projects')
    .select('id')
    .eq('project_key', projectKey)
    .eq('tenant_id', tenantId)
    .single()

  if (projectError || !project) {
    return jiraError(404, ['Project not found'])
  }

  const { data: versions, error, count } = await supabase
    .from('injira_versions')
    .select('*', { count: 'exact' })
    .eq('project_id', project.id)
    .eq('tenant_id', tenantId)
    .order('sequence', { ascending: true })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error(`[GET /project/${projectKey}/versions] Failed:`, error)
    return jiraError(400, [error.message])
  }

  const transformedVersions = (versions || []).map(transformVersionToJira)

  return jiraSuccess(transformedVersions)
}

async function handleCreateVersion(supabase: any, body: any, tenantId: string) {
  console.log('[POST /version] Creating version:', body)

  if (!body.name) {
    return jiraError(400, ['Version name is required'])
  }
  if (!body.projectId) {
    return jiraError(400, ['Project ID is required'])
  }

  const { data: version, error } = await supabase
    .from('injira_versions')
    .insert({
      tenant_id: tenantId,
      project_id: body.projectId,
      name: body.name,
      description: body.description,
      start_date: body.startDate,
      release_date: body.releaseDate,
      archived: body.archived || false,
      released: body.released || false,
    })
    .select()
    .single()

  if (error) {
    console.error('[POST /version] Failed:', error)
    return jiraError(400, [error.message])
  }

  return jiraSuccess(transformVersionToJira(version), 201)
}

// Main router
Deno.serve(async (req) => {
  console.log(`[Jira API] ${req.method} ${req.url}`)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const path = url.pathname.replace('/jira-api', '')
    
    // Get auth header
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return jiraError(401, ['Authentication required'])
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Verify token and get user
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return jiraError(401, ['Invalid or expired token'])
    }

    // Get user's tenant (simplified - in production would check user's tenant assignment)
    const tenantId = url.searchParams.get('tenantId') || 'default-tenant'
    const userId = user.id

    // Parse body for POST/PUT requests
    let body = null
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      try {
        body = await req.json()
      } catch {
        // Empty body is ok for some endpoints
      }
    }

    // Route matching
    // REST API 3 routes
    const issueKeyMatch = path.match(/^\/rest\/api\/3\/issue\/([A-Z]+-\d+)$/)
    const issueCommentMatch = path.match(/^\/rest\/api\/3\/issue\/([A-Z]+-\d+)\/comment$/)
    const issueAssigneeMatch = path.match(/^\/rest\/api\/3\/issue\/([A-Z]+-\d+)\/assignee$/)
    const projectVersionsMatch = path.match(/^\/rest\/api\/3\/project\/([A-Z]+)\/versions$/)

    // Agile routes
    const boardIdMatch = path.match(/^\/rest\/agile\/1\.0\/board\/([a-f0-9-]+)$/)
    const boardIssuesMatch = path.match(/^\/rest\/agile\/1\.0\/board\/([a-f0-9-]+)\/issue$/)
    const boardConfigMatch = path.match(/^\/rest\/agile\/1\.0\/board\/([a-f0-9-]+)\/configuration$/)
    const boardSprintsMatch = path.match(/^\/rest\/agile\/1\.0\/board\/([a-f0-9-]+)\/sprint$/)
    const sprintIdMatch = path.match(/^\/rest\/agile\/1\.0\/sprint\/([a-f0-9-]+)$/)

    // Route handlers
    if (path === '/rest/api/3/issue' && req.method === 'POST') {
      return await handleCreateIssue(supabase, body, tenantId, userId)
    }

    if (issueKeyMatch) {
      const issueKey = issueKeyMatch[1]
      if (req.method === 'GET') {
        return await handleGetIssue(supabase, issueKey, tenantId)
      }
      if (req.method === 'PUT') {
        return await handleUpdateIssue(supabase, issueKey, body, tenantId, userId)
      }
    }

    if (path === '/rest/api/3/search' && req.method === 'POST') {
      return await handleSearch(supabase, body, tenantId)
    }

    if (issueCommentMatch && req.method === 'POST') {
      return await handleAddComment(supabase, issueCommentMatch[1], body, tenantId, userId)
    }

    if (issueAssigneeMatch && req.method === 'PUT') {
      return await handleUpdateAssignee(supabase, issueAssigneeMatch[1], body, tenantId, userId)
    }

    if (path === '/rest/agile/1.0/board' && req.method === 'GET') {
      return await handleGetBoards(supabase, tenantId, url.searchParams.get('cursor') || undefined)
    }

    if (boardIssuesMatch && req.method === 'GET') {
      return await handleGetBoardIssues(supabase, boardIssuesMatch[1], tenantId, url.searchParams.get('cursor') || undefined)
    }

    if (boardConfigMatch && req.method === 'GET') {
      return await handleGetBoardConfiguration(supabase, boardConfigMatch[1], tenantId)
    }

    if (boardSprintsMatch && req.method === 'GET') {
      return await handleGetBoardSprints(
        supabase, 
        boardSprintsMatch[1], 
        tenantId, 
        url.searchParams.get('state') || undefined,
        url.searchParams.get('cursor') || undefined
      )
    }

    if (path === '/rest/agile/1.0/sprint' && req.method === 'POST') {
      return await handleCreateSprint(supabase, body, tenantId)
    }

    if (sprintIdMatch && req.method === 'PUT') {
      return await handleUpdateSprint(supabase, sprintIdMatch[1], body, tenantId)
    }

    if (projectVersionsMatch && req.method === 'GET') {
      return await handleGetProjectVersions(
        supabase, 
        projectVersionsMatch[1], 
        tenantId, 
        url.searchParams.get('cursor') || undefined
      )
    }

    if (path === '/rest/api/3/version' && req.method === 'POST') {
      return await handleCreateVersion(supabase, body, tenantId)
    }

    // 404 for unmatched routes
    console.log(`[Jira API] Route not found: ${path}`)
    return jiraError(404, [`No endpoint found for ${req.method} ${path}`])

  } catch (error) {
    console.error('[Jira API] Unexpected error:', error)
    return jiraError(500, ['Internal server error'])
  }
})
