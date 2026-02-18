import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Star, AlertTriangle } from 'lucide-react';
import type { Initiative, Density } from '@/types/initiative';
import { getPriorityLevel, getAvatarColor, getInitials } from '@/types/initiative';
import { cn } from '@/lib/utils';

interface KanbanCardProps {
  initiative: Initiative;
  density: Density;
  isDragOverlay?: boolean;
  isGhost?: boolean;
  onClick?: () => void;
  onFavoriteToggle: (id: string, isFavorited: boolean) => void;
}

export function KanbanCard({ initiative, density, isDragOverlay, isGhost, onClick, onFavoriteToggle }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: initiative.id, disabled: isDragOverlay });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priority = getPriorityLevel(initiative.computed_score);
  const isOverdue = initiative.target_complete && new Date(initiative.target_complete) < new Date() &&
    !['delivered', 'closed', 'cancelled'].includes(initiative.status);
  const isDelivered = initiative.status === 'delivered';
  const isCancelled = initiative.status === 'cancelled';

  const progressColor = isDelivered ? '#10b981' : initiative.progress >= 40 && initiative.progress < 70 ? '#f59e0b' : '#2563eb';

  if (isGhost) {
    return (
      <div className="rounded-lg border-2 border-dashed border-zinc-200 bg-zinc-100/50" style={{ height: density === 'compact' ? 48 : density === 'comfortable' ? 140 : 110 }} />
    );
  }

  // Compact: just ID + title
  if (density === 'compact' && !isDragOverlay) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onClick={onClick}
        className={cn(
          'bg-white rounded-lg border border-zinc-200 px-3 py-2 cursor-pointer transition-shadow hover:shadow-md hover:border-zinc-300',
          isDragging && 'opacity-50',
          isCancelled && 'opacity-55',
          isOverdue && 'border-l-2 border-l-red-400'
        )}
      >
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-medium text-blue-600">{initiative.initiative_key}</span>
          <span className="text-[12px] text-zinc-800 font-medium truncate">{initiative.title}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={!isDragOverlay ? setNodeRef : undefined}
      style={!isDragOverlay ? style : undefined}
      {...(!isDragOverlay ? attributes : {})}
      {...(!isDragOverlay ? listeners : {})}
      onClick={onClick}
      className={cn(
        'bg-white rounded-lg border border-zinc-200 p-3 cursor-pointer transition-all group',
        'hover:shadow-md hover:border-zinc-300',
        isDragging && 'opacity-50',
        isDragOverlay && 'shadow-lg',
        isCancelled && 'opacity-55',
        isOverdue && 'border-l-2 border-l-red-400'
      )}
    >
      {/* Row 1: ID + Priority + Star */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
            {initiative.initiative_key}
          </span>
          <span
            className="inline-flex items-center px-1.5 h-[18px] rounded-full border text-[10px] font-medium"
            style={{ backgroundColor: priority.bg, borderColor: priority.border, color: priority.text }}
          >
            {priority.level}
          </span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onFavoriteToggle(initiative.id, !initiative.is_favorited); }}
          className="w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Star
            size={13}
            className={initiative.is_favorited ? 'fill-amber-400 text-amber-400' : 'text-zinc-300 hover:text-amber-400'}
          />
        </button>
      </div>

      {/* Row 2: Title */}
      <p className="text-[13px] font-medium text-zinc-900 leading-snug line-clamp-2 mb-2">
        {initiative.title}
      </p>

      {/* Row 3: Description preview (comfortable only) */}
      {density === 'comfortable' && initiative.description && (
        <p className="text-[11px] text-zinc-500 line-clamp-2 mb-2 leading-relaxed">
          {initiative.description}
        </p>
      )}

      {/* Row 4: Assignee + Department */}
      <div className="flex items-center gap-2 mb-2">
        {initiative.assignee_name ? (
          <>
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-white flex-shrink-0"
              style={{ backgroundColor: getAvatarColor(initiative.assignee_name), fontSize: 9, fontWeight: 600 }}
            >
              {getInitials(initiative.assignee_name)}
            </div>
            <span className="text-[11px] text-zinc-600 truncate">{initiative.assignee_name}</span>
          </>
        ) : (
          <>
            <div className="w-5 h-5 rounded-full border-[1.5px] border-dashed border-zinc-300 flex-shrink-0" />
            <span className="text-[11px] text-zinc-400 italic">Unassigned</span>
          </>
        )}
        {initiative.department_name && (
          <>
            <span className="text-zinc-300">·</span>
            <span className="text-[11px] text-zinc-400 truncate">{initiative.department_name}</span>
          </>
        )}
      </div>

      {/* Row 5: Progress + Quarter + Overdue */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="w-[36px] h-[3px] bg-zinc-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.min(initiative.progress, 100)}%`, backgroundColor: progressColor }}
            />
          </div>
          <span className="text-[10px] text-zinc-500 tabular-nums">{initiative.progress}%</span>
        </div>

        <div className="flex items-center gap-1.5">
          {isOverdue && (
            <AlertTriangle size={12} className="text-red-500" />
          )}
          {initiative.target_quarter && (
            <span className="text-[10px] font-medium text-zinc-400">
              {initiative.target_quarter}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
