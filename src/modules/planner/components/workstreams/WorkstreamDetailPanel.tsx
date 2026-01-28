// ============================================================
// WORKSTREAM DETAIL PANEL V9
// Comprehensive panel matching reference design:
// - Description section with edit CTA
// - Details: Lead, Created, Status
// - Members section with task counts and inline Add Member
// - Task Overview, Progress, Recent Tasks, Recent Activity
// - Footer: View Tasks, Board View
// Real-time data from database - NO MOCK DATA
// ============================================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  X, 
  Pencil, 
  MoreHorizontal, 
  ListTodo, 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle,
  Clock,
  BarChart2,
  Grid3X3,
  Users,
  Activity,
  Check,
  FileText,
  Info,
  User,
  Calendar,
  Circle,
  UserPlus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { HealthIndicator } from './HealthIndicator';
import { useWorkstreamMembers } from './useWorkstreamMutations';
import type { WorkstreamData } from './types';
import { motion } from 'framer-motion';
import { formatDistanceToNow, format } from 'date-fns';

interface WorkstreamDetailPanelProps {
  workstream: WorkstreamData | null;
  open: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onAddMembers?: () => void;
}

// Fetch workstream description from DB
function useWorkstreamDescription(workstreamId: string | null) {
  return useQuery({
    queryKey: ['workstream-description', workstreamId],
    queryFn: async () => {
      if (!workstreamId) return null;
      
      const { data, error } = await supabase
        .from('planner_workstreams')
        .select('description, created_at, is_active, updated_at')
        .eq('id', workstreamId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!workstreamId,
    staleTime: 30 * 1000,
  });
}

// Fetch task counts per member for this workstream
function useMemberTaskCounts(workstreamId: string | null, memberUserIds: string[]) {
  return useQuery({
    queryKey: ['member-task-counts', workstreamId, memberUserIds],
    queryFn: async () => {
      if (!workstreamId || memberUserIds.length === 0) return {};
      
      const { data, error } = await supabase
        .from('planner_tasks')
        .select('assignee_id')
        .eq('workstream_id', workstreamId)
        .in('assignee_id', memberUserIds);
      
      if (error) throw error;
      
      // Count tasks per assignee
      const counts: Record<string, number> = {};
      (data || []).forEach(task => {
        if (task.assignee_id) {
          counts[task.assignee_id] = (counts[task.assignee_id] || 0) + 1;
        }
      });
      return counts;
    },
    enabled: !!workstreamId && memberUserIds.length > 0,
    staleTime: 30 * 1000,
  });
}

// Fetch recent tasks for this workstream from DB
function useWorkstreamRecentTasks(workstreamId: string | null) {
  return useQuery({
    queryKey: ['workstream-recent-tasks', workstreamId],
    queryFn: async () => {
      if (!workstreamId) return [];
      
      const { data, error } = await supabase
        .from('planner_tasks')
        .select(`
          id,
          task_key,
          key,
          title,
          status:planner_statuses(slug, name, color)
        `)
        .eq('workstream_id', workstreamId)
        .order('updated_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      
      // Map to ensure task_key is prioritized over key
      return (data || []).map(task => ({
        ...task,
        key: task.task_key || task.key || `PLN-${task.id.slice(0, 6)}`
      }));
    },
    enabled: !!workstreamId,
    staleTime: 30 * 1000,
  });
}

// Fetch recent activity for this workstream from planner_activity_log
function useWorkstreamActivity(workstreamId: string | null) {
  return useQuery({
    queryKey: ['workstream-activity', workstreamId],
    queryFn: async () => {
      if (!workstreamId) return [];
      
      // Get task IDs for this workstream first
      const { data: tasks } = await supabase
        .from('planner_tasks')
        .select('id')
        .eq('workstream_id', workstreamId);
      
      if (!tasks || tasks.length === 0) return [];
      
      const taskIds = tasks.map(t => t.id);
      
      // Get activity for these tasks
      const { data: activities, error } = await supabase
        .from('planner_activity_log')
        .select('*')
        .in('task_id', taskIds)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      if (!activities || activities.length === 0) return [];
      
      // Get user profiles for the activity
      const userIds = [...new Set(activities.map(a => a.user_id).filter(Boolean))];
      let profilesMap: Record<string, { full_name: string | null; avatar_url: string | null }> = {};
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds);
        
        if (profiles) {
          profilesMap = Object.fromEntries(profiles.map(p => [p.id, p]));
        }
      }
      
      // Get task keys for the activity
      const activityTaskIds = [...new Set(activities.map(a => a.task_id).filter(Boolean))];
      let taskKeysMap: Record<string, string> = {};
      
      if (activityTaskIds.length > 0) {
        const { data: taskData } = await supabase
          .from('planner_tasks')
          .select('id, task_key, key')
          .in('id', activityTaskIds);
        
        if (taskData) {
          taskKeysMap = Object.fromEntries(taskData.map(t => [t.id, t.task_key || t.key || `PLN-${t.id.slice(0, 6)}`]));
        }
      }
      
      return activities.map(activity => {
        const profile = activity.user_id ? profilesMap[activity.user_id] : null;
        const taskKey = activity.task_id ? taskKeysMap[activity.task_id] : null;
        const userName = profile?.full_name || 'System';
        const initials = userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
        
        return {
          id: activity.id,
          user: userName,
          initials,
          color: getColorFromName(userName),
          action: formatActivityAction(activity.action, activity.old_value, activity.new_value, taskKey),
          time: formatDistanceToNow(new Date(activity.created_at), { addSuffix: true }),
        };
      });
    },
    enabled: !!workstreamId,
    staleTime: 30 * 1000,
  });
}

// Generate consistent color from name
function getColorFromName(name: string): string {
  const colors = ['#3b82f6', '#f97316', '#a855f7', '#10b981', '#ef4444', '#06b6d4', '#ec4899'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// Format activity action text
function formatActivityAction(action: string, oldValue: any, newValue: any, taskKey: string | null): string {
  const taskRef = taskKey || 'a task';
  
  // Parse newValue if it's a string (JSON)
  let parsedValue = newValue;
  if (typeof newValue === 'string') {
    try {
      parsedValue = JSON.parse(newValue);
    } catch {
      parsedValue = newValue;
    }
  }
  
  switch (action) {
    case 'created':
      return `created task ${taskRef}`;
    case 'completed':
      return `completed ${taskRef}`;
    case 'status_changed':
      const newStatus = parsedValue?.to || parsedValue?.name || (typeof parsedValue === 'string' ? parsedValue : null);
      return newStatus ? `moved ${taskRef} to ${newStatus}` : `updated ${taskRef} status`;
    case 'priority_changed':
      const newPriority = parsedValue?.to || (typeof parsedValue === 'string' ? parsedValue : null);
      return newPriority ? `changed ${taskRef} priority to ${newPriority}` : `updated ${taskRef} priority`;
    case 'assignee_changed':
      return `reassigned ${taskRef}`;
    case 'title_changed':
      return `updated ${taskRef} title`;
    case 'description_changed':
      return `updated ${taskRef} description`;
    default:
      return `updated ${taskRef}`;
  }
}

export function WorkstreamDetailPanel({ 
  workstream, 
  open, 
  onClose,
  onEdit,
  onAddMembers
}: WorkstreamDetailPanelProps) {
  const navigate = useNavigate();
  const [isSaved, setIsSaved] = useState(true);
  
  // Fetch real data
  const { data: wsDetails } = useWorkstreamDescription(workstream?.id || null);
  const { data: members = [] } = useWorkstreamMembers(workstream?.id || null);
  const memberUserIds = members.map(m => m.user_id);
  const { data: memberTaskCounts = {} } = useMemberTaskCounts(workstream?.id || null, memberUserIds);
  const { data: recentTasks = [] } = useWorkstreamRecentTasks(workstream?.id || null);
  const { data: activity = [] } = useWorkstreamActivity(workstream?.id || null);

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, onClose]);

  if (!workstream) return null;

  const handleViewTasks = () => {
    navigate(`/planner/task-list?workstream=${encodeURIComponent(workstream.code.toLowerCase())}`);
    onClose();
  };

  const handleViewBoard = () => {
    navigate(`/planner/boards?workstream=${encodeURIComponent(workstream.code.toLowerCase())}`);
    onClose();
  };

  const handleEdit = () => {
    onEdit?.();
  };

  const stats = [
    { 
      label: 'Total Tasks', 
      value: workstream.task_count, 
      icon: ListTodo, 
      bgColor: 'bg-slate-50 dark:bg-slate-800/50',
      iconBg: 'bg-slate-100 dark:bg-slate-700',
      iconColor: 'text-slate-600 dark:text-slate-300',
      textColor: 'text-slate-900 dark:text-slate-100',
      highlight: false
    },
    { 
      label: 'In Progress', 
      value: workstream.in_progress_count, 
      icon: TrendingUp, 
      bgColor: 'bg-amber-50/80 dark:bg-amber-900/20',
      iconBg: 'bg-amber-100 dark:bg-amber-900/40',
      iconColor: 'text-amber-600 dark:text-amber-400',
      textColor: 'text-slate-900 dark:text-slate-100',
      highlight: false
    },
    { 
      label: 'Completed', 
      value: workstream.completed_count, 
      icon: CheckCircle2, 
      bgColor: 'bg-emerald-50/80 dark:bg-emerald-900/20',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      textColor: 'text-slate-900 dark:text-slate-100',
      highlight: false
    },
    { 
      label: 'Overdue', 
      value: workstream.overdue_count, 
      icon: AlertTriangle, 
      bgColor: workstream.overdue_count > 0 
        ? 'bg-red-50 dark:bg-red-900/20 ring-1 ring-red-200 dark:ring-red-800' 
        : 'bg-slate-50 dark:bg-slate-800/50',
      iconBg: workstream.overdue_count > 0 
        ? 'bg-red-100 dark:bg-red-900/40' 
        : 'bg-slate-100 dark:bg-slate-700',
      iconColor: workstream.overdue_count > 0 
        ? 'text-red-500 dark:text-red-400' 
        : 'text-slate-500 dark:text-slate-400',
      textColor: workstream.overdue_count > 0 
        ? 'text-red-600 dark:text-red-400' 
        : 'text-slate-900 dark:text-slate-100',
      highlight: workstream.overdue_count > 0
    },
  ];

  const remaining = workstream.task_count - workstream.completed_count;
  const progressColor = workstream.progress === 0 ? 'bg-amber-400' : workstream.color;

  // Find lead (first member with role 'lead')
  const leadMember = members.find(m => m.role?.toLowerCase() === 'lead');

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent 
        className="w-[420px] p-0 border-l border-slate-200 dark:border-slate-700 flex flex-col"
        hideClose
      >
        {/* Header */}
        <div
          className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0"
          style={{ borderTopColor: workstream.color, borderTopWidth: '4px' }}
        >
          <div className="flex items-start gap-3">
            {/* Workstream Icon */}
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-sm flex-shrink-0"
              style={{ backgroundColor: workstream.color }}
            >
              {workstream.name.charAt(0)}
            </div>
            
            {/* Title & Code */}
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">
                {workstream.name}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm font-mono text-slate-500 dark:text-slate-400">
                  {workstream.code}
                </span>
                <HealthIndicator health={workstream.health} size="sm" />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={handleEdit}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={handleViewTasks}>
                    <ListTodo className="w-4 h-4 mr-2" />
                    View All Tasks
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleViewBoard}>
                    <Grid3X3 className="w-4 h-4 mr-2" />
                    Open Board View
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleEdit}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit Workstream
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Save Indicator */}
          {isSaved && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-600 dark:text-emerald-400">
              <Check className="w-3.5 h-3.5" />
              All changes saved
            </div>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Description Section */}
          <div className="px-5 py-5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Description
                </h3>
              </div>
              <button
                onClick={handleEdit}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
              >
                Edit
              </button>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {wsDetails?.description || 'No description provided. Click Edit to add one.'}
            </p>
          </div>

          {/* Details Section */}
          <div className="px-5 py-5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-4">
              <Info className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Details
              </h3>
            </div>
            
            <div className="space-y-3">
              {/* Lead */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <User className="w-4 h-4" />
                  <span>Lead</span>
                </div>
                {leadMember ? (
                  <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                    {leadMember.profile?.full_name || 'Unknown'}
                  </span>
                ) : (
                  <button
                    onClick={onAddMembers}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                  >
                    Assign lead...
                  </button>
                )}
              </div>
              
              {/* Created */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <Calendar className="w-4 h-4" />
                  <span>Created</span>
                </div>
                <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                  {wsDetails?.created_at ? format(new Date(wsDetails.created_at), 'MMM d, yyyy') : 'Unknown'}
                </span>
              </div>
              
              {/* Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <Clock className="w-4 h-4" />
                  <span>Status</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Circle className="w-2.5 h-2.5 fill-emerald-500 text-emerald-500" />
                  <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                    {wsDetails?.is_active !== false ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Members Section */}
          <div className="px-5 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Members
                </h3>
              </div>
              <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                {members.length} {members.length === 1 ? 'member' : 'members'}
              </span>
            </div>
            
            {members.length === 0 ? (
              <div className="text-center py-4 text-sm text-slate-400 dark:text-slate-500">
                No members yet
              </div>
            ) : (
              <div className="space-y-2 mb-4">
                {members.map((member) => {
                  const initials = member.profile?.full_name
                    ? member.profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                    : '??';
                  const isLead = member.role?.toLowerCase() === 'lead';
                  const taskCount = memberTaskCounts[member.user_id] || 0;
                  
                  return (
                    <div 
                      key={member.id}
                      className="flex items-center gap-3 py-2.5 px-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                    >
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                        style={{ backgroundColor: getColorFromName(member.profile?.full_name || 'Unknown') }}
                      >
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {member.profile?.full_name || 'Unknown'}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {member.profile?.vendor || member.profile?.role || 'Team Member'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isLead && (
                          <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded">
                            Lead
                          </span>
                        )}
                        <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                          {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Inline Add Member Button */}
            <button
              onClick={onAddMembers}
              className="flex items-center gap-2 w-full py-2.5 px-3 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Add Member
            </button>
          </div>

          {/* Task Overview Section */}
          <div className="px-5 py-5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Task overview
              </h3>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl',
                      stat.bgColor
                    )}
                  >
                    <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', stat.iconBg)}>
                      <Icon className={cn('w-5 h-5', stat.iconColor)} />
                    </div>
                    <div>
                      <div className={cn('text-xl font-bold', stat.textColor)}>
                        {stat.value}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {stat.label}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Progress Section */}
          <div className="px-5 py-5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Progress
                </h3>
              </div>
              <span className={cn(
                'text-base font-bold',
                workstream.progress === 0 ? 'text-red-500' : 'text-slate-900 dark:text-slate-100'
              )}>
                {workstream.progress}%
              </span>
            </div>
            
            <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(workstream.progress, 2)}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ backgroundColor: progressColor }}
              />
            </div>
            
            <div className="flex items-center justify-between mt-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="text-emerald-600 dark:text-emerald-400">
                {workstream.completed_count} completed
              </span>
              <span>{remaining} remaining</span>
            </div>
          </div>

          {/* Recent Tasks Section */}
          <div className="px-5 py-5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Recent tasks
              </h3>
            </div>
            
            {recentTasks.length === 0 ? (
              <div className="text-center py-6 text-sm text-slate-400 dark:text-slate-500">
                No tasks in this workstream
              </div>
            ) : (
              <div className="space-y-2">
                {recentTasks.map((task) => (
                  <div 
                    key={task.id}
                    onClick={() => navigate(`/planner/tasks?taskId=${task.id}`)}
                    className="flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 group cursor-pointer transition-colors"
                  >
                    {/* Task Key */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/planner/task-list?search=${encodeURIComponent(task.key)}`);
                      }}
                      className="text-xs font-mono text-blue-600 dark:text-blue-400 w-[60px] flex-shrink-0 truncate hover:underline hover:text-blue-700 dark:hover:text-blue-300 text-left"
                    >
                      {task.key}
                    </button>
                    {/* Task Title */}
                    <span className="flex-1 text-sm text-slate-700 dark:text-slate-300 truncate min-w-0">
                      {task.title}
                    </span>
                    {/* Status Badge */}
                    <span 
                      className="text-xs px-2.5 py-1 rounded-md font-medium flex-shrink-0 min-w-[80px] text-center"
                      style={{ 
                        backgroundColor: task.status?.color ? `${task.status.color}20` : '#f1f5f9',
                        color: task.status?.color || '#64748b'
                      }}
                    >
                      {task.status?.name || 'Unknown'}
                    </span>
                  </div>
                ))}
              </div>
            )}
            
            {workstream.task_count > 0 && (
              <button
                onClick={handleViewTasks}
                className="flex items-center justify-center gap-1 w-full mt-4 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
              >
                View all {workstream.task_count} tasks →
              </button>
            )}
          </div>

          {/* Recent Activity Section */}
          <div className="px-5 py-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Recent activity
              </h3>
            </div>
            
            {activity.length === 0 ? (
              <div className="text-center py-6 text-sm text-slate-400 dark:text-slate-500">
                No recent activity
              </div>
            ) : (
              <div className="space-y-4">
                {activity.map((item) => (
                  <div key={item.id} className="flex items-start gap-3">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    >
                      {item.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        <span className="font-semibold">{item.user}</span>
                        {' '}{item.action}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                        {item.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer with Actions - View Tasks + Board View (matching reference) */}
        <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex-shrink-0">
          <div className="flex gap-3 mb-3">
            <Button 
              onClick={handleViewTasks} 
              className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <ListTodo className="w-4 h-4" />
              View Tasks
            </Button>
            <Button 
              onClick={handleViewBoard} 
              variant="outline" 
              className="flex-1 gap-2"
            >
              <Grid3X3 className="w-4 h-4" />
              Board View
            </Button>
          </div>
          
          <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
            <span>Created {wsDetails?.created_at ? format(new Date(wsDetails.created_at), 'MMM d, yyyy') : 'Unknown'}</span>
            <span>Updated {wsDetails?.updated_at ? formatDistanceToNow(new Date(wsDetails.updated_at), { addSuffix: true }) : 'recently'}</span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
