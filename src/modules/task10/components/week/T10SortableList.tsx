import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { T10PriorityCard } from './T10PriorityCard';
import type { T10Item } from '../../types';

interface T10SortableListProps {
  items: T10Item[];
  onReorder: (activeId: string, overId: string) => void;
  onCardClick: (itemId: string) => void;
  onToggleStatus: (itemId: string) => void;
  disabled?: boolean;
}

export function T10SortableList({ 
  items, 
  onReorder, 
  onCardClick, 
  onToggleStatus,
  disabled = false,
}: T10SortableListProps) {
  const [activeItem, setActiveItem] = React.useState<T10Item | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const item = items.find((i) => i.id === active.id);
    setActiveItem(item || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);

    if (over && active.id !== over.id) {
      onReorder(active.id as string, over.id as string);
    }
  };

  const handleDragCancel = () => {
    setActiveItem(null);
  };

  if (disabled) {
    return (
      <div className="t10-cards-list">
        {items.map((item) => (
          <T10PriorityCard
            key={item.id}
            item={item}
            onClick={() => onCardClick(item.id)}
            onToggleStatus={() => onToggleStatus(item.id)}
            isDraggable={false}
          />
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div className="t10-cards-list">
          {items.map((item) => (
            <T10PriorityCard
              key={item.id}
              item={item}
              onClick={() => onCardClick(item.id)}
              onToggleStatus={() => onToggleStatus(item.id)}
              isDraggable={true}
            />
          ))}
        </div>
      </SortableContext>
      <DragOverlay>
        {activeItem ? (
          <div className="t10-card-overlay">
            <T10PriorityCard
              item={activeItem}
              onClick={() => {}}
              onToggleStatus={() => {}}
              isDraggable={false}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
