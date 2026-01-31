// ============================================================
// COMPLETED TODAY SECTION - Collapsible completed tasks
// Ring-fenced CSS: mytasks-section-header, mytasks-row
// ============================================================

import { useState } from 'react';
import { ChevronDown, CheckCircle2, Check, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUncompleteMyTask } from '../../hooks/useUncompleteMyTask';
import type { MyTask } from '../../types/my-tasks';

interface CompletedTodaySectionProps {
  tasks: MyTask[];
  onOpenDetail: (taskId: string) => void;
}

function formatCompletedTime(dateString: string | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  return date.toLocaleDateString();
}

export function CompletedTodaySection({ tasks, onOpenDetail }: CompletedTodaySectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const uncompleteTask = useUncompleteMyTask();

  // Don't render if no completed tasks
  if (tasks.length === 0) return null;

  const handleUncomplete = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    uncompleteTask.mutate({ taskId });
  };

  return (
    <div className="mytasks-completed-section">
      {/* Section Header */}
      <button 
        className="mytasks-section-header mytasks-section-header--completed"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <ChevronDown 
          className={cn(
            'w-4 h-4 text-slate-400 transition-transform',
            !isExpanded && '-rotate-90'
          )}
        />
        <CheckCircle2 className="mytasks-section-header__icon mytasks-section-header__icon--completed" />
        <h3 className="mytasks-section-header__title mytasks-section-header__title--completed">
          COMPLETED TODAY
        </h3>
        <span className="mytasks-section-header__count">
          {tasks.length}
        </span>
      </button>

      {/* Section Content */}
      {isExpanded && (
        <div className="mytasks-completed-list">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="mytasks-row mytasks-row--completed-item"
              onClick={() => onOpenDetail(task.id)}
            >
              {/* Checked checkbox */}
              <button
                onClick={(e) => handleUncomplete(e, task.id)}
                className="mytasks-checkbox mytasks-checkbox--checked"
                title="Uncheck to restore task"
              >
                <Check className="w-2.5 h-2.5" />
              </button>

              {/* Task Key */}
              <span className="mytasks-row__id mytasks-row__id--completed">
                {task.task_key}
              </span>

              {/* Task Title with strikethrough */}
              <span className="mytasks-row__title mytasks-row__title--completed">
                {task.title}
              </span>

              {/* Completed time */}
              <span className="mytasks-completed-time">
                {formatCompletedTime(task.completed_at)}
              </span>

              {/* Restore button on hover */}
              <button 
                className="mytasks-restore-btn"
                onClick={(e) => handleUncomplete(e, task.id)}
                title="Restore task"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
