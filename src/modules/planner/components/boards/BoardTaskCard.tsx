// ============================================================
// BOARD TASK CARD — LINEAR-INSPIRED ENTERPRISE DESIGN
// 
// KEY DESIGN DECISIONS (Linear Philosophy):
// - Task ID: Monospace var(--ds-text-subtlest, #64748b) (visible, not washed out)
// - Title: Weight 500 (hero of the card)
// - No Date: Show NOTHING (not "No due date")
// - Assignee: Avatar circle (not text name)
// - Priority: Left border (not floating icon)
// - Cards: Shadow + hover lift (draggable affordance)
// ============================================================

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AlertTriangle, Calendar } from 'lucide-react';
import type { BoardTask } from '../../types/planner-boards';
import { cn } from '@/lib/utils';
import { format, parseISO, isToday, isTomorrow, isPast } from 'date-fns';

// Import ring-fenced CSS
import '@/styles/boards.css';

interface BoardTaskCardProps {
  task: BoardTask;
  onClick?: () => void;
  isDragging?: boolean;
}

// Avatar color assignment (consistent per user)
const AVATAR_COLORS = ['blue', 'teal', 'purple', 'orange', 'pink', 'green', 'slate'] as const;

const getAvatarColor = (userId: string): typeof AVATAR_COLORS[number] => {
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(word => word[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// Date status for color coding
const getDateStatus = (date: string): 'overdue' | 'today' | 'upcoming' => {
  const parsedDate = parseISO(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dueDate = new Date(parsedDate);
  dueDate.setHours(0, 0, 0, 0);
  
  if (dueDate < today) return 'overdue';
  if (dueDate.getTime() === today.getTime()) return 'today';
  return 'upcoming';
};

// Format date for display
const formatDueDate = (date: string): string => {
  const parsedDate = parseISO(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dueDate = new Date(parsedDate);
  dueDate.setHours(0, 0, 0, 0);
  
  if (isPast(dueDate) && !isToday(parsedDate)) return 'Overdue';
  if (isToday(parsedDate)) return 'Today';
  if (isTomorrow(parsedDate)) return 'Tomorrow';
  
  return format(parsedDate, 'MMM d');
};

export function BoardTaskCard({ task, onClick, isDragging }: BoardTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isCompleted = task.is_completed_status;
  const activeDragging = isDragging || isSortableDragging;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        'boards-card dark:bg-[var(--ds-surface-raised,#1A1A1A)] dark:border-[var(--ds-border,#2E2E2E)] dark:hover:bg-[var(--ds-surface-raised,#1A1A1A)] dark:hover:border-[var(--ds-border-bold,#454545)]',
        // Priority left border (NOT floating icon)
        task.priority === 'critical' && 'boards-card--priority-critical',
        task.priority === 'high' && 'boards-card--priority-high',
        task.priority === 'medium' && 'boards-card--priority-medium',
        task.priority === 'low' && 'boards-card--priority-low',
        // Done state (opacity + strikethrough)
        isCompleted && 'boards-card--done',
        // Blocked state
        task.blocked && 'boards-card--blocked',
        // Dragging state
        activeDragging && 'boards-card--dragging'
      )}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick?.();
        }
      }}
    >
      {/* ========================================
          CARD HEADER — Task ID only
          NO mysterious blue dot
          ======================================== */}
      <div className="boards-card__header">
        <span className="boards-card__id dark:text-[var(--ds-text-subtlest,#A1A1A1)]">{task.key}</span>
        {/* NO blue dot — it was unclear what it meant */}
      </div>

      {/* ========================================
          CARD TITLE — The Hero
          Weight 500, darkest element
          ======================================== */}
      <h4 className="boards-card__title dark:text-[var(--ds-text,#EDEDED)]">{task.title}</h4>

      {/* Blocked indicator */}
      {task.blocked && (
        <div className="boards-card__blocked">
          <AlertTriangle />
          <span>Blocked</span>
        </div>
      )}

      {/* ========================================
          CARD FOOTER — Date + Avatar
          ======================================== */}
      <div className="boards-card__footer">
        {/* Date — ONLY show if date exists
            If no date, render nothing (not "No due date") */}
        {task.due_date ? (
          <span 
            className={cn(
              'boards-card__date',
              `boards-card__date--${isCompleted ? 'upcoming' : getDateStatus(task.due_date)}`
            )}
          >
            <Calendar />
            {formatDueDate(task.due_date)}
          </span>
        ) : (
          // Empty span to maintain flex layout
          <span />
        )}

        {/* Avatar — Circle with initials (NOT text name) */}
        {task.assignee_id && task.assignee_name ? (
          <div 
            className={cn(
              'boards-card__avatar',
              `boards-card__avatar--${getAvatarColor(task.assignee_id)}`
            )}
            title={task.assignee_name}
          >
            {getInitials(task.assignee_name)}
          </div>
        ) : null}
      </div>
    </div>
  );
}
