/**
 * useResource360Data — Resource 360 data from profiles + ph_issues (Jira subtasks)
 * 
 * People & departments from profiles + capacity_departments
 * Work assignments from ph_issues (Backend, Frontend, Figma, Integration subtasks)
 * Only includes subtasks under active (non-Done) parent stories
 * Due dates from effective_due_date in ph_issues
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Resource360Person {
  id: string;
  full_name: string;
  role: string;
  department_id: string | null;
  department_name: string | null;
  avatar_url: string | null;
  active_subtasks: number;
  done_subtasks: number;
  blocked_items: number;
  total_subtasks: number;
  release_names: string[];
  theme_names: string[];
  next_due_date: string | null;
  assignment_type: string | null;
}

export interface Resource360Department {
  id: string;
  name: string;
  count: number;
}

/** Fetch all departments from capacity_departments */
export function useResource360Departments() {
  return useQuery({
    queryKey: ['resource360', 'departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('capacity_departments')
        .select('id, name, department_id')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw new Error(error.message);
      return (data ?? []) as Array<{ id: string; name: string; department_id: string }>;
    },
    staleTime: 60_000,
  });
}

/** Main Resource 360 hook — profiles with ph_issues (Jira subtasks) */
export function useResource360People() {
  return useQuery({
    queryKey: ['resource360', 'people'],
    queryFn: async () => {
      // 1. Get ALL active resources from resource_inventory (source of truth for headcount)
      const { data: resources, error: rErr } = await supabase
        .from('resource_inventory')
        .select('id, name, role_name, profile_id, department_id, department_name, is_active, assignment_id')
        .eq('is_active', true)
        .order('name');
      if (rErr) throw new Error(rErr.message);

      // 1a. Get assignment types from resource_assignments
      const assignmentIds = (resources ?? []).map((r: any) => r.assignment_id).filter(Boolean);
      let assignmentTypeMap = new Map<string, string>();
      if (assignmentIds.length > 0) {
        const { data: assignments } = await supabase
          .from('resource_assignments')
          .select('id, assignment_type')
          .in('id', assignmentIds);
        (assignments ?? []).forEach((a: any) => {
          if (a.assignment_type) assignmentTypeMap.set(a.id, a.assignment_type);
        });
      }

      // 1b. Get profiles for avatar_url lookup (only those that exist)
      const profileIds = (resources ?? [])
        .map((r: any) => r.profile_id)
        .filter(Boolean);
      
      let avatarMap = new Map<string, string>();
      let profileDeptMap = new Map<string, string>();
      if (profileIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, avatar_url, department_id')
          .in('id', profileIds);
        (profiles ?? []).forEach((p: any) => {
          if (p.avatar_url) avatarMap.set(p.id, p.avatar_url);
          if (p.department_id) profileDeptMap.set(p.id, p.department_id);
        });
      }

      // 2. Get capacity_departments for name lookup
      const { data: depts, error: dErr } = await supabase
        .from('capacity_departments')
        .select('id, name, department_id')
        .eq('is_active', true);
      if (dErr) throw new Error(dErr.message);

      const deptMap = new Map<string, string>();
      (depts ?? []).forEach(d => {
        deptMap.set(d.id, d.name);
        deptMap.set(d.department_id, d.name);
      });

      // 3. Get ph_user_mapping to map jira_account_id → catalyst_profile_id
      const { data: userMappings, error: umErr } = await supabase
        .from('ph_user_mapping')
        .select('jira_account_id, catalyst_profile_id')
        .eq('is_mapped', true);
      if (umErr) throw new Error(umErr.message);

      const accountIdToProfileMap = new Map<string, string>();
      (userMappings ?? []).forEach((m: any) => {
        if (m.catalyst_profile_id) {
          accountIdToProfileMap.set(m.jira_account_id, m.catalyst_profile_id);
        }
      });

      // 4. Get all subtask-type issues from ph_issues with their parent story info
      const { data: subtaskIssues, error: sErr } = await supabase
        .from('ph_issues')
        .select(`
          issue_key,
          summary,
          status,
          status_category,
          assignee_account_id,
          parent_key,
          effective_due_date
        `)
        .in('issue_type', ['Backend', 'Frontend', 'Figma', 'Integration', 'Sub-task'])
        .not('assignee_account_id', 'is', null);
      if (sErr) throw new Error(sErr.message);

      // 5. Get parent stories to check their status (active = not Done)
      const parentKeys = new Set<string>();
      (subtaskIssues ?? []).forEach((issue: any) => {
        if (issue.parent_key) parentKeys.add(issue.parent_key);
      });

      let parentStoryMap = new Map<string, { status_category: string; fix_versions: any }>();
      if (parentKeys.size > 0) {
        const { data: parentStories } = await supabase
          .from('ph_issues')
          .select('issue_key, status_category, fix_versions')
          .in('issue_key', Array.from(parentKeys));
        (parentStories ?? []).forEach((p: any) => {
          parentStoryMap.set(p.issue_key, { 
            status_category: p.status_category,
            fix_versions: p.fix_versions
          });
        });
      }

      // 6. Initialize all resources (from resource_inventory, not profiles)
      const personMap = new Map<string, Resource360Person>();
      // Also build a reverse map: profile_id → resource inventory id
      const profileToResourceId = new Map<string, string>();

      (resources ?? []).forEach((r: any) => {
        const deptId = r.department_id || (r.profile_id ? profileDeptMap.get(r.profile_id) : null);
        const deptName = deptId ? (deptMap.get(deptId) || r.department_name || null) : (r.department_name || null);
        
        personMap.set(r.id, {
          id: r.id,
          full_name: r.name || 'Unknown',
          role: r.role_name || 'Team Member',
          department_id: deptId || null,
          department_name: deptName,
          avatar_url: r.profile_id ? (avatarMap.get(r.profile_id) || null) : null,
          active_subtasks: 0,
          done_subtasks: 0,
          blocked_items: 0,
          total_subtasks: 0,
          release_names: [],
          theme_names: [],
          next_due_date: null,
          assignment_type: r.assignment_id ? (assignmentTypeMap.get(r.assignment_id) || null) : null,
        });

        if (r.profile_id) {
          profileToResourceId.set(r.profile_id, r.id);
        }
      });

      const releaseNamesPerPerson = new Map<string, Set<string>>();

      // 7. Process subtask issues
      (subtaskIssues ?? []).forEach((issue: any) => {
        const assigneeAccountId = issue.assignee_account_id;
        const profileId = accountIdToProfileMap.get(assigneeAccountId);
        if (!profileId) return;

        // Map profile_id → resource_inventory id
        const resourceId = profileToResourceId.get(profileId);
        if (!resourceId) return;

        const person = personMap.get(resourceId);
        if (!person) return;

        // Check if parent story is active (status_category !== 'Done')
        const parentStory = issue.parent_key ? parentStoryMap.get(issue.parent_key) : undefined;
        if (!parentStory || parentStory.status_category === 'Done') return;

        // Count this subtask
        person.total_subtasks++;
        if (issue.status_category === 'Done') {
          person.done_subtasks++;
        } else {
          person.active_subtasks++;
        }

        // Extract release names from fix_versions if available
        if (parentStory.fix_versions && Array.isArray(parentStory.fix_versions)) {
          parentStory.fix_versions.forEach((version: any) => {
            if (version.name) {
              if (!releaseNamesPerPerson.has(resourceId)) {
                releaseNamesPerPerson.set(resourceId, new Set());
              }
              releaseNamesPerPerson.get(resourceId)!.add(version.name);
            }
          });
        }

        // Track next due date (earliest effective_due_date)
        if (issue.effective_due_date && issue.status_category !== 'Done') {
          if (!person.next_due_date || issue.effective_due_date < person.next_due_date) {
            person.next_due_date = issue.effective_due_date;
          }
        }
      });

      personMap.forEach((person) => {
        const names = releaseNamesPerPerson.get(person.id);
        if (names) person.release_names = Array.from(names);
      });

      return Array.from(personMap.values());
    },
    staleTime: 30_000,
  });
}
