// ============================================================
// WORKSTREAM DETAIL PANEL
// Slide-out panel showing workstream details and quick actions
// ============================================================

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ExternalLink, ListTodo, Users, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { HealthIndicator } from './HealthIndicator';
import type { WorkstreamData } from './types';
import { motion } from 'framer-motion';

interface WorkstreamDetailPanelProps {
  workstream: WorkstreamData | null;
  open: boolean;
  onClose: () => void;
}

export function WorkstreamDetailPanel({ workstream, open, onClose }: WorkstreamDetailPanelProps) {
  const navigate = useNavigate();

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

  const stats = [
    { label: 'Total Tasks', value: workstream.task_count, icon: ListTodo, color: '#3b82f6' },
    { label: 'In Progress', value: workstream.in_progress_count, icon: TrendingUp, color: '#6366f1' },
    { label: 'Completed', value: workstream.completed_count, icon: CheckCircle, color: '#10b981' },
    { label: 'Overdue', value: workstream.overdue_count, icon: AlertTriangle, color: workstream.overdue_count > 0 ? '#ef4444' : '#64748b' },
  ];

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-[420px] p-0 border-l border-slate-200 dark:border-slate-700">
        {/* Header */}
        <div
          className="px-6 py-5 border-b border-slate-200 dark:border-slate-700"
          style={{ borderTopColor: workstream.color, borderTopWidth: '4px' }}
        >
          <div className="flex items-start gap-4">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-sm"
              style={{ backgroundColor: workstream.color }}
            >
              {workstream.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">
                {workstream.name}
              </h2>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm font-mono text-slate-500 dark:text-slate-400">
                  {workstream.code}
                </span>
                <HealthIndicator health={workstream.health} size="sm" />
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">
            Task Overview
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${stat.color}15` }}
                  >
                    <Icon className="w-4 h-4" style={{ color: stat.color }} />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
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

        {/* Progress */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Progress
            </h3>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {workstream.progress}%
            </span>
          </div>
          <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${workstream.progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ backgroundColor: workstream.color }}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
            <span>{workstream.completed_count} completed</span>
            <span>{workstream.task_count - workstream.completed_count} remaining</span>
          </div>
        </div>

        {/* Members */}
        {workstream.members.length > 0 && (
          <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Team Members
              </h3>
              <span className="text-xs text-slate-400">{workstream.members.length}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {workstream.members.slice(0, 8).map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold"
                    style={{ backgroundColor: member.color }}
                  >
                    {member.initials}
                  </div>
                  <span className="text-xs text-slate-600 dark:text-slate-300">
                    {member.initials}
                  </span>
                </div>
              ))}
              {workstream.members.length > 8 && (
                <div className="flex items-center px-2 py-1.5 text-xs text-slate-500">
                  +{workstream.members.length - 8} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="px-6 py-5">
          <div className="flex flex-col gap-3">
            <Button onClick={handleViewTasks} className="w-full gap-2">
              <ListTodo className="w-4 h-4" />
              View Tasks
            </Button>
            <Button onClick={handleViewBoard} variant="outline" className="w-full gap-2">
              <ExternalLink className="w-4 h-4" />
              Open Board View
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
