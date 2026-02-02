/**
 * Task¹⁰ List Card - Dashboard List Item
 * Uses direct CSS classes (not CSS modules) for proper styling
 */
import { useNavigate } from 'react-router-dom';
import { Pin, MoreHorizontal, Archive, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { AqdListFull } from '../types/aqd.types';

interface AqdListCardProps {
  list: AqdListFull;
  onPin?: (listId: string) => void;
  onArchive?: (listId: string) => void;
  onDelete?: (listId: string) => void;
}

export function AqdListCard({ list, onPin, onArchive, onDelete }: AqdListCardProps) {
  const navigate = useNavigate();
  
  const totalItems = list.active_item_count || 0;
  const completedItems = list.completed_item_count || 0;
  const completionRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const handleCardClick = () => {
    navigate(`/aqd/${list.id}`);
  };

  return (
    <div 
      className="aqd-card t10-list-card"
      onClick={handleCardClick}
    >
      {/* Rank/Pin Badge */}
      <div className="aqd-rank-badge">
        {list.is_pinned ? <Pin size={14} /> : totalItems}
      </div>

      {/* Card Body */}
      <div className="aqd-card-body">
        {/* Title Row */}
        <div className="aqd-card-row-top">
          <div className="aqd-card-title">
            {list.is_pinned && <Pin size={12} className="inline mr-1 text-blue-500" />}
            {list.name}
          </div>
        </div>

        {/* Meta Row with Separators */}
        <div className="aqd-card-meta">
          <span className="aqd-meta-item">
            {totalItems} item{totalItems !== 1 ? 's' : ''}
          </span>
          <span className="aqd-meta-separator">·</span>
          <span className="aqd-meta-item">
            {completedItems} completed
          </span>
          {list.owner_name && (
            <>
              <span className="aqd-meta-separator">·</span>
              <span className="aqd-meta-item">
                by {list.owner_name}
              </span>
            </>
          )}
        </div>

        {/* Progress Bar */}
        <div className="aqd-progress-bar">
          <div 
            className="aqd-progress-bar-fill" 
            style={{ width: `${completionRate}%` }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="aqd-card-actions">
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <button className="aqd-action-btn">
              <MoreHorizontal size={14} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPin?.(list.id); }}>
              <Pin size={14} className="mr-2" />
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
  );
}

export default AqdListCard;
