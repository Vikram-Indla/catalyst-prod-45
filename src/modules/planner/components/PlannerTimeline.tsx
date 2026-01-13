// ============================================================
// PLANNER TIMELINE (GANTT) VIEW
// Gantt chart with zoom controls and drag-to-reschedule
// ============================================================

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { PlannerTask } from '../types';
import { PRIORITY_CONFIG } from '../types';
import { motion } from 'framer-motion';
import { addDays, startOfWeek, endOfWeek, format, differenceInDays, isToday, isWeekend } from 'date-fns';

interface PlannerTimelineProps {
  tasks: PlannerTask[];
  onTaskClick: (task: PlannerTask) => void;
}

type ZoomLevel = 'day' | 'week' | 'month';

export function PlannerTimeline({ tasks, onTaskClick }: PlannerTimelineProps) {
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('week');
  const [viewStart, setViewStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));

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
          {/* Task List Column */}
          <div className="w-[264px] flex-shrink-0 border-r border-border bg-surface-0">
            <div className="h-10 border-b border-border bg-surface-1 flex items-center px-3">
              <span className="text-xs font-semibold text-text-muted uppercase">Tasks</span>
            </div>
            <div>
              {tasks.map((task, index) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  onClick={() => onTaskClick(task)}
                  className="flex items-center gap-2 px-3 py-2 border-b border-border hover:bg-surface-1 cursor-pointer h-10"
                >
                  {task.assigneeInitials && (
                    <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-medium flex-shrink-0">
                      {task.assigneeInitials}
                    </div>
                  )}
                  <span className="text-sm text-text-primary truncate flex-1">{task.title}</span>
                  <span className="text-[10px] font-mono text-text-muted">{task.key}</span>
                </motion.div>
              ))}
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
                    isToday(date) && "bg-blue-50",
                    isWeekend(date) && "bg-surface-2"
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
                      isToday(date) && "bg-blue-50/30",
                      isWeekend(date) && "bg-surface-2/50"
                    )}
                    style={{ width: columnWidth }}
                  />
                ))}
              </div>

              {/* Today Line */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
                style={{
                  left: differenceInDays(new Date(), viewStart) * columnWidth + columnWidth / 2,
                }}
              />

              {/* Task Bars */}
              {tasks.map((task, index) => {
                const bar = getTaskBar(task);
                const priorityConfig = PRIORITY_CONFIG[task.priority];

                return (
                  <div
                    key={task.id}
                    className="relative h-10 border-b border-border"
                    style={{ width: dateColumns.length * columnWidth }}
                  >
                    <motion.div
                      initial={{ opacity: 0, scaleX: 0 }}
                      animate={{ opacity: 1, scaleX: 1 }}
                      transition={{ delay: index * 0.03, type: 'spring' }}
                      onClick={() => onTaskClick(task)}
                      className={cn(
                        "absolute top-1.5 h-7 rounded cursor-pointer",
                        "flex items-center px-2 text-white text-xs font-medium truncate",
                        "hover:brightness-110 transition-all",
                        task.blocked && "opacity-50"
                      )}
                      style={{
                        left: Math.max(0, bar.left),
                        width: bar.width,
                        backgroundColor: priorityConfig.color,
                        transformOrigin: 'left',
                      }}
                    >
                      {/* Progress Fill */}
                      <div
                        className="absolute inset-0 bg-white/20 rounded-l"
                        style={{ width: `${task.progress}%` }}
                      />
                      <span className="relative z-10 truncate">{task.title}</span>
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
