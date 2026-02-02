/**
 * Task¹⁰ Priority Card - Weekly Item Card
 * Uses direct CSS classes (not CSS modules) for proper styling
 */
import { Edit2, Trash2, MoreHorizontal, AlertTriangle } from 'lucide-react';
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

  // Rank badge styling
  const getRankClass = () => {
    if (isOverflow) return 'aqd-rank-badge aqd-rank-badge-overflow';
    if (item.rank === 1) return 'aqd-rank-badge aqd-rank-gold';
    if (item.rank === 2) return 'aqd-rank-badge aqd-rank-silver';
    if (item.rank === 3) return 'aqd-rank-badge aqd-rank-bronze';
    return 'aqd-rank-badge';
  };

  // Card class with carryover styling
  const cardClass = isCarryover 
    ? 'aqd-card aqd-card-carryover t10-priority-card t10-priority-card--carryover'
    : 'aqd-card t10-priority-card';

  // Title class with completed styling
  const titleClass = isCompleted
    ? 'aqd-card-title aqd-card-title-completed'
    : 'aqd-card-title';

  const handleCardClick = () => {
    onEdit?.(item);
  };

  return (
    <div className={cardClass} onClick={handleCardClick}>
      {/* Rank Badge */}
      <div className={getRankClass()}>
        {item.rank}
      </div>

      {/* Status Toggle */}
      <AqdStatusToggle 
        status={item.status} 
        onClick={() => onStatusChange(item.id)} 
      />

      {/* Card Body */}
      <div className="aqd-card-body">
        {/* Title Row */}
        <div className="aqd-card-row-top">
          <div className={titleClass}>{item.title}</div>
          
          {/* Carryover Badge */}
          {isCarryover && (
            <span className="aqd-carryover-badge">
              ×{item.carryover_count}
            </span>
          )}
        </div>

        {/* Meta Row with Separators */}
        <div className="aqd-card-meta">
          {item.taskhub_key && (
            <>
              <span className="aqd-taskhub-key">{item.taskhub_key}</span>
              <span className="aqd-meta-separator">·</span>
            </>
          )}
          {item.assignee_name && (
            <>
              <span className="aqd-meta-item">{item.assignee_name}</span>
              <span className="aqd-meta-separator">·</span>
            </>
          )}
          {formattedDueDate && (
            <span className={`aqd-due-date ${isOverdue ? 'aqd-due-date-overdue' : ''}`}>
              {isOverdue && <AlertTriangle size={12} className="mr-1" />}
              Due {formattedDueDate}
            </span>
          )}
          {!item.taskhub_key && !item.assignee_name && !formattedDueDate && (
            <span className="aqd-meta-item" style={{ opacity: 0.5 }}>
              No details
            </span>
          )}
        </div>

        {/* Labels Row */}
        {item.labels && item.labels.length > 0 && (
          <div className="aqd-card-labels">
            {item.labels.map((label) => (
              <AqdLabelBadge key={label.id} label={label} />
            ))}
          </div>
        )}
      </div>

      {/* Hover Actions */}
      <div className="aqd-card-actions">
        {onEdit && (
          <button 
            className="aqd-action-btn"
            onClick={(e) => { e.stopPropagation(); onEdit(item); }}
            title="Edit"
          >
            <Edit2 size={14} />
          </button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <button className="aqd-action-btn">
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
