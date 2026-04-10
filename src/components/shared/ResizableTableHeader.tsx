/**
 * ResizableTableHeader — Draggable + resizable <th> element
 */
import { cn } from '@/lib/utils';
import { GripVertical } from 'lucide-react';

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
  return (
    <th
      style={{ width, minWidth: width, maxWidth: width, position: 'relative' }}
      className={cn(
        'select-none',
        isDragging && 'opacity-40',
        isDragOver && 'border-l-2 border-l-blue-500',
        className,
      )}
      draggable={!locked}
      onDragStart={e => {
        if (locked) { e.preventDefault(); return; }
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', colKey);
        onDragStart(colKey);
      }}
      onDragOver={e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        onDragOver(colKey);
      }}
      onDragLeave={() => {}}
      onDrop={e => {
        e.preventDefault();
        onDragEnd();
      }}
      onDragEnd={onDragEnd}
    >
      <div className="flex items-center gap-1">
        {!locked && (
          <GripVertical
            size={10}
            className="text-slate-300 opacity-0 group-hover/thead:opacity-100 transition-opacity cursor-grab flex-shrink-0"
          />
        )}
        {children || <span>{label}</span>}
      </div>

      {/* Resize handle */}
      <div
        style={{
          position: 'absolute', right: 0, top: 0, bottom: 0, width: 4,
          cursor: 'col-resize', zIndex: 10,
        }}
        className="hover:bg-blue-500/30"
        onMouseDown={e => {
          e.preventDefault();
          e.stopPropagation();
          onResizeStart(colKey, e.clientX);
        }}
      />
    </th>
  );
}
