import React, { useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MoreHorizontal, CalendarDays } from 'lucide-react';
import type { Initiative } from '@/types/initiative';
import { getAvatarColor, getInitials } from '@/types/initiative';
import { format, isPast } from 'date-fns';

interface KanbanCardProps {
  initiative: Initiative;
  onClick: () => void;
  onContextMenu?: (e: React.MouseEvent, initiative: Initiative) => void;
  isOverlay?: boolean;
  isFocused?: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  project: '#0D9488',
  enhancement: '#2563EB',
  improvement: '#D97706',
  entity_integration: '#7C3AED',
};

function getPriorityBars(score: number | null): number {
  if (score === null) return 0;
  if (score >= 4.0) return 4;
  if (score >= 3.0) return 3;
  if (score >= 2.0) return 2;
  return 1;
}

function getProgressColor(progress: number): string {
  if (progress >= 75) return 'var(--pk-success)';
  if (progress >= 50) return 'var(--pk-teal)';
  return 'var(--pk-primary)';
}

export const KanbanCard: React.FC<KanbanCardProps> = ({ initiative, onClick, onContextMenu, isOverlay, isFocused }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: initiative.id,
    data: { status: initiative.status },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isCancelled = initiative.status === 'cancelled';
  const typeColor = initiative.initiative_type_color_hex || TYPE_COLORS[initiative.initiative_type_key ?? ''] || null;
  const filledBars = getPriorityBars(initiative.computed_score);
  const isOverdue = initiative.target_complete && isPast(new Date(initiative.target_complete)) && initiative.progress < 100 && !['done', 'cancelled'].includes(initiative.status);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu?.(e, initiative);
  }, [initiative, onContextMenu]);

  let cardClass = 'pk-card';
  if (isDragging) cardClass += ' pk-card--dragging';
  if (isOverlay) cardClass += ' pk-card--overlay';
  if (isFocused) cardClass += ' pk-card--focused';
  if (isCancelled) cardClass += ' pk-card--cancelled';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      role="article"
      aria-label={`Initiative ${initiative.initiative_key}: ${initiative.title}`}
      onClick={onClick}
      onContextMenu={handleContextMenu}
      className={cardClass}
      tabIndex={0}
    >
      {/* Top: ID + More */}
      <div className="pk-card-top">
        <span className="pk-card-id">{initiative.initiative_key}</span>
        <button
          className="pk-card-more"
          onClick={e => { e.stopPropagation(); onContextMenu?.(e, initiative); }}
        >
          <MoreHorizontal size={14} />
        </button>
      </div>

      {/* Title */}
      <div className={`pk-card-title${isCancelled ? ' pk-card-title--cancelled' : ''}`}>
        {initiative.is_favorited && <span style={{ color: '#F59E0B', marginRight: 4 }}>★</span>}
        {initiative.title}
      </div>

      {/* Meta */}
      <div className="pk-card-meta">
        {typeColor && initiative.initiative_type_label && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span className="pk-card-type-dot" style={{ backgroundColor: typeColor }} />
            <span className="pk-card-type-label" style={{ color: typeColor }}>{initiative.initiative_type_label}</span>
          </span>
        )}
        {initiative.department_name && (
          <span className="pk-card-tag">{initiative.department_name}</span>
        )}
        {initiative.target_quarter && (
          <span className="pk-card-quarter">{initiative.target_quarter}</span>
        )}
        {initiative.target_complete && (
          <span className={`pk-card-date${isOverdue ? ' pk-card-date--overdue' : ''}`}>
            <CalendarDays size={11} />
            {format(new Date(initiative.target_complete), 'MMM d')}
          </span>
        )}
      </div>

      {/* Bottom: Priority bars + Progress + Avatar */}
      <div className="pk-card-bottom">
        <div className="pk-card-priority">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`pk-priority-bar ${i < filledBars ? 'pk-priority-bar--filled' : 'pk-priority-bar--unfilled'}`} />
          ))}
        </div>

        <div className="pk-card-progress">
          <div
            className="pk-card-progress-fill"
            style={{
              width: `${Math.min(initiative.progress, 100)}%`,
              backgroundColor: getProgressColor(initiative.progress),
            }}
          />
        </div>

        <span className="pk-card-percent">{initiative.progress}%</span>

        {initiative.assignee_name ? (
          <div
            className="pk-card-avatar"
            style={{ backgroundColor: getAvatarColor(initiative.assignee_name) }}
            title={initiative.assignee_name}
          >
            {getInitials(initiative.assignee_name)}
          </div>
        ) : (
          <div className="pk-card-avatar pk-card-avatar--empty">?</div>
        )}
      </div>
    </div>
  );
};
