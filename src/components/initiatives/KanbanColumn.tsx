import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ChevronRight, MoreHorizontal } from 'lucide-react';
import type { Initiative, InitiativeStatus, Density } from '@/types/initiative';
import { STATUS_DISPLAY } from '@/types/initiative';
import { KanbanCard } from './KanbanCard';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
  status: InitiativeStatus;
  items: Initiative[];
  density: Density;
  isCollapsed: boolean;
  isDropTarget: boolean;
  onToggleCollapse: () => void;
  onCardClick: (initiative: Initiative) => void;
  onFavoriteToggle: (id: string, isFavorited: boolean) => void;
  activeId: string | null;
}

export function KanbanColumn({
  status,
  items,
  density,
  isCollapsed,
  isDropTarget,
  onToggleCollapse,
  onCardClick,
  onFavoriteToggle,
  activeId,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const display = STATUS_DISPLAY[status];
  const highlight = isDropTarget || isOver;

  if (isCollapsed) {
    return (
      <div
        className="flex-shrink-0 w-10 rounded-lg bg-zinc-50 border border-zinc-200 flex flex-col items-center pt-3 gap-2 cursor-pointer hover:bg-zinc-100 transition-colors"
        onClick={onToggleCollapse}
      >
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: display.dot }}
        />
        <span className="text-[11px] font-medium text-zinc-500 [writing-mode:vertical-lr] rotate-180">
          {display.label}
        </span>
        <span className="text-[10px] font-medium text-zinc-400 mt-1">{items.length}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex-shrink-0 w-[280px] min-w-[280px] max-w-[320px] rounded-lg border flex flex-col transition-all',
        highlight
          ? 'bg-blue-50/50 border-blue-300 ring-2 ring-blue-500/20'
          : 'bg-zinc-50 border-zinc-200'
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-200/60 sticky top-0 bg-inherit rounded-t-lg z-10">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onToggleCollapse}
            className="w-5 h-5 flex items-center justify-center text-zinc-400 hover:text-zinc-600 rounded transition-colors"
          >
            <ChevronRight size={14} className="rotate-90" />
          </button>
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: display.dot }}
          />
          <span className="text-[13px] font-medium text-zinc-800 truncate">
            {display.label}
          </span>
          <span className="text-[11px] font-medium text-zinc-400 bg-zinc-200/60 rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
            {items.length}
          </span>
        </div>
        <button className="w-6 h-6 flex items-center justify-center text-zinc-400 hover:text-zinc-600 rounded transition-colors">
          <MoreHorizontal size={14} />
        </button>
      </div>

      {/* Column Body */}
      <div
        ref={setNodeRef}
        className="flex-1 overflow-y-auto p-2 space-y-2"
        style={{ maxHeight: 'calc(100vh - 340px)' }}
      >
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          {items.map(item => (
            <KanbanCard
              key={item.id}
              initiative={item}
              density={density}
              onClick={() => onCardClick(item)}
              onFavoriteToggle={(id, fav) => onFavoriteToggle(id, fav)}
              isGhost={item.id === activeId}
            />
          ))}
        </SortableContext>

        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center mb-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: display.dot, opacity: 0.4 }}
              />
            </div>
            <p className="text-[12px] text-zinc-400">No items</p>
          </div>
        )}
      </div>
    </div>
  );
}
