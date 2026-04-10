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
      style={{ width, minWidth: width, position: 'relative' }}
      className={cn(
        'select-none',
        isDragging && 'opacity-40',
        isDragOver && 'border-l-2 border-l-blue-500',
        className,
      )}
      draggable={!locked}
      onDragStart={e => {
        const target = e.target as HTMLElement;
        if (target.closest('[data-resize-handle="true"]')) {
          e.preventDefault();
          return;
        }
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
      <div className="flex items-center gap-1 pr-2">
        {!locked && (
          <GripVertical
            size={10}
            className="text-slate-300 opacity-0 group-hover/thead:opacity-100 transition-opacity cursor-grab flex-shrink-0"
          />
        )}
        {children || <span>{label}</span>}
      </div>

      <div
        data-resize-handle="true"
        style={{
          position: 'absolute',
          right: -4,
          top: 0,
          bottom: 0,
          width: 10,
          cursor: 'col-resize',
          zIndex: 20,
          touchAction: 'none',
        }}
        className="hover:bg-blue-500/30"
        onClick={e => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDragStart={e => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onMouseDown={e => {
          e.preventDefault();
          e.stopPropagation();
          onResizeStart(colKey, e.clientX);
        }}
      />
    </th>
  );
}
