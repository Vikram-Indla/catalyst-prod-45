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
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    position: 'relative' as const,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <T10PriorityCard
        item={item}
        onToggleStatus={onToggleStatus}
        onClick={onClick}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
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
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const itemIds = useMemo(() => items.map((item) => item.id), [items]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
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
    </DndContext>
  );
}

export default T10SortablePriorityList;
