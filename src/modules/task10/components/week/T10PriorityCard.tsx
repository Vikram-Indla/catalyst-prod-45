import React, { useState, useEffect } from 'react';
import { Check, ArrowUp, ArrowDown, User, Calendar } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { T10Item } from '../../types';
import { getDueStatus, formatShortDate } from '../../utils';
import { T10EditableTitle } from './T10EditableTitle';

interface T10PriorityCardProps {
  item: T10Item;
  previousRank?: number;
  onClick: () => void;
  onToggleStatus: () => void;
  isDraggable?: boolean;
}

export function T10PriorityCard({ 
  item, 
  previousRank,
  onClick, 
  onToggleStatus, 
  isDraggable = true 
}: T10PriorityCardProps) {
  const [showRankChange, setShowRankChange] = useState(false);
  const [rankDiff, setRankDiff] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  const dueStatus = item.due_date ? getDueStatus(item.due_date) : 'normal';
  const isCompleted = item.status === 'done';

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: item.id,
    disabled: !isDraggable,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : undefined,
  };

  // Show rank change badge when rank changes
  useEffect(() => {
    if (previousRank !== undefined && previousRank !== item.rank) {
      const diff = previousRank - item.rank;
      setRankDiff(diff);
      setShowRankChange(true);
      setFadeOut(false);

      const fadeTimer = setTimeout(() => {
        setFadeOut(true);
      }, 2500);

      const hideTimer = setTimeout(() => {
        setShowRankChange(false);
        setFadeOut(false);
      }, 3000);

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [item.rank, previousRank]);

  const cardClasses = [
    't10-detail-priority-item',
    isCompleted ? 't10-detail-priority-item-completed' : '',
    isDragging ? 't10-detail-priority-item-dragging' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cardClasses}
      onClick={onClick}
    >
      {/* Drag Handle - 6 dot pattern */}
      {isDraggable && (
        <div 
          className="t10-detail-drag-handle"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        />
      )}

      {/* Rank Badge - 48px blue square */}
      <div className="t10-detail-rank">
        {item.rank}
      </div>

      {/* Rank Change Badge */}
      {showRankChange && rankDiff !== 0 && (
        <span 
          className="t10-detail-rank-change"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 2,
            padding: '2px 8px',
            fontSize: 11,
            fontWeight: 600,
            borderRadius: 4,
            background: rankDiff > 0 ? 'var(--ds-background-success, var(--ds-background-success, #dcfce7))' : '#fee2e2',
            color: rankDiff > 0 ? 'var(--ds-text-success, var(--ds-text-success, #16a34a))' : 'var(--ds-text-danger, var(--ds-text-danger, #dc2626))',
            opacity: fadeOut ? 0 : 1,
            transition: 'opacity 0.3s ease',
          }}
        >
          {rankDiff > 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
          {Math.abs(rankDiff)}
        </span>
      )}

      {/* Content */}
      <div className="t10-detail-priority-content">
        <T10EditableTitle 
          itemId={item.id}
          title={item.title}
          className="t10-detail-priority-text"
        />
        <div className="t10-detail-priority-meta">
          {item.assignee_name && (
            <>
              <span className="t10-detail-priority-assignee">
                <User size={14} className="t10-detail-priority-assignee-avatar" />
                {item.assignee_name}
              </span>
              {(item.due_date || item.label) && (
                <span className="t10-detail-priority-meta-separator" />
              )}
            </>
          )}
          {item.due_date && (
            <>
              <span 
                className={`t10-detail-priority-due ${
                  dueStatus === 'overdue' ? 't10-detail-priority-due-overdue' : 
                  dueStatus === 'today' ? 't10-detail-priority-due-today' : ''
                }`}
              >
                <Calendar size={13} />
                {formatShortDate(item.due_date)}
              </span>
              {item.label && (
                <span className="t10-detail-priority-meta-separator" />
              )}
            </>
          )}
          {item.label && (
            <span className="t10-detail-priority-label">{item.label}</span>
          )}
          {item.carryover_count > 0 && (
            <span 
              className="t10-detail-priority-label"
              style={{ color: 'var(--ds-text-warning, var(--ds-text-warning, #f59e0b))', background: '#fef3c7' }}
              title={`Carried over ${item.carryover_count} time${item.carryover_count > 1 ? 's' : ''}`}
            >
              ×{item.carryover_count}
            </span>
          )}
        </div>
      </div>

      {/* Checkbox - 32px circular */}
      <label className="t10-detail-checkbox" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          className="t10-detail-checkbox-input"
          checked={isCompleted}
          onChange={onToggleStatus}
        />
        <div className="t10-detail-checkbox-visual">
          <Check size={16} strokeWidth={3} />
        </div>
      </label>
    </div>
  );
}
