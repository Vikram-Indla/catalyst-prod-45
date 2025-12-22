/**
 * Drag and Drop hook for roadmap interactions
 * Uses @hello-pangea/dnd for row reordering
 */

import { useCallback } from 'react';
import type { DropResult } from '@hello-pangea/dnd';
import type { RoadmapDemand } from '../types/roadmap';

interface UseRoadmapDragDropOptions {
  items: RoadmapDemand[];
  onReorder: (updates: { id: string; rank: number }[]) => void;
  onDateChange: (id: string, startDate: string | null, endDate: string | null) => void;
}

interface UseRoadmapDragDropReturn {
  handleDragEnd: (result: DropResult) => void;
}

export function useRoadmapDragDrop({
  items,
  onReorder,
  onDateChange,
}: UseRoadmapDragDropOptions): UseRoadmapDragDropReturn {

  const handleDragEnd = useCallback((result: DropResult) => {
    const { destination, source, draggableId } = result;

    // Dropped outside a droppable area
    if (!destination) return;

    // Dropped in the same position
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // Reorder items
    const reorderedItems = Array.from(items);
    const [removed] = reorderedItems.splice(source.index, 1);
    reorderedItems.splice(destination.index, 0, removed);

    // Create rank updates
    const updates = reorderedItems.map((item, index) => ({
      id: item.id,
      rank: index + 1,
    }));

    onReorder(updates);
  }, [items, onReorder]);

  return {
    handleDragEnd,
  };
}

/**
 * Helper function to reorder an array
 */
export function reorder<T>(list: T[], startIndex: number, endIndex: number): T[] {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
}
