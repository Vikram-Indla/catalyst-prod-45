/**
 * Taskhub Strip - KPI cards for My Tasks on Home page
 * Shows Overdue, Today, This Week counts with navigation
 */

import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Calendar, CalendarDays, CheckCircle2, ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, isBefore } from 'date-fns';

interface TaskCounts {
  overdue: number;
  today: number;
  thisWeek: number;
  completed: number;
}

export function TaskhubStrip() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: counts, isLoading } = useQuery({
    queryKey: ['taskhub-strip-counts', user?.id],
    queryFn: async (): Promise<TaskCounts> => {
      if (!user?.id) return { overdue: 0, today: 0, thisWeek: 0, completed: 0 };

      // Done status UUID from planner_statuses
      const DONE_STATUS_ID = 'f71c7171-abc7-40b8-8f05-d858ad589e17';
      
      const now = new Date();
      const todayStart = startOfDay(now).toISOString();
      const todayEnd = endOfDay(now).toISOString();
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 }).toISOString();

      // Get all tasks assigned to user with status join
      const { data: tasks, error } = await supabase
        .from('planner_tasks')
        .select('id, status_id, due_date, completed_at')
        .eq('assignee_id', user.id)
        .is('deleted_at', null);

      if (error) throw new Error(error.message);

      // Filter by Done status UUID
      const activeTasks = ((tasks as any[]) || []).filter(t => t.status_id !== DONE_STATUS_ID);
      const completedTasks = ((tasks as any[]) || []).filter(t => t.status_id === DONE_STATUS_ID);

      let overdue = 0;
      let today = 0;
      let thisWeek = 0;

      activeTasks.forEach((task: any) => {
        if (!task.due_date) return;
        
        const dueDate = new Date(task.due_date);
        
        if (isBefore(dueDate, now) && task.due_date < todayStart) {
          overdue++;
        } else if (task.due_date >= todayStart && task.due_date <= todayEnd) {
          today++;
        } else if (task.due_date > todayEnd && task.due_date <= weekEnd) {
          thisWeek++;
        }
      });

      return {
        overdue,
        today,
        thisWeek,
        completed: completedTasks.length,
      };
    },
    enabled: !!user?.id,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const cards = [
    {
      label: 'Overdue',
      count: counts?.overdue ?? 0,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-950/30',
      borderColor: 'border-red-200 dark:border-red-900',
      filter: 'overdue',
    },
    {
      label: 'Due Today',
      count: counts?.today ?? 0,
      icon: Calendar,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50 dark:bg-indigo-950/30',
      borderColor: 'border-indigo-200 dark:border-indigo-900',
      filter: 'today',
    },
    {
      label: 'This Week',
      count: counts?.thisWeek ?? 0,
      icon: CalendarDays,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50 dark:bg-amber-950/30',
      borderColor: 'border-amber-200 dark:border-amber-900',
      filter: 'week',
    },
    {
      label: 'Completed',
      count: counts?.completed ?? 0,
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
      borderColor: 'border-emerald-200 dark:border-emerald-900',
      filter: 'done',
    },
  ];

  const handleCardClick = (filter: string) => {
    navigate(`/taskhub/my-tasks?filter=${filter}`);
  };

  const handleViewAll = () => {
    navigate('/taskhub/my-tasks');
  };

  // Don't render if no user
  if (!user?.id) return null;

  return (
    <section className="mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span 
            className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
          >
            TH
          </span>
          <h2 className="text-sm font-semibold text-text-primary">My Taskhub Tasks</h2>
        </div>
        <button
          onClick={handleViewAll}
          className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          View all
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.label}
              onClick={() => handleCardClick(card.filter)}
              disabled={isLoading}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border transition-all',
                'hover:shadow-sm hover:scale-[1.02] active:scale-[0.98]',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                card.bgColor,
                card.borderColor
              )}
            >
              <div className={cn('p-2 rounded-md bg-white/60 dark:bg-black/20', card.color)}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className={cn('text-lg font-bold', card.color)}>
                  {isLoading ? '—' : card.count}
                </div>
                <div className="text-xs text-muted-foreground">{card.label}</div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
