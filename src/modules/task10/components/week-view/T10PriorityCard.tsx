// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ PRIORITY CARD COMPONENT
// - Completed items: strikethrough + faded opacity
// - Carryover items: orange left border accent
// ═══════════════════════════════════════════════════════════════════════════

import { GripVertical, RotateCcw } from 'lucide-react';
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

  // Build card styles with inline for reliable rendering
  const cardStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '14px',
    padding: '16px 18px',
    background: isCompleted ? '#f9fafb' : '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    opacity: isCompleted ? 0.7 : 1,
    ...(isCarryover && { borderLeft: '4px solid #f59e0b' }),
    ...(isDragging && { opacity: 0.5, borderColor: '#2563eb', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }),
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 600,
    color: isCompleted ? '#9ca3af' : '#1f2937',
    textDecoration: isCompleted ? 'line-through' : 'none',
  };

  return (
    <div 
      className={`t10-priority-card ${isCarryover ? 't10-priority-card--carryover' : ''} ${isDragging ? 't10-priority-card--dragging' : ''} ${isCompleted ? 't10-priority-card--completed' : ''}`}
      style={cardStyle}
      onClick={onClick}
    >
      {/* Drag Handle */}
      <div 
        className="t10-priority-card__drag-handle" 
        style={{ color: '#d1d5db', cursor: 'grab', flexShrink: 0 }}
        {...dragHandleProps}
      >
        <GripVertical size={18} />
      </div>
      
      {/* Rank Badge */}
      <T10RankBadge rank={item.rank} />
      
      {/* Content */}
      <div className="t10-priority-card__content" style={{ flex: 1, minWidth: 0 }}>
        <div className="t10-priority-card__header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span className="t10-priority-card__title" style={titleStyle}>
            {item.title}
          </span>
          {item.taskhub_key && (
            <span 
              className="t10-priority-card__task-key"
              style={{ 
                fontSize: '12px', 
                fontFamily: 'SF Mono, Monaco, monospace', 
                color: '#9ca3af',
                flexShrink: 0,
              }}
            >
              {item.taskhub_key}
            </span>
          )}
        </div>
        
        <div className="t10-priority-card__meta" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {item.assignee && (
            <span className="t10-priority-card__assignee" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#6b7280' }}>
              {item.assignee.avatar_url ? (
                <img 
                  src={item.assignee.avatar_url} 
                  alt={item.assignee.full_name || ''} 
                  style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <span style={{ 
                  width: '20px', 
                  height: '20px', 
                  borderRadius: '50%', 
                  backgroundColor: '#e5e7eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#6b7280',
                }}>
                  {(item.assignee.full_name || 'U').charAt(0)}
                </span>
              )}
              <span>{item.assignee.full_name}</span>
            </span>
          )}
          
          {item.label && (
            <span 
              className="t10-priority-card__label"
              style={{
                padding: '2px 8px',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                fontSize: '12px',
                fontWeight: 500,
                borderRadius: '4px',
              }}
            >
              {item.label}
            </span>
          )}
          
          {/* Carryover indicator with orange styling */}
          {isCarryover && (
            <span 
              className="t10-priority-card__carryover"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                fontWeight: 500,
                color: '#d97706',
              }}
            >
              <RotateCcw size={12} />
              Carried {item.carryover_count}x
            </span>
          )}
        </div>
      </div>
      
      {/* Checkbox */}
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
