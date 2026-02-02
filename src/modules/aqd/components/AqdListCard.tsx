/**
 * ============================================================================
 * PRIORITY LIST CARD — ENTERPRISE V2
 * 
 * ENTERPRISE OVERHAUL:
 * - NO emoji icons (professional design)
 * - Pinned indicator via left border + small pin icon
 * - Improved stats format: "X of Y completed · Z remaining"
 * - Color-coded progress bars
 * - Last updated timestamp
 * - Hover-reveal menu
 * - Shadow + lift on hover
 * ============================================================================
 */
import { useNavigate } from 'react-router-dom';
import { MoreHorizontal, Pin as PinIcon, Archive, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { formatTimeAbbreviated } from '@/lib/formatTimeAgo';
import type { AqdListFull } from '../types/aqd.types';
import '@/styles/priority-lists.css';

// ============================================================================
// TYPES
// ============================================================================

type AvatarColor = 'blue' | 'teal' | 'purple' | 'orange' | 'pink';

interface AqdListCardProps {
  list: AqdListFull;
  onPin?: (listId: string) => void;
  onArchive?: (listId: string) => void;
  onDelete?: (listId: string) => void;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const AVATAR_COLORS: AvatarColor[] = ['blue', 'teal', 'purple', 'orange', 'pink'];

const getAvatarColor = (userId: string): AvatarColor => {
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

const calculateProgress = (completed: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
};

// ============================================================================
// PRIORITY CARD COMPONENT — ENTERPRISE V2
// ============================================================================

export function AqdListCard({ list, onPin, onArchive, onDelete }: AqdListCardProps) {
  const navigate = useNavigate();
  
  const totalItems = list.active_item_count || 0;
  const completedItems = list.completed_item_count || 0;
  const remainingItems = totalItems - completedItems;
  const progressPercent = calculateProgress(completedItems, totalItems);
  const isComplete = progressPercent === 100;

  const handleCardClick = () => {
    navigate(`/aqd/${list.id}`);
  };

  return (
    <div
      className={`priority-card-v2 ${list.is_pinned ? 'priority-card-v2--pinned' : ''}`}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
    >
      {/* Header row */}
      <div className="priority-card-v2__header">
        <div className="priority-card-v2__title-row">
          {list.is_pinned && (
            <PinIcon size={14} className="priority-card-v2__pin-icon" />
          )}
          <h3 className="priority-card-v2__title">{list.name}</h3>
        </div>
        
        <div className="priority-card-v2__actions">
          {/* Owner avatar */}
          {list.owner_name && (
            <div 
              className={`priority-card-v2__avatar priority-card-v2__avatar--${getAvatarColor(list.created_by || 'default')}`}
              title={list.owner_name}
            >
              {getInitials(list.owner_name)}
            </div>
          )}
          
          {/* Menu — visible on hover only */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <button className="priority-card-v2__menu">
                <MoreHorizontal size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" style={{ zIndex: 99999 }}>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPin?.(list.id); }}>
                <PinIcon size={14} className="mr-2" />
                {list.is_pinned ? 'Unpin' : 'Pin'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onArchive?.(list.id); }}>
                <Archive size={14} className="mr-2" />
                Archive
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-destructive" 
                onClick={(e) => { e.stopPropagation(); onDelete?.(list.id); }}
              >
                <Trash2 size={14} className="mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats row */}
      <div className="priority-card-v2__stats">
        {totalItems === 0 ? (
          <span className="priority-card-v2__stats-empty">No items yet</span>
        ) : (
          <>
            <span className="priority-card-v2__stats-completed">
              {completedItems}
            </span>
            {' of '}
            <span className="priority-card-v2__stats-total">
              {totalItems}
            </span>
            {' completed'}
            {remainingItems > 0 && (
              <span className="priority-card-v2__stats-remaining">
                {' · '}{remainingItems} remaining
              </span>
            )}
          </>
        )}
      </div>

      {/* Progress bar */}
      <div className="priority-card-v2__progress-row">
        <div className="priority-card-v2__progress-track">
          <div 
            className={`priority-card-v2__progress-fill ${isComplete ? 'priority-card-v2__progress-fill--complete' : ''}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className={`priority-card-v2__percent ${isComplete ? 'priority-card-v2__percent--complete' : ''}`}>
          {progressPercent}%
        </span>
      </div>

      {/* Footer: Last updated */}
      <div className="priority-card-v2__footer">
        Updated {formatTimeAbbreviated(list.updated_at)}
      </div>
    </div>
  );
}

export default AqdListCard;
