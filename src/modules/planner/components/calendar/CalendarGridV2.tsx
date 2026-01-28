// ============================================================
// CALENDAR GRID V2
// Enhanced grid with week numbers, capacity panel, keyboard nav
// ============================================================

import { useMemo, useState, useCallback, useEffect } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval,
  eachWeekOfInterval,
  isSameMonth, 
  isSameDay,
  isToday,
  getWeek,
  isWeekend as isWeekendDay,
} from 'date-fns';
import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import type { PlannerTask } from '../../types';
import { TaskPillV2 } from './TaskPillV2';
import { TaskContextMenu } from './TaskContextMenu';
import '../../styles/planner-calendar.css';

interface CalendarGridV2Props {
  currentDate: Date;
  tasks: PlannerTask[];
  view: 'month' | 'week';
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  onTaskClick: (task: PlannerTask) => void;
  onTaskDrop: (taskId: string, newDate: Date) => void;
  onQuickAdd: (date: Date) => void;
  statuses?: { id: string; name: string; color: string }[];
  users?: { id: string; name: string; initials: string }[];
  onTaskAction?: (action: string, taskId: string, payload?: any) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MAX_VISIBLE_TASKS = 3;

export function CalendarGridV2({
  currentDate,
  tasks,
  view,
  selectedDate,
  onDateSelect,
  onTaskClick,
  onTaskDrop,
  onQuickAdd,
  statuses = [],
  users = [],
  onTaskAction,
}: CalendarGridV2Props) {
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    task: PlannerTask;
    position: { x: number; y: number };
  } | null>(null);
  const [focusedDate, setFocusedDate] = useState<Date | null>(null);

  // Calculate grid data
  const { weeks, days } = useMemo(() => {
    if (view === 'month') {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
      const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
      
      const allDays = eachDayOfInterval({ start: gridStart, end: gridEnd });
      const weekStarts = eachWeekOfInterval(
        { start: gridStart, end: gridEnd },
        { weekStartsOn: 0 }
      );
      
      return {
        weeks: weekStarts,
        days: allDays,
      };
    } else {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
      return {
        weeks: [weekStart],
        days: eachDayOfInterval({ start: weekStart, end: weekEnd }),
      };
    }
  }, [currentDate, view]);

  // Group tasks by date
  const tasksByDate = useMemo(() => {
    const map = new Map<string, PlannerTask[]>();
    tasks.forEach(task => {
      if (task.dueDate) {
        const dateKey = format(new Date(task.dueDate), 'yyyy-MM-dd');
        const existing = map.get(dateKey) || [];
        map.set(dateKey, [...existing, task]);
      }
    });
    return map;
  }, [tasks]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const current = focusedDate || selectedDate || new Date();
      let newDate: Date | null = null;

      switch (e.key) {
        case 'ArrowLeft':
          newDate = new Date(current);
          newDate.setDate(newDate.getDate() - 1);
          break;
        case 'ArrowRight':
          newDate = new Date(current);
          newDate.setDate(newDate.getDate() + 1);
          break;
        case 'ArrowUp':
          newDate = new Date(current);
          newDate.setDate(newDate.getDate() - 7);
          break;
        case 'ArrowDown':
          newDate = new Date(current);
          newDate.setDate(newDate.getDate() + 7);
          break;
        case 'Enter':
          if (focusedDate) {
            onDateSelect(focusedDate);
          }
          break;
        case 'n':
        case 'N':
          if (focusedDate) {
            onQuickAdd(focusedDate);
          }
          break;
      }

      if (newDate) {
        e.preventDefault();
        setFocusedDate(newDate);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [focusedDate, selectedDate, onDateSelect, onQuickAdd]);

  // Drag handlers
  const handleDragOver = useCallback((e: React.DragEvent, dateKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget(dateKey);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDropTarget(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, date: Date) => {
    e.preventDefault();
    setDropTarget(null);
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      onTaskDrop(taskId, date);
    }
  }, [onTaskDrop]);

  // Context menu handler
  const handleContextMenu = useCallback((e: React.MouseEvent, task: PlannerTask) => {
    setContextMenu({
      task,
      position: { x: e.clientX, y: e.clientY },
    });
  }, []);

  const handleContextAction = useCallback((action: string, payload?: any) => {
    if (contextMenu && onTaskAction) {
      onTaskAction(action, contextMenu.task.id, payload);
    }
  }, [contextMenu, onTaskAction]);

  return (
    <div className="planner-calendar-content flex-1 flex flex-col overflow-hidden">
      {/* Header with week days */}
      <div className="cal-grid-header">
        <div className="cal-grid-header-cell">WK</div>
        {WEEKDAYS.map((day, idx) => (
          <div 
            key={day} 
            className={`cal-grid-header-cell ${idx === 0 || idx === 6 ? 'weekend' : ''}`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Weeks */}
      <div className="flex-1 overflow-auto border border-slate-200 rounded-b-lg">
        {weeks.map((weekStart, weekIdx) => {
          const weekNumber = getWeek(weekStart);
          const weekDays = days.filter(d => 
            d >= weekStart && d < new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
          );

          return (
            <div key={weekStart.toISOString()} className="cal-week-row">
              {/* Week Number */}
              <div className="cal-week-number">
                W{String(weekNumber).padStart(2, '0')}
              </div>

              {/* Day Cells */}
              {weekDays.map((date, dayIdx) => {
                const dateKey = format(date, 'yyyy-MM-dd');
                const dayTasks = tasksByDate.get(dateKey) || [];
                const isCurrentMonth = view === 'week' || isSameMonth(date, currentDate);
                const isTodayDate = isToday(date);
                const isSelected = selectedDate && isSameDay(date, selectedDate);
                const isFocused = focusedDate && isSameDay(date, focusedDate);
                const isWeekend = isWeekendDay(date);
                const isDropTarget = dropTarget === dateKey;

                const visibleTasks = dayTasks.slice(0, MAX_VISIBLE_TASKS);
                const remainingCount = dayTasks.length - MAX_VISIBLE_TASKS;

                return (
                  <motion.div
                    key={dateKey}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: (weekIdx * 7 + dayIdx) * 0.01 }}
                    className={`cal-day-cell ${isWeekend ? 'weekend' : ''} ${!isCurrentMonth ? 'adjacent' : ''} ${isTodayDate ? 'today' : ''} ${isSelected ? 'selected' : ''} ${isFocused ? 'cal-keyboard-focus' : ''} ${isDropTarget ? 'drop-target' : ''}`}
                    onClick={() => onDateSelect(date)}
                    onDragOver={(e) => handleDragOver(e, dateKey)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, date)}
                    tabIndex={0}
                    role="gridcell"
                    aria-label={`${format(date, 'MMMM d, yyyy')}, ${dayTasks.length} tasks`}
                  >
                    {/* Day Header */}
                    <div className="cal-day-header">
                      <span className="cal-day-number">
                        {format(date, 'd')}
                      </span>
                      <button
                        className="cal-day-add-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onQuickAdd(date);
                        }}
                        title="Add task"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Task Count Badge (if many tasks) */}
                    {dayTasks.length > 3 && (
                      <div className="cal-task-count-badge">
                        {dayTasks.length}
                      </div>
                    )}

                    {/* Tasks */}
                    <div className="cal-day-tasks">
                      {visibleTasks.map(task => (
                        <TaskPillV2
                          key={task.id}
                          task={task}
                          onClick={() => onTaskClick(task)}
                          onContextMenu={handleContextMenu}
                          compact
                        />
                      ))}

                      {remainingCount > 0 && (
                        <button
                          className="cal-more-tasks"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDateSelect(date);
                          }}
                        >
                          +{remainingCount} more
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <TaskContextMenu
          task={contextMenu.task}
          position={contextMenu.position}
          onClose={() => setContextMenu(null)}
          onAction={handleContextAction}
          statuses={statuses}
          users={users}
        />
      )}
    </div>
  );
}
