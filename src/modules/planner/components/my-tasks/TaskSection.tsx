// ============================================================
// TASK SECTION - Enterprise Clean V1
// Sentence case headers, hidden dots, card-based tasks
// ============================================================

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

  return (
    <div className="mb-6">
      {/* Section Header - Enterprise Clean: Sentence case, no dots */}
      <div className={cn('mt-section-header', isOverdue && 'section-overdue')}>
        {/* Hidden dot for backward compat */}
        <span className="mt-section-dot" style={{ backgroundColor: color }} />
        <h3 className="mt-section-title">{title}</h3>
        <span className="mt-section-count">{tasks.length}</span>
      </div>

      {/* Task Cards - Enterprise Clean style */}
      <div className="space-y-0">
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
