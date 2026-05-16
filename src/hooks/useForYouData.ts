/**
 * For You Page Data Hook - Real data from Jira sync (ph_issues)
 * MARAM V4.0 — ring-fenced to For You page
 *
 * Cache architecture (2026-05-10):
 *   Two useQuery calls route through the existing React Query infrastructure
 *   (PersistQueryClientProvider in App.tsx, staleTime 5min, gcTime 30 days,
 *   localStorage persistence). Previously the hook used raw useState/useEffect
 *   which bypassed the cache entirely, causing a full 10+ query waterfall on
 *   every mount.
 *
 *   Query 1 — user mapping (staleTime 1 hour): profile + jira account IDs.
 *   Query 2 — raw data (staleTime 5 min): all issues, projects, starred, viewed.
 *   Mutations (toggleStar, trackView) use queryClient.setQueryData for
 *   optimistic updates without invalidating the full query.
 */

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { PROJECT_AVATAR_REGISTRY } from '@/components/icons';

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
  | 'ageing';
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
  fixVersion?: string;
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
  commentId: string;
  commentBody: string;
  commentCreatedAt: string;
  issueKey: string;
  issueId: string;
  issueSummary: string;
  issueType: string;
  projectKey: string;
  projectName: string;
  mentionerId: string | null;
  mentionerName: string;
  mentionerAvatarUrl?: string;
}

export interface RecommendedComment {
  commentId: string;
  commentBody: string;
  commentCreatedAt: string;
  issueKey: string;
  issueId: string;
  issueSummary: string;
  issueType: string;
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
    fix_versions: null,
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
    fix_versions: null,
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
    fix_versions: null,
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
    fix_versions: null,
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
    fix_versions: null,
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

  let fixVersion = '';
  if (row.fix_versions) {
    try {
      const fv = typeof row.fix_versions === 'string' ? JSON.parse(row.fix_versions) : row.fix_versions;
      if (Array.isArray(fv) && fv.length > 0) fixVersion = fv[0]?.name || fv[0] || '';
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
    fixVersion: fixVersion || undefined,
    component: component || undefined,
    description: row.description_text || undefined,
    jiraUrl: row.issue_key ? `https://jira.example.com/browse/${row.issue_key}` : undefined,
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

const SELECT_FIELDS = 'id, issue_key, project_key, project_name, issue_type, summary, status, status_category, assignee_account_id, assignee_display_name, reporter_display_name, priority, jira_updated_at, jira_created_at, parent_key, parent_summary, sprint_name, story_points, labels, fix_versions, components, description_text, last_synced_at';

// ─── Cache-layer types ────────────────────────────────────────────────────────
// Maps serialized as [key, value][] so they survive JSON.stringify in the
// React Query localStorage persister.

interface ForYouRawData {
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

interface UserMappingResult {
  jiraAccountIds: string[];
  userProfile: { firstName: string; lastName: string } | null;
}

// ─── Pure fetch functions (no React hooks, safe to call from useQuery) ────────

async function fetchUserMapping(userId: string): Promise<UserMappingResult> {
  // Include jira_account_id so we can use it as a final fallback if ph_user_mapping
  // has no entry for this user (aligns with useAgeingItems which reads the same field).
  const { data: profileData } = await supabase
    .from('profiles')
    .select('full_name, jira_account_id')
    .eq('id', userId)
    .single();

  const userProfile = profileData?.full_name
    ? {
        firstName: profileData.full_name.split(' ')[0] || 'there',
        lastName: profileData.full_name.split(' ').slice(1).join(' ') || '',
      }
    : null;

  let jiraAccountIds: string[] = [];
  const { data: mappings } = await supabase
    .from('ph_user_mapping')
    .select('jira_account_id')
    .eq('catalyst_profile_id', userId)
    .eq('is_mapped', true);

  if (mappings && mappings.length > 0) {
    jiraAccountIds = mappings.map((m: any) => m.jira_account_id).filter(Boolean);
  } else if (profileData?.full_name) {
    const { data: nameMatches } = await supabase
      .from('ph_user_mapping')
      .select('jira_account_id')
      .ilike('jira_display_name', `%${profileData.full_name}%`)
      .eq('is_mapped', true);
    if (nameMatches && nameMatches.length > 0) {
      jiraAccountIds = nameMatches.map((m: any) => m.jira_account_id).filter(Boolean);
    }
  }

  // Final fallback: ph_user_mapping had no entry, but profiles.jira_account_id is set.
  // useAgeingItems uses this same field — keep both hooks in sync.
  if (jiraAccountIds.length === 0 && (profileData as any)?.jira_account_id) {
    jiraAccountIds = [(profileData as any).jira_account_id];
  }

  return { jiraAccountIds, userProfile };
}

async function fetchForYouRawData(
  userId: string,
  jiraAccountIds: string[],
  userName: string,
): Promise<ForYouRawData> {
  // ── Wave 1: All independent lookups in parallel ──
  const [
    { data: jiraProjects },
    { data: catalystProjects },
    { data: plannerAssigned },
    { data: nativeStories },
    { data: nativeFeatures },
    { data: nativeEpics },
    { data: nativeIncidents },
    { data: stars },
    { data: attachmentRows },
  ] = await Promise.all([
    supabase.from('ph_jira_projects').select('project_key, name'),
    supabase.from('projects').select('id, key, name, avatar_url, color'),
    supabase.from('planner_tasks')
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
    supabase.from('ph_issue_attachments').select('issue_key'),
  ]);

  // Attachment count map
  const attMap = new Map<string, number>();
  (attachmentRows || []).forEach((r: any) => {
    attMap.set(r.issue_key, (attMap.get(r.issue_key) || 0) + 1);
  });

  // Project maps
  const projectIdMap = new Map<string, string>();
  const localProjectAvatarMap = new Map<string, string | null>();
  const stableProjects: Project[] = [];

  if (catalystProjects) {
    const projectKeys = (catalystProjects as Array<{ key: string }>).map(p => p.key).filter(Boolean);
    const phIconMap = new Map<string, { icon: string | null; color: string | null }>();
    if (projectKeys.length > 0) {
      const { data: phRows } = await supabase
        .from('ph_projects')
        .select('key, icon, color')
        .in('key', projectKeys);
      (phRows || []).forEach((r: { key: string; icon: string | null; color: string | null }) => {
        phIconMap.set(r.key, { icon: r.icon, color: r.color });
      });
    }
    (catalystProjects as Array<{ id: string; key: string; name?: string | null; avatar_url?: string | null; color?: string | null }>).forEach(p => {
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
  }

  const localProjectNameMap = new Map<string, string>();
  if (jiraProjects) {
    jiraProjects.forEach((p: any) => localProjectNameMap.set(p.project_key, p.name));
  }

  // ── Wave 2: Dependent lookups in parallel ──
  const plannerRows = plannerAssigned || [];
  const statusIds = [...new Set(plannerRows.map((r: any) => r.status_id).filter(Boolean))];
  const wsIds = [...new Set(plannerRows.map((r: any) => r.workstream_id).filter(Boolean))];
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const wave2Promises: PromiseLike<any>[] = [
    statusIds.length > 0
      ? supabase.from('planner_statuses').select('id, name').in('id', statusIds)
      : Promise.resolve({ data: [] }),
    wsIds.length > 0
      ? supabase.from('planner_workstreams').select('id, name').in('id', wsIds)
      : Promise.resolve({ data: [] }),
  ];

  if (jiraAccountIds.length > 0) {
    wave2Promises.push(
      supabase.from('ph_issues').select(SELECT_FIELDS).in('assignee_account_id', jiraAccountIds).is('archived_at', null).order('jira_updated_at', { ascending: false }).limit(200),
      supabase.from('ph_issues').select(SELECT_FIELDS).in('assignee_account_id', jiraAccountIds).is('archived_at', null).gte('jira_updated_at', ninetyDaysAgo.toISOString()).order('jira_updated_at', { ascending: false }).limit(200),
    );
  }

  const wave2Results = await Promise.all(wave2Promises);
  const statuses = wave2Results[0]?.data || [];
  const workstreams = wave2Results[1]?.data || [];
  const jiraAssignedRaw = jiraAccountIds.length > 0 ? (wave2Results[2]?.data || []) : [];
  const jiraWorkedRaw = jiraAccountIds.length > 0 ? (wave2Results[3]?.data || []) : [];

  // Map planner tasks
  const statusMap = new Map(statuses.map((s: any) => [s.id, s.name]));
  const wsMap = new Map(workstreams.map((w: any) => [w.id, w.name]));
  const plannerMapped = plannerRows.map((row: any) =>
    mapPlannerTaskToIssueRow({
      ...row,
      assignee_name: userName,
      status_name: statusMap.get(row.status_id) || 'Backlog',
      workstream_name: wsMap.get(row.workstream_id) || null,
    })
  );

  // Map Jira issues
  const jiraAssigned = jiraAssignedRaw.map((r: any) => ({ ...r, project_id: projectIdMap.get(r.project_key) || null }));
  const jiraWorked = jiraWorkedRaw.map((r: any) => ({ ...r, project_id: projectIdMap.get(r.project_key) || null }));

  // Map native items
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

  const assignedItems = [...jiraAssigned, ...plannerMapped, ...dedupedNativeItems];
  const recentPlannerTasks = plannerMapped.filter((t: any) => t.jira_updated_at && new Date(t.jira_updated_at) >= ninetyDaysAgo);
  const recentNativeItems = dedupedNativeItems.filter((item: any) => item.jira_updated_at && new Date(item.jira_updated_at) >= ninetyDaysAgo);
  const workedOnItems = [...jiraWorked, ...recentPlannerTasks, ...recentNativeItems];

  // ── Viewed items ──
  const { data: viewedRowsRaw } = await (supabase as any)
    .from('user_viewed_items')
    .select('item_id, item_type, last_viewed_at')
    .eq('user_id', userId)
    .order('last_viewed_at', { ascending: false })
    .limit(100);
  const viewedRows = viewedRowsRaw as Array<{ item_id: string; item_type: string; last_viewed_at: string }> | null;

  let viewedItems: any[] = [];
  if (viewedRows && viewedRows.length > 0) {
    const phKeys = viewedRows.filter(r => r.item_type === 'ph_issue').map(r => r.item_id);
    const plannerKeys = viewedRows.filter(r => r.item_type === 'task').map(r => r.item_id);
    const [viewedPhRaw, viewedPlannerRaw] = await Promise.all([
      phKeys.length > 0
        ? supabase.from('ph_issues').select(SELECT_FIELDS).in('issue_key', phKeys).is('archived_at', null)
        : Promise.resolve({ data: [] as any[] }),
      plannerKeys.length > 0
        ? supabase.from('planner_tasks')
            .select('task_key, title, priority, assignee_id, updated_at, created_at, status_id, workstream_id, reporter_id')
            .in('task_key', plannerKeys)
            .is('deleted_at', null)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const viewedPh = (viewedPhRaw.data || []).map((r: any) => ({ ...r, project_id: projectIdMap.get(r.project_key) || null }));
    const viewedPlanner = (viewedPlannerRaw.data || []).map((row: any) =>
      mapPlannerTaskToIssueRow({ ...row, assignee_name: userName, status_name: 'Backlog', workstream_name: null })
    );
    const viewedAtByKey = new Map<string, string>(viewedRows.map(r => [r.item_id, r.last_viewed_at]));
    viewedItems = [...viewedPh, ...viewedPlanner]
      .map(r => ({ ...r, _last_viewed_at: viewedAtByKey.get(r.issue_key) || null }))
      .filter(r => r._last_viewed_at)
      .map(r => ({ ...r, jira_updated_at: r._last_viewed_at || r.jira_updated_at }))
      .sort((a, b) => new Date(b._last_viewed_at).getTime() - new Date(a._last_viewed_at).getTime());
  }

  // ── Recommended mentions ──
  const mentionsToPopulate: RecommendedMention[] = [];
  const recommendedKeyOrder: string[] = [];
  const recommendedKeySet = new Set<string>();

  if (userName && userName !== 'Unassigned') {
    const parts = userName.trim().split(/\s+/);
    const firstName = parts[0];
    const lastName = parts.length > 1 ? parts[parts.length - 1] : '';

    if (firstName && firstName.length >= 2) {
      const [modernQ, legacyQ] = await Promise.all([
        supabase
          .from('jira_sync_comments')
          .select('id, jira_comment_id, issue_key, body, jira_created_at, author_account_id, author_display_name, author_avatar_url')
          .ilike('body', `%@${firstName}%`)
          .order('jira_created_at', { ascending: false })
          .limit(10),
        lastName
          ? supabase
              .from('jira_sync_comments')
              .select('id, jira_comment_id, issue_key, body, jira_created_at, author_account_id, author_display_name, author_avatar_url')
              .ilike('body', `%${firstName} ${lastName}%`)
              .order('jira_created_at', { ascending: false })
              .limit(10)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const mergedById = new Map<string, any>();
      [...(modernQ.data || []), ...(legacyQ.data || [])].forEach((row: any) => {
        if (!row.jira_comment_id) return;
        if (row.author_display_name?.trim().toLowerCase() === userName.trim().toLowerCase()) return;
        if (!mergedById.has(row.jira_comment_id)) mergedById.set(row.jira_comment_id, row);
      });

      const merged = [...mergedById.values()]
        .sort((a, b) => new Date(b.jira_created_at || 0).getTime() - new Date(a.jira_created_at || 0).getTime())
        .slice(0, 5);

      const issueKeys = [...new Set(merged.map((r: any) => r.issue_key).filter(Boolean))];
      const issueByKey = new Map<string, any>();
      if (issueKeys.length > 0) {
        const { data: issueRows } = await supabase
          .from('ph_issues')
          .select('id, issue_key, summary, issue_type, project_key')
          .in('issue_key', issueKeys);
        (issueRows || []).forEach((r: any) => issueByKey.set(r.issue_key, r));

        const missedKeys = issueKeys.filter(k => !issueByKey.has(k));
        if (missedKeys.length > 0) {
          const { data: catRows } = await supabase
            .from('catalyst_issues')
            .select('id, issue_key, title, issue_type')
            .in('issue_key', missedKeys);
          (catRows || []).forEach((r: any) => issueByKey.set(r.issue_key, {
            id: r.id, issue_key: r.issue_key, summary: r.title, issue_type: r.issue_type,
            project_key: (r.issue_key || '').split('-')[0],
          }));
          const stillMissing = missedKeys.filter(k => !issueByKey.has(k));
          if (stillMissing.length > 0) {
            console.warn('[useForYouData] mentions enrichment miss:', stillMissing);
          }
        }
      }

      merged.forEach((row: any) => {
        if (!row.issue_key) return;
        const issue = issueByKey.get(row.issue_key);
        const projectKey = issue?.project_key || (typeof row.issue_key === 'string' ? row.issue_key.split('-')[0] : '');
        if (!recommendedKeySet.has(row.issue_key)) {
          recommendedKeySet.add(row.issue_key);
          recommendedKeyOrder.push(row.issue_key);
        }
        mentionsToPopulate.push({
          commentId: row.jira_comment_id,
          commentBody: row.body || '',
          commentCreatedAt: row.jira_created_at || new Date().toISOString(),
          issueKey: row.issue_key,
          issueId: issue?.id || row.issue_key,
          issueSummary: issue?.summary || row.issue_key,
          issueType: issue?.issue_type || 'task',
          projectKey,
          projectName: localProjectNameMap.get(projectKey) || projectKey || '',
          mentionerId: row.author_account_id || null,
          mentionerName: row.author_display_name || 'A teammate',
          mentionerAvatarUrl: row.author_avatar_url || undefined,
        });
      });
    }
  }

  // ── Recommended comments ──
  const commentsToPopulate: RecommendedComment[] = [];
  const watchedKeys = new Set<string>((jiraAssignedRaw as any[]).map((r: any) => r.issue_key).filter(Boolean));

  if (watchedKeys.size > 0 && userName && userName !== 'Unassigned') {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const watchedKeyList = [...watchedKeys].slice(0, 200);

    const { data: commentRows } = await supabase
      .from('jira_sync_comments')
      .select('id, jira_comment_id, issue_key, body, jira_created_at, author_account_id, author_display_name, author_avatar_url')
      .in('issue_key', watchedKeyList)
      .gte('jira_created_at', thirtyDaysAgo.toISOString())
      .order('jira_created_at', { ascending: false })
      .limit(50);

    const mentionIds = new Set(mentionsToPopulate.map(m => m.commentId));
    const filtered = (commentRows || []).filter((row: any) => {
      if (!row.jira_comment_id) return false;
      if (mentionIds.has(row.jira_comment_id)) return false;
      return !(row.author_display_name?.trim().toLowerCase() === userName.trim().toLowerCase());
    }).slice(0, 5);

    const commentIssueKeys = [...new Set(filtered.map((r: any) => r.issue_key).filter(Boolean))];
    const commentIssueByKey = new Map<string, any>();
    if (commentIssueKeys.length > 0) {
      const { data: issueRows } = await supabase
        .from('ph_issues')
        .select('id, issue_key, summary, issue_type, project_key')
        .in('issue_key', commentIssueKeys);
      (issueRows || []).forEach((r: any) => commentIssueByKey.set(r.issue_key, r));

      const missedKeys = commentIssueKeys.filter(k => !commentIssueByKey.has(k));
      if (missedKeys.length > 0) {
        const { data: catRows } = await supabase
          .from('catalyst_issues')
          .select('id, issue_key, title, issue_type')
          .in('issue_key', missedKeys);
        (catRows || []).forEach((r: any) => commentIssueByKey.set(r.issue_key, {
          id: r.id, issue_key: r.issue_key, summary: r.title, issue_type: r.issue_type,
          project_key: (r.issue_key || '').split('-')[0],
        }));
      }
    }

    filtered.forEach((row: any) => {
      const issue = commentIssueByKey.get(row.issue_key);
      const projectKey = issue?.project_key || (typeof row.issue_key === 'string' ? row.issue_key.split('-')[0] : '');
      if (!recommendedKeySet.has(row.issue_key)) {
        recommendedKeySet.add(row.issue_key);
        recommendedKeyOrder.push(row.issue_key);
      }
      commentsToPopulate.push({
        commentId: row.jira_comment_id,
        commentBody: row.body || '',
        commentCreatedAt: row.jira_created_at || new Date().toISOString(),
        issueKey: row.issue_key,
        issueId: issue?.id || row.issue_key,
        issueSummary: issue?.summary || row.issue_key,
        issueType: issue?.issue_type || 'task',
        projectKey,
        projectName: localProjectNameMap.get(projectKey) || projectKey || '',
        authorId: row.author_account_id || null,
        authorName: row.author_display_name || 'A teammate',
        authorAvatarUrl: row.author_avatar_url || undefined,
      });
    });
  }

  // Top assigned items feed the recommended set
  (jiraAssigned as any[]).slice(0, 10).forEach((r: any) => {
    if (!recommendedKeySet.has(r.issue_key)) {
      recommendedKeySet.add(r.issue_key);
      recommendedKeyOrder.push(r.issue_key);
    }
  });

  let recommendedItems: any[] = [];
  if (recommendedKeyOrder.length > 0) {
    const { data: recRaw } = await supabase
      .from('ph_issues')
      .select(SELECT_FIELDS)
      .in('issue_key', recommendedKeyOrder)
      .is('archived_at', null);
    const recByKey = new Map<string, any>(
      (recRaw || []).map((r: any) => [r.issue_key, { ...r, project_id: projectIdMap.get(r.project_key) || null }])
    );
    recommendedItems = recommendedKeyOrder.map(k => recByKey.get(k)).filter(Boolean);
  }

  // ── Starred items ──
  let starredData: any[] = [];
  let starredItemIds: string[] = [];

  if (stars && stars.length > 0) {
    const starredKeys = new Set(stars.map((s: any) => s.item_id));
    starredItemIds = [...starredKeys];
    const itemIds = stars.map((s: any) => s.item_id);

    const [{ data: starredIssuesRaw }, { data: starredPlannerTasks }] = await Promise.all([
      supabase.from('ph_issues').select(SELECT_FIELDS).in('issue_key', itemIds).is('archived_at', null).order('jira_updated_at', { ascending: false }),
      supabase.from('planner_tasks').select('task_key, title, priority, assignee_id, updated_at, created_at, status_id').in('task_key', itemIds).is('deleted_at', null),
    ]);

    const starredIssues = (starredIssuesRaw || []).map((r: any) => ({ ...r, project_id: projectIdMap.get(r.project_key) || null }));
    let starredPlannerMapped: any[] = [];
    if (starredPlannerTasks && starredPlannerTasks.length > 0) {
      const stIds = [...new Set(starredPlannerTasks.map((r: any) => r.status_id).filter(Boolean))];
      const { data: sts } = stIds.length > 0
        ? await supabase.from('planner_statuses').select('id, name').in('id', stIds)
        : { data: [] as any[] };
      const stMap = new Map((sts || []).map((s: any) => [s.id, s.name]));
      starredPlannerMapped = starredPlannerTasks.map((row: any) =>
        mapPlannerTaskToIssueRow({ ...row, assignee_name: 'Unassigned', status_name: stMap.get(row.status_id) || 'Backlog' })
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

  return {
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
  // selectedItemId/selectedItem/handleRowClick/closeDetailPanel removed
  // 2026-05-11: the only consumer was ForYouDetailPanel (now deleted).
  // ForYouPage routes all selections through useGlobalSearchStore.openDetail()
  // which mounts the canonical CatalystDetailRouter via CatalystShell.

  const { user: authUser } = useAuth();
  const queryClient = useQueryClient();

  // Step 1: User mapping — very stable (jira account IDs change almost never)
  const mappingKey = ['for-you-user-mapping', authUser?.id];
  const { data: userMapping } = useQuery({
    queryKey: mappingKey,
    queryFn: () => fetchUserMapping(authUser!.id),
    // Don't start until auth is fully loaded AND authUser is set
    enabled: !!authUser?.id && !authLoading,
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  const jiraAccountIds = useMemo(() => userMapping?.jiraAccountIds ?? [], [userMapping]);
  const userProfile = userMapping?.userProfile ?? null;
  const userName = userProfile
    ? `${userProfile.firstName} ${userProfile.lastName}`.trim()
    : 'Unassigned';

  // Step 2: Main data — wait for mapping to resolve before firing
  const rawDataKey = useMemo(
    () => ['for-you-data', authUser?.id ?? '', jiraAccountIds.join(',')],
    [authUser?.id, jiraAccountIds],
  );
  const { data: rawData, isPending: dataPending } = useQuery({
    queryKey: rawDataKey,
    queryFn: () => fetchForYouRawData(authUser!.id, jiraAccountIds, userName),
    // Wait until: (1) auth is fully loaded, (2) user mapping has resolved
    // This prevents wasted fetches while auth is initializing
    enabled: !!authUser?.id && userMapping !== undefined && !authLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes — issues change more often than mapping
  });

  const isLoading = dataPending;

  // Reconstruct Maps from JSON-safe serialized arrays
  const projectNameMap = useMemo(() => new Map<string, string>(rawData?.projectNameMap ?? []), [rawData]);
  const projectAvatarMap = useMemo(() => new Map<string, string | null>(rawData?.projectAvatarMap ?? []), [rawData]);
  const attachmentCounts = useMemo(() => new Map<string, number>(rawData?.attachmentCounts ?? []), [rawData]);
  const starredItems = useMemo(() => new Set<string>(rawData?.starredItemIds ?? []), [rawData]);

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
      mapIssueToWorkItem(row, starredItems, projectNameMap, attachmentCounts, projectAvatarMap)
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

  /**
   * Record a view. Upserts into user_viewed_items and updates the cached
   * viewedItems list in place — no full refetch needed.
   */
  const trackView = useCallback(async (itemId: string, itemType: string = 'ph_issue') => {
    if (!authUser?.id || !itemId) return;

    const now = new Date().toISOString();

    // Optimistic: hoist the item to the top of viewedItems in the cache
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

      // Re-hydrate viewedItems from DB and update cache
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
          ? supabase.from('planner_tasks')
              .select('task_key, title, priority, assignee_id, updated_at, created_at, status_id, workstream_id, reporter_id')
              .in('task_key', plannerKeys)
              .is('deleted_at', null)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const viewedAtByKey = new Map<string, string>(refreshed.map(r => [r.item_id, r.last_viewed_at]));
      const allViewed = [...(viewedPhRaw.data || []), ...(viewedPlannerRaw.data || []).map((row: any) =>
        mapPlannerTaskToIssueRow({ ...row, assignee_name: 'You', status_name: 'Backlog', workstream_name: null })
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
  }, [authUser?.id, queryClient, rawDataKey]);

  const toggleStar = useCallback(async (itemId: string) => {
    if (!authUser?.id) return;
    const isCurrentlyStarred = starredItems.has(itemId);

    // Optimistic update
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
        const { error } = await supabase.from('user_starred_items')
          .insert({ user_id: authUser.id, item_id: itemId, item_type: 'ph_issue' });
        if (error) throw error;
        // Add the issue row to starredData from the assigned/worked cache
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
      // Rollback: invalidate the query so it refetches fresh state
      queryClient.invalidateQueries({ queryKey: rawDataKey });
    }
  }, [authUser?.id, starredItems, queryClient, rawDataKey]);

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
