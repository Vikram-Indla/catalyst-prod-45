import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Columns3, GripVertical, Check } from 'lucide-react';
import { TableColumn } from './types';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { cn } from '@/lib/utils';

interface ColumnVisibilityDropdownProps {
  columns: TableColumn[];
  visibleColumns: Set<string>;
  onToggleColumn: (columnKey: string) => void;
  onShowAll: () => void;
  onHideAll: () => void;
  onReorderColumns?: (newOrder: string[]) => void;
}

export function ColumnVisibilityDropdown({
  columns,
  visibleColumns,
  onToggleColumn,
  onShowAll,
  onHideAll,
  onReorderColumns,
}: ColumnVisibilityDropdownProps) {
  const [open, setOpen] = useState(false);
  
  // Filter out checkbox column from visibility toggle
  const toggleableColumns = columns.filter(c => c.key !== 'checkbox');

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !onReorderColumns) return;
    
    const items = Array.from(toggleableColumns);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // Include checkbox at the start, then the reordered columns
    const newOrder = ['checkbox', ...items.map(c => c.key)];
    onReorderColumns(newOrder);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
          <Columns3 className="h-3.5 w-3.5" />
          Columns
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        align="end" 
        className="w-56 p-0 bg-popover border border-border shadow-lg z-[100]"
      >
        <div className="px-3 py-2 border-b border-border">
          <span className="text-xs font-medium text-muted-foreground">
            Toggle Columns
          </span>
        </div>
        
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="columns-list">
            {(provided) => (
              <div 
                ref={provided.innerRef} 
                {...provided.droppableProps}
                className="py-1 max-h-[300px] overflow-y-auto"
              >
                {toggleableColumns.map((column, index) => (
                  <Draggable key={column.key} draggableId={column.key} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={cn(
                          "flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer hover:bg-muted transition-colors",
                          snapshot.isDragging && "bg-muted shadow-md"
                        )}
                        onClick={() => onToggleColumn(column.key)}
                      >
                        <div 
                          {...provided.dragHandleProps}
                          className="cursor-grab active:cursor-grabbing p-0.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div className={cn(
                          "w-4 h-4 flex items-center justify-center",
                          visibleColumns.has(column.key) ? "text-foreground" : "text-transparent"
                        )}>
                          <Check className="h-4 w-4" />
                        </div>
                        <span className="flex-1 text-foreground">{column.label}</span>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
        
        {/* Separator */}
        <div className="h-px bg-border mx-2" />
        
        {/* Show All / Hide All buttons */}
        <div className="flex items-center gap-1 px-2 py-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs flex-1"
            onClick={() => {
              onShowAll();
            }}
          >
            Show All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs flex-1"
            onClick={() => {
              onHideAll();
            }}
          >
            Hide All
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
