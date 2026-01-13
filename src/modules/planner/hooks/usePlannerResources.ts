// ============================================================
// PLANNER RESOURCES HOOK
// Fetches resources (users) with their tasks and team memberships
// ============================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PlannerResource, ResourceWithTasks, PlannerTask, TaskStatus } from '../types';
import { AVATAR_COLORS } from '../types';
import { addDays, isBefore, isAfter } from 'date-fns';

const DUE_SOON_DAYS = 7;
const STALE_DAYS = 7;

export function usePlannerResources() {
  return useQuery({
    queryKey: ['planner-resources'],
    queryFn: async () => {
      // Fetch profiles with their team memberships
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name')
        .limit(100);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        return [];
      }

      // Fetch team memberships
      const { data: teamMembers } = await supabase
        .from('team_members')
        .select(`
          user_id,
          role,
          team:teams(id, name)
        `);

      // Fetch all tasks with assignees
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, status, due_date, updated_at, assignee_id, team_id')
        .not('status', 'eq', 'done');

      const now = new Date();
      const weekFromNow = addDays(now, DUE_SOON_DAYS);
      const weekAgo = addDays(now, -STALE_DAYS);

      const resources: PlannerResource[] = (profiles || []).map((profile, index) => {
        // Get team memberships for this user
        const userTeamMemberships = (teamMembers || [])
          .filter(tm => tm.user_id === profile.id && tm.team)
          .map(tm => ({
            teamId: tm.team.id,
            teamName: tm.team.name,
            teamColor: getTeamColor(index),
            role: (tm.role as 'lead' | 'member') || 'member',
            taskCount: 0, // Will be calculated below
          }));

        // Get tasks assigned to this user
        const userTasks = (tasks || []).filter(t => t.assignee_id === profile.id);
        
        // Calculate task counts for each team
        userTeamMemberships.forEach(tm => {
          tm.taskCount = userTasks.filter(t => t.team_id === tm.teamId).length;
        });

        // Calculate stats
        const overdueCount = userTasks.filter(t => 
          t.due_date && isBefore(new Date(t.due_date), now)
        ).length;

        const dueSoonCount = userTasks.filter(t => {
          if (!t.due_date) return false;
          const due = new Date(t.due_date);
          return isAfter(due, now) && isBefore(due, weekFromNow);
        }).length;

        const staleCount = userTasks.filter(t => 
          isBefore(new Date(t.updated_at), weekAgo)
        ).length;

        const initials = (profile.full_name || 'U')
          .split(' ')
          .map(n => n[0])
          .join('')
          .slice(0, 2)
          .toUpperCase();

        return {
          id: profile.id,
          fullName: profile.full_name || 'Unknown',
          email: profile.email || '',
          initials,
          avatarColor: AVATAR_COLORS[index % AVATAR_COLORS.length],
          role: null, // Will be fetched from user_product_roles if needed
          teams: userTeamMemberships,
          taskCount: userTasks.length,
          overdueCount,
          dueSoonCount,
          staleCount,
        };
      });

      return resources;
    },
  });
}

export function usePlannerResource(userId: string | null) {
  return useQuery({
    queryKey: ['planner-resource', userId],
    queryFn: async () => {
      if (!userId) return null;

      // Fetch profile
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      // Fetch team memberships
      const { data: teamMembers } = await supabase
        .from('team_members')
        .select(`
          role,
          team:teams(id, name)
        `)
        .eq('user_id', userId);

      // Fetch tasks assigned to this user
      const { data: tasksData } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          status,
          due_date,
          updated_at,
          priority,
          team_id,
          teams(id, name)
        `)
        .eq('assignee_id', userId)
        .not('status', 'eq', 'done')
        .order('due_date', { ascending: true, nullsFirst: false });

      const now = new Date();
      const weekFromNow = addDays(now, DUE_SOON_DAYS);
      const weekAgo = addDays(now, -STALE_DAYS);

      // Map tasks to PlannerTask format
      const tasks: PlannerTask[] = (tasksData || []).map((t: any) => ({
        id: t.id,
        key: `TASK-${t.id.slice(0, 4).toUpperCase()}`,
        title: t.title,
        status: mapStatus(t.status),
        type: 'task' as const,
        priority: t.priority || 'medium',
        teamId: t.team_id,
        teamName: t.teams?.name,
        dueDate: t.due_date,
        blocked: false,
        progress: 0,
        comments: 0,
        createdAt: t.updated_at,
        updatedAt: t.updated_at,
      }));

      // Sort tasks: overdue first, then by due date
      tasks.sort((a, b) => {
        const aOverdue = a.dueDate && isBefore(new Date(a.dueDate), now);
        const bOverdue = b.dueDate && isBefore(new Date(b.dueDate), now);
        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        return 0;
      });

      // Calculate stats
      const tasksByStatus: Record<TaskStatus, number> = {
        backlog: 0,
        planned: 0,
        'in-progress': 0,
        review: 0,
        done: 0,
      };
      tasks.forEach(t => {
        tasksByStatus[t.status] = (tasksByStatus[t.status] || 0) + 1;
      });

      const initials = (profile.full_name || 'U')
        .split(' ')
        .map(n => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

      const userTeamMemberships = (teamMembers || [])
        .filter(tm => tm.team)
        .map((tm, i) => ({
          teamId: tm.team.id,
          teamName: tm.team.name,
          teamColor: getTeamColor(i),
          role: (tm.role as 'lead' | 'member') || 'member',
          taskCount: tasks.filter(t => t.teamId === tm.team.id).length,
        }));

      return {
        id: profile.id,
        fullName: profile.full_name || 'Unknown',
        email: profile.email || '',
        initials,
        avatarColor: AVATAR_COLORS[0],
        role: null,
        teams: userTeamMemberships,
        tasks,
        tasksByStatus,
        taskCount: tasks.length,
        overdueCount: tasks.filter(t => t.dueDate && isBefore(new Date(t.dueDate), now)).length,
        dueSoonCount: tasks.filter(t => {
          if (!t.dueDate) return false;
          const due = new Date(t.dueDate);
          return isAfter(due, now) && isBefore(due, weekFromNow);
        }).length,
        staleCount: tasks.filter(t => isBefore(new Date(t.updatedAt), weekAgo)).length,
      } as ResourceWithTasks;
    },
    enabled: !!userId,
  });
}

// Helper to map DB status to TaskStatus
function mapStatus(status: string): TaskStatus {
  const statusMap: Record<string, TaskStatus> = {
    'backlog': 'backlog',
    'planned': 'planned',
    'in_progress': 'in-progress',
    'in-progress': 'in-progress',
    'review': 'review',
    'done': 'done',
  };
  return statusMap[status] || 'backlog';
}

function getTeamColor(index: number): string {
  const colors = ['#10b981', '#2563eb', '#8b5cf6', '#d97706', '#ef4444', '#0d9488'];
  return colors[index % colors.length];
}
