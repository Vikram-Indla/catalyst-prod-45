// ============================================================
// PLANNER TIMELINE (GANTT) VIEW - ENTERPRISE STYLE
// Clean white bars with workstream-based color stripes
// ============================================================

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { PlannerTask } from '../types';
import { motion } from 'framer-motion';
import { addDays, startOfWeek, format, differenceInDays, isToday, isWeekend } from 'date-fns';
import { GanttBarEnterprise } from './timeline/GanttBarEnterprise';
import { TimelineTaskRow } from './timeline/TimelineTaskRow';
import { TodayLine } from './timeline/TodayLine';

interface PlannerTimelineProps {
  tasks: PlannerTask[];
  onTaskClick: (task: PlannerTask) => void;
}

type ZoomLevel = 'day' | 'week' | 'month';

export function PlannerTimeline({ tasks, onTaskClick }: PlannerTimelineProps) {
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('week');
  const [viewStart, setViewStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Generate date columns based on zoom level
  const dateColumns = useMemo(() => {
    const columns: Date[] = [];
    const numDays = zoomLevel === 'day' ? 14 : zoomLevel === 'week' ? 28 : 60;
    
    for (let i = 0; i < numDays; i++) {
      columns.push(addDays(viewStart, i));
    }
    return columns;
  }, [viewStart, zoomLevel]);

  // Column width based on zoom
  const columnWidth = zoomLevel === 'day' ? 60 : zoomLevel === 'week' ? 48 : 24;

  // Calculate bar position and width for each task
  const getTaskBar = (task: PlannerTask) => {
    const startDate = task.startDate ? new Date(task.startDate) : new Date();
    const endDate = task.dueDate ? new Date(task.dueDate) : addDays(startDate, 5);
    
    const startOffset = differenceInDays(startDate, viewStart);
    const duration = Math.max(1, differenceInDays(endDate, startDate) + 1);
    
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

  // Calculate today line position
  const todayPosition = differenceInDays(new Date(), viewStart) * columnWidth + columnWidth / 2;
  const showTodayLine = todayPosition > 0 && todayPosition < dateColumns.length * columnWidth;

  const handleTaskClick = (task: PlannerTask) => {
    setSelectedTaskId(task.id);
    onTaskClick(task);
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-950">
      {/* Header Controls */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            <CalendarDays className="w-4 h-4 mr-2" />
            Today
          </Button>
          <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900">
            <Button variant="ghost" size="sm" onClick={() => navigateView('prev')}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="px-3 text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[140px] text-center">
              {format(viewStart, 'MMM d')} - {format(addDays(viewStart, dateColumns.length - 1), 'MMM d, yyyy')}
            </span>
            <Button variant="ghost" size="sm" onClick={() => navigateView('next')}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-md p-0.5">
          {(['day', 'week', 'month'] as const).map(level => (
            <button
              key={level}
              onClick={() => setZoomLevel(level)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded transition-colors capitalize",
                zoomLevel === level 
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm" 
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
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
          <div className="w-[320px] flex-shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
            <div className="h-10 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex items-center px-3 sticky top-0 z-10">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Tasks ({tasks.length})
              </span>
            </div>
            <div>
              {tasks.map((task) => (
                <TimelineTaskRow
                  key={task.id}
                  task={task}
                  isSelected={selectedTaskId === task.id}
                  isHovered={hoveredTaskId === task.id}
                  onClick={() => handleTaskClick(task)}
                  onHover={(hovered) => setHoveredTaskId(hovered ? task.id : null)}
                />
              ))}
            </div>
          </div>

          {/* Gantt Chart Area */}
          <div className="flex-1 overflow-x-auto">
            {/* Date Headers */}
            <div className="flex h-10 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
              {dateColumns.map((date, i) => {
                const isCurrentDay = isToday(date);
                // Saudi weekend is Friday (5) and Saturday (6)
                const dayOfWeek = date.getDay();
                const isSaudiWeekend = dayOfWeek === 5 || dayOfWeek === 6;
                
                return (
                  <div
                    key={i}
                    className={cn(
                      "flex-shrink-0 flex flex-col items-center justify-center border-r border-gray-100 dark:border-gray-800 text-[10px]",
                      isCurrentDay && "bg-blue-100 dark:bg-blue-950/50",
                      isSaudiWeekend && !isCurrentDay && "bg-gray-200 dark:bg-gray-800"
                    )}
                    style={{ width: columnWidth }}
                  >
                    <span className={cn(
                      "font-medium",
                      isCurrentDay ? "text-blue-600" : isSaudiWeekend ? "text-gray-500" : "text-gray-400 dark:text-gray-500"
                    )}>
                      {format(date, 'EEE')}
                    </span>
                    <span className={cn(
                      "font-semibold",
                      isCurrentDay ? "text-blue-600" : isSaudiWeekend ? "text-gray-600" : "text-gray-700 dark:text-gray-300"
                    )}>
                      {format(date, 'd')}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Task Rows with Bars */}
            <div className="relative" style={{ minWidth: dateColumns.length * columnWidth }}>
              {/* Grid Background */}
              <div className="absolute inset-0 flex pointer-events-none">
                {dateColumns.map((date, i) => {
                  const isCurrentDay = isToday(date);
                  // Saudi weekend is Friday (5) and Saturday (6)
                  const dayOfWeek = date.getDay();
                  const isSaudiWeekend = dayOfWeek === 5 || dayOfWeek === 6;
                  
                  return (
                    <div
                      key={i}
                      className={cn(
                        "flex-shrink-0 border-r border-gray-100 dark:border-gray-800",
                        isCurrentDay && "bg-blue-50/50 dark:bg-blue-950/20",
                        isSaudiWeekend && !isCurrentDay && "bg-gray-100 dark:bg-gray-800/50"
                      )}
                      style={{ width: columnWidth }}
                    />
                  );
                })}
              </div>

              {/* Today Line */}
              {showTodayLine && <TodayLine position={todayPosition} />}

              {/* Task Bars */}
              {tasks.map((task, index) => {
                const bar = getTaskBar(task);
                const isHovered = hoveredTaskId === task.id;

                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    className={cn(
                      "relative h-16 border-b border-gray-100 dark:border-gray-800",
                      index % 2 === 1 && "bg-gray-50/30 dark:bg-gray-900/20"
                    )}
                  >
                    <GanttBarEnterprise
                      task={task}
                      left={bar.left}
                      width={bar.width}
                      isHovered={isHovered}
                      onClick={() => handleTaskClick(task)}
                      onHover={(hovered) => setHoveredTaskId(hovered ? task.id : null)}
                    />
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {tasks.length === 0 && (
        <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <CalendarDays className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p className="text-sm font-medium">No tasks to display on timeline</p>
            <p className="text-xs text-gray-400 mt-1">Tasks with start dates will appear here</p>
          </div>
        </div>
      )}
    </div>
  );
}
