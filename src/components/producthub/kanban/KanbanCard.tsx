import React, { useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { Pencil, Star, MoreHorizontal } from 'lucide-react';
import type { Initiative } from '@/types/initiative';
import { getPriorityLevel, getAvatarColor, getInitials } from '@/types/initiative';
import { format, differenceInDays, isPast } from 'date-fns';

interface KanbanCardProps {
  initiative: Initiative;
  onClick: () => void;
  onContextMenu?: (e: React.MouseEvent, initiative: Initiative) => void;
  isOverlay?: boolean;
  isFocused?: boolean;
}

function getScoreColor(score: number | null): string {
  if (score === null) return '#a1a1aa';
  if (score >= 4.0) return '#059669';
  if (score >= 3.0) return '#2563eb';
  return '#d97706';
}

function getScoreBorderClass(score: number | null): string {
  if (score === null) return 'border-l-4 border-l-zinc-200 border-dashed';
  if (score >= 4.0) return 'border-l-4 border-l-emerald-500';
  if (score >= 3.0) return 'border-l-4 border-l-blue-500';
  return 'border-l-4 border-l-amber-500';
}

function getDueDateChip(date: string | null) {
  if (!date) return null;
  const d = new Date(date);
  const now = new Date();
  const days = differenceInDays(d, now);
  const formatted = format(d, 'MMM d');

  if (isPast(d) && days < 0) return { icon: '⚠', label: formatted, cls: 'text-red-700 bg-red-50' };
  if (days <= 14) return { icon: '⏰', label: formatted, cls: 'text-amber-700 bg-amber-50' };
  return { icon: '📅', label: formatted, cls: 'text-emerald-700 bg-emerald-50' };
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

  const dueChip = getDueDateChip(initiative.target_complete);
  const score = initiative.computed_score;
  const isCancelled = initiative.status === 'cancelled';

  const priorityBadge = (() => {
    if (score === null) return { label: '—', cls: 'text-zinc-400 bg-zinc-100' };
    if (score >= 4.0) return { label: `High · ${score.toFixed(1)}`, cls: 'text-emerald-800 bg-emerald-500/12' };
    if (score >= 3.0) return { label: `Med · ${score.toFixed(1)}`, cls: 'text-blue-800 bg-blue-500/12' };
    return { label: `Low · ${score.toFixed(1)}`, cls: 'text-amber-800 bg-amber-500/12' };
  })();

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu?.(e, initiative);
  }, [initiative, onContextMenu]);

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
      className={cn(
        'group bg-white border border-zinc-200 rounded-xl p-3 cursor-grab active:cursor-grabbing transition-all relative',
        getScoreBorderClass(score),
        isDragging && 'opacity-50 rotate-[2deg] scale-[1.02]',
        isOverlay && 'shadow-xl rotate-[3deg] scale-[1.04]',
        isCancelled && 'opacity-55',
        isFocused && 'ring-2 ring-blue-500 ring-offset-2',
        !isDragging && !isOverlay && 'hover:shadow-md hover:border-zinc-300 hover:-translate-y-px',
        'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2'
      )}
      tabIndex={0}
    >
      {/* Hover actions */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-100 flex items-center gap-0.5 bg-white shadow-sm border border-zinc-200 rounded-md p-0.5 z-10">
        <button
          onClick={e => { e.stopPropagation(); onClick(); }}
          className="w-[22px] h-[22px] flex items-center justify-center rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <Pencil className="w-3 h-3" />
        </button>
        <button
          onClick={e => { e.stopPropagation(); }}
          className="w-[22px] h-[22px] flex items-center justify-center rounded hover:bg-zinc-100 text-zinc-400 hover:text-amber-500 focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <Star className={cn('w-3 h-3', initiative.is_favorited && 'fill-amber-500 text-amber-500')} />
        </button>
        <button
          onClick={e => { e.stopPropagation(); }}
          className="w-[22px] h-[22px] flex items-center justify-center rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <MoreHorizontal className="w-3 h-3" />
        </button>
      </div>

      {/* Row 1: ID + Priority badge */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-mono text-[10px] font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
          {initiative.initiative_key}
        </span>
        <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded', priorityBadge.cls)}>
          {priorityBadge.label}
        </span>
      </div>

      {/* Row 2: Title */}
      <h4 className={cn(
        'text-[13px] font-medium text-zinc-900 leading-snug mb-2 line-clamp-2',
        isCancelled && 'line-through'
      )}>
        {initiative.is_favorited && <span className="text-amber-500 mr-1">★</span>}
        {initiative.title}
      </h4>

      {/* Row 3: Meta tags */}
      <div className="flex flex-wrap gap-1.5 mb-2.5">
        {initiative.department_name && (
          <span className="text-[10px] bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded max-w-[120px] truncate">
            {initiative.department_name}
          </span>
        )}
        {initiative.target_quarter && (
          <span className="text-[10px] bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded">
            {initiative.target_quarter}
          </span>
        )}
        {dueChip && (
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded', dueChip.cls)}>
            {dueChip.icon} {dueChip.label}
          </span>
        )}
      </div>

      {/* Row 4: Score + Progress + Avatar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <div className="w-12 h-[3px] bg-zinc-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: score !== null ? `${Math.min((score / 5) * 100, 100)}%` : '0%',
                backgroundColor: getScoreColor(score),
              }}
            />
          </div>
          <span
            className="text-[10px] font-semibold font-mono tabular-nums"
            style={{ color: getScoreColor(score) }}
          >
            {score !== null ? score.toFixed(1) : '—'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="w-10 h-[3px] bg-zinc-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(initiative.progress, 100)}%`,
                backgroundColor:
                  initiative.progress >= 100
                    ? '#10b981'
                    : dueChip?.cls.includes('red')
                      ? '#ef4444'
                      : '#3b82f6',
              }}
            />
          </div>
          <span className="text-[10px] text-zinc-500 tabular-nums font-medium">
            {initiative.progress}%
          </span>
        </div>

        {initiative.assignee_name ? (
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-semibold text-white shrink-0"
            style={{ backgroundColor: getAvatarColor(initiative.assignee_name) }}
            title={initiative.assignee_name}
          >
            {getInitials(initiative.assignee_name)}
          </div>
        ) : (
          <div className="w-6 h-6 rounded-full border-2 border-dashed border-zinc-300 bg-zinc-100 flex items-center justify-center text-[9px] text-zinc-400 shrink-0">
            ?
          </div>
        )}
      </div>

      {/* Row 5: Badges (conditional) */}
      {(initiative.risk_count > 0) && (
        <div className="mt-2 pt-2 border-t border-zinc-100 flex items-center gap-3">
          <span className="text-[10px] text-zinc-400">🔗 {initiative.risk_count}</span>
        </div>
      )}
    </div>
  );
};
