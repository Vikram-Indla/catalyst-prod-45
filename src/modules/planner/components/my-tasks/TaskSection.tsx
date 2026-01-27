// ============================================================
// TASK SECTION
// Per Justification Matrix: Simple section grouping by time urgency
// Per Design Audit: Sentence case headers, no ALL CAPS
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

  return (
    <div className="mb-4">
      {/* Section Header - Sentence case per audit (no uppercase) */}
      <div className="flex items-center gap-2 mb-2 px-2">
        <span
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          {title}
        </h3>
        <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
          {tasks.length}
        </span>
      </div>

      {/* Task List */}
      <div className="border rounded-lg bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
        {tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            onOpenDetail={onOpenDetail}
          />
        ))}
      </div>
    </div>
  );
}
