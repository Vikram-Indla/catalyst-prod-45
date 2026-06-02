/**
 * For You Page Data Hook - Real data from Jira sync (ph_issues)
 * MARAM V5.0 — 3-wave parallel architecture
 *
 * Performance architecture (2026-05-16 perf RCA):
 *
 *   Previous: 2-phase serial gate (fetchUserMapping → rawData enabled) caused
 *   10+ sequential RTTs before first paint. Minimum load time: 3-6s cold cache.
 *
 *   Now: single useQuery, 3-wave parallel structure:
 *     Wave 1 (10 parallel): profiles, ph_user_mapping, jira projects,
 *             catalyst projects, planner tasks, stories, features, epics,
 *             incidents, starred items.
 *     Wave 2 (7 parallel, uses Wave 1): ph_projects, planner lookups,
 *             ph_issues assigned, jira_sync_comments x2 mentions,
 *             user_viewed_items.
 *     Wave 3 (8 parallel, uses Wave 2): comments, mention enrichment,
 *             ph_issue_attachments (SCOPED), viewed items, starred items,
 *             user project list.
 *   No separate fetchUserMapping call. userProfile embedded in ForYouRawData.
 *   ph_issue_attachments now scoped to top assigned + mention issue keys only
 *   (was a full-table scan).
 *   workedOnItems derived client-side from assignedItems (eliminated duplicate
 *   ph_issues query).
 *   recommendedItems derived from already-fetched data (eliminated extra RTT).
 *   Target: Recommended tab first paint in <1s cold cache, <100ms warm.
 */

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { PROJECT_AVATAR_REGISTRY } from '@/components/icons';
import { useJiraBaseUrl } from '@/hooks/useJiraBaseUrl';

export type WorkMode = 'OPS' | 'DEL' | 'TSK';
export type WorkGroup = 'YESTERDAY' | 'THIS_WEEK' | 'EARLIER';
export type TabType =
  | 'ai-theme'
  | 'recommended'
  | 'assigned'
  | 'starred'
  | 'r360'
  | 'worked'
  | 'viewed'
  | 'ageing'
  | 'team-pulse';
export type ModeFilter = 'all' | 'ops' | 'del' | 'tsk';

export interface WorkItemAssignee {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  avatarUrl?: string;
}

export type HubType = 'ProductHub' | 'ProjectHub' | 'ReleaseHub' | 'TestHub' | 'IncidentHub' | 'TaskHub' | 'StrategyHub' | 'PlanHub';

export interface WorkItem {
  id: string;
  key: string;
  summary: string;
  phIssueId?: string;
  projectId?: string;
  projectAvatarUrl?: string;
  mode: WorkMode;
  level: string;
  project: string;
  projectKey: string;
  hub: HubType;
  hubLabel: string;
  updatedAt: string;
  createdAt: string;
  assignee: WorkItemAssignee;
  reporter?: string;
  reporterAvatarUrl?: string;
  issueType: string;
  group: WorkGroup;
  starred?: boolean;
  status: string;
  priority: string;
  priorityLevel: number;
  sprint?: string;
  storyPoints?: number;
  labels?: string[];
  sprintRelease?: string;
  component?: string;
  jiraUrl?: string;
  lastSyncedAt?: string;
  description?: string;
  parentKey?: string;
  parentSummary?: string;
  attachmentCount?: number;
  statusCategory?: string;
}

export interface RecommendedMention {
  commentId: string;        // jira_comment_id (Jira-side text identifier — used as a row key)
  /**
   * UUID of the matching `ph_comments` row, if one exists. `ph_comment_reactions.comment_id`
   * FK references `ph_comments.id`, so reactions must use this UUID, NOT the Jira-side
   * `commentId`. Null when no Catalyst-side row exists for this Jira comment yet — in
   * that case reactions are unavailable for this card (see ReactionStrip gating).
   */
  phCommentId: string | null;
  commentBody: string;
  commentCreatedAt: string;
  issueKey: string;
  issueId: string;
  issueSummary: string;
  issueType: string;
  issueStatus?: string;
  /** Jira status category key ('done' | 'new' | 'indeterminate'). Used by the
   *  For You feed status chip to pick the correct category background color. */
  issueStatusCategory?: string;
  projectKey: string;
  projectName: string;
  mentionerId: string | null;
  mentionerName: string;
  mentionerAvatarUrl?: string;
}

export interface RecommendedComment {
  commentId: string;        // jira_comment_id (Jira-side text identifier)
  /** UUID of matching ph_comments row — see RecommendedMention.phCommentId. */
  phCommentId: string | null;
  commentBody: string;
  commentCreatedAt: string;
  issueKey: string;
  issueId: string;
  issueSummary: string;
  issueType: string;
  issueStatus?: string;
  /** Jira status category key ('done' | 'new' | 'indeterminate'). */
  issueStatusCategory?: string;
  projectKey: string;
  projectName: string;
  authorId: string | null;
  authorName: string;
  authorAvatarUrl?: string;
}

export interface Project {
  id: string;
  key: string;
  name: string;
  avatar_url?: string | null;
  icon?: string | null;
  color?: string | null;
}

export type AIWorkItemType = 'feature' | 'epic' | 'story' | 'defect' | 'incident' | 'task' | 'business-request';

export interface AISuggestion {
  id: string;
  itemId: string;
  key: string;
  title: string;
  type: AIWorkItemType;
  reason: string;
  timeLeft: string;
  isPriority: boolean;
  context: string;
}

export interface PerformanceStats {
  closed: number;
  ops: number;
  del: number;
  pln: number;
  slaRate: number;
  percentChange: number;
  personalBest: number;
}

// ─── Helper functions ─────────────────────────────────────────────────────────

function computeGroup(updatedAt: string): WorkGroup {
  const now = new Date();
  const updated = new Date(updatedAt);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  if (updated >= yesterday) return 'YESTERDAY';
  if (updated >= weekAgo) return 'THIS_WEEK';
  return 'EARLIER';
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins === 1) return '1 minute ago';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks === 1) return '1 week ago';
  return `${diffWeeks} weeks ago`;
}

function getInitials(name: string): string {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

function inferMode(projectKey: string, issueType: string): WorkMode {
  const type = issueType?.toLowerCase() || '';
  if (type.includes('incident') || type.includes('production')) return 'OPS';
  if (type === 'task' || type === 'planner_task') return 'TSK';
  return 'DEL';
}

function inferHub(issueType: string, projectKey: string): HubType {
  const type = (issueType || '').toLowerCase();
  if (type.includes('incident') || type.includes('production')) return 'IncidentHub';
  if (type === 'planner_task' || projectKey === 'TSK') return 'TaskHub';
  if (type === 'test' || type === 'test case' || type === 'test execution') return 'TestHub';
  if (type === 'epic') return 'ProjectHub';
  if (type === 'story' || type === 'sub-task' || type === 'subtask') return 'ProjectHub';
  if (type === 'bug' || type === 'defect') return 'ReleaseHub';
  if (type === 'feature' || type === 'initiative' || type === 'business request') return 'ProductHub';
  return 'ProductHub';
}

const HUB_LABEL_MAP: Record<HubType, string> = {
  ProductHub: 'Product', ProjectHub: 'Project', ReleaseHub: 'Release',
  TestHub: 'Test', IncidentHub: 'Incident', TaskHub: 'Task',
  StrategyHub: 'Strategy', PlanHub: 'Plan',
};

function priorityToLevel(priority: string): number {
  const p = (priority || '').toLowerCase();
  if (p === 'lowest') return 1;
  if (p === 'low') return 2;
  if (p === 'medium') return 3;
  if (p === 'high') return 4;
  if (p === 'highest') return 5;
  return 3;
}

// ─── Mapper functions ─────────────────────────────────────────────────────────

function mapPlannerTaskToIssueRow(row: any) {
  return {
    issue_key: row.task_key,
    project_key: row.task_key?.split('-')[0] || 'TSK',
    project_name: null,
    issue_type: 'planner_task',
    summary: row.title || '',
    status: row.status_name || 'Backlog',
    status_category: null,
    assignee_account_id: row.assignee_id,
    assignee_display_name: row.assignee_name || 'Unassigned',
    reporter_display_name: row.reporter_name || null,
    priority: row.priority || 'Medium',
    jira_updated_at: row.updated_at,
    jira_created_at: row.created_at || row.updated_at,
    parent_key: null,
    parent_summary: null,
    workstream_name: row.workstream_name || null,
    sprint_name: null,
    story_points: null,
    labels: null,
    sprint_release: null,
    components: null,
    description_text: null,
    last_synced_at: null,
  };
}

function mapStoryToIssueRow(row: any, assigneeName: string, projectName: string, projectKey: string) {
  return {
    id: row.id,
    project_id: row.feature?.project_id || null,
    issue_key: row.story_key || `US-${row.id.slice(0, 6)}`,
    project_key: projectKey,
    project_name: projectName,
    issue_type: 'story',
    summary: row.title || row.name || '',
    status: row.status || row.state || 'Open',
    status_category: null,
    assignee_account_id: row.assignee_id,
    assignee_display_name: assigneeName,
    reporter_display_name: null,
    priority: row.priority || 'Medium',
    jira_updated_at: row.updated_at,
    jira_created_at: row.created_at || row.updated_at,
    parent_key: row.feature?.display_id || null,
    parent_summary: row.feature?.name || null,
    workstream_name: projectName,
    sprint_name: null,
    story_points: row.story_points || row.estimate_points || null,
    labels: row.tags || null,
    sprint_release: null,
    components: null,
    description_text: row.description || null,
    last_synced_at: null,
  };
}

function mapFeatureToIssueRow(row: any, assigneeName: string, projectName: string, projectKey: string) {
  return {
    id: row.id,
    project_id: row.project_id || null,
    issue_key: row.display_id || `F-${row.id.slice(0, 6)}`,
    project_key: projectKey,
    project_name: projectName,
    issue_type: 'feature',
    summary: row.name || '',
    status: row.status || 'Open',
    status_category: null,
    assignee_account_id: row.assignee_id,
    assignee_display_name: assigneeName,
    reporter_display_name: null,
    priority: row.priority || 'Medium',
    jira_updated_at: row.updated_at,
    jira_created_at: row.created_at || row.updated_at,
    parent_key: row.epic?.epic_key || null,
    parent_summary: row.epic?.name || null,
    workstream_name: projectName,
    sprint_name: null,
    story_points: row.estimate_points || null,
    labels: row.labels || null,
    sprint_release: null,
    components: row.components || null,
    description_text: row.description || null,
    last_synced_at: null,
  };
}

function mapEpicToIssueRow(row: any, assigneeName: string) {
  return {
    id: row.id,
    project_id: null,
    issue_key: row.epic_key || `E-${row.id.slice(0, 6)}`,
    project_key: row.epic_key?.split('-')[0] || 'EP',
    project_name: 'Portfolio',
    issue_type: 'epic',
    summary: row.name || '',
    status: row.status || row.state || 'Open',
    status_category: null,
    assignee_account_id: row.assignee_id || row.owner_id,
    assignee_display_name: assigneeName,
    reporter_display_name: null,
    priority: 'Medium',
    jira_updated_at: row.updated_at,
    jira_created_at: row.created_at || row.updated_at,
    parent_key: null,
    parent_summary: null,
    workstream_name: 'Portfolio',
    sprint_name: null,
    story_points: row.points_estimate || null,
    labels: row.tags || null,
    sprint_release: null,
    components: null,
    description_text: row.description || null,
    last_synced_at: null,
  };
}

function mapIncidentToIssueRow(row: any, assigneeName: string, projectName: string, projectKey: string) {
  return {
    id: row.id,
    project_id: row.project_id || null,
    issue_key: row.incident_key || `INC-${row.id.slice(0, 6)}`,
    project_key: projectKey,
    project_name: projectName,
    issue_type: 'incident',
    summary: row.title || '',
    status: row.status || 'Open',
    status_category: null,
    assignee_account_id: row.assignee_id,
    assignee_display_name: assigneeName,
    reporter_display_name: row.reporter_name || null,
    priority: row.priority || row.severity || 'Medium',
    jira_updated_at: row.updated_at,
    jira_created_at: row.created_at || row.updated_at,
    parent_key: null,
    parent_summary: null,
    workstream_name: projectName,
    sprint_name: null,
    story_points: null,
    labels: null,
    sprint_release: null,
    components: null,
    description_text: row.description || null,
    last_synced_at: null,
  };
}

function mapIssueToWorkItem(
  row: any,
  starredSet: Set<string>,
  projectNameMap: Map<string, string>,
  attachmentCounts: Map<string, number>,
  projectAvatarMap: Map<string, string | null>,
  jiraBaseUrl: string | null,
): WorkItem {
  const assigneeName = row.assignee_display_name || 'Unassigned';
  const projectKey = row.project_key || '';
  const issueType = row.issue_type || 'Task';
  const hub = inferHub(issueType, projectKey);
  const priority = row.priority || 'Medium';

  let labels: string[] = [];
  if (Array.isArray(row.labels)) labels = row.labels;
  else if (typeof row.labels === 'string') {
    try { labels = JSON.parse(row.labels); } catch { /* empty */ }
  }

  let sprintRelease = '';
  if (row.sprint_release) {
    try {
      const fv = typeof row.sprint_release === 'string' ? JSON.parse(row.sprint_release) : row.sprint_release;
      if (Array.isArray(fv) && fv.length > 0) sprintRelease = fv[0]?.name || fv[0] || '';
    } catch { /* empty */ }
  }

  let component = '';
  if (row.components) {
    try {
      const cs = typeof row.components === 'string' ? JSON.parse(row.components) : row.components;
      if (Array.isArray(cs) && cs.length > 0) component = cs[0]?.name || cs[0] || '';
    } catch { /* empty */ }
  }

  const bundledAvatar = projectKey && projectKey in PROJECT_AVATAR_REGISTRY
    ? PROJECT_AVATAR_REGISTRY[projectKey as keyof typeof PROJECT_AVATAR_REGISTRY].url
    : null;
  const resolvedAvatar = bundledAvatar ?? projectAvatarMap.get(projectKey) ?? null;

  return {
    id: row.issue_key,
    key: row.issue_key,
    summary: row.summary || '',
    phIssueId: row.id || undefined,
    projectId: row.project_id || undefined,
    projectAvatarUrl: resolvedAvatar || undefined,
    mode: inferMode(projectKey, issueType),
    level: issueType,
    project: row.workstream_name || row.project_name || projectNameMap.get(projectKey) || projectKey,
    projectKey,
    hub,
    hubLabel: HUB_LABEL_MAP[hub],
    issueType,
    status: row.status || 'To Do',
    statusCategory: row.status_category || undefined,
    priority,
    priorityLevel: priorityToLevel(priority),
    sprint: row.sprint_name || undefined,
    storyPoints: row.story_points ? Number(row.story_points) : undefined,
    labels: labels.length > 0 ? labels : undefined,
    sprintRelease: sprintRelease || undefined,
    component: component || undefined,
    description: row.description_text || undefined,
    jiraUrl: row.issue_key && jiraBaseUrl ? `${jiraBaseUrl}/browse/${row.issue_key}` : undefined,
    lastSyncedAt: row.last_synced_at || undefined,
    parentKey: row.parent_key || undefined,
    parentSummary: row.parent_summary || undefined,
    updatedAt: row.jira_updated_at ? formatRelativeTime(row.jira_updated_at) : '-',
    createdAt: row.jira_created_at
      ? new Date(row.jira_created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : '-',
    assignee: {
      id: row.assignee_account_id || 'none',
      name: assigneeName,
      initials: getInitials(assigneeName),
      avatarColor: '#6b7280',
    },
    reporter: row.reporter_display_name || undefined,
    group: row.jira_updated_at ? computeGroup(row.jira_updated_at) : 'EARLIER',
    starred: starredSet.has(row.issue_key),
    attachmentCount: attachmentCounts.get(row.issue_key) ?? 0,
  };
}

const SELECT_FIELDS = 'id, issue_key, project_key, project_name, issue_type, summary, status, status_category, assignee_account_id, assignee_display_name, reporter_display_name, priority, jira_updated_at, jira_created_at, parent_key, parent_summary, sprint_name, story_points, labels, sprint_release, components, description_text, last_synced_at';

// ─── Cache-layer types ────────────────────────────────────────────────────────
// Maps serialized as [key, value][] so they survive JSON.stringify in the
// React Query localStorage persister.

interface ForYouRawData {
  userProfile: { firstName: string; lastName: string } | null;
  assignedItems: any[];
  workedOnItems: any[];
  starredData: any[];
  starredItemIds: string[];
  recommendedItems: any[];
  recommendedMentions: RecommendedMention[];
  recommendedComments: RecommendedComment[];
  viewedItems: any[];
  projectNameMap: [string, string][];
  projectAvatarMap: [string, string | null][];
  allUserProjects: Project[];
  attachmentCounts: [string, number][];
}

// ─── Pure fetch function (no React hooks, safe to call from useQuery) ─────────
//
// 3-wave architecture eliminates the previous 10+ serial RTT waterfall.
// See module-level comment for the full wave breakdown.

async function fetchForYouRawData(userId: string): Promise<ForYouRawData> {
  // ── Wave 1: Everything independent, including user identity resolution ──
  const [
    profileResult,
    mappingsResult,
    { data: jiraProjects },
    { data: catalystProjects },
    { data: plannerAssigned },
    { data: nativeStories },
    { data: nativeFeatures },
    { data: nativeEpics },
    { data: nativeIncidents },
    { data: stars },
  ] = await Promise.all([
    supabase.from('profiles').select('full_name, jira_account_id').eq('id', userId).single(),
    supabase.from('ph_user_mapping').select('jira_account_id').eq('catalyst_profile_id', userId).eq('is_mapped', true),
    supabase.from('ph_jira_projects').select('project_key, name'),
    supabase.from('projects').select('id, key, name, avatar_url, color'),
    supabase.from('tasks')
      .select('task_key, title, priority, assignee_id, updated_at, created_at, status_id, workstream_id, reporter_id')
      .eq('assignee_id', userId)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .limit(200),
    supabase.from('stories')
      .select('id, story_key, title, name, status, state, priority, assignee_id, story_points, estimate_points, tags, description, updated_at, created_at, feature:features(id, name, display_id, project_id, project:projects(id, name, key))')
      .eq('assignee_id', userId)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .limit(200),
    supabase.from('features')
      .select('id, display_id, name, status, priority, assignee_id, estimate_points, labels, components, description, updated_at, created_at, project_id, project:projects(id, name, key), epic:epics(id, name, epic_key)')
      .eq('assignee_id', userId)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .limit(100),
    supabase.from('epics')
      .select('id, epic_key, name, status, state, assignee_id, owner_id, points_estimate, tags, description, updated_at, created_at')
      .or(`assignee_id.eq.${userId},owner_id.eq.${userId}`)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .limit(100),
    supabase.from('incidents')
      .select('id, incident_key, title, status, severity, priority, assignee_id, reporter_name, description, updated_at, created_at, project_id, project:projects!incidents_project_id_fkey(id, name, key)')
      .eq('assignee_id', userId)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .limit(100),
    supabase.from('user_starred_items').select('item_id, item_type').eq('user_id', userId),
  ]);

  // ── Resolve user identity from Wave 1 ──
  const profileData = profileResult.data;
  const userProfile = profileData?.full_name
    ? {
        firstName: profileData.full_name.split(' ')[0] || 'there',
        lastName: profileData.full_name.split(' ').slice(1).join(' ') || '',
      }
    : null;

  let jiraAccountIds: string[] = [];
  if (mappingsResult.data && mappingsResult.data.length > 0) {
    jiraAccountIds = mappingsResult.data.map((m: any) => m.jira_account_id).filter(Boolean);
  } else if (profileData?.full_name) {
    // Name-based fallback: one conditional RTT (only when ph_user_mapping has no entry)
    const { data: nameMatches } = await supabase
      .from('ph_user_mapping')
      .select('jira_account_id')
      .ilike('jira_display_name', `%${profileData.full_name}%`)
      .eq('is_mapped', true);
    if (nameMatches && nameMatches.length > 0) {
      jiraAccountIds = nameMatches.map((m: any) => m.jira_account_id).filter(Boolean);
    }
  }
  if (jiraAccountIds.length === 0 && (profileData as any)?.jira_account_id) {
    jiraAccountIds = [(profileData as any).jira_account_id];
  }

  const userName = userProfile ? `${userProfile.firstName} ${userProfile.lastName}`.trim() : 'Unassigned';

  // ── Build project maps from Wave 1 results ──
  const localProjectNameMap = new Map<string, string>();
  (jiraProjects || []).forEach((p: any) => localProjectNameMap.set(p.project_key, p.name));

  const projectIdMap = new Map<string, string>();
  const localProjectAvatarMap = new Map<string, string | null>();
  const stableProjects: Project[] = [];

  const plannerRows = plannerAssigned || [];
  const statusIds = [...new Set(plannerRows.map((r: any) => r.status_id).filter(Boolean))];
  const wsIds = [...new Set(plannerRows.map((r: any) => r.workstream_id).filter(Boolean))];
  const catalystProjectKeys = (catalystProjects as Array<{ key: string }> | null || []).map(p => p.key).filter(Boolean);

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const nameParts = userName.trim().split(/\s+/);
  const firstName = nameParts[0] || '';
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
  const canFetchMentions = firstName.length >= 2 && userName !== 'Unassigned';

  // ── Wave 2: Parallel, uses Wave 1 results ──
  const [
    { data: phIconRows },
    { data: statuses },
    { data: workstreams },
    { data: jiraAssignedRaw },
    { data: mentionsModernRaw },
    { data: mentionsLegacyRaw },
    { data: viewedRowsRaw },
  ] = await Promise.all([
    catalystProjectKeys.length > 0
      ? supabase.from('ph_projects').select('key, icon, color').in('key', catalystProjectKeys)
      : Promise.resolve({ data: [] as any[] }),
    statusIds.length > 0
      ? supabase.from('task_statuses').select('id, name').in('id', statusIds)
      : Promise.resolve({ data: [] as any[] }),
    wsIds.length > 0
      ? supabase.from('task_workstreams').select('id, name').in('id', wsIds)
      : Promise.resolve({ data: [] as any[] }),
    jiraAccountIds.length > 0
      ? supabase.from('ph_issues').select(SELECT_FIELDS).in('assignee_account_id', jiraAccountIds).is('archived_at', null).order('jira_updated_at', { ascending: false }).limit(200)
      : Promise.resolve({ data: [] as any[] }),
    // Mentions now run in parallel with ph_issues (was serial after it)
    canFetchMentions
      ? supabase.from('jira_sync_comments')
          .select('id, jira_comment_id, issue_key, body, jira_created_at, author_account_id, author_display_name, author_avatar_url')
          .ilike('body', `%@${firstName}%`)
          .order('jira_created_at', { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [] as any[] }),
    canFetchMentions && lastName && lastName !== firstName
      ? supabase.from('jira_sync_comments')
          .select('id, jira_comment_id, issue_key, body, jira_created_at, author_account_id, author_display_name, author_avatar_url')
          .ilike('body', `%${firstName} ${lastName}%`)
          .order('jira_created_at', { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [] as any[] }),
    // Viewed items moved here from serial-after-Wave-2 position
    (supabase as any)
      .from('user_viewed_items')
      .select('item_id, item_type, last_viewed_at')
      .eq('user_id', userId)
      .order('last_viewed_at', { ascending: false })
      .limit(100),
  ]);

  // ── Build project maps using ph_projects from Wave 2 ──
  const phIconMap = new Map<string, { icon: string | null; color: string | null }>();
  (phIconRows || []).forEach((r: any) => phIconMap.set(r.key, { icon: r.icon, color: r.color }));
  (catalystProjects as Array<{ id: string; key: string; name?: string | null; avatar_url?: string | null; color?: string | null }> | null || []).forEach(p => {
    if (p.key) {
      projectIdMap.set(p.key, p.id);
      localProjectAvatarMap.set(p.key, p.avatar_url ?? null);
    }
    const ph = phIconMap.get(p.key);
    stableProjects.push({
      id: p.id,
      key: p.key,
      name: p.name || p.key,
      avatar_url: p.avatar_url ?? null,
      icon: ph?.icon ?? null,
      color: ph?.color ?? p.color ?? null,
    });
  });

  // Jira assigned with project IDs resolved
  const jiraAssigned = (jiraAssignedRaw || []).map((r: any) => ({
    ...r,
    project_id: projectIdMap.get(r.project_key) || null,
  }));

  // workedOnItems is a date-filtered subset — no extra ph_issues query needed
  const jiraWorked = jiraAssigned.filter(
    (r: any) => r.jira_updated_at && new Date(r.jira_updated_at) >= ninetyDaysAgo
  );

  // Planner maps from Wave 2
  const statusMap = new Map((statuses || []).map((s: any) => [s.id, s.name]));
  const wsMap = new Map((workstreams || []).map((w: any) => [w.id, w.name]));

  // Watched keys for comments query (Wave 3)
  const watchedKeys = new Set<string>(jiraAssigned.map((r: any) => r.issue_key).filter(Boolean));
  const watchedKeyList = [...watchedKeys].slice(0, 200);

  // Process mentions from Wave 2 — dedup by jira_comment_id
  const mergedById = new Map<string, any>();
  [...(mentionsModernRaw || []), ...(mentionsLegacyRaw || [])].forEach((row: any) => {
    if (!row.jira_comment_id) return;
    if (row.author_display_name?.trim().toLowerCase() === userName.trim().toLowerCase()) return;
    if (!mergedById.has(row.jira_comment_id)) mergedById.set(row.jira_comment_id, row);
  });
  const mergedMentions = [...mergedById.values()]
    .sort((a, b) => new Date(b.jira_created_at || 0).getTime() - new Date(a.jira_created_at || 0).getTime())
    .slice(0, 5);
  const mentionIssueKeys = [...new Set(mergedMentions.map((r: any) => r.issue_key).filter(Boolean))];

  // Top assigned keys for attachment scoping — no full-table scan
  const topAssignedKeys = jiraAssigned.slice(0, 20).map((r: any) => r.issue_key).filter(Boolean);
  const attachmentScopeKeys = [...new Set([...topAssignedKeys, ...mentionIssueKeys])];

  // Viewed item keys from Wave 2
  const viewedRows = viewedRowsRaw as Array<{ item_id: string; item_type: string; last_viewed_at: string }> | null;
  const viewedPhKeys = (viewedRows || []).filter(r => r.item_type === 'ph_issue').map(r => r.item_id);
  const viewedPlannerKeys = (viewedRows || []).filter(r => r.item_type === 'task').map(r => r.item_id);

  // Starred item IDs from Wave 1
  const starItemIds = (stars || []).map((s: any) => s.item_id);

  // jira_comment_ids needed for ph_comments → reactions FK resolution (Wave 3).
  // We resolve every comment that surfaces in the mentions / comments feed up
  // front so `useCommentReactions` can use the canonical UUID instead of the
  // Jira-side text identifier (which would silently fail the FK).
  const mentionAndFeedCommentIds = [...new Set([
    ...mergedMentions.map((m: any) => m.jira_comment_id).filter(Boolean),
  ])];

  // ── Wave 3: Parallel, uses Wave 2 results ──
  const [
    { data: commentRows },
    { data: mentionIssueRows },
    { data: attachmentRows },
    { data: viewedPhRaw },
    { data: viewedPlannerRaw },
    { data: starredIssuesRaw },
    { data: starredPlannerTasksRaw },
    { data: userIssueProjects },
    { data: phCommentRows },
  ] = await Promise.all([
    // Comments on watched issues (now Wave 3, parallel with enrichment)
    watchedKeyList.length > 0 && userName !== 'Unassigned'
      ? supabase.from('jira_sync_comments')
          .select('id, jira_comment_id, issue_key, body, jira_created_at, author_account_id, author_display_name, author_avatar_url')
          .in('issue_key', watchedKeyList)
          .gte('jira_created_at', thirtyDaysAgo.toISOString())
          .order('jira_created_at', { ascending: false })
          .limit(50)
      : Promise.resolve({ data: [] as any[] }),
    // Mention issue enrichment (ph_issues for mention issue keys)
    mentionIssueKeys.length > 0
      ? supabase.from('ph_issues').select('id, issue_key, summary, issue_type, project_key, status, status_category').in('issue_key', mentionIssueKeys)
      : Promise.resolve({ data: [] as any[] }),
    // Attachment counts SCOPED to relevant keys — no full-table scan
    attachmentScopeKeys.length > 0
      ? supabase.from('ph_issue_attachments').select('issue_key').in('issue_key', attachmentScopeKeys)
      : Promise.resolve({ data: [] as any[] }),
    // Viewed ph_issues
    viewedPhKeys.length > 0
      ? supabase.from('ph_issues').select(SELECT_FIELDS).in('issue_key', viewedPhKeys).is('archived_at', null)
      : Promise.resolve({ data: [] as any[] }),
    // Viewed planner tasks
    viewedPlannerKeys.length > 0
      ? supabase.from('tasks')
          .select('task_key, title, priority, assignee_id, updated_at, created_at, status_id, workstream_id, reporter_id')
          .in('task_key', viewedPlannerKeys)
          .is('deleted_at', null)
      : Promise.resolve({ data: [] as any[] }),
    // Starred ph_issues
    starItemIds.length > 0
      ? supabase.from('ph_issues').select(SELECT_FIELDS).in('issue_key', starItemIds).is('archived_at', null).order('jira_updated_at', { ascending: false })
      : Promise.resolve({ data: [] as any[] }),
    // Starred planner tasks
    starItemIds.length > 0
      ? supabase.from('tasks')
          .select('task_key, title, priority, assignee_id, updated_at, created_at, status_id')
          .in('task_key', starItemIds)
          .is('deleted_at', null)
      : Promise.resolve({ data: [] as any[] }),
    // User's jira project keys for allUserProjects
    jiraAccountIds.length > 0
      ? supabase.from('ph_issues').select('project_key').in('assignee_account_id', jiraAccountIds).is('deleted_at', null)
      : Promise.resolve({ data: [] as any[] }),
    // ph_comments lookup for the mentions feed. `ph_comment_reactions.comment_id`
    // is a UUID FK to ph_comments(id); the Recommended cards therefore need the
    // ph_comments UUID, NOT the jira_comment_id text key. We also pull
    // jira_comment_ids that appear in any `commentRows` (watched-comments feed)
    // below — but that list isn't known until commentRows resolves, so for
    // initial paint we cover only the mentions feed. Comments-feed entries
    // get their phCommentId in a second pass after commentRows below.
    mentionAndFeedCommentIds.length > 0
      ? supabase.from('ph_comments').select('id, jira_comment_id').in('jira_comment_id', mentionAndFeedCommentIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  // Build jira_comment_id → ph_comments.id map. Used to enrich both mentions
  // and comments below. Comments-feed entries that surfaced after Wave 3
  // dispatch (i.e., commentRows ids not in mentionAndFeedCommentIds) get a
  // small follow-up SELECT — typically 0-5 ids — far cheaper than blocking
  // Wave 3 on commentRows.
  const phCommentIdByJiraCommentId = new Map<string, string>();
  (phCommentRows || []).forEach((r: any) => {
    if (r.jira_comment_id && r.id) phCommentIdByJiraCommentId.set(r.jira_comment_id, r.id);
  });

  // ── Build attachment map from scoped results ──
  const attMap = new Map<string, number>();
  (attachmentRows || []).forEach((r: any) => {
    attMap.set(r.issue_key, (attMap.get(r.issue_key) || 0) + 1);
  });

  // ── Process mentions with enrichment from Wave 3 ──
  const issueByKey = new Map<string, any>();
  (mentionIssueRows || []).forEach((r: any) => issueByKey.set(r.issue_key, r));

  // Fallback: catalyst_issues for any mention keys not found in ph_issues
  const missedMentionKeys = mentionIssueKeys.filter(k => !issueByKey.has(k));
  if (missedMentionKeys.length > 0) {
    const { data: catRows } = await supabase
      .from('catalyst_issues')
      .select('id, issue_key, title, issue_type')
      .in('issue_key', missedMentionKeys);
    (catRows || []).forEach((r: any) => issueByKey.set(r.issue_key, {
      id: r.id, issue_key: r.issue_key, summary: r.title, issue_type: r.issue_type,
      project_key: (r.issue_key || '').split('-')[0],
    }));
    const stillMissing = missedMentionKeys.filter(k => !issueByKey.has(k));
    if (stillMissing.length > 0) {
      console.warn('[useForYouData] mentions enrichment miss:', stillMissing);
    }
  }

  const mentionsToPopulate: RecommendedMention[] = [];
  mergedMentions.forEach((row: any) => {
    if (!row.issue_key) return;
    const issue = issueByKey.get(row.issue_key);
    const projectKey = issue?.project_key || (typeof row.issue_key === 'string' ? row.issue_key.split('-')[0] : '');
    mentionsToPopulate.push({
      commentId: row.jira_comment_id,
      phCommentId: phCommentIdByJiraCommentId.get(row.jira_comment_id) ?? null,
      commentBody: row.body || '',
      commentCreatedAt: row.jira_created_at || new Date().toISOString(),
      issueKey: row.issue_key,
      issueId: issue?.id || row.issue_key,
      issueSummary: issue?.summary || row.issue_key,
      issueType: issue?.issue_type || 'task',
      issueStatus: issue?.status || undefined,
      issueStatusCategory: issue?.status_category || undefined,
      projectKey,
      projectName: localProjectNameMap.get(projectKey) || projectKey || '',
      mentionerId: row.author_account_id || null,
      mentionerName: row.author_display_name || 'A teammate',
      mentionerAvatarUrl: row.author_avatar_url || undefined,
    });
  });

  // ── Process comments with enrichment ──
  // Reuse issueByKey from mention enrichment where possible — only fetch missed keys
  const mentionCommentIds = new Set(mergedMentions.map((m: any) => m.jira_comment_id));
  const filteredComments = (commentRows || []).filter((row: any) => {
    if (!row.jira_comment_id) return false;
    if (mentionCommentIds.has(row.jira_comment_id)) return false;
    return !(row.author_display_name?.trim().toLowerCase() === userName.trim().toLowerCase());
  }).slice(0, 5);

  const commentIssueKeys = [...new Set(filteredComments.map((r: any) => r.issue_key).filter(Boolean))];
  const commentIssueByKey = new Map<string, any>(issueByKey);
  const missedCommentKeys = commentIssueKeys.filter(k => !commentIssueByKey.has(k));
  if (missedCommentKeys.length > 0) {
    const { data: missedRows } = await supabase
      .from('ph_issues')
      .select('id, issue_key, summary, issue_type, project_key, status, status_category')
      .in('issue_key', missedCommentKeys);
    (missedRows || []).forEach((r: any) => commentIssueByKey.set(r.issue_key, r));

    const missedCatKeys = missedCommentKeys.filter(k => !commentIssueByKey.has(k));
    if (missedCatKeys.length > 0) {
      const { data: catRows } = await supabase
        .from('catalyst_issues')
        .select('id, issue_key, title, issue_type')
        .in('issue_key', missedCatKeys);
      (catRows || []).forEach((r: any) => commentIssueByKey.set(r.issue_key, {
        id: r.id, issue_key: r.issue_key, summary: r.title, issue_type: r.issue_type,
        project_key: (r.issue_key || '').split('-')[0],
      }));
    }
  }

  // Catch-up SELECT: comments-feed jira_comment_ids not covered by the Wave 3
  // ph_comments lookup (which only saw the mentions list). Tiny query — at
  // most 5 ids per render — keeps reactions reliable without blocking Wave 3.
  const commentFeedJiraIds = filteredComments
    .map((r: any) => r.jira_comment_id)
    .filter((id: string | null) => !!id && !phCommentIdByJiraCommentId.has(id));
  if (commentFeedJiraIds.length > 0) {
    const { data: extraPhComments } = await supabase
      .from('ph_comments')
      .select('id, jira_comment_id')
      .in('jira_comment_id', commentFeedJiraIds);
    (extraPhComments || []).forEach((r: any) => {
      if (r.jira_comment_id && r.id) phCommentIdByJiraCommentId.set(r.jira_comment_id, r.id);
    });
  }

  const commentsToPopulate: RecommendedComment[] = [];
  filteredComments.forEach((row: any) => {
    const issue = commentIssueByKey.get(row.issue_key);
    const projectKey = issue?.project_key || (typeof row.issue_key === 'string' ? row.issue_key.split('-')[0] : '');
    commentsToPopulate.push({
      commentId: row.jira_comment_id,
      phCommentId: phCommentIdByJiraCommentId.get(row.jira_comment_id) ?? null,
      commentBody: row.body || '',
      commentCreatedAt: row.jira_created_at || new Date().toISOString(),
      issueKey: row.issue_key,
      issueId: issue?.id || row.issue_key,
      issueSummary: issue?.summary || row.issue_key,
      issueType: issue?.issue_type || 'task',
      issueStatus: issue?.status || undefined,
      issueStatusCategory: issue?.status_category || undefined,
      projectKey,
      projectName: localProjectNameMap.get(projectKey) || projectKey || '',
      authorId: row.author_account_id || null,
      authorName: row.author_display_name || 'A teammate',
      authorAvatarUrl: row.author_avatar_url || undefined,
    });
  });

  // ── Derive recommendedItems from already-fetched data — no extra query ──
  const recommendedKeySet = new Set<string>();
  const recommendedKeyOrder: string[] = [];
  const addRecommendedKey = (key: string) => {
    if (key && !recommendedKeySet.has(key)) {
      recommendedKeySet.add(key);
      recommendedKeyOrder.push(key);
    }
  };
  mentionsToPopulate.forEach(m => addRecommendedKey(m.issueKey));
  commentsToPopulate.forEach(c => addRecommendedKey(c.issueKey));
  jiraAssigned.slice(0, 10).forEach((r: any) => addRecommendedKey(r.issue_key));

  // Build from jiraAssigned (full SELECT_FIELDS rows) + issue enrichment rows
  const recByKey = new Map<string, any>();
  jiraAssigned.forEach((r: any) => recByKey.set(r.issue_key, r));
  // mentionIssueRows has a smaller field set — only fill gaps not in jiraAssigned
  (mentionIssueRows || []).forEach((r: any) => {
    if (!recByKey.has(r.issue_key)) recByKey.set(r.issue_key, r);
  });
  const recommendedItems = recommendedKeyOrder.map(k => recByKey.get(k)).filter(Boolean);

  // ── Map planner tasks ──
  const plannerMapped = plannerRows.map((row: any) =>
    mapPlannerTaskToIssueRow({
      ...row,
      assignee_name: userName,
      status_name: statusMap.get(row.status_id) || 'Backlog',
      workstream_name: wsMap.get(row.workstream_id) || null,
    })
  );
  const recentPlannerTasks = plannerMapped.filter((t: any) => t.jira_updated_at && new Date(t.jira_updated_at) >= ninetyDaysAgo);

  // ── Map native items ──
  const nativeStoryRows = (nativeStories || []).map((s: any) => {
    const projName = s.feature?.project?.name || s.feature?.name || 'Backlog';
    const projKey = s.feature?.project?.key || s.feature?.display_id || 'BKL';
    return mapStoryToIssueRow(s, userName, projName, projKey);
  });
  const nativeFeatureRows = (nativeFeatures || []).map((f: any) => {
    const projName = f.project?.name || 'Portfolio';
    const projKey = f.project?.key || 'PRT';
    return mapFeatureToIssueRow(f, userName, projName, projKey);
  });
  const nativeEpicRows = (nativeEpics || []).map((e: any) => mapEpicToIssueRow(e, userName));
  const nativeIncidentRows = (nativeIncidents || []).map((inc: any) => {
    const projName = inc.project?.name || 'Operations';
    const projKey = inc.project?.key || 'OPS';
    return mapIncidentToIssueRow(inc, userName, projName, projKey);
  });

  const allNativeItems = [...nativeStoryRows, ...nativeFeatureRows, ...nativeEpicRows, ...nativeIncidentRows];
  const jiraKeys = new Set([...jiraAssigned, ...jiraWorked].map((r: any) => r.issue_key));
  const dedupedNativeItems = allNativeItems.filter((item: any) => !jiraKeys.has(item.issue_key));
  const recentNativeItems = dedupedNativeItems.filter((item: any) => item.jira_updated_at && new Date(item.jira_updated_at) >= ninetyDaysAgo);

  const assignedItems = [...jiraAssigned, ...plannerMapped, ...dedupedNativeItems];
  const workedOnItems = [...jiraWorked, ...recentPlannerTasks, ...recentNativeItems];

  // ── Viewed items ──
  let viewedItems: any[] = [];
  if (viewedRows && viewedRows.length > 0) {
    const viewedAtByKey = new Map<string, string>(viewedRows.map(r => [r.item_id, r.last_viewed_at]));
    const viewedPh = (viewedPhRaw || []).map((r: any) => ({
      ...r,
      project_id: projectIdMap.get(r.project_key) || null,
    }));
    const viewedPlanner = (viewedPlannerRaw || []).map((row: any) =>
      mapPlannerTaskToIssueRow({ ...row, assignee_name: userName, status_name: 'Backlog', workstream_name: null })
    );
    viewedItems = [...viewedPh, ...viewedPlanner]
      .map(r => ({ ...r, _last_viewed_at: viewedAtByKey.get(r.issue_key) || null }))
      .filter(r => r._last_viewed_at)
      .map(r => ({ ...r, jira_updated_at: r._last_viewed_at || r.jira_updated_at }))
      .sort((a, b) => new Date(b._last_viewed_at).getTime() - new Date(a._last_viewed_at).getTime());
  }

  // ── Starred items ──
  let starredData: any[] = [];
  let starredItemIds: string[] = [];

  if (stars && stars.length > 0) {
    const starredKeys = new Set(stars.map((s: any) => s.item_id));
    starredItemIds = [...starredKeys];

    const starredIssues = (starredIssuesRaw || []).map((r: any) => ({
      ...r,
      project_id: projectIdMap.get(r.project_key) || null,
    }));

    let starredPlannerMapped: any[] = [];
    if (starredPlannerTasksRaw && starredPlannerTasksRaw.length > 0) {
      // Reuse the status map from Wave 2 for planner tasks
      const stIds = [...new Set(starredPlannerTasksRaw.map((r: any) => r.status_id).filter(Boolean))];
      const missingStIds = stIds.filter(id => !statusMap.has(id));
      if (missingStIds.length > 0) {
        const { data: sts } = await supabase.from('task_statuses').select('id, name').in('id', missingStIds);
        (sts || []).forEach((s: any) => statusMap.set(s.id, s.name));
      }
      starredPlannerMapped = starredPlannerTasksRaw.map((row: any) =>
        mapPlannerTaskToIssueRow({ ...row, assignee_name: 'Unassigned', status_name: statusMap.get(row.status_id) || 'Backlog' })
      );
    }

    const starredNativeItems = allNativeItems.filter((item: any) => starredKeys.has(item.issue_key));
    const existingStarredKeys = new Set([
      ...starredIssues.map((r: any) => r.issue_key),
      ...starredPlannerMapped.map((r: any) => r.issue_key),
    ]);
    const dedupedStarredNative = starredNativeItems.filter((item: any) => !existingStarredKeys.has(item.issue_key));
    starredData = [...starredIssues, ...starredPlannerMapped, ...dedupedStarredNative];
  }

  // ── allUserProjects: merge Catalyst projects with Jira-only projects ──
  const existingKeys = new Set(stableProjects.map(p => p.key));
  const jiraProjectKeys = [...new Set(
    (userIssueProjects ?? []).map((r: any) => r.project_key).filter(Boolean)
  )] as string[];
  for (const key of jiraProjectKeys) {
    if (!existingKeys.has(key)) {
      stableProjects.push({
        id: key,
        key,
        name: localProjectNameMap.get(key) || key,
        avatar_url: null,
        icon: null,
        color: null,
      });
      existingKeys.add(key);
    }
  }

  return {
    userProfile,
    assignedItems,
    workedOnItems,
    starredData,
    starredItemIds,
    recommendedItems,
    recommendedMentions: mentionsToPopulate,
    recommendedComments: commentsToPopulate,
    viewedItems,
    projectNameMap: [...localProjectNameMap.entries()],
    projectAvatarMap: [...localProjectAvatarMap.entries()],
    allUserProjects: [...stableProjects].sort((a, b) => a.name.localeCompare(b.name)),
    attachmentCounts: [...attMap.entries()],
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useForYouData(authLoading = false) {
  const [activeMode, setActiveMode] = useState<ModeFilter>('all');
  const [activeTab, setActiveTab] = useState<TabType>('recommended');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ field: string; order: 'asc' | 'desc' }>({ field: 'updated', order: 'desc' });
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);

  const { user: authUser } = useAuth();
  const queryClient = useQueryClient();
  const jiraBaseUrl = useJiraBaseUrl();

  // Single query — no serial gate. User mapping resolved inside fetchForYouRawData.
  const rawDataKey = useMemo(() => ['for-you-data', authUser?.id ?? ''], [authUser?.id]);
  const { data: rawData, isPending: dataPending } = useQuery({
    queryKey: rawDataKey,
    queryFn: () => fetchForYouRawData(authUser!.id),
    enabled: !!authUser?.id && !authLoading,
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = dataPending;

  // Reconstruct Maps from JSON-safe serialized arrays
  const projectNameMap = useMemo(() => new Map<string, string>(rawData?.projectNameMap ?? []), [rawData]);
  const projectAvatarMap = useMemo(() => new Map<string, string | null>(rawData?.projectAvatarMap ?? []), [rawData]);
  const attachmentCounts = useMemo(() => new Map<string, number>(rawData?.attachmentCounts ?? []), [rawData]);
  const starredItems = useMemo(() => new Set<string>(rawData?.starredItemIds ?? []), [rawData]);

  const userProfile = rawData?.userProfile ?? null;
  const user = {
    id: authUser?.id || 'current-user',
    firstName: userProfile?.firstName || 'there',
    lastName: userProfile?.lastName || '',
  };

  const sourceItems = useMemo(() => {
    switch (activeTab) {
      case 'recommended': return rawData?.recommendedItems ?? [];
      case 'assigned':    return rawData?.assignedItems ?? [];
      case 'starred':     return rawData?.starredData ?? [];
      case 'viewed':      return rawData?.viewedItems ?? [];
      case 'ai-theme':    return [];
      case 'ageing':      return [];
      case 'worked':
      default:            return rawData?.workedOnItems ?? [];
    }
  }, [activeTab, rawData]);

  const filteredItems = useMemo(() => {
    let items = sourceItems.map(row =>
      mapIssueToWorkItem(row, starredItems, projectNameMap, attachmentCounts, projectAvatarMap, jiraBaseUrl)
    );
    if (activeMode !== 'all') items = items.filter(item => item.mode.toLowerCase() === activeMode);
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item =>
        item.key.toLowerCase().includes(query) || item.summary.toLowerCase().includes(query)
      );
    }
    return items;
  }, [sourceItems, activeMode, searchQuery, starredItems, projectNameMap, attachmentCounts, projectAvatarMap]);

  const groupedItems = useMemo(() => {
    const groups: Record<WorkGroup, WorkItem[]> = { YESTERDAY: [], THIS_WEEK: [], EARLIER: [] };
    filteredItems.forEach(item => { groups[item.group].push(item); });
    return groups;
  }, [filteredItems]);

  const tabCounts = useMemo(() => {
    const filterByMode = (items: any[]) => {
      if (activeMode === 'all') return items;
      return items.filter((row: any) => inferMode(row.project_key, row.issue_type).toLowerCase() === activeMode);
    };
    return {
      'ai-theme':  0,
      recommended: filterByMode(rawData?.recommendedItems ?? []).length,
      assigned:    filterByMode(rawData?.assignedItems ?? []).length,
      starred:     filterByMode(rawData?.starredData ?? []).length,
      worked:      filterByMode(rawData?.workedOnItems ?? []).length,
      viewed:      filterByMode(rawData?.viewedItems ?? []).length,
      ageing:      0,
    };
  }, [rawData, activeMode]);

  const hubStats = useMemo(() => {
    const stats: Record<string, number> = {};
    filteredItems.forEach(item => { stats[item.hubLabel] = (stats[item.hubLabel] || 0) + 1; });
    const projects = new Set(filteredItems.map(i => i.project));
    const reporters = new Set(filteredItems.map(i => i.reporter || i.assignee.name));
    return { hubCounts: stats, projectCount: projects.size, reporterCount: reporters.size };
  }, [filteredItems]);

  const aiData = useMemo(() => ({
    criticalCount: 0,
    priorityItem: undefined,
    nextItems: [] as AISuggestion[],
    suggestions: [] as AISuggestion[],
  }), []);
  const performanceStats: PerformanceStats = { closed: 0, ops: 0, del: 0, pln: 0, slaRate: 0, percentChange: 0, personalBest: 0 };

  const handleStartTask = (itemId: string) => { console.log('Start task:', itemId); };
  const generateStatusUpdate = () => { console.log('Generate status update'); };
  const generateImpactReport = () => { console.log('Generate impact report'); };
  const showDeprioritize = () => { console.log('Show deprioritize options'); };

  const trackView = useCallback(async (itemId: string, itemType: string = 'ph_issue') => {
    if (!authUser?.id || !itemId) return;

    const now = new Date().toISOString();

    queryClient.setQueryData(rawDataKey, (old: ForYouRawData | undefined) => {
      if (!old) return old;
      const existing = old.viewedItems.find((r: any) => r.issue_key === itemId);
      if (existing) {
        const rest = old.viewedItems.filter((r: any) => r.issue_key !== itemId);
        return {
          ...old,
          viewedItems: [{ ...existing, jira_updated_at: now, _last_viewed_at: now }, ...rest],
        };
      }
      return old;
    });

    try {
      const { error } = await (supabase as any).from('user_viewed_items').upsert(
        { user_id: authUser.id, item_id: itemId, item_type: itemType, last_viewed_at: now },
        { onConflict: 'user_id,item_id,item_type', ignoreDuplicates: false }
      );
      if (error) { console.warn('[useForYouData] trackView failed:', error); return; }

      const { data: refreshedRaw } = await (supabase as any)
        .from('user_viewed_items')
        .select('item_id, item_type, last_viewed_at')
        .eq('user_id', authUser.id)
        .order('last_viewed_at', { ascending: false })
        .limit(100);
      const refreshed = refreshedRaw as Array<{ item_id: string; item_type: string; last_viewed_at: string }> | null;
      if (!refreshed || refreshed.length === 0) return;

      const phKeys = refreshed.filter(r => r.item_type === 'ph_issue').map(r => r.item_id);
      const plannerKeys = refreshed.filter(r => r.item_type === 'task').map(r => r.item_id);
      const [viewedPhRaw, viewedPlannerRaw] = await Promise.all([
        phKeys.length > 0
          ? supabase.from('ph_issues').select(SELECT_FIELDS).in('issue_key', phKeys).is('archived_at', null)
          : Promise.resolve({ data: [] as any[] }),
        plannerKeys.length > 0
          ? supabase.from('tasks')
              .select('task_key, title, priority, assignee_id, updated_at, created_at, status_id, workstream_id, reporter_id')
              .in('task_key', plannerKeys)
              .is('deleted_at', null)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const viewedAtByKey = new Map<string, string>(refreshed.map(r => [r.item_id, r.last_viewed_at]));
      const userName = rawData?.userProfile ? `${rawData.userProfile.firstName} ${rawData.userProfile.lastName}`.trim() : 'You';
      const allViewed = [...(viewedPhRaw.data || []), ...(viewedPlannerRaw.data || []).map((row: any) =>
        mapPlannerTaskToIssueRow({ ...row, assignee_name: userName, status_name: 'Backlog', workstream_name: null })
      )]
        .map((r: any) => ({ ...r, _last_viewed_at: viewedAtByKey.get(r.issue_key) || null }))
        .filter((r: any) => r._last_viewed_at)
        .map((r: any) => ({ ...r, jira_updated_at: r._last_viewed_at || r.jira_updated_at }))
        .sort((a: any, b: any) => new Date(b._last_viewed_at).getTime() - new Date(a._last_viewed_at).getTime());

      queryClient.setQueryData(rawDataKey, (old: ForYouRawData | undefined) => {
        if (!old) return old;
        return { ...old, viewedItems: allViewed };
      });
    } catch (err) {
      console.warn('[useForYouData] trackView threw:', err);
    }
  }, [authUser?.id, queryClient, rawDataKey, rawData?.userProfile]);

  const toggleStar = useCallback(async (itemId: string) => {
    if (!authUser?.id) return;
    const isCurrentlyStarred = starredItems.has(itemId);

    queryClient.setQueryData(rawDataKey, (old: ForYouRawData | undefined) => {
      if (!old) return old;
      const newIds = isCurrentlyStarred
        ? old.starredItemIds.filter(id => id !== itemId)
        : [...old.starredItemIds, itemId];
      const newStarredData = isCurrentlyStarred
        ? old.starredData.filter((r: any) => r.issue_key !== itemId)
        : old.starredData;
      return { ...old, starredItemIds: newIds, starredData: newStarredData };
    });

    try {
      if (isCurrentlyStarred) {
        const { error } = await supabase.from('user_starred_items')
          .delete().eq('user_id', authUser.id).eq('item_id', itemId);
        if (error) throw error;
      } else {
        // Detect item_type from the source row instead of hardcoding 'ph_issue'.
        // Without this, planner_task stars get stored as ph_issue, polluting
        // analytics and downstream filtering. The row already carries
        // `issue_type` from the mapper (planner tasks use 'planner_task').
        const sourceRow = [...(rawData?.assignedItems ?? []), ...(rawData?.workedOnItems ?? [])]
          .find((r: any) => r.issue_key === itemId);
        const itemType = sourceRow?.issue_type === 'planner_task' ? 'task' : 'ph_issue';
        const { error } = await supabase.from('user_starred_items')
          .insert({ user_id: authUser.id, item_id: itemId, item_type: itemType });
        if (error) throw error;
        queryClient.setQueryData(rawDataKey, (old: ForYouRawData | undefined) => {
          if (!old) return old;
          const issueRow = [...old.assignedItems, ...old.workedOnItems].find((r: any) => r.issue_key === itemId);
          if (issueRow && !old.starredData.some((r: any) => r.issue_key === itemId)) {
            return { ...old, starredData: [issueRow, ...old.starredData] };
          }
          return old;
        });
      }
    } catch (err) {
      console.error('Error toggling star:', err);
      queryClient.invalidateQueries({ queryKey: rawDataKey });
    }
  }, [authUser?.id, starredItems, queryClient, rawDataKey, rawData]);

  return {
    activeMode, setActiveMode,
    activeTab, setActiveTab,
    searchQuery, setSearchQuery,
    sortConfig, setSortConfig,
    isAIPanelOpen, setIsAIPanelOpen,
    user,
    workItems: filteredItems,
    groupedItems,
    tabCounts,
    hubStats,
    aiData,
    performanceStats,
    isLoading,
    handleStartTask,
    generateStatusUpdate,
    generateImpactReport,
    showDeprioritize,
    toggleStar,
    trackView,
    recommendedMentions: rawData?.recommendedMentions ?? [],
    recommendedComments: rawData?.recommendedComments ?? [],
    allUserProjects: rawData?.allUserProjects ?? [],
  };
}
