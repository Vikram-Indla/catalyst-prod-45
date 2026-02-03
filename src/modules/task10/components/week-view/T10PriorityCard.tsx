// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ PRIORITY CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

import { GripVertical, RefreshCw } from 'lucide-react';
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

  return (
    <div 
      className={`t10-priority-card ${isCarryover ? 't10-priority-card--carryover' : ''} ${isDragging ? 't10-priority-card--dragging' : ''}`}
      onClick={onClick}
    >
      <div className="t10-priority-card__drag-handle" {...dragHandleProps}>
        <GripVertical className="t10-priority-card__drag-icon" />
      </div>
      
      <T10RankBadge rank={item.rank} />
      
      <div className="t10-priority-card__content">
        <div className="t10-priority-card__header">
          <span className={`t10-priority-card__title ${isCompleted ? 't10-priority-card__title--completed' : ''}`}>
            {item.title}
          </span>
          {item.taskhub_key && (
            <span className="t10-priority-card__task-key">{item.taskhub_key}</span>
          )}
        </div>
        
        <div className="t10-priority-card__meta">
          {item.assignee && (
            <span className="t10-priority-card__assignee">
              {item.assignee.avatar_url ? (
                <img 
                  src={item.assignee.avatar_url} 
                  alt={item.assignee.full_name || ''} 
                  className="t10-priority-card__avatar"
                />
              ) : (
                <span className="t10-priority-card__avatar-placeholder">
                  {(item.assignee.full_name || 'U').charAt(0)}
                </span>
              )}
              <span>{item.assignee.full_name}</span>
            </span>
          )}
          
          {item.label && (
            <span className="t10-priority-card__label">{item.label}</span>
          )}
          
          {isCarryover && (
            <span className="t10-priority-card__carryover">
              <RefreshCw className="t10-priority-card__carryover-icon" />
              Carried {item.carryover_count}x
            </span>
          )}
        </div>
      </div>
      
      <div onClick={(e) => e.stopPropagation()}>
        <T10Checkbox 
          checked={isCompleted}
          onChange={(checked) => onToggleStatus(item.id, checked)}
        />
      </div>
    </div>
  );
}

export default T10PriorityCard;
