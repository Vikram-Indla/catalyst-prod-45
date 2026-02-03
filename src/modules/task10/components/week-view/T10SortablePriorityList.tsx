// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ SORTABLE PRIORITY LIST
// Drag-and-drop reorderable list using @dnd-kit
// ═══════════════════════════════════════════════════════════════════════════

import { useMemo, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState } from 'react';
import type { T10ItemWithAssignee } from '../../types';
import { T10PriorityCard } from './T10PriorityCard';

interface T10SortablePriorityListProps {
  items: T10ItemWithAssignee[];
  onToggleStatus: (itemId: string, done: boolean) => void;
  onItemClick: (item: T10ItemWithAssignee) => void;
  onReorder: (itemIds: string[]) => void;
  disabled?: boolean;
}

interface SortableItemProps {
  item: T10ItemWithAssignee;
  onToggleStatus: (itemId: string, done: boolean) => void;
  onClick: () => void;
}

function SortableItem({ item, onToggleStatus, onClick }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as const,
    touchAction: 'none', // Critical for drag to work on touch devices
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <T10PriorityCard
        item={item}
        onToggleStatus={onToggleStatus}
        onClick={onClick}
        isDragging={isDragging}
        dragHandleProps={{ ...listeners }}
      />
    </div>
  );
}

export function T10SortablePriorityList({
  items,
  onToggleStatus,
  onItemClick,
  onReorder,
  disabled = false,
}: T10SortablePriorityListProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  
  // Lower activation distance to make clicks work better
  // distance: 5 means you need to drag 5px before drag starts, allowing clicks through
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const itemIds = useMemo(() => items.map((item) => item.id), [items]);
  const activeItem = useMemo(
    () => items.find((item) => item.id === activeId),
    [items, activeId]
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = itemIds.indexOf(active.id as string);
        const newIndex = itemIds.indexOf(over.id as string);
        const newOrder = arrayMove(itemIds, oldIndex, newIndex);
        onReorder(newOrder);
      }
    },
    [itemIds, onReorder]
  );

  if (items.length === 0) {
    return (
      <div className="t10-priority-empty">
        <p>No priorities yet. Add your first item below.</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={itemIds}
        strategy={verticalListSortingStrategy}
        disabled={disabled}
      >
        <div className="t10-priority-list">
          {items.map((item) => (
            <SortableItem
              key={item.id}
              item={item}
              onToggleStatus={onToggleStatus}
              onClick={() => onItemClick(item)}
            />
          ))}
        </div>
      </SortableContext>
      
      <DragOverlay>
        {activeItem ? (
          <div className="t10-priority-card--overlay">
            <T10PriorityCard
              item={activeItem}
              onToggleStatus={() => {}}
              isDragging
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export default T10SortablePriorityList;
