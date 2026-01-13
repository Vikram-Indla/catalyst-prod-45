// ============================================================
// TASK CARD COMPONENT - Enterprise Grade (Catalyst V5)
// Enhanced card with blocked state, team, assignee, dependencies
// ============================================================

import { useMemo, useState } from 'react';
import { AlertTriangle, Calendar, Link2, MessageSquare, Paperclip, MoreVertical, Pencil, Copy, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PlannerTask, TaskPriority } from '../types';
import { motion } from 'framer-motion';
import { differenceInDays, format, startOfDay } from 'date-fns';
import { ChecklistIndicator } from './ChecklistIndicator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TaskCardProps {
  task: PlannerTask;
  onClick: () => void;
  isDragging?: boolean;
  className?: string;
}

const priorityConfig: Record<TaskPriority, { bg: string; text: string; border: string; dot: string; label: string }> = {
  critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500', label: 'Critical' },
  high: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500', label: 'High' },
  medium: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500', label: 'Medium' },
  low: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-400', label: 'Low' },
};

export function TaskCard({ task, onClick, isDragging = false, className }: TaskCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const priority = priorityConfig[task.priority];

  const isOverdue = useMemo(() => {
    if (!task.dueDate || task.status === 'done') return false;
    const today = startOfDay(new Date());
    const dueDate = startOfDay(new Date(task.dueDate));
    return differenceInDays(dueDate, today) < 0;
  }, [task.dueDate, task.status]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    return format(new Date(dateStr), 'MMM d');
  };

  const getInitials = (name?: string) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const dependencyCount = (task.blockedByCount || 0) + (task.blocksCount || 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "group relative bg-card rounded-xl border-2 transition-all duration-200 cursor-pointer w-full",
        task.blocked
          ? "border-destructive/50 shadow-[0_0_0_3px_hsl(var(--destructive)/0.1)]"
          : "border-border hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10",
        isHovered && !isDragging && "scale-[1.02]",
        isDragging && "opacity-50 shadow-lg rotate-2",
        className
      )}
      style={{ maxWidth: '320px' }}
    >
      {/* Blocked Banner */}
      {task.blocked && (
        <div className="bg-gradient-to-r from-destructive to-destructive/90 text-destructive-foreground px-3 py-2 rounded-t-[10px] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-wide">Blocked</span>
        </div>
      )}

      <div className={cn("p-4", task.blocked ? "rounded-b-xl" : "rounded-xl")}>
        {/* Header Row: ID + Story Points + Priority */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {/* Task ID */}
            <span className="font-mono text-xs font-semibold text-muted-foreground bg-muted px-2 py-1 rounded">
              {task.key}
            </span>
            {/* Story Points */}
            {task.storyPoints && (
              <span className="flex items-center justify-center w-6 h-6 bg-primary text-primary-foreground text-xs font-bold rounded-full">
                {task.storyPoints}
              </span>
            )}
          </div>

          {/* Priority Badge */}
          <span className={cn(
            "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold border",
            priority.bg, priority.text, priority.border
          )}>
            <span className={cn("w-2 h-2 rounded-full", priority.dot)} />
            {priority.label}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-foreground text-sm leading-snug mb-3 line-clamp-2 group-hover:text-primary transition-colors">
          {task.title}
        </h3>

        {/* Blocked Reason */}
        {task.blocked && task.blockedReason && (
          <div className="bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2 mb-3">
            <p className="text-xs text-destructive leading-relaxed">
              <span className="font-semibold">Reason:</span> {task.blockedReason}
            </p>
          </div>
        )}

        {/* Tags */}
        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {task.tags.slice(0, 3).map((tag, i) => (
              <span key={i} className="px-2 py-0.5 bg-muted text-muted-foreground text-xs font-medium rounded-md">
                {tag}
              </span>
            ))}
            {task.tags.length > 3 && (
              <span className="px-2 py-0.5 bg-muted text-muted-foreground text-xs font-medium rounded-md">
                +{task.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-muted-foreground">Progress</span>
            <span className="text-xs font-bold text-foreground">{task.progress}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                task.progress === 100 ? "bg-emerald-500" :
                task.blocked ? "bg-destructive" :
                task.progress >= 70 ? "bg-primary" :
                task.progress >= 40 ? "bg-primary/70" : "bg-primary/50"
              )}
              style={{ width: `${task.progress}%` }}
            />
          </div>
        </div>

        {/* Checklist Indicator */}
        <ChecklistIndicator storyId={task.id} className="mb-3" />

        {/* Team Badge */}
        {task.teamName && (
          <div
            className="flex items-center gap-2 mb-4 px-2.5 py-1.5 rounded-lg"
            style={{ backgroundColor: task.teamColor ? `${task.teamColor}15` : 'hsl(var(--muted))' }}
          >
            <span className="text-sm">{task.teamEmoji || '👥'}</span>
            <span className="text-xs font-semibold" style={{ color: task.teamColor || 'hsl(var(--foreground))' }}>
              {task.teamName}
            </span>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-border pt-3 mb-3" />

        {/* Assignee */}
        <div className="flex items-center gap-2 mb-3">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground text-xs font-bold shadow-sm">
              {task.assigneeInitials || getInitials(task.assigneeName)}
            </div>
            {task.assigneeOnline && (
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-card rounded-full" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Assignee</p>
            <p className="text-xs font-semibold text-foreground truncate">
              {task.assigneeName?.split(' ')[0] || 'Unassigned'}
            </p>
          </div>
        </div>

        {/* Footer: Dates + Meta */}
        <div className="flex items-center justify-between">
          {/* Dates */}
          <div className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-md",
            isOverdue ? "bg-destructive/10" : "bg-muted"
          )}>
            <Calendar className={cn("w-3.5 h-3.5", isOverdue ? "text-destructive" : "text-muted-foreground")} />
            <span className={cn("text-xs font-medium", isOverdue ? "text-destructive" : "text-muted-foreground")}>
              {formatDate(task.startDate) || '—'} → {formatDate(task.dueDate) || '—'}
            </span>
          </div>

          {/* Meta Icons */}
          <div className="flex items-center gap-2">
            {/* Dependencies */}
            {dependencyCount > 0 && (
              <div className="flex items-center gap-1 text-muted-foreground" title={`Blocked by ${task.blockedByCount || 0}, Blocks ${task.blocksCount || 0}`}>
                <Link2 className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">{dependencyCount}</span>
              </div>
            )}

            {/* Comments */}
            {task.comments > 0 && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">{task.comments}</span>
              </div>
            )}

            {/* Attachments */}
            {(task.attachments || 0) > 0 && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Paperclip className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">{task.attachments}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hover Actions */}
      <div className={cn(
        "absolute top-2 right-2 flex gap-1 transition-opacity duration-200",
        isHovered && !task.blocked ? "opacity-100" : "opacity-0"
      )}>
        <button
          className="w-7 h-7 bg-card border border-border rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors shadow-sm"
          onClick={(e) => { e.stopPropagation(); }}
        >
          <Pencil className="w-4 h-4" />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="w-7 h-7 bg-card border border-border rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors shadow-sm"
              onClick={(e) => { e.stopPropagation(); }}
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-popover">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onClick(); }}>
              <Pencil className="w-4 h-4 mr-2" />
              Edit Task
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
              <Copy className="w-4 h-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
              <ArrowUp className="w-4 h-4 mr-2" />
              Move to Top
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
              <ArrowDown className="w-4 h-4 mr-2" />
              Move to Bottom
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={(e) => e.stopPropagation()} className="text-destructive focus:text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
}
