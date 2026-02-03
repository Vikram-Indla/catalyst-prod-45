import React from 'react';
import { Check } from 'lucide-react';
import type { T10Item } from '../../types';
import { getRankTier, getDueStatus, formatShortDate } from '../../utils';

interface T10PriorityCardProps {
  item: T10Item;
  onClick: () => void;
  onToggleStatus: () => void;
}

export function T10PriorityCard({ item, onClick, onToggleStatus }: T10PriorityCardProps) {
  const rankTier = getRankTier(item.rank);
  const dueStatus = item.due_date ? getDueStatus(item.due_date) : 'normal';
  const isCompleted = item.status === 'done';

  return (
    <div
      className={`t10-card ${isCompleted ? 'completed' : ''} ${item.carryover_count > 0 ? 'carryover' : ''}`}
      onClick={onClick}
    >
      {/* Rank Badge */}
      <div className={`t10-rank t10-rank-${rankTier}`}>
        {item.rank}
      </div>

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
            <span className="t10-carryover-badge">
              →×{item.carryover_count}
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
