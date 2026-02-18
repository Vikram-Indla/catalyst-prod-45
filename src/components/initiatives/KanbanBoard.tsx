import { useState, useCallback, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { Initiative, InitiativeStatus, Density } from '@/types/initiative';
import { STATUS_DISPLAY } from '@/types/initiative';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';

const COLUMN_ORDER: InitiativeStatus[] = [
  'new_demand',
  'under_review',
  'approved',
  'in_progress',
  'on_hold',
  'delivered',
  'closed',
  'cancelled',
];

interface KanbanBoardProps {
  data: Initiative[];
  density: Density;
  onRowClick: (initiative: Initiative) => void;
  onStatusChange: (id: string, status: InitiativeStatus) => void;
  onFavoriteToggle: (id: string, isFavorited: boolean) => void;
}

export function KanbanBoard({ data, density, onRowClick, onStatusChange, onFavoriteToggle }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [collapsedColumns, setCollapsedColumns] = useState<Set<InitiativeStatus>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Group initiatives by status
  const columns = useMemo(() => {
    const map = new Map<InitiativeStatus, Initiative[]>();
    COLUMN_ORDER.forEach(s => map.set(s, []));
    data.forEach(item => {
      const col = map.get(item.status);
      if (col) col.push(item);
    });
    return map;
  }, [data]);

  const activeItem = useMemo(
    () => (activeId ? data.find(i => i.id === activeId) : null),
    [activeId, data]
  );

  // Determine which column is being hovered
  const overColumn = useMemo(() => {
    if (!overId) return null;
    // Check if overId is a column ID
    if (COLUMN_ORDER.includes(overId as InitiativeStatus)) return overId as InitiativeStatus;
    // Check if overId is a card — find its column
    const item = data.find(i => i.id === overId);
    return item?.status ?? null;
  }, [overId, data]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    setOverId(event.over?.id as string | null);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverId(null);

    if (!over) return;

    const draggedId = active.id as string;
    let targetStatus: InitiativeStatus | null = null;

    // If dropped on a column droppable
    if (COLUMN_ORDER.includes(over.id as InitiativeStatus)) {
      targetStatus = over.id as InitiativeStatus;
    } else {
      // Dropped on a card — find that card's column
      const targetCard = data.find(i => i.id === over.id);
      targetStatus = targetCard?.status ?? null;
    }

    if (!targetStatus) return;

    const draggedItem = data.find(i => i.id === draggedId);
    if (!draggedItem || draggedItem.status === targetStatus) return;

    onStatusChange(draggedId, targetStatus);
  }, [data, onStatusChange]);

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setOverId(null);
  }, []);

  const toggleCollapse = useCallback((status: InitiativeStatus) => {
    setCollapsedColumns(prev => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }, []);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: 'calc(100vh - 280px)' }}>
        {COLUMN_ORDER.map(status => {
          const items = columns.get(status) || [];
          const isCollapsed = collapsedColumns.has(status);
          const isDropTarget = overColumn === status && activeId !== null;

          return (
            <KanbanColumn
              key={status}
              status={status}
              items={items}
              density={density}
              isCollapsed={isCollapsed}
              isDropTarget={isDropTarget}
              onToggleCollapse={() => toggleCollapse(status)}
              onCardClick={onRowClick}
              onFavoriteToggle={onFavoriteToggle}
              activeId={activeId}
            />
          );
        })}
      </div>

      <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
        {activeItem ? (
          <div className="rotate-[2deg] scale-[1.02] opacity-90">
            <KanbanCard
              initiative={activeItem}
              density={density}
              isDragOverlay
              onFavoriteToggle={(_id: string, _fav: boolean) => {}}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
