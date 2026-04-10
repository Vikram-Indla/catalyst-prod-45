/**
 * ResizableTableHeader — Draggable + resizable <th> element
 * Drag-to-reorder via GripVertical handle; resize via right-edge handle.
 */
import { cn } from '@/lib/utils';
import { GripVertical } from 'lucide-react';
import { useRef } from 'react';

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
  className?: string;
  children?: React.ReactNode;
}

export function ResizableTableHeader({
  colKey, label, width, locked, isDragging, isDragOver,
  onResizeStart, onDragStart, onDragOver, onDragEnd,
  className, children,
}: Props) {
  const thRef = useRef<HTMLTableCellElement>(null);

  return (
    <th
      ref={thRef}
      style={{ width, minWidth: width, position: 'relative' }}
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

      <div className="flex items-center gap-1 pr-2">
        {!locked && (
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
