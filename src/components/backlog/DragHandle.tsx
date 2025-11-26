import { GripVertical } from "lucide-react";

interface DragHandleProps {
  onDragStart: (e: React.DragEvent) => void;
}

export const DragHandle = ({ onDragStart }: DragHandleProps) => {
  return (
    <div
      className="drag-handle absolute -left-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-muted-foreground cursor-grab opacity-0 group-hover:opacity-100 transition-opacity rounded hover:bg-muted hover:text-foreground active:cursor-grabbing"
      draggable
      onDragStart={onDragStart}
    >
      <GripVertical className="w-4 h-4" />
    </div>
  );
};
