// useCardDrag — DnD logic hook for kanban cards
import { useState } from 'react';

export function useCardDrag() {
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);

  const onDragStart = (cardId: string) => setDraggedCardId(cardId);
  const onDragEnd = () => setDraggedCardId(null);

  return { draggedCardId, onDragStart, onDragEnd };
}
