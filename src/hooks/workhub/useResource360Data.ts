/**
 * useResource360Data — Resource 360 data from profiles + subtasks of active stories
 * 
 * People & departments from profiles + capacity_departments
 * Work assignments from subtasks under stories not in 'done' status
 * Due dates from releases linked to stories/features
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

/** Main Resource 360 hook — profiles with subtask aggregation */
export function useResource360People() {
  return useQuery({
    queryKey: ['resource360', 'people'],
    queryFn: async () => {
      // 1. Get all profiles with department join
      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('id, full_name, role, department_id, avatar_url')
        .order('full_name');
      if (pErr) throw new Error(pErr.message);

      // 2. Get capacity_departments for name lookup
      const { data: depts, error: dErr } = await supabase
        .from('capacity_departments')
        .select('id, name, department_id')
        .eq('is_active', true);
      if (dErr) throw new Error(dErr.message);

      const deptMap = new Map<string, string>();
      (depts ?? []).forEach(d => deptMap.set(d.id, d.name));

      // 3. Get all subtasks with their story status, release info
      const { data: subtasks, error: sErr } = await supabase
        .from('subtasks')
        .select(`
          id,
          assignee_id,
          status,
          story_id,
          release_id,
          story:stories!subtasks_story_id_fkey(
            id, status, name,
            feature:features!stories_feature_id_fkey(
              id,
              release:releases!features_release_id_fkey(id, name, target_date)
            )
          )
        `);
      if (sErr) throw new Error(sErr.message);

      // 4. Get releases for subtasks that have direct release_id
      const releaseIds = new Set<string>();
      (subtasks ?? []).forEach((st: any) => {
        if (st.release_id) releaseIds.add(st.release_id);
      });
      
      let releaseMap = new Map<string, { name: string; target_date: string | null }>();
      if (releaseIds.size > 0) {
        const { data: releases } = await supabase
          .from('releases')
          .select('id, name, target_date')
          .in('id', Array.from(releaseIds));
        (releases ?? []).forEach((r: any) => releaseMap.set(r.id, { name: r.name, target_date: r.target_date }));
      }

      // 5. Aggregate per person
      const personMap = new Map<string, Resource360Person>();
      (profiles ?? []).forEach((p: any) => {
        personMap.set(p.id, {
          id: p.id,
          full_name: p.full_name || 'Unknown',
          role: p.role || 'Team Member',
          department_id: p.department_id,
          department_name: p.department_id ? (deptMap.get(p.department_id) || null) : null,
          avatar_url: p.avatar_url,
          active_subtasks: 0,
          done_subtasks: 0,
          blocked_items: 0,
          total_subtasks: 0,
          release_names: [],
          theme_names: [],
          next_due_date: null,
        });
      });

      const releaseNamesPerPerson = new Map<string, Set<string>>();

      (subtasks ?? []).forEach((st: any) => {
        if (!st.assignee_id) return;
        const person = personMap.get(st.assignee_id);
        if (!person) return;

        const story = st.story;
        if (!story) return;

        // Only count subtasks under active stories (not done)
        const storyActive = story.status !== 'done';
        if (!storyActive) return;

        person.total_subtasks++;
        if (st.status === 'done') {
          person.done_subtasks++;
        } else {
          person.active_subtasks++;
        }

        // Release from subtask.release_id or story→feature→release
        let releaseName: string | null = null;
        let releaseTargetDate: string | null = null;

        if (st.release_id && releaseMap.has(st.release_id)) {
          const rel = releaseMap.get(st.release_id)!;
          releaseName = rel.name;
          releaseTargetDate = rel.target_date;
        } else if (story.feature?.release) {
          releaseName = story.feature.release.name;
          releaseTargetDate = story.feature.release.target_date;
        }

        if (releaseName) {
          if (!releaseNamesPerPerson.has(person.id)) releaseNamesPerPerson.set(person.id, new Set());
          releaseNamesPerPerson.get(person.id)!.add(releaseName);
        }

        // Track next due date (earliest release target_date)
        if (releaseTargetDate && st.status !== 'done') {
          if (!person.next_due_date || releaseTargetDate < person.next_due_date) {
            person.next_due_date = releaseTargetDate;
          }
        }
      });

      // Finalize release names
      personMap.forEach((person) => {
        const names = releaseNamesPerPerson.get(person.id);
        if (names) person.release_names = Array.from(names);
      });

      return Array.from(personMap.values());
    },
    staleTime: 30_000,
  });
}
