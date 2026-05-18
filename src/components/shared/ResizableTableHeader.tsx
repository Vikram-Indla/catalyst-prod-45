/**
 * ResizableTableHeader — Draggable + resizable + sortable <th> element
 * Drag-to-reorder via GripVertical handle; resize via right-edge handle.
 * Jira-style sort: click header label to toggle asc → desc → asc.
 */
import { cn } from '@/lib/utils';
import { GripVertical, ChevronUp, ChevronDown } from '@/lib/atlaskit-icons';
import { useRef } from 'react';

export type SortDir = 'asc' | 'desc' | null;

interface Props {
  colKey: string;
  label: string;
  width: number;
  locked?: boolean;
  isDragging?: boolean;
  isDragOver?: boolean;
  onResizeStart: (colKey: string, startX: number) => void;
  onDragStart: (key: string) => void;
  onDragOver: (key: string) => void;
  onDragEnd: () => void;
  sortDirection?: SortDir;
  onSort?: (colKey: string) => void;
  className?: string;
  children?: React.ReactNode;
  /**
   * Hide the GripVertical drag grip in the header. Drag-to-reorder STILL
   * works — when this flag is set, the entire `<th>` becomes the drag handle
   * (grab cursor on hover, drag fires the same `onDragStart` callback). This
   * removes the visual noise while preserving the reorder functionality
   * (design-critique 2026-05-17 — Projects table directive: grip is "ugly",
   * but drag must still happen).
   * Defaults to `false` so every other table using this primitive keeps its
   * current grip-based drag UX.
   */
  hideDragHandle?: boolean;
}

export function ResizableTableHeader({
  colKey, label, width, locked, isDragging, isDragOver,
  onResizeStart, onDragStart, onDragOver, onDragEnd,
  sortDirection, onSort,
  className, children,
  hideDragHandle = false,
}: Props) {
  const thRef = useRef<HTMLTableCellElement>(null);
  const isSorted = sortDirection != null;
  const canSort = !!onSort && !!label;

  // When the grip is hidden, the entire <th> becomes the drag handle so
  // drag-to-reorder still works without the visual grip icon. The resize
  // handle (right-edge 6px) keeps its own onMouseDown which stopPropagates,
  // so resize and reorder don't conflict.
  const thIsDraggable = hideDragHandle && !locked;

  return (
    <th
      ref={thRef}
      draggable={thIsDraggable || undefined}
      onDragStart={thIsDraggable ? e => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', colKey);
        if (thRef.current) e.dataTransfer.setDragImage(thRef.current, 0, 0);
        onDragStart(colKey);
      } : undefined}
      style={{ width, minWidth: width, position: 'relative', color: isSorted ? 'var(--ds-text-brand, #2563EB)' : undefined, cursor: thIsDraggable ? 'grab' : undefined }}
      className={cn(
        'select-none',
        isDragging && 'opacity-40',
        className,
      )}
      onDragOver={e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (!locked) onDragOver(colKey);
      }}
      onDrop={e => {
        e.preventDefault();
        onDragEnd();
      }}
      onDragEnd={onDragEnd}
    >
      {/* Subtle drop indicator — thin 2px left accent */}
      {isDragOver && (
        <div style={{
          position: 'absolute', left: 0, top: 6, bottom: 6,
          width: 2, borderRadius: 1, background: '#93C5FD', zIndex: 15,
        }} />
      )}

      <div
        className="flex items-center gap-1 pr-2"
        style={{ cursor: canSort ? 'pointer' : undefined }}
        onClick={canSort ? () => onSort(colKey) : undefined}
      >
        {!locked && !hideDragHandle && (
          <span
            draggable
            onDragStart={e => {
              e.stopPropagation();
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('text/plain', colKey);
              if (thRef.current) {
                e.dataTransfer.setDragImage(thRef.current, 0, 0);
              }
              onDragStart(colKey);
            }}
            className="inline-flex items-center"
          >
            <GripVertical
              size={10}
              className="text-slate-300 opacity-0 group-hover/thead:opacity-100 transition-opacity cursor-grab flex-shrink-0"
            />
          </span>
        )}
        {children || <span>{label}</span>}
        {canSort && (
          isSorted
            ? (sortDirection === 'asc'
              ? <ChevronUp size={12} style={{ color: 'var(--ds-text-brand, #2563EB)', flexShrink: 0 }} />
              : <ChevronDown size={12} style={{ color: 'var(--ds-text-brand, #2563EB)', flexShrink: 0 }} />)
            : <ChevronUp size={12} className="opacity-0 group-hover/thead:opacity-30 flex-shrink-0" style={{ color: 'var(--ds-text-subtlest, var(--cp-ink-4, #94A3B8))', transition: 'opacity 120ms' }} />
        )}
      </div>

      {/* Resize handle — right edge */}
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: 6,
          cursor: 'col-resize',
          zIndex: 20,
        }}
        onMouseDown={e => {
          e.preventDefault();
          e.stopPropagation();
          onResizeStart(colKey, e.clientX);
        }}
      >
        <div style={{
          position: 'absolute', right: 2, top: 6, bottom: 6,
          width: 1, background: 'transparent', transition: 'background 120ms',
        }} className="group-hover/thead:bg-slate-300" />
      </div>
    </th>
  );
}
