/**
 * VirtualizedCardList - High-performance virtualized list for Kanban cards
 * Uses @tanstack/react-virtual for smooth scrolling with 100+ cards
 */

import { memo, useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';
import { KanbanCard } from './KanbanCard';
import type { Incident } from '@/types/incident';

interface VirtualizedCardListProps {
  incidents: Incident[];
  draggingId: string | null;
  onDragStart: (e: React.DragEvent, incident: Incident) => void;
  onDragEnd: () => void;
  maxHeight?: number;
  emptyMessage?: string;
  onEditCommittee?: (incident: Incident) => void;
}

// Estimated card height (compact card ~72px)
const CARD_HEIGHT = 76;
const CARD_GAP = 4;

export const VirtualizedCardList = memo(function VirtualizedCardList({
  incidents,
  draggingId,
  onDragStart,
  onDragEnd,
  maxHeight = 400,
  emptyMessage = 'No incidents',
  onEditCommittee,
}: VirtualizedCardListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: incidents.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => CARD_HEIGHT + CARD_GAP,
    overscan: 3, // Render 3 extra items for smoother scrolling
  });

  // Stable drag handlers
  const handleDragStart = useCallback((e: React.DragEvent, incident: Incident) => {
    onDragStart(e, incident);
  }, [onDragStart]);

  if (incidents.length === 0) {
    return (
      <div className="py-6 text-center text-[10px] text-muted-foreground/40">
        {emptyMessage}
      </div>
    );
  }

  // For small lists (< 15 cards), skip virtualization overhead
  if (incidents.length < 15) {
    return (
      <div 
        ref={parentRef}
        className="overflow-y-auto p-1.5 space-y-1"
        style={{ maxHeight }}
      >
        {incidents.map(incident => (
          <KanbanCard
            key={incident.id}
            incident={incident}
            isDragging={draggingId === incident.id}
            onDragStart={handleDragStart}
            onDragEnd={onDragEnd}
            onEditCommittee={onEditCommittee}
          />
        ))}
      </div>
    );
  }

  // Virtualized list for large card counts
  return (
    <div 
      ref={parentRef}
      className="overflow-y-auto p-1.5"
      style={{ maxHeight }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map(virtualItem => {
          const incident = incidents[virtualItem.index];
          return (
            <div
              key={incident.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size - CARD_GAP}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <KanbanCard
                incident={incident}
                isDragging={draggingId === incident.id}
                onDragStart={handleDragStart}
                onDragEnd={onDragEnd}
                onEditCommittee={onEditCommittee}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default VirtualizedCardList;
