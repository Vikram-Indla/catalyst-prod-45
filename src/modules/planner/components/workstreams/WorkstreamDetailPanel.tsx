// ============================================================
// WORKSTREAM DETAIL PANEL V9
// Comprehensive panel with header, stats, progress, tasks, activity
// ============================================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Activity,
  Check
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
import type { WorkstreamData } from './types';
import { motion } from 'framer-motion';
import { formatDistanceToNow, format } from 'date-fns';

interface WorkstreamDetailPanelProps {
  workstream: WorkstreamData | null;
  open: boolean;
  onClose: () => void;
  onEdit?: () => void;
}

// Mock recent tasks - in production would come from DB
const getMockRecentTasks = (workstream: WorkstreamData) => [
  { 
    key: `${workstream.code}-12`, 
    title: 'Factory Registration Module', 
    status: 'Backlog',
    statusColor: 'bg-slate-100 text-slate-600'
  },
  { 
    key: `${workstream.code}-11`, 
    title: 'Compliance Dashboard Design', 
    status: 'In Progress',
    statusColor: 'bg-amber-100 text-amber-700'
  },
];

// Mock activity - in production would come from DB
const getMockActivity = () => [
  { 
    id: '1',
    user: 'Sara Ahmed', 
    initials: 'SA', 
    color: '#3b82f6',
    action: 'moved SEN-11 to In Progress', 
    time: '2 hours ago' 
  },
  { 
    id: '2',
    user: 'Ibrahim Khalil', 
    initials: 'IB', 
    color: '#f97316',
    action: 'created task SEN-12', 
    time: 'Yesterday' 
  },
  { 
    id: '3',
    user: 'System', 
    initials: 'SY', 
    color: '#a855f7',
    action: 'marked SEN-10 as overdue', 
    time: '2 days ago' 
  },
];

export function WorkstreamDetailPanel({ 
  workstream, 
  open, 
  onClose,
  onEdit 
}: WorkstreamDetailPanelProps) {
  const navigate = useNavigate();
  const [isSaved, setIsSaved] = useState(true);

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
    navigate(`/planner/task-list?workstream=${encodeURIComponent(workstream.id)}`);
    onClose();
  };

  const handleViewBoard = () => {
    navigate(`/planner/boards?workstream=${encodeURIComponent(workstream.id)}`);
    onClose();
  };

  const handleEdit = () => {
    onEdit?.();
  };

  const recentTasks = getMockRecentTasks(workstream);
  const activity = getMockActivity();

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
          {/* Task Overview Section */}
          <div className="px-5 py-5 bg-slate-50/50 dark:bg-slate-900/30">
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
          <div className="px-5 py-5 border-t border-slate-100 dark:border-slate-800">
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
          <div className="px-5 py-5 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Recent tasks
              </h3>
            </div>
            
            <div className="space-y-3">
              {recentTasks.map((task) => (
                <div 
                  key={task.key}
                  className="flex items-center gap-3 group cursor-pointer"
                >
                  <span className="text-xs font-mono text-blue-600 dark:text-blue-400 w-14 flex-shrink-0">
                    {task.key}
                  </span>
                  <span className="flex-1 text-sm text-slate-700 dark:text-slate-300 truncate">
                    {task.title}
                  </span>
                  <span className={cn(
                    'text-xs px-2 py-1 rounded-md font-medium flex-shrink-0',
                    task.statusColor
                  )}>
                    {task.status}
                  </span>
                </div>
              ))}
            </div>
            
            <button
              onClick={handleViewTasks}
              className="flex items-center justify-center gap-1 w-full mt-4 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
            >
              View all {workstream.task_count} tasks →
            </button>
          </div>

          {/* Recent Activity Section */}
          <div className="px-5 py-5 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Recent activity
              </h3>
            </div>
            
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
          </div>
        </div>

        {/* Footer with Actions */}
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
            <span>Created Jan 10, 2026</span>
            <span>Updated 2 hours ago</span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
