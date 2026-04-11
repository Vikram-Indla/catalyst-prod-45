/**
 * For You Page Data Hook - Real data from Jira sync (ph_issues)
 * MARAM V3.1 — ring-fenced to For You page
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';

export type WorkMode = 'OPS' | 'DEL' | 'TSK';
export type WorkGroup = 'YESTERDAY' | 'THIS_WEEK' | 'EARLIER';
export type TabType = 'worked' | 'assigned' | 'starred';
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
function mapIssueToWorkItem(row: any, starredSet: Set<string>, projectNameMap: Map<string, string>, attachmentCounts?: Map<string, number>): WorkItem {
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

  return {
    id: row.issue_key,
    key: row.issue_key,
    summary: row.summary || '',
    phIssueId: row.id || undefined,
    projectId: row.project_id || undefined,
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
  const [activeTab, setActiveTab] = useState<TabType>('worked');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ field: string; order: 'asc' | 'desc' }>({ field: 'updated', order: 'desc' });
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
  const [starredItems, setStarredItems] = useState<Set<string>>(new Set());
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const [workedOnItems, setWorkedOnItems] = useState<any[]>([]);
  const [assignedItems, setAssignedItems] = useState<any[]>([]);
  const [starredData, setStarredData] = useState<any[]>([]);
  const [attachmentCounts, setAttachmentCounts] = useState<Map<string, number>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [jiraAccountIds, setJiraAccountIds] = useState<string[]>([]);
  const [projectNameMap, setProjectNameMap] = useState<Map<string, string>>(new Map());

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
          supabase.from('projects').select('id, key'),
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
        if (catalystProjects) catalystProjects.forEach(p => projectIdMap.set(p.key, p.id));
        if (jiraProjects) {
          const pMap = new Map<string, string>();
          jiraProjects.forEach(p => pMap.set(p.project_key, p.name));
          setProjectNameMap(pMap);
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
            supabase.from('ph_issues').select(SELECT_FIELDS).in('assignee_account_id', jiraAccountIds).order('jira_updated_at', { ascending: false }).limit(200),
            supabase.from('ph_issues').select(SELECT_FIELDS).in('assignee_account_id', jiraAccountIds).gte('jira_updated_at', ninetyDaysAgo.toISOString()).order('jira_updated_at', { ascending: false }).limit(200),
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

        // ── Starred items (parallel) ──
        if (stars && stars.length > 0) {
          const starredKeys = new Set(stars.map(s => s.item_id));
          setStarredItems(starredKeys as any);
          const itemIds = stars.map(s => s.item_id);

          const [{ data: starredIssuesRaw }, { data: starredPlannerTasks }] = await Promise.all([
            supabase.from('ph_issues').select(SELECT_FIELDS).in('issue_key', itemIds).order('jira_updated_at', { ascending: false }),
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
      case 'assigned': return assignedItems;
      case 'starred': return starredData;
      case 'worked':
      default: return workedOnItems;
    }
  }, [activeTab, workedOnItems, assignedItems, starredData]);

  const filteredItems = useMemo(() => {
    let items = sourceItems.map(row => mapIssueToWorkItem(row, starredItems, projectNameMap, attachmentCounts));
    if (activeMode !== 'all') items = items.filter(item => item.mode.toLowerCase() === activeMode);
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item => item.key.toLowerCase().includes(query) || item.summary.toLowerCase().includes(query));
    }
    return items;
  }, [sourceItems, activeMode, searchQuery, starredItems, projectNameMap, attachmentCounts]);

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
    return { worked: filterByMode(workedOnItems).length, assigned: filterByMode(assignedItems).length, starred: filterByMode(starredData).length };
  }, [workedOnItems, assignedItems, starredData, activeMode]);

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
  };
}
