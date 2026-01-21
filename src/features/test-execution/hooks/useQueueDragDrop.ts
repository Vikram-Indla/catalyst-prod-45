/**
 * Module 3B-2: Hook for drag-drop reordering
 */

import { useState, useCallback } from 'react';
import type { DragDropState } from '../types/queue-management';

export function useQueueDragDrop(
  onReorder: (itemId: string, newPosition: number) => void
) {
  const [state, setState] = useState<DragDropState>({
    draggedItemId: null,
    dragOverItemId: null,
    isDragging: false,
  });

  const handleDragStart = useCallback((e: React.DragEvent, itemId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', itemId);
    
    // Add slight delay for visual feedback
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        draggedItemId: itemId,
        isDragging: true,
      }));
    }, 0);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, itemId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (state.draggedItemId !== itemId) {
      setState(prev => ({ ...prev, dragOverItemId: itemId }));
    }
  }, [state.draggedItemId]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setState(prev => ({ ...prev, dragOverItemId: null }));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetId: string, targetPosition: number) => {
    e.preventDefault();
    
    const draggedId = e.dataTransfer.getData('text/plain') || state.draggedItemId;
    
    if (draggedId && draggedId !== targetId) {
      onReorder(draggedId, targetPosition);
    }
    
    setState({ draggedItemId: null, dragOverItemId: null, isDragging: false });
  }, [state.draggedItemId, onReorder]);

  const handleDragEnd = useCallback(() => {
    setState({ draggedItemId: null, dragOverItemId: null, isDragging: false });
  }, []);

  return {
    ...state,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    isDraggedItem: (id: string) => state.draggedItemId === id,
    isDragOverItem: (id: string) => state.dragOverItemId === id,
  };
}
