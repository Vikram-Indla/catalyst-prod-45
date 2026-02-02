/**
 * Task¹⁰ List Card - Dashboard List Item
 * Enterprise-grade styling with shadows, hover lift, and rich content
 */
import { useNavigate } from 'react-router-dom';
import { Pin as PinIcon, MoreHorizontal, Archive, Trash2, ArrowRight, User } from 'lucide-react';
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
  const remainingItems = totalItems - completedItems;
  const completionRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const handleCardClick = () => {
    navigate(`/aqd/${list.id}`);
  };

  // Enterprise card styling with shadows and hover lift
  const cardClasses = [
    'w-full bg-white rounded-xl p-5 cursor-pointer',
    'border border-slate-200',
    'shadow-sm hover:shadow-lg',
    'hover:border-slate-300 hover:-translate-y-0.5',
    'transition-all duration-200 ease-out',
    'group',
    list.is_pinned ? 'border-l-4 border-l-teal-500' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={cardClasses} onClick={handleCardClick}>
      {/* Header Row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {list.is_pinned && (
            <PinIcon size={14} className="text-teal-600 shrink-0" />
          )}
          <h3 className="text-base font-semibold text-slate-900 leading-tight">
            {list.name}
          </h3>
        </div>
        
        {/* Arrow indicator on hover */}
        <div className="flex items-center gap-2">
          <ArrowRight 
            size={18} 
            className="text-slate-300 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" 
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <button className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors opacity-0 group-hover:opacity-100">
                <MoreHorizontal size={16} />
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

      {/* Meta Row with item counts */}
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
        <span>{totalItems} item{totalItems !== 1 ? 's' : ''}</span>
        <span className="text-slate-300">·</span>
        <span className="text-emerald-600 font-medium">{completedItems} completed</span>
        <span className="text-slate-300">·</span>
        <span>{remainingItems} remaining</span>
      </div>

      {/* Progress Bar with percentage */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{completedItems} of {totalItems} completed</span>
          <span className="font-semibold text-slate-700">{completionRate}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ease-out ${
              completionRate === 100 ? 'bg-emerald-500' : 'bg-blue-600'
            }`}
            style={{ width: `${completionRate}%` }}
          />
        </div>
      </div>

      {/* Owner info */}
      {list.owner_name && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
          <User size={12} />
          <span>{list.owner_name}</span>
        </div>
      )}
    </div>
  );
}

export default AqdListCard;
