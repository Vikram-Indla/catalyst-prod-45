/**
 * Task¹⁰ Priority Card - Weekly Item Card
 * Features: Rank badge, status toggle, meta separators, labels, carryover, hover actions
 */
import { Edit2, Trash2, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { AqdItemFull } from '../types/aqd.types';
import { formatDate } from '../types/aqd.types';
import { AqdStatusToggle } from './AqdStatusToggle';
import { AqdLabelBadge } from './AqdLabelBadge';
import styles from '../styles/aqd.module.css';

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

  // Rank badge styling
  const getRankClass = () => {
    if (isOverflow) return `${styles['aqd-rank-badge']} ${styles['aqd-rank-badge-overflow']}`;
    if (item.rank === 1) return `${styles['aqd-rank-badge']} ${styles['aqd-rank-gold']}`;
    if (item.rank === 2) return `${styles['aqd-rank-badge']} ${styles['aqd-rank-silver']}`;
    if (item.rank === 3) return `${styles['aqd-rank-badge']} ${styles['aqd-rank-bronze']}`;
    return styles['aqd-rank-badge'];
  };

  // Card class with carryover styling
  const cardClass = isCarryover 
    ? `${styles['aqd-card']} ${styles['aqd-card-carryover']}`
    : styles['aqd-card'];

  // Title class with completed styling
  const titleClass = isCompleted
    ? `${styles['aqd-card-title']} ${styles['aqd-card-title-completed']}`
    : styles['aqd-card-title'];

  return (
    <div className={cardClass}>
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
      <div className={styles['aqd-card-body']}>
        {/* Title Row */}
        <div className={styles['aqd-card-row-top']}>
          <div className={titleClass}>{item.title}</div>
          
          {/* Carryover Badge */}
          {isCarryover && (
            <span className={styles['aqd-carryover-badge']}>
              ×{item.carryover_count}
            </span>
          )}
        </div>

        {/* Meta Row with Separators */}
        <div className={styles['aqd-card-meta']}>
          {item.taskhub_key && (
            <>
              <span className={styles['aqd-taskhub-key']}>{item.taskhub_key}</span>
              <span className={styles['aqd-meta-separator']}>·</span>
            </>
          )}
          {item.assignee_name && (
            <>
              <span className={styles['aqd-meta-item']}>{item.assignee_name}</span>
              <span className={styles['aqd-meta-separator']}>·</span>
            </>
          )}
          {formattedDueDate && (
            <span className={styles['aqd-due-date']}>Due {formattedDueDate}</span>
          )}
          {!item.taskhub_key && !item.assignee_name && !formattedDueDate && (
            <span className={styles['aqd-meta-item']} style={{ opacity: 0.5 }}>
              No details
            </span>
          )}
        </div>

        {/* Labels Row */}
        {item.labels && item.labels.length > 0 && (
          <div className={styles['aqd-card-labels']}>
            {item.labels.map((label) => (
              <AqdLabelBadge key={label.id} label={label} />
            ))}
          </div>
        )}
      </div>

      {/* Hover Actions */}
      <div className={styles['aqd-card-actions']}>
        {onEdit && (
          <button 
            className={styles['aqd-action-btn']}
            onClick={(e) => { e.stopPropagation(); onEdit(item); }}
            title="Edit"
          >
            <Edit2 size={14} />
          </button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <button className={styles['aqd-action-btn']}>
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
