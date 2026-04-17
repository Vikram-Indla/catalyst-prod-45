/**
 * SortableRow — DnD-enabled wrapper around a subtask <tr>.
 *
 * Uses @dnd-kit/sortable to register the row with its parent SortableContext.
 * Drag handle is a separate element (not the whole row) so rows still
 * support click / checkbox / inline editing without accidental drags.
 *
 * Caller is responsible for rendering child <td>s.
 */
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

interface SortableRowProps {
  id: string;
  disabled?: boolean;
  className?: string;
  selected?: boolean;
  onRowClick?: () => void;
  children: React.ReactNode;
}

export function SortableRow({
  id, disabled, className, selected, onRowClick, children,
}: SortableRowProps) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id, disabled });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    background: selected ? undefined : 'inherit',
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={[className ?? '', isDragging ? 'sp-row--dragging' : ''].join(' ')}
      onClick={onRowClick}
    >
      <td
        className="sp-td sp-td--drag"
        onClick={(e) => e.stopPropagation()}
      >
        {!disabled && (
          <button
            type="button"
            className="sp-drag-handle"
            aria-label="Drag to reorder"
            {...attributes}
            {...listeners}
          >
            <GripVertical size={14} />
          </button>
        )}
      </td>
      {children}
    </tr>
  );
}
