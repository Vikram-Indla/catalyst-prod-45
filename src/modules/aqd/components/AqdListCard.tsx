/**
 * Task¹⁰ List Card - Dashboard List Item
 * Uses direct CSS classes (not CSS modules) for proper styling
 */
import { useNavigate } from 'react-router-dom';
import { Pin as PinIcon, MoreHorizontal, Archive, Trash2 } from 'lucide-react';
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

  // ISSUE 8 & 9 FIX: Light badge, icon instead of emoji for pin
  // Width fix: w-full for full container width
  return (
    <div 
      className={`w-full bg-white border border-slate-200 rounded-xl p-5 cursor-pointer hover:border-slate-300 hover:shadow-md transition-all flex items-start gap-3 ${list.is_pinned ? 'border-l-4 border-l-teal-500' : ''}`}
      onClick={handleCardClick}
    >
      {/* Card Body */}
      <div className="aqd-card-body">
        {/* Title Row */}
        <div className="aqd-card-row-top">
          <div className="aqd-card-title flex items-center gap-1.5">
            {list.is_pinned && <PinIcon size={14} className="text-teal-600 shrink-0" />}
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

        {/* Progress Bar - ISSUE 5 FIX: Solid blue instead of gradient */}
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2">
          <div 
            className="h-full bg-blue-600 rounded-full transition-all" 
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
  );
}

export default AqdListCard;
