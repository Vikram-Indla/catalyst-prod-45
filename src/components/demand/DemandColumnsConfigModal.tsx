import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { GripVertical, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Column {
  key: string;
  label: string;
  visible: boolean;
  required?: boolean;
}

interface DemandColumnsConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: Column[];
  onColumnsChange: (columns: Column[]) => void;
}

export function DemandColumnsConfigModal({ isOpen, onClose, columns, onColumnsChange }: DemandColumnsConfigModalProps) {
  const [localColumns, setLocalColumns] = useState<Column[]>(columns);

  const handleToggle = (key: string) => {
    setLocalColumns(prev => prev.map(col => 
      col.key === key && !col.required ? { ...col, visible: !col.visible } : col
    ));
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const items = Array.from(localColumns);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setLocalColumns(items);
  };

  const handleApply = () => {
    onColumnsChange(localColumns);
    onClose();
  };

  const handleReset = () => {
    setLocalColumns(columns.map(col => ({ ...col, visible: true })));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configure Columns</DialogTitle>
          <DialogDescription>
            Drag to reorder. Check to show/hide columns.
          </DialogDescription>
        </DialogHeader>
        
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="columns">
            {(provided) => (
              <div 
                {...provided.droppableProps} 
                ref={provided.innerRef}
                className="space-y-1"
              >
                {localColumns.map((column, index) => (
                  <Draggable key={column.key} draggableId={column.key} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-md border bg-card",
                          snapshot.isDragging && "shadow-md border-primary"
                        )}
                      >
                        <div 
                          {...provided.dragHandleProps} 
                          className="cursor-grab hover:text-foreground text-muted-foreground"
                        >
                          <GripVertical className="h-4 w-4" />
                        </div>
                        <Checkbox
                          id={`col-${column.key}`}
                          checked={column.visible}
                          onCheckedChange={() => handleToggle(column.key)}
                          disabled={column.required}
                        />
                        <Label 
                          htmlFor={`col-${column.key}`} 
                          className="flex-1 cursor-pointer text-sm"
                        >
                          {column.label}
                        </Label>
                        {column.required && (
                          <span className="text-xs text-muted-foreground">
                            Required
                          </span>
                        )}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
        
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1">
            <RotateCcw className="h-3 w-3" />
            Reset
          </Button>
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleApply}>
              Apply
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default DemandColumnsConfigModal;
