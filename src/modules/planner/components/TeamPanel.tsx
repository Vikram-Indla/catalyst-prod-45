// ============================================================
// TEAM PANEL - SLIDE-IN
// Shows team details, stats, members, and tasks
// ============================================================

import { useEffect, useState } from 'react';
import { X, Users, Settings, Plus, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { addDays, isBefore, isAfter } from 'date-fns';
import { AVATAR_COLORS, STATUS_COLORS } from '../types';
import type { PlannerTask, TaskStatus } from '../types';

interface TeamMemberWithStats {
  id: string;
  userId: string;
  name: string;
  initials: string;
  role: 'lead' | 'member';
  color: string;
  taskCount: number;
  overdueCount: number;
  dueSoonCount: number;
}

interface TeamDetails {
  id: string;
  name: string;
  shortName: string;
  description: string | null;
  color: string;
  members: TeamMemberWithStats[];
  tasks: PlannerTask[];
  stats: {
    totalMembers: number;
    totalTasks: number;
    overdueTasks: number;
    dueSoonTasks: number;
  };
}

interface TeamPanelProps {
  teamId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onMemberClick?: (userId: string) => void;
  onTaskClick?: (task: PlannerTask) => void;
  onSettings?: () => void;
}

function useTeamDetails(teamId: string | null) {
  return useQuery({
    queryKey: ['team-panel', teamId],
    queryFn: async (): Promise<TeamDetails | null> => {
      if (!teamId) return null;

      // Fetch team
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('id, name, short_name, description')
        .eq('id', teamId)
        .single();

      if (teamError) {
        console.error('Error fetching team:', teamError);
        return null;
      }

      // Fetch members
      const { data: members } = await supabase
        .from('team_members')
        .select(`
          id,
          user_id,
          role,
          user:profiles!team_members_user_id_fkey(id, full_name)
        `)
        .eq('team_id', teamId);

      // Fetch stories for this team (use stories table, not tasks)
      const { data: stories } = await supabase
        .from('stories')
        .select('id, title, status, start_date, updated_at, priority, assignee_id, story_key')
        .eq('team_id', teamId)
        .is('deleted_at', null)
        .not('status', 'eq', 'done')
        .order('start_date', { ascending: true, nullsFirst: false })
        .limit(20);

      const now = new Date();
      const weekFromNow = addDays(now, 7);

      // Map members with stats
      const membersWithStats: TeamMemberWithStats[] = (members || [])
        .filter(m => m.user)
        .map((m, i) => {
          const memberTasks = (stories || []).filter(t => t.assignee_id === m.user_id);
          // Use start_date as "due date" for urgency calculations
          const overdue = memberTasks.filter(t => t.start_date && isBefore(new Date(t.start_date), now));
          const dueSoon = memberTasks.filter(t => {
            if (!t.start_date) return false;
            const due = new Date(t.start_date);
            return isAfter(due, now) && isBefore(due, weekFromNow);
          });

          const fullName = m.user?.full_name || 'Unknown';
          const initials = fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

          return {
            id: m.id,
            userId: m.user_id,
            name: fullName,
            initials,
            role: (m.role as 'lead' | 'member') || 'member',
            color: AVATAR_COLORS[i % AVATAR_COLORS.length],
            taskCount: memberTasks.length,
            overdueCount: overdue.length,
            dueSoonCount: dueSoon.length,
          };
        });

      // Map stories to PlannerTask format
      const mappedTasks: PlannerTask[] = (stories || []).map(t => ({
        id: t.id,
        key: t.story_key || `TASK-${t.id.slice(0, 4).toUpperCase()}`,
        title: t.title,
        status: mapStatus(t.status),
        type: 'task' as const,
        priority: (t.priority as 'low' | 'medium' | 'high' | 'critical') || 'medium',
        assigneeId: t.assignee_id,
        dueDate: t.start_date,
        blocked: false,
        progress: 0,
        comments: 0,
        createdAt: t.updated_at || '',
        updatedAt: t.updated_at || '',
      }));

      // Calculate stats
      const overdueTasks = mappedTasks.filter(t => t.dueDate && isBefore(new Date(t.dueDate), now));
      const dueSoonTasks = mappedTasks.filter(t => {
        if (!t.dueDate) return false;
        const due = new Date(t.dueDate);
        return isAfter(due, now) && isBefore(due, weekFromNow);
      });

      // Get team color from team type
      const getTeamColor = (shortName: string): string => {
        const colors: Record<string, string> = {
          'AGILE': '#10b981',
          'KANBAN': '#3b82f6',
          'COP': '#d97706',
          'PROGRAM': '#7c3aed',
          'PORTFOLIO': '#6366f1',
        };
        return colors[shortName?.toUpperCase()] || '#2563eb';
      };

      return {
        id: team.id,
        name: team.name,
        shortName: team.short_name || team.name.slice(0, 3).toUpperCase(),
        description: team.description,
        color: getTeamColor(team.short_name || ''),
        members: membersWithStats,
        tasks: mappedTasks,
        stats: {
          totalMembers: membersWithStats.length,
          totalTasks: mappedTasks.length,
          overdueTasks: overdueTasks.length,
          dueSoonTasks: dueSoonTasks.length,
        },
      };
    },
    enabled: !!teamId,
  });
}

function mapStatus(status: string | null): TaskStatus {
  const statusMap: Record<string, TaskStatus> = {
    'backlog': 'backlog',
    'planned': 'planned',
    'in_progress': 'in-progress',
    'in-progress': 'in-progress',
    'review': 'review',
    'done': 'done',
  };
  return statusMap[status || ''] || 'backlog';
}

export function TeamPanel({ 
  teamId, 
  isOpen, 
  onClose,
  onMemberClick,
  onTaskClick,
  onSettings,
}: TeamPanelProps) {
  const { data: team, isLoading } = useTeamDetails(teamId);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 z-40"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 bottom-0 w-[420px] max-w-full bg-surface-0 shadow-2xl z-50 flex flex-col border-l border-border"
          >
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : team ? (
              <>
                {/* Hero Header */}
                <div 
                  className="border-b border-border"
                  style={{ 
                    background: `linear-gradient(135deg, ${team.color}10, ${team.color}05)`,
                  }}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                          style={{ backgroundColor: team.color }}
                        >
                          {team.shortName.charAt(0)}
                        </div>
                        <div>
                          <h2 className="text-lg font-semibold text-text-primary">
                            {team.name}
                          </h2>
                          <p className="text-sm text-text-muted">
                            {team.description || 'No description'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-white/50 text-text-muted transition-colors"
                        title="Close panel (Esc)"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-2 p-3 bg-white/50">
                    <StatCard 
                      label="Members" 
                      value={team.stats.totalMembers} 
                      icon={<Users className="w-3 h-3" />}
                    />
                    <StatCard label="Active" value={team.stats.totalTasks} />
                    <StatCard 
                      label="Overdue" 
                      value={team.stats.overdueTasks}
                      color={team.stats.overdueTasks > 0 ? '#ef4444' : undefined}
                    />
                    <StatCard 
                      label="Due Soon" 
                      value={team.stats.dueSoonTasks}
                      color={team.stats.dueSoonTasks > 0 ? '#d97706' : undefined}
                    />
                  </div>
                </div>

                {/* Body */}
                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-4">
                    {/* Description */}
                    {team.description && (
                      <div className="p-3 rounded-lg bg-slate-50 border border-border">
                        <p className="text-sm text-text-secondary">{team.description}</p>
                      </div>
                    )}

                    {/* Members */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-text-primary">
                          Members ({team.members.length})
                        </h3>
                      </div>
                      <div className="space-y-1">
                        {team.members.map(member => (
                          <button
                            key={member.id}
                            onClick={() => onMemberClick?.(member.userId)}
                            className="w-full flex items-center gap-3 p-2.5 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors group"
                          >
                            <div 
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium"
                              style={{ backgroundColor: member.color }}
                            >
                              {member.initials}
                            </div>
                            <div className="flex-1 text-left">
                              <p className="text-sm font-medium text-text-primary">
                                {member.name}
                              </p>
                            </div>
                            {member.role === 'lead' ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                                Lead
                              </span>
                            ) : member.overdueCount > 0 ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
                                {member.overdueCount} overdue
                              </span>
                            ) : (
                              <span className="text-[10px] text-text-muted">
                                {member.taskCount} tasks
                              </span>
                            )}
                            <ChevronRight className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        ))}

                        {/* Add Member placeholder */}
                        <button className="w-full flex items-center gap-3 p-2.5 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors text-text-muted">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center border-2 border-dashed border-slate-300">
                            <Plus className="w-4 h-4" />
                          </div>
                          <span className="text-sm">Add member</span>
                        </button>
                      </div>
                    </div>

                    {/* Active Tasks */}
                    <div>
                      <h3 className="text-sm font-medium text-text-primary mb-2">
                        Active Tasks ({team.tasks.length})
                      </h3>
                      <div className="space-y-1.5">
                        {team.tasks.slice(0, 5).map(task => (
                          <TaskCard 
                            key={task.id} 
                            task={task} 
                            onClick={() => onTaskClick?.(task)}
                          />
                        ))}
                        {team.tasks.length > 5 && (
                          <div className="text-xs text-text-muted text-center py-2">
                            +{team.tasks.length - 5} more tasks
                          </div>
                        )}
                        {team.tasks.length === 0 && (
                          <div className="text-center py-6 text-text-muted text-sm">
                            No active tasks
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </ScrollArea>

                {/* Footer */}
                <div className="border-t border-border p-3 flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 gap-2"
                    onClick={onSettings}
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </Button>
                  <Button size="sm" className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                    + Assign Task
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-text-muted">
                Team not found
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function StatCard({ label, value, color, icon }: { label: string; value: number; color?: string; icon?: React.ReactNode }) {
  return (
    <div className="text-center p-2 rounded-lg bg-white border border-border">
      <div className="flex items-center justify-center gap-1">
        {icon}
        <span 
          className="text-lg font-bold"
          style={{ color: color || '#1e293b' }}
        >
          {value}
        </span>
      </div>
      <div className="text-[10px] text-text-muted">{label}</div>
    </div>
  );
}

function TaskCard({ task, onClick }: { task: PlannerTask; onClick: () => void }) {
  const now = new Date();
  const isOverdue = task.dueDate && new Date(task.dueDate) < now;
  const statusColor = STATUS_COLORS[task.status] || '#94a3b8';

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-2.5 rounded-lg border border-border hover:border-blue-200 hover:bg-blue-50/50 transition-all group"
    >
      <div className="flex items-start gap-2">
        <div 
          className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
          style={{ backgroundColor: statusColor }}
        />
        <div className="flex-1 min-w-0">
          <span className="text-[10px] font-mono text-text-muted">{task.key}</span>
          <p className="text-xs font-medium text-text-primary truncate">
            {task.title}
          </p>
          {task.dueDate && (
            <span className={cn(
              "text-[10px] mt-0.5 inline-block",
              isOverdue ? "text-red-600 font-medium" : "text-text-muted"
            )}>
              Due: {new Date(task.dueDate).toLocaleDateString()}
              {isOverdue && " (Overdue)"}
            </span>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
      </div>
    </button>
  );
}
