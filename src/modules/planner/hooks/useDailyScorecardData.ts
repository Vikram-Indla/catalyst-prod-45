// ============================================================
// DAILY SCORECARD DATA HOOK
// Fetches real task data from planner database
// ============================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DailyScorecardData } from '../types/insights';

interface TaskRow {
  id: string;
  title: string;
  status_id: string;
  assignee_id: string | null;
  workstream_id: string | null;
  due_date: string | null;
  blocked: boolean;
  assignee_name: string | null;
  workstream_name: string | null;
  workstream_color: string | null;
  is_completed_status: boolean;
}

interface WorkstreamRow {
  id: string;
  name: string;
  color: string;
}

// Generate initials from name
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Generate a gradient from a color
function getGradient(color: string): { from: string; to: string } {
  // Darken the color slightly for the "to" gradient
  return { from: color, to: color };
}

// Get avatar color based on assignee index - Catalyst V5 (Blue, Teal, Gray only)
const AVATAR_COLORS = ['#2563eb', '#0d9488', '#6b7280'];

export function useDailyScorecardData() {
  return useQuery({
    queryKey: ['daily-scorecard-data'],
    queryFn: async (): Promise<DailyScorecardData> => {
      // Fetch workstreams
      const { data: workstreams, error: wsError } = await supabase
        .from('planner_workstreams')
        .select('id, name, color')
        .eq('is_active', true)
        .order('sort_order');
      
      if (wsError) throw wsError;

      // Fetch tasks with related data
      const { data: tasks, error: taskError } = await supabase
        .from('planner_tasks')
        .select(`
          id,
          title,
          status_id,
          assignee_id,
          workstream_id,
          due_date,
          blocked,
          assignee:profiles!planner_tasks_assignee_id_fkey(full_name),
          workstream:planner_workstreams(name, color),
          status:planner_statuses(is_completed_status)
        `)
        .is('deleted_at', null);

      if (taskError) throw taskError;

      // Process tasks into scorecard format
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Build workstream stats
      const workstreamMap = new Map<string, {
        id: string;
        name: string;
        color: string;
        members: Map<string, {
          id: string;
          name: string;
          tasksDone: number;
          tasksActive: number;
          tasksOverdue: number;
        }>;
      }>();

      // Initialize workstreams
      (workstreams || []).forEach((ws: WorkstreamRow) => {
        workstreamMap.set(ws.id, {
          id: ws.id,
          name: ws.name,
          color: ws.color,
          members: new Map(),
        });
      });

      let totalTasks = 0;
      let totalCompleted = 0;
      let totalOverdue = 0;

      // Process each task
      (tasks || []).forEach((task: any) => {
        totalTasks++;

        const isCompleted = task.status?.is_completed_status ?? false;
        const dueDate = task.due_date ? new Date(task.due_date) : null;
        const isOverdue = dueDate && dueDate < today && !isCompleted;

        if (isCompleted) totalCompleted++;
        if (isOverdue) totalOverdue++;

        // Skip tasks without workstream or assignee for workstream breakdown
        if (!task.workstream_id || !task.assignee_id) return;

        const wsData = workstreamMap.get(task.workstream_id);
        if (!wsData) return;

        const assigneeName = task.assignee?.full_name || 'Unknown';
        const memberId = task.assignee_id;

        if (!wsData.members.has(memberId)) {
          wsData.members.set(memberId, {
            id: memberId,
            name: assigneeName,
            tasksDone: 0,
            tasksActive: 0,
            tasksOverdue: 0,
          });
        }

        const member = wsData.members.get(memberId)!;
        if (isCompleted) {
          member.tasksDone++;
        } else {
          member.tasksActive++;
          if (isOverdue) {
            member.tasksOverdue++;
          }
        }
      });

      // Build final workstreams array
      const scorecardWorkstreams = Array.from(workstreamMap.values())
        .filter(ws => ws.members.size > 0)
        .map((ws, wsIndex) => {
          const members = Array.from(ws.members.values());
          const totalDone = members.reduce((sum, m) => sum + m.tasksDone, 0);
          const totalActive = members.reduce((sum, m) => sum + m.tasksActive, 0);
          const totalTasks = totalDone + totalActive;
          const completionRate = totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0;

          return {
            id: ws.id,
            name: ws.name,
            initial: ws.name[0].toUpperCase(),
            gradient: getGradient(ws.color),
            memberCount: members.length,
            taskCount: totalTasks,
            completionRate,
            members: members.map((m, mIndex) => {
              const memberTotal = m.tasksDone + m.tasksActive;
              const completionPercent = memberTotal > 0 ? Math.round((m.tasksDone / memberTotal) * 100) : 0;
              return {
                id: m.id,
                name: m.name,
                initials: getInitials(m.name),
                avatarColor: AVATAR_COLORS[(wsIndex + mIndex) % AVATAR_COLORS.length],
                role: 'Team Member',
                tasksDone: m.tasksDone,
                tasksActive: m.tasksActive,
                tasksOverdue: m.tasksOverdue,
                completionPercent,
              };
            }),
          };
        });

      const completionRate = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

      return {
        period: { date: new Date(), label: 'Today' },
        summary: {
          workstreams: scorecardWorkstreams.length,
          totalTasks,
          completed: totalCompleted,
          overdue: totalOverdue,
          completionRate,
        },
        workstreams: scorecardWorkstreams,
      };
    },
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });
}
