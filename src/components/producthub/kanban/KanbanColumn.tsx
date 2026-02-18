import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Initiative, InitiativeStatus } from '@/types/initiative';
import { KanbanCard } from './KanbanCard';
import { WipIndicator } from './WipIndicator';
import { QuickAddCard } from './QuickAddCard';

export interface ColumnConfig {
  key: InitiativeStatus;
  label: string;
  color: string;
  wip: number | null;
}

interface KanbanColumnProps {
  config: ColumnConfig;
  items: Initiative[];
  onCardClick: (initiative: Initiative) => void;
  activeId: string | null;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  config,
  items,
  onCardClick,
  activeId,
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: config.key });

  const overWip = config.wip !== null && items.length > config.wip;

  return (
    <div
      className={cn(
        'flex-shrink-0 w-[300px] min-w-[300px] rounded-xl border flex flex-col bg-white shadow-sm transition-all',
        isOver && 'border-blue-400 bg-blue-50/30',
        overWip && !isOver && 'border-amber-400 shadow-[0_0_0_2px_rgba(251,191,36,0.3)]',
        !isOver && !overWip && 'border-zinc-200'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-100">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: config.color }}
          />
          <span className="text-sm font-semibold text-zinc-900 truncate">
            {config.label}
          </span>
          <WipIndicator count={items.length} limit={config.wip} />
        </div>
        <button className="w-7 h-7 flex items-center justify-center rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin scrollbar-thumb-zinc-200',
          isOver && 'border-2 border-dashed border-blue-400 rounded-lg bg-blue-50/20 m-1'
        )}
        style={{ maxHeight: 'calc(100vh - 280px)' }}
      >
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          {items.map(item => (
            <KanbanCard
              key={item.id}
              initiative={item}
              onClick={() => onCardClick(item)}
            />
          ))}
        </SortableContext>

        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <span className="text-2xl mb-2">📭</span>
            <p className="text-sm text-zinc-400">No initiatives</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-2 pb-2 pt-1">
        <QuickAddCard status={config.key} />
      </div>
    </div>
  );
};
