import React, { useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, AlertOctagon, ArrowUp, Minus, ArrowDown, User } from 'lucide-react';
import type { Initiative } from '@/types/initiative';
import { getAvatarColor, getInitials } from '@/types/initiative';

interface KanbanCardProps {
  initiative: Initiative;
  onClick: () => void;
  onContextMenu?: (e: React.MouseEvent, initiative: Initiative) => void;
  isOverlay?: boolean;
  isFocused?: boolean;
  isSelected?: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  project: '#2563EB',
  enhancement: '#0EA5E9',
  improvement: '#D97706',
  entity_integration: 'rgba(237,237,237,0.40)',
  business_request: '#2563EB',
};

const PRIORITY_MAP: Record<string, { icon: React.ElementType; color: string }> = {
  P1: { icon: AlertOctagon, color: '#DC2626' },
  P2: { icon: ArrowUp, color: '#D97706' },
  P3: { icon: Minus, color: 'rgba(237,237,237,0.40)' },
  P4: { icon: ArrowDown, color: 'rgba(237,237,237,0.40)' },
};

function getAge(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return '1d';
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.floor(days / 7)}w`;
  return `${Math.floor(days / 30)}mo`;
}

export const KanbanCard: React.FC<KanbanCardProps> = ({
  initiative,
  onClick,
  onContextMenu,
  isOverlay,
  isFocused,
  isSelected,
}) => {
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
  const typeColor = initiative.initiative_type_color_hex || TYPE_COLORS[initiative.initiative_type_key ?? ''] || 'rgba(237,237,237,0.40)';
  const priority = (initiative as any).priority as string | undefined;
  const priorityInfo = priority ? PRIORITY_MAP[priority] : null;

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu?.(e, initiative);
  }, [initiative, onContextMenu]);

  let cardClass = 'pk-card';
  if (isDragging) cardClass += ' pk-card--dragging';
  else if (isSelected) cardClass += ' pk-card--selected';
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
      {/* ROW 1: Type dot + ID + Priority + Drag handle */}
      <div className="pk-card-row1">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: typeColor,
              flexShrink: 0,
            }}
          />
          <span className="pk-card-id">{initiative.initiative_key}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {priorityInfo && (
            <priorityInfo.icon size={14} color={priorityInfo.color} style={{ flexShrink: 0 }} />
          )}
          <span className="pk-card-drag-handle">
            <GripVertical size={14} />
          </span>
        </div>
      </div>

      {/* ROW 2: Title */}
      <div className={`pk-card-title${isCancelled ? ' pk-card-title--cancelled' : ''}`}>
        {initiative.is_favorited && <span style={{ color: '#F59E0B', marginRight: 4 }}>★</span>}
        {initiative.title}
      </div>

      {/* ROW 3: Assignee + Age */}
      <div className="pk-card-row3">
        {initiative.assignee_name ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                backgroundColor: getAvatarColor(initiative.assignee_name),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 9,
                fontWeight: 700,
                color: '#fff',
                flexShrink: 0,
              }}
            >
              {getInitials(initiative.assignee_name)}
            </div>
            <span style={{ fontSize: 12, color: 'var(--fg-3)', fontWeight: 500 }}>
              {initiative.assignee_name.split(' ')[0]}
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                backgroundColor: 'var(--divider)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <User size={10} color="rgba(237,237,237,0.40)" />
            </div>
            <span style={{ fontSize: 12, color: 'var(--fg-4)', fontStyle: 'italic' }}>Unassigned</span>
          </div>
        )}
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            color: 'var(--fg-4)',
            fontWeight: 500,
          }}
        >
          {getAge(initiative.created_at)}
        </span>
      </div>
    </div>
  );
};
