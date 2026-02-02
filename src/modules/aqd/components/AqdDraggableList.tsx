/**
 * Task¹⁰ Draggable List - Drag & drop reordering with @hello-pangea/dnd
 */
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { GripVertical } from 'lucide-react';
import type { AqdItemFull } from '../types/aqd.types';
import { AqdPriorityCard } from './AqdPriorityCard';

interface AqdDraggableListProps {
  items: AqdItemFull[];
  onReorder: (itemId: string, newRank: number) => void;
  onStatusChange: (itemId: string) => void;
  onEdit?: (item: AqdItemFull) => void;
  onDelete?: (itemId: string) => void;
  droppableId: string;
  isOverflow?: boolean;
}

export function AqdDraggableList({
  items,
  onReorder,
  onStatusChange,
  onEdit,
  onDelete,
  droppableId,
  isOverflow = false,
}: AqdDraggableListProps) {
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;
    
    if (sourceIndex === destIndex) return;

    const draggedItem = items[sourceIndex];
    if (!draggedItem) return;

    // Calculate new rank based on destination
    // For top 10: rank = destIndex + 1
    // For overflow: rank = 10 + destIndex + 1
    const baseRank = isOverflow ? 10 : 0;
    const newRank = baseRank + destIndex + 1;

    onReorder(draggedItem.id, newRank);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId={droppableId}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`aqd-draggable-list ${snapshot.isDraggingOver ? 'aqd-draggable-list-over' : ''}`}
          >
            {items.map((item, index) => (
              <Draggable key={item.id} draggableId={item.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    className={`aqd-draggable-item ${snapshot.isDragging ? 'aqd-draggable-item-dragging' : ''}`}
                  >
                    {/* Drag Handle */}
                    <div 
                      {...provided.dragHandleProps}
                      className="aqd-drag-handle"
                    >
                      <GripVertical size={16} />
                    </div>
                    
                    {/* Priority Card */}
                    <div className="aqd-draggable-card-wrapper">
                      <AqdPriorityCard
                        item={item}
                        onStatusChange={onStatusChange}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        isOverflow={isOverflow}
                      />
                    </div>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}

export default AqdDraggableList;
