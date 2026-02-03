// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ PRIORITY CARD COMPONENT
// Reference Design:
// - Row 1: Title (bold)
// - Row 2: TaskHub key (blue), Avatar+name, Due date (colored), Label tag, Carryover badge
// - Completed: strikethrough title, faded, green checkmark
// - Carryover: orange left border + "→×2" badge
// ═══════════════════════════════════════════════════════════════════════════

import { GripVertical, ArrowRight } from 'lucide-react';
import { format, isToday, isPast, parseISO, isTomorrow } from 'date-fns';
import type { T10ItemWithAssignee } from '../../types';
import { T10RankBadge } from './T10RankBadge';
import { T10Checkbox } from './T10Checkbox';

interface T10PriorityCardProps {
  item: T10ItemWithAssignee;
  onToggleStatus: (itemId: string, done: boolean) => void;
  onClick?: () => void;
  isDragging?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

export function T10PriorityCard({ 
  item, 
  onToggleStatus, 
  onClick,
  isDragging = false,
  dragHandleProps,
}: T10PriorityCardProps) {
  const isCompleted = item.status === 'done' || item.status === 'resolved';
  const isCarryover = item.carryover_count > 0;

  // Due date formatting
  const getDueDateInfo = (): { text: string; color: string } | null => {
    if (!item.due_date) return null;
    try {
      const dueDate = parseISO(item.due_date);
      if (isPast(dueDate) && !isToday(dueDate)) {
        return { text: format(dueDate, 'MMM d'), color: '#dc2626' }; // Red for overdue
      }
      if (isToday(dueDate)) {
        return { text: 'Today', color: '#d97706' }; // Amber for today
      }
      // Regular upcoming date
      return { text: format(dueDate, 'MMM d'), color: '#374151' }; // Gray for upcoming
    } catch {
      return null;
    }
  };

  const dueDateInfo = getDueDateInfo();

  // Get initials for avatar
  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Get avatar color
  const getAvatarColor = (name: string | null) => {
    if (!name) return '#9ca3af';
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div 
      className={`t10-priority-card ${isCarryover ? 't10-priority-card--carryover' : ''} ${isDragging ? 't10-priority-card--dragging' : ''} ${isCompleted ? 't10-priority-card--completed' : ''}`}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '14px',
        padding: '16px 18px',
        background: isCompleted ? '#f9fafb' : '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        opacity: isCompleted ? 0.7 : 1,
        borderLeft: isCarryover ? '4px solid #f59e0b' : '1px solid #e5e7eb',
        ...(isDragging && { 
          opacity: 0.6, 
          transform: 'rotate(2deg)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)' 
        }),
      }}
      onClick={onClick}
    >
      {/* Rank Badge */}
      <T10RankBadge rank={item.rank} />
      
      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Row 1: Title */}
        <div 
          style={{ 
            fontSize: '15px',
            fontWeight: 600,
            color: isCompleted ? '#9ca3af' : '#1f2937',
            textDecoration: isCompleted ? 'line-through' : 'none',
            marginBottom: '8px',
            lineHeight: 1.4,
          }}
        >
          {item.title}
        </div>
        
        {/* Row 2: Meta info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* TaskHub Key - Blue */}
          {item.taskhub_key && (
            <span 
              style={{ 
                fontFamily: 'SF Mono, Monaco, monospace', 
                fontSize: '12px',
                fontWeight: 600,
                color: '#2563eb',
              }}
            >
              {item.taskhub_key}
            </span>
          )}
          
          {/* Assignee - Avatar + Name */}
          {item.assignee && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {item.assignee.avatar_url ? (
                <img 
                  src={item.assignee.avatar_url} 
                  alt={item.assignee.full_name || ''} 
                  style={{ 
                    width: '22px', 
                    height: '22px', 
                    borderRadius: '50%', 
                    objectFit: 'cover' 
                  }}
                />
              ) : (
                <span 
                  style={{ 
                    width: '22px', 
                    height: '22px', 
                    borderRadius: '50%', 
                    backgroundColor: getAvatarColor(item.assignee.full_name),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: 600,
                    color: '#ffffff',
                  }}
                >
                  {getInitials(item.assignee.full_name)}
                </span>
              )}
              <span style={{ fontSize: '13px', color: '#6b7280' }}>
                {item.assignee.full_name?.split(' ')[0]} {item.assignee.full_name?.split(' ')[1]?.charAt(0)}.
              </span>
            </div>
          )}
          
          {/* Due Date - Color coded */}
          {dueDateInfo && (
            <span 
              style={{
                fontSize: '13px',
                fontWeight: 500,
                color: dueDateInfo.color,
              }}
            >
              {dueDateInfo.text}
            </span>
          )}
          
          {/* Label - Tag style */}
          {item.label && (
            <span 
              style={{
                padding: '3px 10px',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '4px',
                textTransform: 'uppercase',
              }}
            >
              {item.label}
            </span>
          )}
          
          {/* Carryover Badge - Orange pill with arrow */}
          {isCarryover && (
            <span 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                padding: '3px 8px',
                backgroundColor: '#fef3c7',
                border: '1px solid #fcd34d',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#d97706',
              }}
            >
              <ArrowRight size={12} />
              ×{item.carryover_count}
            </span>
          )}
        </div>
      </div>
      
      {/* Checkbox - Right side */}
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{ marginTop: '2px' }}
      >
        <T10Checkbox 
          checked={isCompleted}
          onChange={(checked) => onToggleStatus(item.id, checked)}
        />
      </div>
    </div>
  );
}

export default T10PriorityCard;
