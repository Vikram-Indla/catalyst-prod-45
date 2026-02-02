import React, { useMemo, Fragment } from 'react';
import { format, addDays, differenceInDays, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import type { TaskTreeNode } from '@/types/planhub.types';

interface Props {
  tasks: TaskTreeNode[];
  onTaskClick?: (taskId: string) => void;
}

export default function GanttChart({ tasks, onTaskClick }: Props) {
  // Calculate date range
  const { startDate, endDate, months, dayWidth } = useMemo(() => {
    const allDates: Date[] = [];
    
    const collectDates = (taskList: TaskTreeNode[]) => {
      taskList.forEach(task => {
        if (task.start_date) allDates.push(new Date(task.start_date));
        if (task.end_date) allDates.push(new Date(task.end_date));
        if (task.children.length) collectDates(task.children);
      });
    };
    
    collectDates(tasks);
    
    if (allDates.length === 0) {
      const today = new Date();
      return {
        startDate: startOfMonth(today),
        endDate: endOfMonth(addDays(today, 90)),
        months: eachMonthOfInterval({ start: startOfMonth(today), end: endOfMonth(addDays(today, 90)) }),
        dayWidth: 4,
      };
    }
    
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    
    const start = startOfMonth(addDays(minDate, -7));
    const end = endOfMonth(addDays(maxDate, 14));
    
    return {
      startDate: start,
      endDate: end,
      months: eachMonthOfInterval({ start, end }),
      dayWidth: 4,
    };
  }, [tasks]);

  const totalDays = differenceInDays(endDate, startDate);
  const chartWidth = totalDays * dayWidth;

  const getBarPosition = (task: TaskTreeNode) => {
    if (!task.start_date) return null;
    
    const taskStart = new Date(task.start_date);
    const taskEnd = task.end_date ? new Date(task.end_date) : addDays(taskStart, task.days);
    
    const left = differenceInDays(taskStart, startDate) * dayWidth;
    const width = Math.max(differenceInDays(taskEnd, taskStart) * dayWidth, 16);
    
    return { left, width };
  };

  const renderRow = (task: TaskTreeNode): React.ReactNode => {
    const position = getBarPosition(task);
    
    return (
      <Fragment key={task.id}>
        <div className="ph-gantt-row">
          {position && (
            <div
              className={`ph-gantt-bar ${task.type}`}
              style={{
                left: position.left,
                width: task.type === 'milestone' ? 16 : position.width,
              }}
              onClick={() => onTaskClick?.(task.id)}
              title={`${task.name} (${task.progress}%)`}
            >
              {task.type !== 'milestone' && (
                <>
                  <div
                    className="ph-gantt-progress"
                    style={{ width: `${task.progress}%` }}
                  />
                  <span className="ph-gantt-label">
                    {task.name}
                  </span>
                </>
              )}
            </div>
          )}
        </div>
        
        {/* Children */}
        {task.is_expanded && task.children.map(child => renderRow(child))}
      </Fragment>
    );
  };

  // Today line position
  const today = new Date();
  const todayOffset = differenceInDays(today, startDate) * dayWidth;
  const showTodayLine = today >= startDate && today <= endDate;

  return (
    <div className="ph-gantt">
      {/* Month Headers */}
      <div className="ph-gantt-header" style={{ width: chartWidth }}>
        {months.map((month, idx) => {
          const monthStart = idx === 0 ? startDate : month;
          const monthEnd = idx === months.length - 1 ? endDate : endOfMonth(month);
          const monthDays = differenceInDays(monthEnd, monthStart) + 1;
          const monthWidth = monthDays * dayWidth;
          
          return (
            <div
              key={month.toISOString()}
              className="ph-gantt-month"
              style={{ width: monthWidth, minWidth: monthWidth }}
            >
              {format(month, 'MMMM yyyy')}
            </div>
          );
        })}
      </div>

      {/* Rows */}
      <div className="ph-gantt-body" style={{ width: chartWidth, position: 'relative' }}>
        {/* Today line */}
        {showTodayLine && (
          <div
            className="ph-gantt-today"
            style={{ left: todayOffset }}
          />
        )}

        {tasks.length === 0 ? (
          <div className="ph-empty" style={{ padding: 'var(--ph-space-8)', textAlign: 'center' }}>
            <span className="ph-text-gray-500">Add tasks with dates to see the timeline</span>
          </div>
        ) : (
          tasks.map(task => renderRow(task))
        )}
      </div>
    </div>
  );
}
