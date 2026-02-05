// ============================================================
// File: src/modules/priorities/components/PriPriorityCard.tsx
// ============================================================

import { useState, useRef, useEffect } from 'react';
import { Pencil, Trash2, GripVertical, MessageSquare } from 'lucide-react';
import type { PriItemFull } from '../types';
import { formatShortDate } from '../utils';
import { PriStatusToggle } from './PriStatusToggle';
import { PriLabelBadge } from './PriLabelBadge';
import styles from '../styles/priorities.module.css';

interface PriPriorityCardProps {
  item: PriItemFull;
  onStatusChange: (item: PriItemFull) => void;
  onEdit: (item: PriItemFull) => void;
  onDelete: (item: PriItemFull) => void;
  onTitleChange: (item: PriItemFull, newTitle: string) => void;
  isDragging?: boolean;
  dragHandleProps?: Record<string, unknown>;
}

export function PriPriorityCard({
  item, onStatusChange, onEdit, onDelete, onTitleChange,
  isDragging = false, dragHandleProps,
}: PriPriorityCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleTitleSubmit = () => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== item.title) {
      onTitleChange(item, trimmed);
    } else {
      setEditTitle(item.title);
    }
    setIsEditing(false);
  };

  const isCompleted = item.status === 'completed';
  const isTop10 = item.rank <= 10;

  return (
    <div className={`${styles['pri-card']} ${isDragging ? styles['pri-card-dragging'] : ''}`}>
      {/* Drag handle */}
      <div {...dragHandleProps} style={{ cursor: 'grab', color: 'var(--pri-gray-300)' }}>
        <GripVertical size={14} />
      </div>

      {/* Rank */}
      <span className={`${styles['pri-card-rank']} ${isTop10 ? styles['pri-card-rank-top'] : ''}`}>
        {item.rank}
      </span>

      {/* Status toggle */}
      <PriStatusToggle status={item.status} onToggle={() => onStatusChange(item)} />

      {/* Body */}
      <div className={styles['pri-card-body']}>
        {isEditing ? (
          <input
            ref={inputRef}
            className={styles['pri-card-title-input']}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleTitleSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTitleSubmit();
              if (e.key === 'Escape') { setEditTitle(item.title); setIsEditing(false); }
            }}
          />
        ) : (
          <div
            className={`${styles['pri-card-title']} ${isCompleted ? styles['pri-card-title-completed'] : ''}`}
            onDoubleClick={() => { setEditTitle(item.title); setIsEditing(true); }}
          >
            {item.title}
          </div>
        )}

        {/* Meta row */}
        <div className={styles['pri-card-meta']}>
          {item.task_key && (
            <span className={styles['pri-card-key']}>{item.task_key}</span>
          )}
          {item.is_carryover && (
            <span className={styles['pri-card-carryover']}>CARRYOVER</span>
          )}
          {item.assignee_name && (
            <span className={styles['pri-card-assignee']}>
              <span className={styles['pri-card-assignee-avatar']} />
              {item.assignee_name}
            </span>
          )}
          {item.labels.map((label) => (
            <PriLabelBadge key={label.id} label={label} />
          ))}
          {item.note_count > 0 && (
            <span className={styles['pri-card-date']}>
              <MessageSquare size={11} style={{ marginRight: 2 }} />
              {item.note_count}
            </span>
          )}
          <span className={styles['pri-card-date']}>
            {formatShortDate(item.created_at)}
          </span>
        </div>
      </div>

      {/* Hover actions */}
      <div className={styles['pri-card-actions']}>
        <button
          className={styles['pri-card-action']}
          onClick={(e) => { e.stopPropagation(); onEdit(item); }}
          aria-label="Edit item"
        >
          <Pencil size={14} />
        </button>
        <button
          className={`${styles['pri-card-action']} ${styles['pri-card-action-danger']}`}
          onClick={(e) => { e.stopPropagation(); onDelete(item); }}
          aria-label="Delete item"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
