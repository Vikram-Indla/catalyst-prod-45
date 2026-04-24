/**
 * For You Page Data Hook - Real data from Jira sync (ph_issues)
 * MARAM V3.1 — ring-fenced to For You page
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';

export type WorkMode = 'OPS' | 'DEL' | 'TSK';
export type WorkGroup = 'YESTERDAY' | 'THIS_WEEK' | 'EARLIER';
/**
 * Catalyst "For You" tab order (as of April 2026):
 *   AI Recap | Recommended | Assigned to me | Starred | Worked on | Viewed | Ageing
 *
 * AI Recap and Ageing are Catalyst extensions to the Jira "For You" strip —
 * they were previously tabs inside the Notifications drawer and were relocated
 * here so the For You page becomes a single pane of glass for personal work.
 * Data wiring for both is unchanged (useAiRecap / useAgeingItems hooks
 * continue to drive them). See context pack: for-you-v2-ai-recap-ageing-migration.
 */
export type TabType =
  | 'ai-recap'
  | 'recommended'
  | 'assigned'
  | 'starred'
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
  /**
   * Optional URL to the project's branded avatar (sourced from
   * public.projects.avatar_url). When null, clients should fall back to the
   * Atlaskit hashed-initials tile — same pattern Jira uses.
   */
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
  // New fields for detail panel
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
}

/**
 * RecommendedMention — a single row in the "Reply to mentions" feed that
 * sits at the top of the Recommended tab.
 *
 * Jira parity (from /jira-compare 2026-04-24, RecommendedPanel iteration 2):
 *   "<Mentioner> mentioned you on <issueTypeIcon> <issueTitle>"
 *   + comment body preview
 *   + circular 32px avatar of the mentioner (NOT square — square is the
 *     project card treatment)
 *   + timestamp (relative)
 *
 * We populate this from `ph_comments` rows that ILIKE-match the user's
 * first name, joined to `profiles` for the mentioner's display name and
 * avatar URL, and to `ph_issues` for the target issue summary + type.
 *
 * The commentId is stable so React keys stay correct across refetches,
 * and the issueKey doubles as the route target when the row is clicked.
 */
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

/**
 * RecommendedComment — a single row in the "Reply to comments" feed that sits
 * immediately under "Reply to mentions" on the Recommended tab.
 *
 * Jira parity (from /jira-compare 2026-04-24 DOM probe):
 *   "<Author> commented on <issueType> <issueTitle>"
 *   + comment body preview (with @-mention chips inline, rendered client-side)
 *   + project name · ISSUE-KEY · relative timestamp
 *   + "Leave a reply / Suggest a reply" footer
 *
 * Distinguished from RecommendedMention by intent: these are comments on work
 * items the user is assigned / reporting / has been watching, but the comment
 * does NOT @-mention the user explicitly. It's a "hey FYI something happened
 * on your ticket" signal.
 *
 * Populated from `jira_sync_comments` filtered to issues in the user's
 * assigned/reporting set, last ~30 days, excluding self-authored. The
 * commentId is stable so React keys stay correct across refetches.
 */
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

/**
 * Project — minimal shape used by the "Recommended projects" strip on the
 * For You page. Sourced from `public.projects` scoped to the caller's project
 * membership (RLS). Stable across tab switches so the strip doesn't dance.
 */
export interface Project {
  id: string;
  key: string;
  name: string;
  avatar_url?: string | null;
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

// Helper: compute time group based on jira_updated_at
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

// Helper: format relative time
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

// Map planner_tasks row to a ph_issues-compatible shape
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

// Map native stories table row to ph_issues-compatible shape
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

// Map native features table row to ph_issues-compatible shape
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

// Map native epics table row to ph_issues-compatible shape
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

// Map native incidents table row to ph_issues-compatible shape
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
  ProductHub: 'Product',
  ProjectHub: 'Project',
  ReleaseHub: 'Release',
  TestHub: 'Test',
  IncidentHub: 'Incident',
  TaskHub: 'Task',
  StrategyHub: 'Strategy',
  PlanHub: 'Plan',
};

// Map Jira priority string to numeric level (1-5)
function priorityToLevel(priority: string): number {
  const p = (priority || '').toLowerCase();
  if (p === 'lowest') return 1;
  if (p === 'low') return 2;
  if (p === 'medium') return 3;
  if (p === 'high') return 4;
  if (p === 'highest') return 5;
  return 3; // default medium
}

// Map ph_issues row to WorkItem
function mapIssueToWorkItem(
  row: any,
  starredSet: Set<string>,
  projectNameMap: Map<string, string>,
  attachmentCounts?: Map<string, number>,
  projectAvatarMap?: Map<string, string | null>,
): WorkItem {
  const assigneeName = row.assignee_display_name || 'Unassigned';
  const projectKey = row.project_key || '';
  const issueType = row.issue_type || 'Task';
  const hub = inferHub(issueType, projectKey);
  const priority = row.priority || 'Medium';

  // Parse labels, fix_versions, components from JSON
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

  const resolvedAvatar = projectAvatarMap?.get(projectKey) ?? null;

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
    createdAt: row.jira_created_at ? new Date(row.jira_created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-',
    assignee: {
      id: row.assignee_account_id || 'none',
      name: assigneeName,
      initials: getInitials(assigneeName),
      avatarColor: '#6b7280',
    },
    reporter: row.reporter_display_name || undefined,
    group: row.jira_updated_at ? computeGroup(row.jira_updated_at) : 'EARLIER',
    starred: starredSet.has(row.issue_key),
    attachmentCount: attachmentCounts?.get(row.issue_key) ?? 0,
  };
}

const SELECT_FIELDS = 'id, issue_key, project_key, project_name, issue_type, summary, status, status_category, assignee_account_id, assignee_display_name, reporter_display_name, priority, jira_updated_at, jira_created_at, parent_key, parent_summary, sprint_name, story_points, labels, fix_versions, components, description_text, last_synced_at';

export function useForYouData() {
  const [activeMode, setActiveMode] = useState<ModeFilter>('all');
  // Default tab mirrors Jira For You: Recommended. Persistence to localStorage
  // is handled by the page shell so refresh stays on the last-viewed tab.
  const [activeTab, setActiveTab] = useState<TabType>('recommended');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ field: string; order: 'asc' | 'desc' }>({ field: 'updated', order: 'desc' });
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
  const [starredItems, setStarredItems] = useState<Set<string>>(new Set());
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const [workedOnItems, setWorkedOnItems] = useState<any[]>([]);
  const [assignedItems, setAssignedItems] = useState<any[]>([]);
  const [starredData, setStarredData] = useState<any[]>([]);
  const [recommendedItems, setRecommendedItems] = useState<any[]>([]);
  const [recommendedMentions, setRecommendedMentions] = useState<RecommendedMention[]>([]);
  const [recommendedComments, setRecommendedComments] = useState<RecommendedComment[]>([]);
  const [viewedItems, setViewedItems] = useState<any[]>([]);
  const [attachmentCounts, setAttachmentCounts] = useState<Map<string, number>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [jiraAccountIds, setJiraAccountIds] = useState<string[]>([]);
  const [projectNameMap, setProjectNameMap] = useState<Map<string, string>>(new Map());
  // project_key → avatar_url lookup, used by the Recommended projects strip
  // AND by every WorkItem so cards and rows resolve the same avatar source.
  const [projectAvatarMap, setProjectAvatarMap] = useState<Map<string, string | null>>(new Map());
  // Account-scoped project list — STABLE across tab switches. This is what
  // the "Recommended projects" strip consumes, so it doesn't re-derive (and
  // rearrange) every time the active For You tab changes.
  const [allUserProjects, setAllUserProjects] = useState<Project[]>([]);

  const { user: authUser } = useAuth();
  const [userProfile, setUserProfile] = useState<{ firstName: string; lastName: string } | null>(null);

  // 1. Fetch profile + Jira mapping
  useEffect(() => {
    async function fetchUserMapping() {
      if (!authUser?.id) return;
      const { data: profileData } = await supabase.from('profiles').select('full_name').eq('id', authUser.id).single();
      if (profileData?.full_name) {
        const parts = profileData.full_name.split(' ');
        setUserProfile({ firstName: parts[0] || 'there', lastName: parts.slice(1).join(' ') || '' });
      }
      const { data: mappings } = await supabase.from('ph_user_mapping').select('jira_account_id').eq('catalyst_profile_id', authUser.id).eq('is_mapped', true);
      if (mappings && mappings.length > 0) {
        setJiraAccountIds(mappings.map(m => m.jira_account_id).filter(Boolean));
      } else if (profileData?.full_name) {
        const { data: nameMatches } = await supabase.from('ph_user_mapping').select('jira_account_id').ilike('jira_display_name', `%${profileData.full_name}%`).eq('is_mapped', true);
        if (nameMatches && nameMatches.length > 0) {
          setJiraAccountIds(nameMatches.map(m => m.jira_account_id).filter(Boolean));
        } else {
          setJiraAccountIds([]);
        }
      }
    }
    fetchUserMapping();
  }, [authUser?.id]);

  // 2. Fetch issues
  useEffect(() => {
    async function fetchIssues() {
      if (!authUser?.id) { setIsLoading(false); return; }
      setIsLoading(true);
      try {
        // ── Wave 1: All independent lookups in parallel ──
        const [
          { data: jiraProjects },
          { data: catalystProjects },
          { data: plannerAssigned },
          { data: userProfileData },
          { data: nativeStories },
          { data: nativeFeatures },
          { data: nativeEpics },
          { data: nativeIncidents },
          { data: stars },
          { data: attachmentRows },
        ] = await Promise.all([
          supabase.from('ph_jira_projects').select('project_key, name'),
          // `avatar_url` feeds the Recommended projects strip AND every
          // WorkItem's `projectAvatarUrl`. `name` so the strip has a stable
          // display string regardless of which tab is active.
          supabase.from('projects').select('id, key, name, avatar_url'),
          supabase.from('planner_tasks').select('task_key, title, priority, assignee_id, updated_at, created_at, status_id, workstream_id, reporter_id').eq('assignee_id', authUser.id).is('deleted_at', null).order('updated_at', { ascending: false }).limit(200),
          supabase.from('profiles').select('id, full_name').eq('id', authUser.id).single(),
          supabase.from('stories').select('id, story_key, title, name, status, state, priority, assignee_id, story_points, estimate_points, tags, description, updated_at, created_at, feature:features(id, name, display_id, project_id, project:projects(id, name, key))').eq('assignee_id', authUser.id).is('deleted_at', null).order('updated_at', { ascending: false }).limit(200),
          supabase.from('features').select('id, display_id, name, status, priority, assignee_id, estimate_points, labels, components, description, updated_at, created_at, project_id, project:projects(id, name, key), epic:epics(id, name, epic_key)').eq('assignee_id', authUser.id).is('deleted_at', null).order('updated_at', { ascending: false }).limit(100),
          supabase.from('epics').select('id, epic_key, name, status, state, assignee_id, owner_id, points_estimate, tags, description, updated_at, created_at').or(`assignee_id.eq.${authUser.id},owner_id.eq.${authUser.id}`).is('deleted_at', null).order('updated_at', { ascending: false }).limit(100),
          supabase.from('incidents').select('id, incident_key, title, status, severity, priority, assignee_id, reporter_name, description, updated_at, created_at, project_id, project:projects!incidents_project_id_fkey(id, name, key)').eq('assignee_id', authUser.id).is('deleted_at', null).order('updated_at', { ascending: false }).limit(100),
          supabase.from('user_starred_items').select('item_id, item_type').eq('user_id', authUser.id),
          supabase.from('ph_issue_attachments').select('issue_key'),
        ]);

        // Build attachment count map (issue_key → count)
        const attMap = new Map<string, number>();
        (attachmentRows || []).forEach((r: any) => {
          attMap.set(r.issue_key, (attMap.get(r.issue_key) || 0) + 1);
        });
        setAttachmentCounts(attMap);

        // Build project maps
        const projectIdMap = new Map<string, string>();
        const localProjectAvatarMap = new Map<string, string | null>();
        const stableProjects: Project[] = [];
        if (catalystProjects) {
          (catalystProjects as Array<{ id: string; key: string; name?: string | null; avatar_url?: string | null }>).forEach(p => {
            if (p.key) {
              projectIdMap.set(p.key, p.id);
              localProjectAvatarMap.set(p.key, p.avatar_url ?? null);
            }
            stableProjects.push({
              id: p.id,
              key: p.key,
              name: p.name || p.key,
              avatar_url: p.avatar_url ?? null,
            });
          });
          setProjectAvatarMap(localProjectAvatarMap);
          // Stable across tab switches — drives the Recommended projects strip.
          setAllUserProjects(
            [...stableProjects].sort((a, b) => a.name.localeCompare(b.name))
          );
        }
        // Local copy of the project-key → name lookup so downstream code
        // in this same tick can resolve names before state propagates.
        const localProjectNameMap = new Map<string, string>();
        if (jiraProjects) {
          jiraProjects.forEach(p => localProjectNameMap.set(p.project_key, p.name));
          setProjectNameMap(localProjectNameMap);
        }

        const userName = userProfileData?.full_name || 'Unassigned';

        // ── Wave 2: Dependent lookups in parallel ──
        const plannerRows = plannerAssigned || [];
        const statusIds = [...new Set(plannerRows.map(r => r.status_id).filter(Boolean))];
        const wsIds = [...new Set(plannerRows.map(r => r.workstream_id).filter(Boolean))];

        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        const wave2Promises: PromiseLike<any>[] = [
          statusIds.length > 0 ? supabase.from('planner_statuses').select('id, name').in('id', statusIds) : Promise.resolve({ data: [] }),
          wsIds.length > 0 ? supabase.from('planner_workstreams').select('id, name').in('id', wsIds) : Promise.resolve({ data: [] }),
        ];

        // Jira queries (only if user has Jira mapping)
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
        const statusMap = new Map((statuses).map((s: any) => [s.id, s.name]));
        const wsMap = new Map((workstreams).map((w: any) => [w.id, w.name]));
        const plannerMapped = plannerRows.map(row => mapPlannerTaskToIssueRow({ ...row, assignee_name: userName, status_name: statusMap.get(row.status_id) || 'Backlog', workstream_name: wsMap.get(row.workstream_id) || null }));

        // Map Jira issues
        const jiraAssigned = jiraAssignedRaw.map((r: any) => ({ ...r, project_id: projectIdMap.get(r.project_key) || null }));
        const jiraWorked = jiraWorkedRaw.map((r: any) => ({ ...r, project_id: projectIdMap.get(r.project_key) || null }));

        // Map native items
        const nativeStoryRows = (nativeStories || []).map(s => {
          const projName = (s as any).feature?.project?.name || (s as any).feature?.name || 'Backlog';
          const projKey = (s as any).feature?.project?.key || (s as any).feature?.display_id || 'BKL';
          return mapStoryToIssueRow(s, userName, projName, projKey);
        });
        const nativeFeatureRows = (nativeFeatures || []).map(f => {
          const projName = (f as any).project?.name || 'Portfolio';
          const projKey = (f as any).project?.key || 'PRT';
          return mapFeatureToIssueRow(f, userName, projName, projKey);
        });
        const nativeEpicRows = (nativeEpics || []).map(e => mapEpicToIssueRow(e, userName));
        const nativeIncidentRows = (nativeIncidents || []).map(inc => {
          const projName = (inc as any).project?.name || 'Operations';
          const projKey = (inc as any).project?.key || 'OPS';
          return mapIncidentToIssueRow(inc, userName, projName, projKey);
        });

        const allNativeItems = [...nativeStoryRows, ...nativeFeatureRows, ...nativeEpicRows, ...nativeIncidentRows];

        // Deduplicate: Jira-synced issues take priority
        const jiraKeys = new Set([...jiraAssigned, ...jiraWorked].map((r: any) => r.issue_key));
        const dedupedNativeItems = allNativeItems.filter(item => !jiraKeys.has(item.issue_key));

        setAssignedItems([...jiraAssigned, ...plannerMapped, ...dedupedNativeItems]);
        const recentPlannerTasks = plannerMapped.filter(t => t.jira_updated_at && new Date(t.jira_updated_at) >= ninetyDaysAgo);
        const recentNativeItems = dedupedNativeItems.filter(item => item.jira_updated_at && new Date(item.jira_updated_at) >= ninetyDaysAgo);
        setWorkedOnItems([...jiraWorked, ...recentPlannerTasks, ...recentNativeItems]);

        // ── Recently viewed (drives "Viewed" tab) ──
        //
        // user_viewed_items holds (user, item_id, item_type, last_viewed_at).
        // We hydrate the actual issue rows in a second query so the Viewed
        // tab can render the same ForYouRow shape as every other tab.
        //
        // We split by item_type — ph_issue keys go to ph_issues, planner
        // task_keys to planner_tasks — and skip other types for now.
        const { data: viewedRowsRaw } = await (supabase as any)
          .from('user_viewed_items')
          .select('item_id, item_type, last_viewed_at')
          .eq('user_id', authUser.id)
          .order('last_viewed_at', { ascending: false })
          .limit(100);
        const viewedRows = viewedRowsRaw as Array<{ item_id: string; item_type: string; last_viewed_at: string }> | null;

        if (viewedRows && viewedRows.length > 0) {
          const phKeys = viewedRows.filter(r => r.item_type === 'ph_issue').map(r => r.item_id);
          const plannerKeys = viewedRows.filter(r => r.item_type === 'task').map(r => r.item_id);

          const [viewedPhRaw, viewedPlannerRaw] = await Promise.all([
            phKeys.length > 0
              ? supabase.from('ph_issues').select(SELECT_FIELDS).in('issue_key', phKeys).is('archived_at', null)
              : Promise.resolve({ data: [] as any[] }),
            plannerKeys.length > 0
              ? supabase.from('planner_tasks').select('task_key, title, priority, assignee_id, updated_at, created_at, status_id, workstream_id, reporter_id').in('task_key', plannerKeys).is('deleted_at', null)
              : Promise.resolve({ data: [] as any[] }),
          ]);

          const viewedPh = (viewedPhRaw.data || []).map((r: any) => ({
            ...r,
            project_id: projectIdMap.get(r.project_key) || null,
          }));
          const viewedPlanner = (viewedPlannerRaw.data || []).map((row: any) =>
            mapPlannerTaskToIssueRow({
              ...row,
              assignee_name: userName,
              status_name: 'Backlog',
              workstream_name: null,
            })
          );

          // Preserve the user_viewed_items ordering (most-recent-first).
          const viewedAtByKey = new Map<string, string>(viewedRows.map(r => [r.item_id, r.last_viewed_at]));
          const allViewed = [...viewedPh, ...viewedPlanner]
            .map(r => ({ ...r, _last_viewed_at: viewedAtByKey.get(r.issue_key) || null }))
            .filter(r => r._last_viewed_at) // drop hydration misses
            // Overwrite jira_updated_at with last_viewed_at so grouping uses the VIEW time.
            .map(r => ({ ...r, jira_updated_at: r._last_viewed_at || r.jira_updated_at }))
            .sort((a, b) => new Date(b._last_viewed_at).getTime() - new Date(a._last_viewed_at).getTime());
          setViewedItems(allViewed);
        } else {
          setViewedItems([]);
        }

        // ── Recommended (drives "Recommended" tab) ──
        //
        // Jira's Recommended tab is primarily "mentions + team activity on
        // work you're close to". We don't have a first-class mentions table
        // yet, so we approximate:
        //
        //   (a) issues where a teammate posted a comment body that @-mentions
        //       the current user by first name (best-effort ILIKE),
        //   (b) union recent activity on work items in the assignedItems set
        //       (already fetched above) — a user's own assigned work is a
        //       very strong "recommended" signal.
        //
        // (a) is a placeholder until a proper ph_comment_mentions join table
        // lands; (b) guarantees the tab is never empty for real users.
        const recommendedKeyOrder: string[] = [];
        const recommendedKeySet = new Set<string>();

        // (a) Comment-mention heuristic — sourced from jira_sync_comments
        //
        // RCA (2026-04-24): ph_comments is a broken mirror (1 row across the
        // whole DB vs. jira_sync_comments' 10,636). The wh-jira-sync edge
        // function's ph_comments upsert fails silently on a constraint we
        // haven't tracked down yet. Meanwhile, jira_sync_comments is the
        // live-synced source of truth — it's what the Activity panel reads
        // today and it's what we read here. When the ph_comments mirror is
        // fixed we can switch back (or keep jira_sync_comments — it has
        // everything we need without the extra join).
        //
        // Match strategy:
        //   1. "@{firstName}" — modern Jira cloud comments with proper ADF
        //      mention nodes (preserved once wh-jira-sync's adfToPlainText
        //      stops dropping them).
        //   2. "{firstName} {lastName}" — legacy comments where the ADF
        //      flattener dropped the @ but left the display name as plain
        //      text (we observed this on Hadeel Alrdaddi's 2025 comments).
        //
        // We run both matches, merge by jira_comment_id, and drop any
        // comment the current user authored.
        const mentionsToPopulate: RecommendedMention[] = [];
        if (userName && userName !== 'Unassigned') {
          const parts = userName.trim().split(/\s+/);
          const firstName = parts[0];
          const lastName = parts.length > 1 ? parts[parts.length - 1] : '';

          if (firstName && firstName.length >= 2) {
            // Two parallel ILIKE queries — one for modern `@name` form,
            // one for legacy plain-text name form. We union client-side
            // to keep each query simple and indexable.
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

            // Merge + dedupe by jira_comment_id, exclude self-authored.
            const mergedById = new Map<string, any>();
            [...(modernQ.data || []), ...(legacyQ.data || [])].forEach((row: any) => {
              if (!row.jira_comment_id) return;
              // Don't surface the user's own comments as "mentions of me"
              if (
                row.author_display_name &&
                row.author_display_name.trim().toLowerCase() === userName.trim().toLowerCase()
              ) return;
              if (!mergedById.has(row.jira_comment_id)) mergedById.set(row.jira_comment_id, row);
            });

            // Order by recency (most-recent first) and cap at 5 for the feed.
            const merged = [...mergedById.values()]
              .sort((a, b) => new Date(b.jira_created_at || 0).getTime() - new Date(a.jira_created_at || 0).getTime())
              .slice(0, 5);

            // Enrich with ph_issues metadata (summary, issue_type) via a
            // single follow-up query keyed on issue_key.
            //
            // Two-tier enrichment — ph_issues first, then catalyst_issues for
            // any keys ph_issues missed. RCA (2026-04-24, SIMP-1699): the
            // wh-jira-sync mirror doesn't cover every project (SIMP in
            // particular), so mentions from those projects fell through the
            // `issue?.issue_type || 'task'` default below and rendered as the
            // blue-check task icon even though SIMP-1699 is a "QA Bug".
            // catalyst_issues is the Catalyst-native mirror that DOES have
            // those rows — use it as the second-chance lookup so the icon
            // normalizer can route to the correct primitive (bug → red asterisk).
            const issueKeys = [...new Set(merged.map(r => r.issue_key).filter(Boolean))];
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
                  id: r.id,
                  issue_key: r.issue_key,
                  summary: r.title,                                   // catalyst_issues uses `title`
                  issue_type: r.issue_type,
                  project_key: (r.issue_key || '').split('-')[0],
                }));
                // Diagnostic — make icon misses visible in the console. When
                // BOTH mirrors (ph_issues, catalyst_issues) lack a row, the
                // mention falls through to the 'task' default and renders
                // the blue-check icon. Surfacing the gap here lets us decide
                // whether to (a) extend the sync to cover the project or
                // (b) add a real-time Jira API fallback.
                const stillMissing = missedKeys.filter(k => !issueByKey.has(k));
                if (stillMissing.length > 0) {
                  console.warn(
                    '[useForYouData] mentions enrichment miss (icon may default to task):',
                    stillMissing,
                  );
                } else if (typeof console !== 'undefined' && console.info) {
                  console.info(
                    '[useForYouData] mentions enrichment hit via catalyst_issues:',
                    (catRows || []).map((r: any) => ({ key: r.issue_key, type: r.issue_type })),
                  );
                }
              }
            }

            // Permissive enrichment — when ph_issues has the key, use its
            // rich metadata. When it doesn't (older projects not fully
            // indexed yet), fall back to the raw issue_key + best-effort
            // project key split. This keeps the mentions feed populated for
            // 2025-era comments like Hadeel Alrdaddi's SIMP-1706/MDT-384
            // which aren't in ph_issues but are what the user actually
            // needs to see in the "Reply to mentions" card.
            merged.forEach((row: any) => {
              if (!row.issue_key) return;
              const issue = issueByKey.get(row.issue_key);
              const projectKey = issue?.project_key
                || (typeof row.issue_key === 'string' ? row.issue_key.split('-')[0] : '');
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
        setRecommendedMentions(mentionsToPopulate);

        // ── Recommended — "Reply to comments" feed ──
        //
        // Jira parity: the Recommended tab has TWO stacked cards —
        //   1. "Reply to mentions"  (you were @-mentioned)
        //   2. "Reply to comments"  (someone commented on work you care about
        //                            but didn't explicitly @-mention you)
        //
        // Population rule for (2): comments on work items in the user's
        // assigned/reporting set, within the last 30 days, excluding
        // self-authored and excluding anything already surfaced in (1). We
        // cap at 5 newest.
        //
        // Data source: jira_sync_comments (10k+ rows, live-synced). Same
        // source of truth as (1) — we only change the filter predicate.
        const commentsToPopulate: RecommendedComment[] = [];
        {
          // The "care about" set = user's assigned Jira issues
          // + their reporting set (derived from userProfileData).
          const watchedKeys = new Set<string>(
            (jiraAssignedRaw as any[])
              .map((r: any) => r.issue_key)
              .filter(Boolean)
          );

          if (watchedKeys.size > 0 && userName && userName !== 'Unassigned') {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            // Cap the IN() clause at 200 keys — more than enough headroom
            // for "Reply to comments" (we display 5) and stays well under
            // PostgREST's URL-length ceiling.
            const watchedKeyList = [...watchedKeys].slice(0, 200);

            const { data: commentRows } = await supabase
              .from('jira_sync_comments')
              .select('id, jira_comment_id, issue_key, body, jira_created_at, author_account_id, author_display_name, author_avatar_url')
              .in('issue_key', watchedKeyList)
              .gte('jira_created_at', thirtyDaysAgo.toISOString())
              .order('jira_created_at', { ascending: false })
              .limit(50);

            // Exclude self-authored AND exclude anything already in
            // mentionsToPopulate (dedupe across the two cards).
            const mentionIds = new Set(mentionsToPopulate.map(m => m.commentId));
            const filtered = (commentRows || []).filter((row: any) => {
              if (!row.jira_comment_id) return false;
              if (mentionIds.has(row.jira_comment_id)) return false;
              const self = row.author_display_name
                && row.author_display_name.trim().toLowerCase() === userName.trim().toLowerCase();
              return !self;
            }).slice(0, 5);

            // Enrich with ph_issues summary/issue_type — reuse issueByKey map
            // where available; otherwise query fresh.
            //
            // Two-tier enrichment mirrors the mentions block above. SIMP and
            // other projects not covered by wh-jira-sync are absent from
            // ph_issues but DO live in catalyst_issues — try both before the
            // icon normalizer falls back to 'task'. See RCA note in the
            // mentions enrichment for the full chain.
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
                  id: r.id,
                  issue_key: r.issue_key,
                  summary: r.title,
                  issue_type: r.issue_type,
                  project_key: (r.issue_key || '').split('-')[0],
                }));
              }
            }

            filtered.forEach((row: any) => {
              const issue = commentIssueByKey.get(row.issue_key);
              const projectKey = issue?.project_key
                || (typeof row.issue_key === 'string' ? row.issue_key.split('-')[0] : '');
              // Thread this key into the recommendedKeyOrder so the detail
              // modal can resolve the WorkItem when the card is clicked.
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
        }
        setRecommendedComments(commentsToPopulate);

        // (b) Top of assigned queue — "you should look at this next"
        (jiraAssigned as any[]).slice(0, 10).forEach((r: any) => {
          if (!recommendedKeySet.has(r.issue_key)) {
            recommendedKeySet.add(r.issue_key);
            recommendedKeyOrder.push(r.issue_key);
          }
        });

        if (recommendedKeyOrder.length > 0) {
          const { data: recRaw } = await supabase
            .from('ph_issues')
            .select(SELECT_FIELDS)
            .in('issue_key', recommendedKeyOrder)
            .is('archived_at', null);

          const recByKey = new Map<string, any>((recRaw || []).map((r: any) => [r.issue_key, { ...r, project_id: projectIdMap.get(r.project_key) || null }]));
          setRecommendedItems(recommendedKeyOrder.map(k => recByKey.get(k)).filter(Boolean));
        } else {
          setRecommendedItems([]);
        }

        // ── Starred items (parallel) ──
        // Cross-source contract (April 2026): "Starred" returns every item
        // the user has starred regardless of origin system. The star itself
        // is always recorded in `user_starred_items` (Catalyst-owned), but
        // the referenced `item_id` may point at either:
        //   • a Jira-synced row in `ph_issues` (source='jira' or 'catalyst'),
        //   • a Catalyst-native row in `planner_tasks`, or
        //   • a native item surfaced through `allNativeItems`.
        // We fan out across all three tables and merge the results — any
        // starred issue_key that exists in Jira comes back with its full
        // Jira metadata intact (summary, status, assignee, etc.). No
        // server-side Jira favourite-sync is required for this to work:
        // because Catalyst mirrors the Jira issue in ph_issues, starring it
        // in Catalyst is semantically identical to marking it a favourite
        // on the Jira side from the user's point of view.
        if (stars && stars.length > 0) {
          const starredKeys = new Set(stars.map(s => s.item_id));
          setStarredItems(starredKeys as any);
          const itemIds = stars.map(s => s.item_id);

          const [{ data: starredIssuesRaw }, { data: starredPlannerTasks }] = await Promise.all([
            supabase.from('ph_issues').select(SELECT_FIELDS).in('issue_key', itemIds).is('archived_at', null).order('jira_updated_at', { ascending: false }),
            supabase.from('planner_tasks').select('task_key, title, priority, assignee_id, updated_at, created_at, status_id').in('task_key', itemIds).is('deleted_at', null),
          ]);

          const starredIssues = (starredIssuesRaw || []).map((r: any) => ({ ...r, project_id: projectIdMap.get(r.project_key) || null }));
          let starredPlannerMapped: any[] = [];
          if (starredPlannerTasks && starredPlannerTasks.length > 0) {
            const stIds = [...new Set(starredPlannerTasks.map(r => r.status_id).filter(Boolean))];
            const { data: sts } = stIds.length > 0 ? await supabase.from('planner_statuses').select('id, name').in('id', stIds) : { data: [] };
            const stMap = new Map((sts || []).map(s => [s.id, s.name]));
            starredPlannerMapped = starredPlannerTasks.map(row => mapPlannerTaskToIssueRow({ ...row, assignee_name: 'Unassigned', status_name: stMap.get(row.status_id) || 'Backlog' }));
          }
          const starredNativeItems = allNativeItems.filter(item => starredKeys.has(item.issue_key));
          const existingStarredKeys = new Set([...starredIssues.map((r: any) => r.issue_key), ...starredPlannerMapped.map(r => r.issue_key)]);
          const dedupedStarredNative = starredNativeItems.filter(item => !existingStarredKeys.has(item.issue_key));
          setStarredData([...starredIssues, ...starredPlannerMapped, ...dedupedStarredNative]);
        }
      } catch (err) {
        console.error('Error fetching ForYou data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchIssues();
  }, [authUser?.id, jiraAccountIds]);

  const user = { id: authUser?.id || 'current-user', firstName: userProfile?.firstName || 'there', lastName: userProfile?.lastName || '' };

  const sourceItems = useMemo(() => {
    switch (activeTab) {
      case 'recommended': return recommendedItems;
      case 'assigned':    return assignedItems;
      case 'starred':     return starredData;
      case 'viewed':      return viewedItems;
      // AI Recap + Ageing panels own their own data pipelines and render
      // without the shared row-based pagination, so return an empty list
      // here — the page shell skips the Load-more sentinel when the active
      // tab is one of these.
      case 'ai-recap':    return [];
      case 'ageing':      return [];
      case 'worked':
      default:            return workedOnItems;
    }
  }, [activeTab, workedOnItems, assignedItems, starredData, recommendedItems, viewedItems]);

  const filteredItems = useMemo(() => {
    let items = sourceItems.map(row => mapIssueToWorkItem(row, starredItems, projectNameMap, attachmentCounts, projectAvatarMap));
    if (activeMode !== 'all') items = items.filter(item => item.mode.toLowerCase() === activeMode);
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item => item.key.toLowerCase().includes(query) || item.summary.toLowerCase().includes(query));
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
      return items.filter(row => inferMode(row.project_key, row.issue_type).toLowerCase() === activeMode);
    };
    return {
      // AI Recap + Ageing are first-class tabs on the For You strip but
      // their counts are owned by their own hooks (useAiRecap / useAgeingCount)
      // rendered alongside the tab label in ForYouTabs.tsx. We expose 0 here
      // purely to satisfy the Record<TabType, number> shape.
      'ai-recap':  0,
      recommended: filterByMode(recommendedItems).length,
      assigned:    filterByMode(assignedItems).length,
      starred:     filterByMode(starredData).length,
      worked:      filterByMode(workedOnItems).length,
      viewed:      filterByMode(viewedItems).length,
      ageing:      0,
    };
  }, [workedOnItems, assignedItems, starredData, recommendedItems, viewedItems, activeMode]);

  // Hub stats from current filtered items
  const hubStats = useMemo(() => {
    const stats: Record<string, number> = {};
    filteredItems.forEach(item => {
      stats[item.hubLabel] = (stats[item.hubLabel] || 0) + 1;
    });
    const projects = new Set(filteredItems.map(i => i.project));
    const reporters = new Set(filteredItems.map(i => i.reporter || i.assignee.name));
    return { hubCounts: stats, projectCount: projects.size, reporterCount: reporters.size };
  }, [filteredItems]);

  const aiData = useMemo(() => ({ criticalCount: 0, priorityItem: undefined, nextItems: [] as AISuggestion[], suggestions: [] as AISuggestion[] }), []);
  const performanceStats: PerformanceStats = { closed: 0, ops: 0, del: 0, pln: 0, slaRate: 0, percentChange: 0, personalBest: 0 };

  // Selected item for detail panel
  const selectedItem = useMemo(() => {
    if (!selectedItemId) return null;
    return filteredItems.find(i => i.id === selectedItemId) || null;
  }, [selectedItemId, filteredItems]);

  const handleRowClick = useCallback((itemId: string) => {
    setSelectedItemId(itemId);
  }, []);

  const closeDetailPanel = useCallback(() => {
    setSelectedItemId(null);
  }, []);

  const handleStartTask = (itemId: string) => { console.log('Start task:', itemId); };
  const generateStatusUpdate = () => { console.log('Generate status update'); };
  const generateImpactReport = () => { console.log('Generate impact report'); };
  const showDeprioritize = () => { console.log('Show deprioritize options'); };

  /**
   * Record a view on a work item. Upserts into `user_viewed_items` so the
   * Viewed tab always shows the most-recently-opened things first.
   *
   * - Fire-and-forget: callers do NOT need to await; UI should not block.
   * - Safe on anonymous sessions — no-ops without auth.
   * - Optimistic: pushes the item to the top of local viewedItems so a user
   *   who clicks a row and hits "Viewed" sees it immediately.
   *
   * `itemType` defaults to 'ph_issue' because the surface overwhelmingly
   * renders Jira-synced issues. Use 'task' for planner rows.
   */
  const trackView = useCallback(async (itemId: string, itemType: string = 'ph_issue') => {
    if (!authUser?.id || !itemId) return;

    // Optimistic local ordering — hoist the row to top if we have it cached.
    const now = new Date().toISOString();
    setViewedItems(prev => {
      const existing = prev.find(r => r.issue_key === itemId);
      if (existing) {
        const rest = prev.filter(r => r.issue_key !== itemId);
        return [{ ...existing, jira_updated_at: now, _last_viewed_at: now }, ...rest];
      }
      // If we haven't cached the row yet, leave the list alone — the next
      // data wave will hydrate it with the correct issue_key.
      return prev;
    });

    try {
      const { error } = await (supabase as any).from('user_viewed_items').upsert(
        {
          user_id: authUser.id,
          item_id: itemId,
          item_type: itemType,
          last_viewed_at: now,
        },
        { onConflict: 'user_id,item_id,item_type', ignoreDuplicates: false }
      );
      if (error) {
        console.warn('[useForYouData] trackView failed:', error);
        return;
      }

      // Re-hydrate the Viewed collection so the Viewed tab populates live
      // instead of waiting for the next full refetch. Before this, the
      // Viewed tab only showed items that were already cached at mount, so
      // a brand-new view stayed invisible until page reload. Keep it cheap:
      // re-read the top 100 rows the same way the mount fetch does.
      try {
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
            ? supabase.from('planner_tasks').select('task_key, title, priority, assignee_id, updated_at, created_at, status_id, workstream_id, reporter_id').in('task_key', plannerKeys).is('deleted_at', null)
            : Promise.resolve({ data: [] as any[] }),
        ]);

        const viewedPh = (viewedPhRaw.data || []).map((r: any) => ({ ...r }));
        const viewedPlanner = (viewedPlannerRaw.data || []).map((row: any) =>
          mapPlannerTaskToIssueRow({
            ...row,
            assignee_name: 'You',
            status_name: 'Backlog',
            workstream_name: null,
          })
        );

        const viewedAtByKey = new Map<string, string>(refreshed.map(r => [r.item_id, r.last_viewed_at]));
        const allViewed = [...viewedPh, ...viewedPlanner]
          .map(r => ({ ...r, _last_viewed_at: viewedAtByKey.get(r.issue_key) || null }))
          .filter(r => r._last_viewed_at)
          .map(r => ({ ...r, jira_updated_at: r._last_viewed_at || r.jira_updated_at }))
          .sort((a, b) => new Date(b._last_viewed_at).getTime() - new Date(a._last_viewed_at).getTime());
        setViewedItems(allViewed);
      } catch (refreshErr) {
        console.warn('[useForYouData] trackView refresh failed:', refreshErr);
      }
    } catch (err) {
      console.warn('[useForYouData] trackView threw:', err);
    }
  }, [authUser?.id]);

  const toggleStar = async (itemId: string) => {
    if (!authUser?.id) return;
    const isCurrentlyStarred = starredItems.has(itemId);
    setStarredItems(prev => { const next = new Set(prev); if (next.has(itemId)) next.delete(itemId); else next.add(itemId); return next; });
    try {
      if (isCurrentlyStarred) {
        const { error } = await supabase.from('user_starred_items').delete().eq('user_id', authUser.id).eq('item_id', itemId);
        if (error) throw error;
        setStarredData(prev => prev.filter(r => r.issue_key !== itemId));
      } else {
        const { error } = await supabase.from('user_starred_items').insert({ user_id: authUser.id, item_id: itemId, item_type: 'ph_issue' });
        if (error) throw error;
        const issueRow = [...assignedItems, ...workedOnItems].find(r => r.issue_key === itemId);
        if (issueRow) setStarredData(prev => [issueRow, ...prev]);
      }
    } catch (err) {
      console.error('Error toggling star:', err);
      setStarredItems(prev => { const next = new Set(prev); if (isCurrentlyStarred) next.add(itemId); else next.delete(itemId); return next; });
    }
  };

  return {
    activeMode, setActiveMode, activeTab, setActiveTab,
    searchQuery, setSearchQuery, sortConfig, setSortConfig,
    isAIPanelOpen, setIsAIPanelOpen,
    user, workItems: filteredItems, groupedItems, tabCounts, hubStats,
    aiData, performanceStats, isLoading,
    selectedItem, handleRowClick, closeDetailPanel,
    handleStartTask, generateStatusUpdate, generateImpactReport, showDeprioritize, toggleStar,
    trackView,
    // Rich mentions feed used by RecommendedPanel (Jira "Reply to mentions"
    // parity — see src/components/for-you/atlaskit/RecommendedPanel.tsx).
    recommendedMentions,
    // Recent comments on the user's watched work (assigned / reporting)
    // where the user was NOT explicitly mentioned — drives the second
    // "Reply to comments" card below the mentions card on Recommended.
    recommendedComments,
    // Account-scoped project list. Stable across every tab switch — the
    // Recommended projects strip consumes this so it doesn't rebuild from
    // the active tab's filtered items on every click.
    allUserProjects,
  };
}
