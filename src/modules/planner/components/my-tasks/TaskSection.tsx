// ============================================================
// TASK SECTION - Enterprise Linear-Aligned V2
// Ring-fenced CSS: mytasks-section-header, uppercase labels
// ============================================================

import { AlertCircle, Clock, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TaskRow } from './TaskRow';
import type { MyTask } from '../../types/my-tasks';

interface TaskSectionProps {
  title: string;
  color: string;
  tasks: MyTask[];
  onOpenDetail: (taskId: string) => void;
}

export function TaskSection({
  title,
  color,
  tasks,
  onOpenDetail,
}: TaskSectionProps) {
  if (tasks.length === 0) return null;

  const isOverdue = title.toLowerCase() === 'overdue';
  const isToday = title.toLowerCase() === 'today';
  const isUpcoming = title.toLowerCase() === 'this week' || title.toLowerCase() === 'later';

  // Get section icon
  const SectionIcon = isOverdue ? AlertCircle : isToday ? Clock : Calendar;
  const iconClass = isOverdue 
    ? 'mytasks-section-header__icon--overdue' 
    : isToday 
      ? 'mytasks-section-header__icon--today' 
      : 'mytasks-section-header__icon--upcoming';

  const titleClass = isOverdue 
    ? 'mytasks-section-header__title--overdue' 
    : isToday 
      ? 'mytasks-section-header__title--today' 
      : 'mytasks-section-header__title--upcoming';

  return (
    <div className="mb-2">
      {/* Section Header - Linear style */}
      <div className="mytasks-section-header">
        <SectionIcon className={cn('mytasks-section-header__icon', iconClass)} />
        <h3 className={cn('mytasks-section-header__title', titleClass)}>
          {title.toUpperCase()}
        </h3>
        <span className="mytasks-section-header__count">{tasks.length}</span>
      </div>

      {/* Task Rows */}
      <div>
        {tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            onOpenDetail={onOpenDetail}
            isOverdueSection={isOverdue}
          />
        ))}
      </div>
    </div>
  );
}
