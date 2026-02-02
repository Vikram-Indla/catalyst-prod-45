/**
 * ============================================================================
 * PRIORITY LIST CARD — LINEAR-INSPIRED COMPACT DESIGN
 * 
 * File: src/modules/aqd/components/AqdListCard.tsx
 * CSS: src/styles/priority-lists.css (ring-fenced with .priority-* classes)
 * 
 * KEY DESIGN DECISIONS:
 * - Compact height (~70px, not ~120px)
 * - Percentage integrated with progress bar (not floating far right)
 * - Avatar circle for owner (not text name)
 * - Status-based left border (green/amber/red)
 * - Customizable emoji icons
 * - Stats show "remaining" only (not green "completed" text)
 * ============================================================================
 */
import { useNavigate } from 'react-router-dom';
import { ChevronRight, MoreHorizontal, Pin as PinIcon, Archive, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { AqdListFull } from '../types/aqd.types';
import '@/styles/priority-lists.css';

// ============================================================================
// TYPES
// ============================================================================

type ListStatus = 'on-track' | 'behind' | 'blocked';
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

/**
 * Get consistent avatar color based on user ID
 */
const getAvatarColor = (userId: string): AvatarColor => {
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

/**
 * Get initials from name
 * "Vikram India" → "VI"
 */
const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(word => word[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

/**
 * Calculate progress percentage
 */
const calculateProgress = (completed: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
};

/**
 * Determine list status based on completion rate
 * - Green (on-track): ≥ 50% done
 * - Amber (behind): 25-49% done
 * - Red (blocked): < 25% done
 */
const getListStatus = (completedItems: number, totalItems: number): ListStatus => {
  if (totalItems === 0) return 'on-track';
  const rate = completedItems / totalItems;
  if (rate >= 0.5) return 'on-track';
  if (rate >= 0.25) return 'behind';
  return 'blocked';
};

/**
 * Get emoji icon based on list name
 */
const getListIcon = (name: string): string => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('sprint') || lowerName.includes('dev')) return '🔥';
  if (lowerName.includes('team')) return '👥';
  if (lowerName.includes('personal')) return '🎯';
  if (lowerName.includes('product')) return '📦';
  if (lowerName.includes('weekly')) return '📅';
  if (lowerName.includes('goal')) return '🎯';
  return '📋';
};

// ============================================================================
// PRIORITY CARD COMPONENT
// ============================================================================

export function AqdListCard({ list, onPin, onArchive, onDelete }: AqdListCardProps) {
  const navigate = useNavigate();
  
  const totalItems = list.active_item_count || 0;
  const completedItems = list.completed_item_count || 0;
  const remainingItems = totalItems - completedItems;
  const progressPercent = calculateProgress(completedItems, totalItems);
  const status = getListStatus(completedItems, totalItems);
  const icon = getListIcon(list.name);

  const handleCardClick = () => {
    navigate(`/aqd/${list.id}`);
  };

  return (
    <div
      className={`priority-card priority-card--${status}`}
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
      {/* Icon — customizable emoji per list */}
      <span className="priority-card__icon">{icon}</span>

      {/* Content */}
      <div className="priority-card__content">
        <h3 className="priority-card__title">
          {list.is_pinned && (
            <PinIcon size={12} className="inline mr-1.5 text-teal-600" />
          )}
          {list.name}
        </h3>
        <div className="priority-card__meta">
          {/* Stats — grey only, shows remaining (actionable)
              NO green "3 completed" mid-sentence */}
          <span className="priority-card__stats">
            {totalItems} items · {remainingItems} remaining
          </span>

          {/* Progress — percentage integrated with bar
              NOT floating on far right */}
          <div className="priority-card__progress">
            <div className="priority-card__progress-track">
              <div 
                className="priority-card__progress-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="priority-card__percent">{progressPercent}%</span>
          </div>
        </div>
      </div>

      {/* Avatar — replaces "👤 Vikram India" text */}
      {list.owner_name && (
        <div 
          className={`priority-card__avatar priority-card__avatar--${getAvatarColor(list.created_by || 'default')}`}
          title={list.owner_name}
        >
          {getInitials(list.owner_name)}
        </div>
      )}

      {/* Actions Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <button 
            className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors opacity-0 group-hover:opacity-100"
            style={{ opacity: 1 }}
          >
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

      {/* Arrow — appears on hover */}
      <ChevronRight className="priority-card__arrow" size={16} />
    </div>
  );
}

export default AqdListCard;
