/**
 * Task¹⁰ Priority Card - Weekly Item Card
 * Enterprise styling with rank badges, hover states, and visual polish
 */
import { Edit2, Trash2, MoreHorizontal, AlertTriangle, ArrowRight } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { AqdItemFull } from '../types/aqd.types';
import { formatDate } from '../types/aqd.types';
import { AqdStatusToggle } from './AqdStatusToggle';
import { AqdLabelBadge } from './AqdLabelBadge';

interface AqdPriorityCardProps {
  item: AqdItemFull;
  onStatusChange: (itemId: string) => void;
  onEdit?: (item: AqdItemFull) => void;
  onDelete?: (itemId: string) => void;
  isOverflow?: boolean;
}

export function AqdPriorityCard({ 
  item, 
  onStatusChange, 
  onEdit, 
  onDelete,
  isOverflow = false 
}: AqdPriorityCardProps) {
  const isCompleted = item.status === 'completed';
  const isCarryover = item.is_carryover && item.carryover_count > 0;
  const formattedDueDate = formatDate(item.due_date);
  
  // Check if overdue (due date in the past and not completed)
  const isOverdue = !isCompleted && item.due_date && new Date(item.due_date) < new Date();
  const isDueToday = !isCompleted && item.due_date && new Date(item.due_date).toDateString() === new Date().toDateString();

  // Rank badge styling - Gold/Silver/Bronze for top 3, light style for others
  const getRankBadge = () => {
    if (isCarryover) {
      return 'w-8 h-8 rounded-lg bg-gradient-to-br from-amber-50 to-amber-100 border-2 border-amber-300 text-amber-700 flex items-center justify-center text-sm font-bold shrink-0';
    }
    if (isOverflow) {
      return 'w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center text-sm font-bold shrink-0';
    }
    // Top 3 get special treatment
    if (item.rank === 1) {
      return 'w-8 h-8 rounded-lg bg-gradient-to-br from-amber-100 to-amber-200 border-2 border-amber-400 text-amber-800 flex items-center justify-center text-sm font-bold shrink-0 shadow-sm';
    }
    if (item.rank === 2) {
      return 'w-8 h-8 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 border-2 border-slate-300 text-slate-600 flex items-center justify-center text-sm font-bold shrink-0 shadow-sm';
    }
    if (item.rank === 3) {
      return 'w-8 h-8 rounded-lg bg-gradient-to-br from-orange-100 to-orange-200 border-2 border-orange-300 text-orange-700 flex items-center justify-center text-sm font-bold shrink-0 shadow-sm';
    }
    // Standard rank badge
    return 'w-8 h-8 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-200 text-slate-600 flex items-center justify-center text-sm font-bold shrink-0';
  };

  // Card classes with shadows and hover lift
  const cardClasses = [
    'w-full bg-white rounded-xl p-4 cursor-pointer',
    'border border-slate-200',
    'shadow-sm hover:shadow-md hover:border-slate-300',
    'hover:-translate-y-0.5',
    'transition-all duration-150 ease-out',
    'flex items-start gap-3 group',
    isCarryover ? 'border-l-4 border-l-amber-500 bg-amber-50/30' : '',
    isCompleted ? 'opacity-70' : '',
  ].filter(Boolean).join(' ');

  const handleCardClick = () => {
    onEdit?.(item);
  };

  return (
    <div className={cardClasses} onClick={handleCardClick}>
      {/* Rank Badge */}
      <div className={getRankBadge()}>
        {item.rank}
      </div>

      {/* Status Toggle */}
      <AqdStatusToggle 
        status={item.status} 
        onClick={() => onStatusChange(item.id)} 
      />

      {/* Card Body */}
      <div className="flex-1 min-w-0">
        {/* Title Row */}
        <div className="flex items-start gap-2 mb-1">
          <span className={`text-sm font-semibold leading-tight flex-1 ${
            isCompleted ? 'line-through text-slate-400' : 'text-slate-900'
          }`}>
            {item.title}
          </span>
          
          {/* Enhanced Carryover Badge */}
          {isCarryover && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold border border-amber-200 shrink-0">
              <ArrowRight size={10} />
              Carried ×{item.carryover_count}
            </span>
          )}
        </div>

        {/* Meta Row */}
        <div className="flex items-center flex-wrap gap-0 text-xs text-slate-500 mt-1">
          {item.taskhub_key && (
            <>
              <span className="font-mono font-semibold text-blue-600">{item.taskhub_key}</span>
              <span className="mx-2 text-slate-300">·</span>
            </>
          )}
          {item.assignee_name && (
            <>
              <span>{item.assignee_name}</span>
              <span className="mx-2 text-slate-300">·</span>
            </>
          )}
          {formattedDueDate && (
            <span className={`flex items-center gap-1 ${
              isOverdue ? 'text-red-600 font-semibold' : 
              isDueToday ? 'text-amber-600 font-semibold' : 
              'text-slate-500'
            }`}>
              {isOverdue && <AlertTriangle size={12} />}
              {isOverdue ? 'Overdue' : isDueToday ? 'Due Today' : `Due ${formattedDueDate}`}
            </span>
          )}
          {!item.taskhub_key && !item.assignee_name && !formattedDueDate && (
            <span className="text-slate-400 italic">No details</span>
          )}
        </div>

        {/* Labels Row */}
        {item.labels && item.labels.length > 0 && (
          <div className="flex gap-1 flex-wrap mt-2">
            {item.labels.map((label) => (
              <AqdLabelBadge key={label.id} label={label} />
            ))}
          </div>
        )}
      </div>

      {/* Hover Actions */}
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {onEdit && (
          <button 
            className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            onClick={(e) => { e.stopPropagation(); onEdit(item); }}
            title="Edit"
          >
            <Edit2 size={14} />
          </button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <button className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
              <MoreHorizontal size={14} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(item); }}>
              <Edit2 size={14} className="mr-2" />
              Edit
            </DropdownMenuItem>
            {onDelete && (
              <DropdownMenuItem 
                className="text-destructive"
                onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
              >
                <Trash2 size={14} className="mr-2" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export default AqdPriorityCard;
