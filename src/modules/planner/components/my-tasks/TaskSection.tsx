// ============================================================
// TASK SECTION - V9 Design System (Task List Aligned)
// Per Justification Matrix: Simple section grouping by time urgency
// Uses ring-fenced Task List typography and sizing
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
      {/* Section Header - Task List V3 style typography */}
      <div className="flex items-center gap-2 mb-2 px-2">
        <span
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        <h3 
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: 'var(--pln-tl-text-tertiary)' }}
        >
          {title}
        </h3>
        <span 
          className="text-xs font-medium"
          style={{ color: 'var(--pln-tl-text-muted)' }}
        >
          {tasks.length}
        </span>
      </div>

      {/* Task List - Task List V3 style */}
      <div 
        className="rounded-lg overflow-hidden"
        style={{ 
          background: 'var(--pln-tl-surface-card)',
          border: '1px solid var(--pln-tl-border)',
        }}
      >
        {tasks.map((task, index) => (
          <div 
            key={task.id}
            style={{ 
              borderTop: index > 0 ? '1px solid var(--pln-tl-border-light)' : 'none' 
            }}
          >
            <TaskRow
              task={task}
              onOpenDetail={onOpenDetail}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
