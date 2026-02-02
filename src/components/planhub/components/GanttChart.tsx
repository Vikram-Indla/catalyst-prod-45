import React, { useMemo } from 'react';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, addMonths, differenceInDays, parseISO } from 'date-fns';
import type { TaskTreeNode } from '@/types/planhub.types';

interface Props {
  tasks: TaskTreeNode[];
}

export default function GanttChart({ tasks }: Props) {
  // Calculate date range
  const { startDate, endDate, months } = useMemo(() => {
    const allTasks = flattenAllTasks(tasks);
    const dates = allTasks
      .flatMap(t => [t.start_date, t.end_date])
      .filter(Boolean)
      .map(d => new Date(d as string));

    if (dates.length === 0) {
      const now = new Date();
      return {
        startDate: startOfMonth(now),
        endDate: endOfMonth(addMonths(now, 2)),
        months: [now, addMonths(now, 1), addMonths(now, 2)].map(d => format(d, 'MMM yyyy'))
      };
    }

    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    const start = startOfMonth(minDate);
    const end = endOfMonth(maxDate);
    
    const monthsList: string[] = [];
    let current = start;
    while (current <= end) {
      monthsList.push(format(current, 'MMM yyyy'));
      current = addMonths(current, 1);
    }

    return { startDate: start, endDate: end, months: monthsList };
  }, [tasks]);

  const totalDays = differenceInDays(endDate, startDate) + 1;
  const dayWidth = 6; // pixels per day
  const chartWidth = totalDays * dayWidth;

  const flatTasks = flattenAllTasks(tasks);

  const getBarPosition = (task: TaskTreeNode) => {
    if (!task.start_date || !task.end_date) return null;
    
    const taskStart = parseISO(task.start_date);
    const taskEnd = parseISO(task.end_date);
    
    const left = differenceInDays(taskStart, startDate) * dayWidth;
    const width = (differenceInDays(taskEnd, taskStart) + 1) * dayWidth;
    
    return { left, width };
  };

  return (
    <div className="ph-gantt">
      {/* Header */}
      <div className="ph-gantt-header" style={{ minWidth: chartWidth }}>
        {months.map((month, i) => (
          <div 
            key={i} 
            className="ph-gantt-month"
            style={{ minWidth: 160, flexShrink: 0 }}
          >
            {month}
          </div>
        ))}
      </div>

      {/* Rows */}
      {flatTasks.length === 0 ? (
        <div className="ph-empty" style={{ padding: 'var(--ph-space-8)', minWidth: chartWidth }}>
          <p className="ph-text-gray-500">No tasks with dates to display.</p>
        </div>
      ) : (
        flatTasks.map(task => {
          const position = getBarPosition(task);
          
          return (
            <div key={task.id} className="ph-gantt-row" style={{ minWidth: chartWidth }}>
              {position && (
                <div
                  className={`ph-gantt-bar ${task.type}`}
                  style={{
                    left: position.left,
                    width: task.type === 'milestone' ? 16 : position.width,
                  }}
                  title={`${task.name} (${task.progress}%)`}
                >
                  {task.type !== 'milestone' && (
                    <>
                      <div 
                        className="ph-gantt-progress" 
                        style={{ width: `${task.progress}%` }} 
                      />
                      <span style={{ position: 'relative', zIndex: 1 }}>
                        {position.width > 60 ? task.name : ''}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

function flattenAllTasks(nodes: TaskTreeNode[]): TaskTreeNode[] {
  const result: TaskTreeNode[] = [];
  const traverse = (items: TaskTreeNode[]) => {
    for (const node of items) {
      result.push(node);
      if (node.children.length > 0) {
        traverse(node.children);
      }
    }
  };
  traverse(nodes);
  return result;
}
