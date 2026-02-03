// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ BUFFER SECTION COMPONENT
// Collapsible section for items ranked 11+
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
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
import type { T10ItemWithAssignee } from '../../types';
import { T10PriorityCard } from './T10PriorityCard';

interface T10BufferSectionProps {
  items: T10ItemWithAssignee[];
  onToggleStatus: (itemId: string, done: boolean) => void;
  onItemClick?: (item: T10ItemWithAssignee) => void;
  onReorder?: (itemIds: string[]) => void;
  disabled?: boolean;
}

interface SortableBufferItemProps {
  item: T10ItemWithAssignee;
  onToggleStatus: (itemId: string, done: boolean) => void;
  onClick: () => void;
}

function SortableBufferItem({ item, onToggleStatus, onClick }: SortableBufferItemProps) {
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

export function T10BufferSection({ 
  items, 
  onToggleStatus, 
  onItemClick,
  onReorder,
  disabled = false,
}: T10BufferSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  
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

      if (over && active.id !== over.id && onReorder) {
        const oldIndex = itemIds.indexOf(active.id as string);
        const newIndex = itemIds.indexOf(over.id as string);
        const newOrder = arrayMove(itemIds, oldIndex, newIndex);
        onReorder(newOrder);
      }
    },
    [itemIds, onReorder]
  );

  if (items.length === 0) return null;

  return (
    <div className="t10-buffer-section" style={{ marginTop: '24px' }}>
      {/* Buffer toggle with dashed border box */}
      <button 
        className="t10-buffer-section__toggle"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '16px 20px',
          border: '2px dashed #e5e7eb',
          borderRadius: '10px',
          background: '#ffffff',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#d1d5db';
          e.currentTarget.style.background = '#f9fafb';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#e5e7eb';
          e.currentTarget.style.background = '#ffffff';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ color: '#9ca3af' }}>
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
          <div>
            <span style={{ fontWeight: 600, color: '#374151', fontSize: '14px' }}>Buffer Items</span>
            <span style={{ 
              marginLeft: '8px', 
              padding: '2px 8px', 
              backgroundColor: '#f3f4f6', 
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#6b7280',
            }}>
              {items.length}
            </span>
          </div>
        </div>
        <span style={{ fontSize: '13px', color: '#9ca3af' }}>
          Items ranked 11+ waiting to move into Top 10
        </span>
      </button>
      
      {isExpanded && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={itemIds}
            strategy={verticalListSortingStrategy}
            disabled={disabled || !onReorder}
          >
            <div className="t10-buffer-section__list">
              {items.map((item) => (
                <SortableBufferItem
                  key={item.id}
                  item={item}
                  onToggleStatus={onToggleStatus}
                  onClick={() => onItemClick?.(item)}
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
      )}
    </div>
  );
}

export default T10BufferSection;
