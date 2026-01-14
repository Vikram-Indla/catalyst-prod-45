// ============================================================
// PLANNER TIMELINE (GANTT) VIEW
// Gantt chart with zoom controls and drag-to-reschedule
// Catalyst V5 semantic colors with priority-based styling
// ============================================================

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { PlannerTask, TaskPriority } from '../types';
import { PRIORITY_CONFIG, getProgressColor } from '../types';
import { motion } from 'framer-motion';
import { addDays, startOfWeek, format, differenceInDays, isToday, isWeekend } from 'date-fns';

interface PlannerTimelineProps {
  tasks: PlannerTask[];
  onTaskClick: (task: PlannerTask) => void;
}

type ZoomLevel = 'day' | 'week' | 'month';

// Priority-based bar colors for Gantt bars
const PRIORITY_BAR_COLORS: Record<TaskPriority, { bg: string; fill: string }> = {
  critical: { bg: 'rgba(239, 68, 68, 0.25)', fill: '#ef4444' },   // red-500
  high: { bg: 'rgba(217, 119, 6, 0.25)', fill: '#d97706' },       // amber-600
  medium: { bg: 'rgba(37, 99, 235, 0.25)', fill: '#2563eb' },     // blue-600
  low: { bg: 'rgba(156, 163, 175, 0.25)', fill: '#9ca3af' },      // gray-400
};

// Priority icons
const PRIORITY_ICONS: Record<TaskPriority, string> = {
  critical: '⚠️',
  high: '🔥',
  medium: '●',
  low: '○',
};

export function PlannerTimeline({ tasks, onTaskClick }: PlannerTimelineProps) {
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('week');
  const [viewStart, setViewStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);

  // Generate date columns based on zoom level
  const dateColumns = useMemo(() => {
    const columns: Date[] = [];
    const numDays = zoomLevel === 'day' ? 14 : zoomLevel === 'week' ? 28 : 60;
    
    for (let i = 0; i < numDays; i++) {
      columns.push(addDays(viewStart, i));
    }
    return columns;
  }, [viewStart, zoomLevel]);

  // Calculate bar position and width for each task
  const getTaskBar = (task: PlannerTask) => {
    const startDate = task.startDate ? new Date(task.startDate) : new Date();
    const endDate = task.dueDate ? new Date(task.dueDate) : addDays(startDate, 5);
    
    const startOffset = differenceInDays(startDate, viewStart);
    const duration = Math.max(1, differenceInDays(endDate, startDate) + 1);
    
    const columnWidth = zoomLevel === 'day' ? 60 : zoomLevel === 'week' ? 40 : 20;
    
    return {
      left: startOffset * columnWidth,
      width: duration * columnWidth,
    };
  };

  const navigateView = (direction: 'prev' | 'next') => {
    const days = zoomLevel === 'day' ? 7 : zoomLevel === 'week' ? 14 : 30;
    setViewStart(prev => addDays(prev, direction === 'next' ? days : -days));
  };

  const goToToday = () => {
    setViewStart(startOfWeek(new Date(), { weekStartsOn: 0 }));
  };

  const columnWidth = zoomLevel === 'day' ? 60 : zoomLevel === 'week' ? 40 : 20;

  // Calculate today line position
  const todayPosition = differenceInDays(new Date(), viewStart) * columnWidth + columnWidth / 2;

  return (
    <div className="h-full flex flex-col bg-surface-0">
      {/* Header Controls */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-1">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            <CalendarDays className="w-4 h-4 mr-2" />
            Today
          </Button>
          <div className="flex items-center border rounded-md">
            <Button variant="ghost" size="sm" onClick={() => navigateView('prev')}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="px-3 text-sm font-medium text-text-primary min-w-[140px] text-center">
              {format(viewStart, 'MMM d')} - {format(addDays(viewStart, dateColumns.length - 1), 'MMM d, yyyy')}
            </span>
            <Button variant="ghost" size="sm" onClick={() => navigateView('next')}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-surface-2 rounded-md p-0.5">
          {(['day', 'week', 'month'] as const).map(level => (
            <button
              key={level}
              onClick={() => setZoomLevel(level)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded transition-colors capitalize",
                zoomLevel === level 
                  ? "bg-white text-text-primary shadow-sm" 
                  : "text-text-muted hover:text-text-secondary"
              )}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline Content */}
      <div className="flex-1 overflow-auto">
        <div className="flex min-h-full">
          {/* Task List Column (Left Panel) */}
          <div className="w-[320px] flex-shrink-0 border-r border-border bg-surface-0">
            <div className="h-10 border-b border-border bg-surface-1 flex items-center px-3">
              <span className="text-xs font-semibold text-text-muted uppercase">Tasks</span>
            </div>
            <div>
              {tasks.map((task, index) => {
                const priorityConfig = PRIORITY_CONFIG[task.priority];
                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                    onClick={() => onTaskClick(task)}
                    onMouseEnter={() => setHoveredTaskId(task.id)}
                    onMouseLeave={() => setHoveredTaskId(null)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 border-b border-border cursor-pointer h-16",
                      "hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors"
                    )}
                  >
                    {/* Priority bar indicator */}
                    <div 
                      className="w-1 h-10 rounded-full flex-shrink-0"
                      style={{ backgroundColor: priorityConfig.color }}
                    />
                    {/* Task info */}
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px]">{PRIORITY_ICONS[task.priority]}</span>
                        <span className="text-sm font-semibold text-text-primary truncate">{task.title}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono font-semibold text-muted-foreground">{task.key}</span>
                        {task.assigneeName && (
                          <>
                            <span className="text-muted-foreground">•</span>
                            <div className="flex items-center gap-1">
                              <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-[8px] font-bold">
                                {task.assigneeInitials}
                              </div>
                              <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">
                                {task.assigneeName}
                              </span>
                            </div>
                          </>
                        )}
                        {task.teamName && (
                          <>
                            <span className="text-muted-foreground">•</span>
                            <span 
                              className="text-[10px] font-semibold truncate max-w-[80px] px-1.5 py-0.5 rounded"
                              style={{ 
                                backgroundColor: `${task.teamColor}15`,
                                color: task.teamColor || '#6b7280'
                              }}
                            >
                              {task.teamName}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Gantt Chart Area */}
          <div className="flex-1 overflow-x-auto">
            {/* Date Headers */}
            <div className="flex h-10 border-b border-border bg-surface-1 sticky top-0 z-10">
              {dateColumns.map((date, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex-shrink-0 flex flex-col items-center justify-center border-r border-border text-[10px]",
                    isToday(date) && "bg-blue-50 dark:bg-blue-950/30",
                    isWeekend(date) && !isToday(date) && "bg-muted/50"
                  )}
                  style={{ width: columnWidth }}
                >
                  <span className="font-medium text-text-muted">{format(date, 'EEE')}</span>
                  <span className={cn(
                    "font-semibold",
                    isToday(date) ? "text-blue-600" : "text-text-primary"
                  )}>
                    {format(date, 'd')}
                  </span>
                </div>
              ))}
            </div>

            {/* Task Rows with Bars */}
            <div className="relative">
              {/* Grid Background */}
              <div className="absolute inset-0 flex pointer-events-none">
                {dateColumns.map((date, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex-shrink-0 border-r border-border",
                      isToday(date) && "bg-blue-50/30 dark:bg-blue-950/10",
                      isWeekend(date) && !isToday(date) && "bg-muted/30"
                    )}
                    style={{ width: columnWidth }}
                  />
                ))}
              </div>

              {/* Today Line - Bold blue with dot */}
              {todayPosition > 0 && todayPosition < dateColumns.length * columnWidth && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-blue-600 z-20"
                  style={{ left: todayPosition }}
                >
                  {/* Dot at top */}
                  <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-blue-600 rounded-full" />
                </div>
              )}

              {/* Task Bars */}
              {tasks.map((task, index) => {
                const bar = getTaskBar(task);
                const barColors = PRIORITY_BAR_COLORS[task.priority];
                const progressColor = getProgressColor(task.progress);
                const isHovered = hoveredTaskId === task.id;

                return (
                  <div
                    key={task.id}
                    className="relative h-16 border-b border-border"
                    style={{ width: dateColumns.length * columnWidth }}
                  >
                    <motion.div
                      initial={{ opacity: 0, scaleX: 0 }}
                      animate={{ opacity: 1, scaleX: 1 }}
                      transition={{ delay: index * 0.03, type: 'spring' }}
                      onClick={() => onTaskClick(task)}
                      onMouseEnter={() => setHoveredTaskId(task.id)}
                      onMouseLeave={() => setHoveredTaskId(null)}
                      className={cn(
                        "absolute top-3 h-10 rounded-md cursor-pointer",
                        "flex items-center px-2.5 text-xs font-medium truncate",
                        "transition-all duration-200",
                        isHovered && "shadow-lg -translate-y-0.5",
                        task.blocked && "opacity-60"
                      )}
                      style={{
                        left: Math.max(0, bar.left),
                        width: Math.max(40, bar.width),
                        backgroundColor: barColors.bg,
                        transformOrigin: 'left',
                      }}
                    >
                      {/* Progress Fill */}
                      <div
                        className="absolute inset-0 rounded-md"
                        style={{ 
                          width: `${task.progress}%`, 
                          backgroundColor: barColors.fill,
                          opacity: 0.6
                        }}
                      />
                      
                      {/* Content */}
                      <div className="relative z-10 flex items-center justify-between w-full gap-2">
                        <span 
                          className="truncate font-semibold drop-shadow-sm"
                          style={{ color: barColors.fill }}
                        >
                          {bar.width > 80 ? task.title : task.key}
                        </span>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span 
                            className="text-[10px] font-bold drop-shadow-sm"
                            style={{ color: barColors.fill }}
                          >
                            {task.progress}%
                          </span>
                          {task.assigneeInitials && (
                            <div className="w-6 h-6 rounded-full bg-white/90 flex items-center justify-center text-[10px] font-bold text-gray-700 shadow-sm">
                              {task.assigneeInitials}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Hover Tooltip */}
                      {isHovered && bar.width < 200 && (
                        <div className="absolute bottom-full left-0 mb-2 bg-gray-900 text-white p-3 rounded-lg text-xs min-w-[200px] z-50 shadow-xl">
                          <div className="font-semibold mb-2">{task.title}</div>
                          <div className="flex justify-between mb-1">
                            <span className="text-gray-400">Key</span>
                            <span>{task.key}</span>
                          </div>
                          <div className="flex justify-between mb-1">
                            <span className="text-gray-400">Dates</span>
                            <span>{task.startDate ? format(new Date(task.startDate), 'MMM d') : '—'} – {task.dueDate ? format(new Date(task.dueDate), 'MMM d') : '—'}</span>
                          </div>
                          {task.teamName && (
                            <div className="flex justify-between mb-1">
                              <span className="text-gray-400">Workstream</span>
                              <span>{task.teamName}</span>
                            </div>
                          )}
                          <div className="mt-2 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full"
                              style={{ width: `${task.progress}%`, backgroundColor: progressColor }}
                            />
                          </div>
                        </div>
                      )}
                    </motion.div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {tasks.length === 0 && (
        <div className="flex-1 flex items-center justify-center text-text-muted">
          No tasks to display on timeline
        </div>
      )}
    </div>
  );
}
