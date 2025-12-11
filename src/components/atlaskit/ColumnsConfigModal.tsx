import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { GripVertical } from 'lucide-react';

interface Column {
  key: string;
  label: string;
  visible: boolean;
  required?: boolean;
}

interface ColumnsConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: Column[];
  onColumnsChange: (columns: Column[]) => void;
}

export function ColumnsConfigModal({ isOpen, onClose, columns, onColumnsChange }: ColumnsConfigModalProps) {
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
        </DialogHeader>
        
        <div className="py-4">
          <p className="mb-4 text-xs text-muted-foreground">
            Drag to reorder. Check to show/hide columns.
          </p>
          
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="columns">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-1">
                  {localColumns.map((column, index) => (
                    <Draggable key={column.key} draggableId={column.key} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`flex items-center gap-2 p-2 rounded-md border ${
                            snapshot.isDragging ? 'bg-accent' : 'bg-background'
                          }`}
                        >
                          <div {...provided.dragHandleProps} className="cursor-grab">
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <Checkbox
                            checked={column.visible}
                            onCheckedChange={() => handleToggle(column.key)}
                            disabled={column.required}
                          />
                          <span className="text-sm text-foreground flex-1">
                            {column.label}
                          </span>
                          {column.required && (
                            <span className="text-[11px] text-muted-foreground">
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
        </div>
        
        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button variant="ghost" onClick={handleReset}>
            Reset to Default
          </Button>
          <div className="flex gap-2">
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

export default ColumnsConfigModal;
