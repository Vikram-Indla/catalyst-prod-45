/**
 * EpicKanbanColumn — Epic Backlog Kanban column.
 *
 * Phase 9: DnD engine migrated from @hello-pangea/dnd → Atlaskit Pragmatic
 * drag-and-drop. Visual surface (rounded cards, selection checkbox, health
 * dot, points/MVP/Blocked chips, collapsed rail) preserved verbatim. Only
 * the DnD primitives change.
 */
import { useEffect, useRef, useState } from 'react';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { BacklogItem } from '../types';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { ChevronLeft, Inbox, Plus, GripVertical } from 'lucide-react';

interface EpicKanbanColumnProps {
  columnId: string;
  label: string;
  color: string;
  items: BacklogItem[];
  selectedItems: string[];
  onItemClick: (itemId: string) => void;
  onItemSelect: (itemId: string, selected: boolean) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onAddEpic?: () => void;
}

/* ═══════════════════════════════════════════════════════════════════════
   Pragmatic draggable card — whole card becomes the drag anchor.
   ═══════════════════════════════════════════════════════════════════════ */

interface PragmaticEpicCardProps {
  item: BacklogItem;
  columnId: string;
  selected: boolean;
  onItemClick: (itemId: string) => void;
  onItemSelect: (itemId: string, selected: boolean) => void;
}

function PragmaticEpicCard({
  item, columnId, selected, onItemClick, onItemSelect,
}: PragmaticEpicCardProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    return draggable({
      element,
      getInitialData: () => ({ type: 'card', cardId: item.id, fromColumn: columnId }),
      onDragStart: () => setIsDragging(true),
      onDrop: () => setIsDragging(false),
    });
  }, [item.id, columnId]);

  return (
    <div ref={ref}>
      <Card
        className={cn(
          'rounded-xl cursor-pointer transition-all duration-200',
          'bg-white dark:bg-gray-900 border group relative',
          selected && 'ring-2 ring-primary',
          isDragging
            ? 'shadow-lg opacity-90 rotate-1 border-gray-300 dark:border-gray-600'
            : 'border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 hover:-translate-y-0.5'
        )}
        onClick={(e) => {
          e.stopPropagation();
          onItemClick(item.id);
        }}
      >
        {/* Drag Handle (visual only — whole card is draggable) */}
        <div
          className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-grab"
        >
          <GripVertical className="w-4 h-4 text-gray-300 dark:text-gray-600" />
        </div>

        <div className="p-4">
          {/* Header: Key + Status */}
          <div className="flex items-start gap-2 mb-2">
            <Checkbox
              checked={selected}
              onCheckedChange={(checked) => onItemSelect(item.id, checked as boolean)}
              onClick={(e) => e.stopPropagation()}
              className="mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <div className="font-mono text-[11px] text-gray-500 dark:text-gray-400 mb-1">
                {item.displayId || item.key || item.id.slice(0, 8)}
              </div>
              <div className="text-[14px] font-medium line-clamp-2 text-gray-900 dark:text-gray-100 group-hover:text-[var(--ds-text-brand,#2563eb)] dark:group-hover:text-[var(--ds-text-brand,#60a5fa)] transition-colors">
                {item.name}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-2 flex-wrap mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            {item.health && (
              <div
                className={cn(
                  'h-2 w-2 rounded-full',
                  {
                    green: 'bg-success',
                    yellow: 'bg-warning',
                    red: 'bg-destructive',
                    gray: 'bg-muted-foreground',
                  }[item.health]
                )}
                title={`Health: ${item.health}`}
              />
            )}

            {item.points !== undefined && item.points !== null && (
              <span className="text-xs text-muted-foreground bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                {item.points} pts
              </span>
            )}

            {item.mvp && (
              <span className="px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded">
                MVP
              </span>
            )}

            {item.blocked && (
              <span className="px-2 py-0.5 text-xs bg-destructive text-destructive-foreground rounded">
                Blocked
              </span>
            )}

            {item.ownerName && (
              <span className="ml-auto text-xs text-muted-foreground">
                {item.ownerName}
              </span>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   EpicKanbanColumn — collapsed + expanded rendering.
   ═══════════════════════════════════════════════════════════════════════ */

export function EpicKanbanColumn({
  columnId,
  label,
  color,
  items,
  selectedItems,
  onItemClick,
  onItemSelect,
  collapsed = false,
  onToggleCollapse,
  onAddEpic,
}: EpicKanbanColumnProps) {
  const [isHeaderHovered, setIsHeaderHovered] = useState(false);
  const [isOver, setIsOver] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = listRef.current;
    if (!element) return;
    return dropTargetForElements({
      element,
      getData: () => ({ type: 'column', columnId }),
      canDrop: ({ source }) => source.data.type === 'card',
      onDragEnter: () => setIsOver(true),
      onDragLeave: () => setIsOver(false),
      onDrop: () => setIsOver(false),
    });
  }, [columnId]);

  if (collapsed) {
    return (
      <div
        onClick={onToggleCollapse}
        onMouseEnter={() => setIsHeaderHovered(true)}
        onMouseLeave={() => setIsHeaderHovered(false)}
        className={cn(
          'cursor-pointer transition-all duration-150',
          'flex flex-col items-center py-3 flex-shrink-0',
          'rounded-xl border',
          'bg-gray-50 dark:bg-gray-800/50',
          'border-gray-200 dark:border-gray-700',
          isHeaderHovered ? 'shadow-md' : 'shadow-sm'
        )}
        style={{
          width: '44px',
          minWidth: '44px',
          height: '100%',
        }}
      >
        <div
          className="w-2.5 h-2.5 rounded-full mb-2 flex-shrink-0"
          style={{ backgroundColor: color }}
        />
        <span className="text-xs font-bold mb-2 text-gray-900 dark:text-gray-100">
          {items.length}
        </span>
        <span
          className="text-[10px] font-semibold tracking-wide uppercase text-gray-500 dark:text-gray-400"
          style={{
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            transform: 'rotate(180deg)',
          }}
        >
          {label}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col flex-shrink-0 transition-all duration-150',
        'rounded-xl border shadow-sm',
        'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
      )}
      style={{
        width: '320px',
        minWidth: '320px',
        maxWidth: '320px',
        height: '100%',
        minHeight: '500px',
      }}
    >
      {/* Column Header */}
      <div className="flex-shrink-0 rounded-t-xl px-4 py-3 border-b bg-gray-50 dark:bg-gray-800/30 border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className="text-[14px] font-semibold text-gray-900 dark:text-gray-100">
              {label}
            </span>
            <span className="bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-[12px] font-medium px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-600 shadow-sm">
              {items.length}
            </span>
          </div>
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              onMouseEnter={() => setIsHeaderHovered(true)}
              onMouseLeave={() => setIsHeaderHovered(false)}
              className="p-1.5 rounded-lg transition-all cursor-pointer text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-700/60"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Droppable Area (Pragmatic drop target) */}
      <div
        ref={listRef}
        className={cn(
          'flex-1 overflow-y-auto p-3 flex flex-col gap-2.5',
          isOver && 'bg-[rgba(37,99,235,0.08)] dark:bg-[rgba(37,99,235,0.1)]'
        )}
        style={{ minHeight: 0 }}
      >
        {items.map((item) => (
          <PragmaticEpicCard
            key={item.id}
            item={item}
            columnId={columnId}
            selected={selectedItems.includes(item.id)}
            onItemClick={onItemClick}
            onItemSelect={onItemSelect}
          />
        ))}

        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-800/30 mx-2 mb-2">
            <div className="w-12 h-12 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center mb-3 shadow-sm border border-gray-100 dark:border-gray-700">
              <Inbox className="w-6 h-6 text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400 mb-1">
              No items
            </p>
            <p className="text-[12px] text-gray-400 dark:text-gray-500 text-center">
              Drag epics here
            </p>
          </div>
        )}
      </div>

      {/* Add Item Button */}
      {onAddEpic && (
        <div className="p-2 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onAddEpic}
            className="w-full py-2 text-[13px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-white dark:hover:bg-gray-800 rounded-lg transition-colors flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add Epic
          </button>
        </div>
      )}
    </div>
  );
}
