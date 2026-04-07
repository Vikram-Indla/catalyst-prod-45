// ============================================================
// RESOURCE PANEL - SLIDE-IN
// Shows resource details, stats, and tasks
// ============================================================

import { useEffect } from 'react';
import { X, Mail, Users, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePlannerResource } from '../hooks/usePlannerResources';
import { STATUS_COLORS } from '../types';
import type { PlannerTask, TaskStatus } from '../types';

interface ResourcePanelProps {
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onTaskClick?: (task: PlannerTask) => void;
  onTeamClick?: (teamId: string) => void;
}

export function ResourcePanel({ 
  userId, 
  isOpen, 
  onClose,
  onTaskClick,
  onTeamClick,
}: ResourcePanelProps) {
  const { data: resource, isLoading } = usePlannerResource(userId);

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
            className="fixed right-0 top-0 bottom-0 w-[400px] max-w-full bg-surface-0 shadow-2xl z-50 flex flex-col border-l border-border"
          >
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : resource ? (
              <>
                {/* Header */}
                <div className="border-b border-border">
                  <div className="p-4 bg-gradient-to-r from-slate-50 to-blue-50 dark:from-[#111111] dark:to-[#111111]">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg"
                          style={{ backgroundColor: resource.avatarColor }}
                        >
                          {resource.initials}
                        </div>
                        <div>
                          <h2 className="text-lg font-semibold text-text-primary">
                            {resource.fullName}
                          </h2>
                          <p className="text-sm text-text-muted">
                            {resource.role || 'Team Member'}
                          </p>
                          {/* Team badges */}
                          <div className="flex flex-wrap gap-1 mt-1">
                            {resource.teams.map(team => (
                              <button
                                key={team.teamId}
                                onClick={() => onTeamClick?.(team.teamId)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium hover:opacity-80 transition-opacity"
                                style={{ 
                                  backgroundColor: `${team.teamColor}20`,
                                  color: team.teamColor,
                                }}
                              >
                                <div 
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: team.teamColor }}
                                />
                                {team.teamName}
                              </button>
                            ))}
                          </div>
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
                  <div className="grid grid-cols-4 gap-2 p-3 bg-slate-50 dark:bg-[#111111]">
                    <StatCard label="Total" value={resource.taskCount} />
                    <StatCard 
                      label="Overdue" 
                      value={resource.overdueCount} 
                      color={resource.overdueCount > 0 ? '#ef4444' : undefined} 
                    />
                    <StatCard 
                      label="Due Soon" 
                      value={resource.dueSoonCount}
                      color={resource.dueSoonCount > 0 ? '#d97706' : undefined}
                    />
                    <StatCard 
                      label="Stale" 
                      value={resource.staleCount}
                      color={resource.staleCount > 0 ? '#6b7280' : undefined}
                    />
                  </div>
                </div>

                {/* Body */}
                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-4">
                    {/* Status Breakdown */}
                    <div>
                      <h3 className="text-sm font-medium text-text-primary mb-2">By Status</h3>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(resource.tasksByStatus || {})
                          .filter(([_, count]) => count > 0)
                          .map(([status, count]) => (
                            <div
                              key={status}
                              className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-surface-1"
                            >
                              <div 
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: STATUS_COLORS[status as TaskStatus] || '#94a3b8' }}
                              />
                              <span className="text-xs text-text-primary font-medium">
                                {count}
                              </span>
                              <span className="text-xs text-text-muted capitalize">
                                {status.replace('-', ' ')}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Tasks */}
                    <div>
                      <h3 className="text-sm font-medium text-text-primary mb-2">
                        Active Tasks ({resource.tasks?.length || 0})
                      </h3>
                      <div className="space-y-1.5">
                        {(resource.tasks || []).map(task => (
                          <TaskCard 
                            key={task.id} 
                            task={task} 
                            onClick={() => onTaskClick?.(task)}
                          />
                        ))}
                        {(!resource.tasks || resource.tasks.length === 0) && (
                          <div className="text-center py-6 text-text-muted text-sm">
                            No active tasks assigned
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </ScrollArea>

                {/* Footer */}
                <div className="border-t border-border p-3 flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 gap-2">
                    <Mail className="w-4 h-4" />
                    Message
                  </Button>
                  <Button size="sm" className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                    + Assign Task
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-text-muted">
                Resource not found
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="text-center p-2 rounded-lg bg-white dark:bg-[#1A1A1A] border border-border">
      <div
        className="text-lg font-bold"
        style={{ color: color || '#1e293b' }}
      >
        {value}
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
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-text-muted">{task.key}</span>
            {task.teamName && (
              <span 
                className="text-[9px] px-1.5 py-0.5 rounded text-white"
                style={{ backgroundColor: task.teamColor || '#6b7280' }}
              >
                {task.teamName}
              </span>
            )}
          </div>
          <p className="text-xs font-medium text-text-primary truncate mt-0.5">
            {task.title}
          </p>
          {task.dueDate && (
            <span className={cn(
              "text-[10px] mt-1 inline-block",
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
