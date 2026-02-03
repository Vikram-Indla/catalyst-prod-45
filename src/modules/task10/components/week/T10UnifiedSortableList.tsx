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
  DragOverEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { ArrowUpDown, ChevronDown } from 'lucide-react';
import { T10PriorityCard } from './T10PriorityCard';
import type { T10Item } from '../../types';

interface T10UnifiedSortableListProps {
  topTenItems: T10Item[];
  bufferItems: T10Item[];
  onReorderAll: (allItems: T10Item[], movedItemId: string, oldRank: number, newRank: number) => void;
  onCardClick: (itemId: string) => void;
  onToggleStatus: (itemId: string) => void;
  disabled?: boolean;
  bufferExpanded: boolean;
  onToggleBuffer: () => void;
}

// Droppable zone component
function DroppableZone({ id, children, className }: { id: string; children: React.ReactNode; className?: string }) {
  const { isOver, setNodeRef } = useDroppable({ id });
  
  return (
    <div 
      ref={setNodeRef} 
      className={`${className || ''} ${isOver ? 't10-drop-zone-active' : ''}`}
    >
      {children}
    </div>
  );
}

export function T10UnifiedSortableList({
  topTenItems,
  bufferItems,
  onReorderAll,
  onCardClick,
  onToggleStatus,
  disabled = false,
  bufferExpanded,
  onToggleBuffer,
}: T10UnifiedSortableListProps) {
  const [activeItem, setActiveItem] = useState<T10Item | null>(null);
  const [previousRanks, setPreviousRanks] = useState<Record<string, number>>({});
  const [showReorderToast, setShowReorderToast] = useState(false);
  const [reorderMessage, setReorderMessage] = useState('');
  const [dragOverSection, setDragOverSection] = useState<'top10' | 'buffer' | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout>();

  // Combine all items for unified DnD context
  const allItems = [...topTenItems, ...bufferItems];

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
    const item = allItems.find((i) => i.id === active.id);
    setActiveItem(item || null);
    
    // Store current ranks before drag
    const ranks: Record<string, number> = {};
    allItems.forEach(item => {
      ranks[item.id] = item.rank;
    });
    setPreviousRanks(ranks);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (!over) {
      setDragOverSection(null);
      return;
    }

    // Determine which section we're over
    if (over.id === 'top10-zone' || topTenItems.some(i => i.id === over.id)) {
      setDragOverSection('top10');
    } else if (over.id === 'buffer-zone' || bufferItems.some(i => i.id === over.id)) {
      setDragOverSection('buffer');
    } else {
      setDragOverSection(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);
    setDragOverSection(null);

    if (!over) return;

    const movedItem = allItems.find(i => i.id === active.id);
    if (!movedItem) return;

    const oldRank = movedItem.rank;
    const wasInTop10 = oldRank <= 10;

    // Determine target section and position
    let targetIsTop10 = false;
    let targetIndex = -1;

    if (over.id === 'top10-zone') {
      // Dropped on empty top10 zone
      targetIsTop10 = true;
      targetIndex = topTenItems.length;
    } else if (over.id === 'buffer-zone') {
      // Dropped on buffer zone
      targetIsTop10 = false;
      targetIndex = 0;
    } else {
      // Dropped on a specific item
      const overItem = allItems.find(i => i.id === over.id);
      if (overItem) {
        targetIsTop10 = overItem.rank <= 10;
        if (targetIsTop10) {
          targetIndex = topTenItems.findIndex(i => i.id === over.id);
        } else {
          targetIndex = bufferItems.findIndex(i => i.id === over.id);
        }
      }
    }

    if (targetIndex === -1 && over.id !== 'top10-zone' && over.id !== 'buffer-zone') {
      return;
    }

    // Calculate new order
    let newTopTen = [...topTenItems];
    let newBuffer = [...bufferItems];

    // Remove from current position
    if (wasInTop10) {
      newTopTen = newTopTen.filter(i => i.id !== movedItem.id);
    } else {
      newBuffer = newBuffer.filter(i => i.id !== movedItem.id);
    }

    // Insert at new position
    if (targetIsTop10) {
      // Check if top 10 is full (only if moving from buffer)
      if (!wasInTop10 && newTopTen.length >= 10) {
        // Move last item to buffer
        const lastTop10Item = newTopTen[newTopTen.length - 1];
        newTopTen = newTopTen.slice(0, -1);
        newBuffer = [lastTop10Item, ...newBuffer];
      }
      
      const insertIndex = Math.min(targetIndex, newTopTen.length);
      newTopTen.splice(insertIndex, 0, movedItem);
    } else {
      const insertIndex = Math.min(targetIndex, newBuffer.length);
      newBuffer.splice(insertIndex, 0, movedItem);
    }

    // Recalculate all ranks
    const updatedItems: T10Item[] = [];
    newTopTen.forEach((item, idx) => {
      updatedItems.push({ ...item, rank: idx + 1 });
    });
    newBuffer.forEach((item, idx) => {
      updatedItems.push({ ...item, rank: 11 + idx });
    });

    // Find the new rank of the moved item
    const newRank = updatedItems.find(i => i.id === movedItem.id)?.rank || oldRank;

    if (oldRank !== newRank) {
      // Show toast
      const titlePreview = movedItem.title.length > 25 
        ? movedItem.title.substring(0, 25) + '...' 
        : movedItem.title;
      
      let message = '';
      if (wasInTop10 && !targetIsTop10) {
        message = `Moved "${titlePreview}" to Buffer`;
      } else if (!wasInTop10 && targetIsTop10) {
        message = `Promoted "${titlePreview}" to Top 10 (Rank #${newRank})`;
      } else {
        const direction = newRank < oldRank ? 'up' : 'down';
        const diff = Math.abs(newRank - oldRank);
        message = `Moved "${titlePreview}" ${direction} ${diff} position${diff > 1 ? 's' : ''}`;
      }
      
      setReorderMessage(message);
      
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
      
      setShowReorderToast(true);
      toastTimeoutRef.current = setTimeout(() => {
        setShowReorderToast(false);
      }, 3000);

      onReorderAll(updatedItems, movedItem.id, oldRank, newRank);
    }
  };

  const handleDragCancel = () => {
    setActiveItem(null);
    setDragOverSection(null);
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
      <>
        <div className="t10-cards-section">
          <div className="t10-section-header">
            <span className="t10-section-title">Top 10 Priorities</span>
          </div>
          <div className="t10-cards-list">
            {topTenItems.map((item) => (
              <T10PriorityCard
                key={item.id}
                item={item}
                onClick={() => onCardClick(item.id)}
                onToggleStatus={() => onToggleStatus(item.id)}
                isDraggable={false}
              />
            ))}
          </div>
        </div>
        
        {bufferItems.length > 0 && (
          <div className="t10-buffer-section">
            <button 
              className={`t10-buffer-toggle ${bufferExpanded ? 'expanded' : ''}`} 
              onClick={onToggleBuffer}
            >
              <div className="t10-buffer-toggle-left">
                <span>Buffer Queue</span>
                <span className="t10-buffer-count">{bufferItems.length} items</span>
              </div>
              <ChevronDown size={18} />
            </button>
            {bufferExpanded && (
              <div className="t10-buffer-list">
                {bufferItems.map(item => (
                  <T10PriorityCard 
                    key={item.id} 
                    item={item} 
                    onClick={() => onCardClick(item.id)} 
                    onToggleStatus={() => onToggleStatus(item.id)}
                    isDraggable={false}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="t10-cards-section">
          <div className="t10-section-header">
            <span className="t10-section-title">Top 10 Priorities</span>
            {dragOverSection === 'top10' && activeItem && activeItem.rank > 10 && (
              <span className="t10-drop-hint">Drop to promote to Top 10</span>
            )}
          </div>
          
          <SortableContext items={topTenItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <DroppableZone id="top10-zone" className={`t10-cards-list ${dragOverSection === 'top10' ? 't10-zone-highlight' : ''}`}>
              {topTenItems.length > 0 ? (
                topTenItems.map((item) => (
                  <T10PriorityCard
                    key={item.id}
                    item={item}
                    previousRank={previousRanks[item.id]}
                    onClick={() => onCardClick(item.id)}
                    onToggleStatus={() => onToggleStatus(item.id)}
                    isDraggable={true}
                  />
                ))
              ) : (
                <div className="t10-empty-state">
                  <p>Drop items here to add to Top 10</p>
                </div>
              )}
            </DroppableZone>
          </SortableContext>
        </div>

        {/* Buffer Section - always show when dragging or has items */}
        {(bufferItems.length > 0 || activeItem) && (
          <div className="t10-buffer-section">
            <button 
              className={`t10-buffer-toggle ${bufferExpanded || activeItem ? 'expanded' : ''}`} 
              onClick={onToggleBuffer}
            >
              <div className="t10-buffer-toggle-left">
                <span>Buffer Queue</span>
                <span className="t10-buffer-count">{bufferItems.length} items</span>
                {dragOverSection === 'buffer' && activeItem && activeItem.rank <= 10 && (
                  <span className="t10-drop-hint-inline">Drop to move to buffer</span>
                )}
              </div>
              <ChevronDown size={18} />
            </button>
            
            {(bufferExpanded || activeItem) && (
              <SortableContext items={bufferItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                <DroppableZone id="buffer-zone" className={`t10-buffer-list ${dragOverSection === 'buffer' ? 't10-zone-highlight' : ''}`}>
                  {bufferItems.length > 0 ? (
                    bufferItems.map(item => (
                      <T10PriorityCard 
                        key={item.id} 
                        item={item}
                        previousRank={previousRanks[item.id]}
                        onClick={() => onCardClick(item.id)} 
                        onToggleStatus={() => onToggleStatus(item.id)}
                        isDraggable={true}
                      />
                    ))
                  ) : (
                    <div className="t10-empty-state t10-empty-buffer">
                      <p>Drop items here to move to buffer</p>
                    </div>
                  )}
                </DroppableZone>
              </SortableContext>
            )}
          </div>
        )}

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
