/**
 * useResourceJiraWork — Fetches Jira work items for a resource
 * Resolves resource_inventory.id → jira_account_id via ph_user_mapping
 * Groups issues into: This Week, This Month, Last Month
 * Structures: stories with nested subtasks
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, subMonths, endOfMonth, format } from 'date-fns';

export interface JiraWorkItem {
  issue_key: string;
  summary: string;
  issue_type: string;
  status: string;
  status_category: string;
  priority: string;
  parent_key: string | null;
  parent_summary: string | null;
  project_key: string;
  jira_created_at: string;
  jira_updated_at: string;
  hierarchy_level: number;
  type_icon_url: string | null;
}

export interface StoryGroup {
  story: JiraWorkItem;
  subtasks: JiraWorkItem[];
}

export interface GroupedWork {
  thisWeek: StoryGroup[];
  thisMonth: StoryGroup[];
  lastMonth: StoryGroup[];
}

export interface ResourceMeta {
  name: string;
  role: string;
  jiraAccountId: string | null;
  avatarUrl: string | null;
  assignmentType: string | null;
  location: string | null;
  department: string | null;
}

function groupIntoStories(items: JiraWorkItem[]): StoryGroup[] {
  // Separate stories (hierarchy_level=0 or no parent) and subtasks
  const stories = new Map<string, JiraWorkItem>();
  const subtasks: JiraWorkItem[] = [];

  for (const item of items) {
    if (item.hierarchy_level === 0 || (!item.parent_key && item.issue_type === 'Story')) {
      stories.set(item.issue_key, item);
    } else {
      subtasks.push(item);
    }
  }

  // Group subtasks under their parent stories
  const storyGroups = new Map<string, StoryGroup>();

  // Init known stories
  for (const [key, story] of stories) {
    storyGroups.set(key, { story, subtasks: [] });
  }

  // Assign subtasks
  for (const sub of subtasks) {
    if (sub.parent_key && storyGroups.has(sub.parent_key)) {
      storyGroups.get(sub.parent_key)!.subtasks.push(sub);
    } else if (sub.parent_key) {
      // Create a synthetic story entry for orphan subtasks
      const syntheticStory: JiraWorkItem = {
        issue_key: sub.parent_key,
        summary: sub.parent_summary || sub.parent_key,
        issue_type: 'Story',
        status: '',
        status_category: '',
        priority: '',
        parent_key: null,
        parent_summary: null,
        project_key: sub.project_key,
        jira_created_at: sub.jira_created_at,
        jira_updated_at: sub.jira_updated_at,
        hierarchy_level: 0,
        type_icon_url: null,
      };
      storyGroups.set(sub.parent_key, { story: syntheticStory, subtasks: [sub] });
    } else {
      // No parent — treat as standalone story
      storyGroups.set(sub.issue_key, { story: sub, subtasks: [] });
    }
  }

  return Array.from(storyGroups.values());
}

export function useResourceJiraWork(resourceId: string | null) {
  return useQuery({
    queryKey: ['capacity', 'resource-jira-work', resourceId],
    queryFn: async (): Promise<{ resource: ResourceMeta; groups: GroupedWork; flatItems: JiraWorkItem[] }> => {
      // 1. Get resource_inventory record with assignment and location
      const { data: ri, error: riErr } = await supabase
        .from('resource_inventory')
        .select('id, name, role_name, profile_id, assignment_id, location_id')
        .eq('id', resourceId!)
        .maybeSingle();
      if (riErr) throw riErr;
      if (!ri) throw new Error('Resource not found');

      // 2. Parallel: resolve jira mapping, assignment, location, avatar
      const [mappingRes, assignmentRes, locationRes, profileRes] = await Promise.all([
        ri.profile_id
          ? supabase.from('ph_user_mapping').select('jira_account_id').eq('catalyst_profile_id', ri.profile_id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        ri.assignment_id
          ? supabase.from('resource_assignments').select('name, assignment_type').eq('id', ri.assignment_id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        ri.location_id
          ? supabase.from('resource_locations').select('name').eq('id', ri.location_id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        ri.profile_id
          ? supabase.from('profiles').select('avatar_url').eq('id', ri.profile_id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

      const jiraAccountId = mappingRes.data?.jira_account_id ?? null;
      const assignmentType = assignmentRes.data?.assignment_type || assignmentRes.data?.name || null;
      const location = locationRes.data?.name || null;
      const avatarUrl = profileRes.data?.avatar_url || null;

      // Get department
      let department: string | null = null;
      // We'll get it from the analytics data context, but also try inventory
      const { data: deptData } = await supabase
        .from('resource_inventory')
        .select('capacity_departments(name)')
        .eq('id', resourceId!)
        .maybeSingle();
      department = (deptData as any)?.capacity_departments?.name || null;

      if (!jiraAccountId) {
        return {
          resource: { name: ri.name, role: ri.role_name || 'Team Member', jiraAccountId: null, avatarUrl, assignmentType, location, department },
          groups: { thisWeek: [], thisMonth: [], lastMonth: [] },
          flatItems: [],
        };
      }

      // 3. Date boundaries
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - 7); // Rolling 7-day window
      const monthStart = startOfMonth(now);
      const lastMonthStart = startOfMonth(subMonths(now, 1));
      const lastMonthEnd = endOfMonth(subMonths(now, 1));
      const lookbackDate = format(lastMonthStart, 'yyyy-MM-dd');

      // 4. Fetch issues
      const { data: issues, error } = await supabase
        .from('ph_issues')
        .select('issue_key, summary, issue_type, status, status_category, priority, parent_key, parent_summary, project_key, jira_created_at, jira_updated_at, hierarchy_level, type_icon_url')
        .eq('assignee_account_id', jiraAccountId)
        .gte('jira_updated_at', lookbackDate)
        .order('jira_updated_at', { ascending: false });

      if (error) throw error;
      const items = (issues ?? []) as JiraWorkItem[];

      // 5. Group by time period
      const thisWeekItems: JiraWorkItem[] = [];
      const thisMonthItems: JiraWorkItem[] = [];
      const lastMonthItems: JiraWorkItem[] = [];

      for (const item of items) {
        const updated = new Date(item.jira_updated_at);
        if (updated >= weekStart) {
          thisWeekItems.push(item);
        } else if (updated >= monthStart) {
          thisMonthItems.push(item);
        } else if (updated >= lastMonthStart && updated <= lastMonthEnd) {
          lastMonthItems.push(item);
        }
      }

      return {
        resource: { name: ri.name, role: ri.role_name || 'Team Member', jiraAccountId, avatarUrl, assignmentType, location, department },
        groups: {
          thisWeek: groupIntoStories(thisWeekItems),
          thisMonth: groupIntoStories(thisMonthItems),
          lastMonth: groupIntoStories(lastMonthItems),
        },
        flatItems: items,
      };
    },
    enabled: !!resourceId,
    staleTime: 60_000,
  });
}

/** Sync a single resource's Jira data */
export function useSyncResourceJira() {
  const queryClient = useQueryClient();

  return async (resourceId: string) => {
    // Invalidate to force refetch
    await queryClient.invalidateQueries({ queryKey: ['capacity', 'resource-jira-work', resourceId] });
  };
}
