import React, { useState, useEffect } from 'react';
import { Check, GripVertical, ArrowUp, ArrowDown } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { T10Item } from '../../types';
import { getRankTier, getDueStatus, formatShortDate } from '../../utils';

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

  const rankTier = getRankTier(item.rank);
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
      const diff = previousRank - item.rank; // Positive = moved up, Negative = moved down
      setRankDiff(diff);
      setShowRankChange(true);
      setFadeOut(false);

      // Start fade out after 2.5 seconds
      const fadeTimer = setTimeout(() => {
        setFadeOut(true);
      }, 2500);

      // Hide badge after 3 seconds
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`t10-card ${isCompleted ? 'completed' : ''} ${item.carryover_count > 0 ? 'carryover' : ''} ${isDragging ? 'dragging' : ''}`}
      onClick={onClick}
    >
      {/* Drag Handle */}
      {isDraggable && (
        <div 
          className="t10-drag-handle"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={16} />
        </div>
      )}

      {/* Rank Badge */}
      <div className={`t10-rank t10-rank-${rankTier}`}>
        {item.rank}
      </div>

      {/* Rank Change Badge */}
      {showRankChange && rankDiff !== 0 && (
        <span className={`t10-rank-change ${rankDiff > 0 ? 'up' : 'down'} ${fadeOut ? 'fade-out' : ''}`}>
          {rankDiff > 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
          {Math.abs(rankDiff)}
        </span>
      )}

      {/* Content */}
      <div className="t10-card-content">
        <div className="t10-card-title">{item.title}</div>
        <div className="t10-card-meta">
          {item.taskhub_key && (
            <span className="t10-card-key">{item.taskhub_key}</span>
          )}
          {item.assignee_name && (
            <span className="t10-card-assignee">
              <span className="t10-avatar t10-avatar-xs">{item.assignee_initials}</span>
              {item.assignee_name}
            </span>
          )}
          {item.due_date && (
            <span className={`t10-card-due ${dueStatus}`}>
              {formatShortDate(item.due_date)}
            </span>
          )}
          {item.label && (
            <span className="t10-card-label">{item.label}</span>
          )}
          {item.carryover_count > 0 && (
            <span className="t10-carryover-badge" title={`Carried over ${item.carryover_count} time${item.carryover_count > 1 ? 's' : ''}`}>
              ×{item.carryover_count}
            </span>
          )}
        </div>
      </div>

      {/* Checkbox */}
      <button
        className={`t10-checkbox ${isCompleted ? 'checked' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleStatus();
        }}
      >
        <Check size={16} />
      </button>
    </div>
  );
}
