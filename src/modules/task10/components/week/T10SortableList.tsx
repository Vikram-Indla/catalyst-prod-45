import React, { useState, useEffect, useRef } from 'react';
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
import { ArrowUpDown, Check } from 'lucide-react';
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
  const [previousRanks, setPreviousRanks] = useState<Record<string, number>>({});
  const [showReorderToast, setShowReorderToast] = useState(false);
  const [reorderMessage, setReorderMessage] = useState('');
  const toastTimeoutRef = useRef<NodeJS.Timeout>();

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
    
    // Store current ranks before drag
    const ranks: Record<string, number> = {};
    items.forEach(item => {
      ranks[item.id] = item.rank;
    });
    setPreviousRanks(ranks);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);

    if (over && active.id !== over.id) {
      const movedItem = items.find(i => i.id === active.id);
      const targetItem = items.find(i => i.id === over.id);
      
      if (movedItem && targetItem) {
        const oldRank = movedItem.rank;
        const newRank = targetItem.rank;
        const direction = newRank < oldRank ? 'up' : 'down';
        const diff = Math.abs(newRank - oldRank);
        
        // Show toast
        const titlePreview = movedItem.title.length > 30 
          ? movedItem.title.substring(0, 30) + '...' 
          : movedItem.title;
        setReorderMessage(`Moved "${titlePreview}" ${direction} ${diff} position${diff > 1 ? 's' : ''}`);
        
        // Clear existing timeout
        if (toastTimeoutRef.current) {
          clearTimeout(toastTimeoutRef.current);
        }
        
        setShowReorderToast(true);
        toastTimeoutRef.current = setTimeout(() => {
          setShowReorderToast(false);
        }, 3000);
      }
      
      onReorder(active.id as string, over.id as string);
    }
  };

  const handleDragCancel = () => {
    setActiveItem(null);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

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
    <>
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
                previousRank={previousRanks[item.id]}
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

      {/* Reorder Toast */}
      {showReorderToast && (
        <div className="t10-reorder-toast">
          <ArrowUpDown size={18} />
          {reorderMessage}
        </div>
      )}
    </>
  );
}
