import React, { useMemo, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Initiative, InitiativeStatus } from '@/types/initiative';
import { KanbanCard } from './KanbanCard';
import { WipIndicator } from './WipIndicator';
import { QuickAddCard } from './QuickAddCard';
import { SwimlaneHeader } from './SwimlaneHeader';

export interface ColumnConfig {
  key: InitiativeStatus;
  label: string;
  color: string;
  wip: number | null;
}

export type SwimlaneField = 'none' | 'department' | 'assignee' | 'quarter' | 'priority';

interface KanbanColumnProps {
  config: ColumnConfig;
  items: Initiative[];
  onCardClick: (initiative: Initiative) => void;
  onCardContextMenu: (e: React.MouseEvent, initiative: Initiative) => void;
  activeId: string | null;
  swimlane: SwimlaneField;
  focusedCardId: string | null;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

function getSwimlaneKey(item: Initiative, swimlane: SwimlaneField): string {
  switch (swimlane) {
    case 'department': return item.department_name || 'Unassigned';
    case 'assignee': return item.assignee_name || 'Unassigned';
    case 'quarter': return item.target_quarter || 'No Quarter';
    case 'priority': {
      const s = item.computed_score;
      if (s === null) return 'Unscored';
      if (s >= 4.0) return 'High';
      if (s >= 3.0) return 'Medium';
      return 'Low';
    }
    default: return '__all__';
  }
}

function groupBySwimlane(items: Initiative[], swimlane: SwimlaneField): Record<string, Initiative[]> {
  if (swimlane === 'none') return { __all__: items };
  const groups: Record<string, Initiative[]> = {};
  for (const item of items) {
    const key = getSwimlaneKey(item, swimlane);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return groups;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  config,
  items,
  onCardClick,
  onCardContextMenu,
  activeId,
  swimlane,
  focusedCardId,
  isCollapsed,
  onToggleCollapse,
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: config.key });
  const [collapsedLanes, setCollapsedLanes] = useState<Record<string, boolean>>({});
  const [showMenu, setShowMenu] = useState(false);

  const overWip = config.wip !== null && items.length >= config.wip;
  const approachingWip = config.wip !== null && !overWip && items.length >= config.wip - 1;

  const grouped = useMemo(() => groupBySwimlane(items, swimlane), [items, swimlane]);
  const laneKeys = Object.keys(grouped).sort();

  const toggleLane = (key: string) =>
    setCollapsedLanes(prev => ({ ...prev, [key]: !prev[key] }));

  // Collapsed column
  if (isCollapsed) {
    return (
      <button
        onClick={onToggleCollapse}
        className={cn(
          'flex-shrink-0 w-12 min-w-[48px] rounded-xl border flex flex-col items-center py-3 bg-white shadow-sm cursor-pointer transition-all hover:bg-zinc-50',
          overWip ? 'border-amber-400' : 'border-zinc-200'
        )}
        aria-label={`Expand ${config.label} column`}
      >
        <span className="w-2.5 h-2.5 rounded-full mb-2 shrink-0" style={{ backgroundColor: config.color }} />
        <span
          className="text-xs font-semibold text-zinc-700 whitespace-nowrap"
          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
        >
          {config.label}
        </span>
        <span className="text-[10px] text-zinc-400 font-semibold mt-2 tabular-nums">{items.length}</span>
        <ChevronRight className="w-3.5 h-3.5 text-zinc-400 mt-2" />
      </button>
    );
  }

  const totalScore = items.reduce((sum, i) => sum + (i.computed_score ?? 0), 0);

  return (
    <div
      className={cn(
        'flex-shrink-0 w-[300px] min-w-[300px] rounded-xl border flex flex-col bg-white shadow-sm transition-all',
        isOver && 'border-blue-400 bg-blue-50/30',
        !isOver && overWip && 'border-red-300 shadow-[0_0_0_2px_rgba(239,68,68,0.15)]',
        !isOver && !overWip && approachingWip && 'border-amber-300 shadow-[0_0_0_2px_rgba(251,191,36,0.15)]',
        !isOver && !overWip && !approachingWip && 'border-zinc-200'
      )}
      aria-label={`${config.label} column with ${items.length} items`}
    >
      {/* Header — sticky */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-100 sticky top-0 bg-white z-10 rounded-t-xl">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: config.color }} />
          <span className="text-sm font-semibold text-zinc-900 truncate">{config.label}</span>
          <WipIndicator count={items.length} limit={config.wip} />
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={onToggleCollapse}
            className="w-7 h-7 flex items-center justify-center rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label={`Collapse ${config.label} column`}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-7 h-7 flex items-center justify-center rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-zinc-200 rounded-lg shadow-lg z-50 py-1">
                  <div className="px-3 py-1.5 text-[10px] text-zinc-400 font-medium">
                    Total Score: {totalScore.toFixed(1)}
                  </div>
                  <div className="h-px bg-zinc-100 my-1" />
                  <button
                    onClick={() => { onToggleCollapse(); setShowMenu(false); }}
                    className="w-full text-left px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                  >
                    Collapse Column
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin scrollbar-thumb-zinc-200',
          isOver && 'bg-blue-50/20'
        )}
        style={{ maxHeight: 'calc(100vh - 280px)' }}
        role="listbox"
        aria-label={`${config.label} cards`}
      >
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          {swimlane === 'none' ? (
            items.map(item => (
              <KanbanCard
                key={item.id}
                initiative={item}
                onClick={() => onCardClick(item)}
                onContextMenu={onCardContextMenu}
                isFocused={focusedCardId === item.id}
              />
            ))
          ) : (
            laneKeys.map(laneKey => (
              <div key={laneKey}>
                <SwimlaneHeader
                  label={laneKey}
                  count={grouped[laneKey].length}
                  isCollapsed={!!collapsedLanes[laneKey]}
                  onToggle={() => toggleLane(laneKey)}
                />
                {!collapsedLanes[laneKey] && (
                  <div className="space-y-2 mt-1.5 mb-2">
                    {grouped[laneKey].map(item => (
                      <KanbanCard
                        key={item.id}
                        initiative={item}
                        onClick={() => onCardClick(item)}
                        onContextMenu={onCardContextMenu}
                        isFocused={focusedCardId === item.id}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
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
