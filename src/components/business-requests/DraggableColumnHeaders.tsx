import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { GripVertical } from "lucide-react";
import { SimpleColumnHeader, SortDirection } from "./SimpleColumnHeader";
import { ColumnConfig } from "@/components/backlog/ColumnsDropdown";
import { cn } from "@/lib/utils";

interface ColumnDefinition {
  label: string;
  width: string;
}

interface DraggableColumnHeadersProps {
  columns: ColumnConfig[];
  columnDefinitions: Record<string, ColumnDefinition>;
  columnSort: { columnId: string; direction: SortDirection };
  onSort: (columnId: string) => void;
  onReorder: (columns: ColumnConfig[]) => void;
  leadingContent?: React.ReactNode;
}

export function DraggableColumnHeaders({
  columns,
  columnDefinitions,
  columnSort,
  onSort,
  onReorder,
  leadingContent,
}: DraggableColumnHeadersProps) {
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const visibleColumns = columns.filter(col => col.visible);
    const allColumns = [...columns];
    
    // Find the actual indices in the full array
    const sourceVisibleIndex = result.source.index;
    const destVisibleIndex = result.destination.index;
    
    // Get the column being moved
    const movedColumn = visibleColumns[sourceVisibleIndex];
    
    // Find actual indices in the full columns array
    const sourceIndex = allColumns.findIndex(col => col.id === movedColumn.id);
    const destColumn = visibleColumns[destVisibleIndex];
    const destIndex = allColumns.findIndex(col => col.id === destColumn.id);
    
    // Reorder
    const [removed] = allColumns.splice(sourceIndex, 1);
    allColumns.splice(destIndex, 0, removed);
    
    onReorder(allColumns);
  };

  const visibleColumns = columns.filter(col => col.visible);

  return (
    <div className="flex items-center gap-4 px-4 py-2.5 bg-muted/50 border-b text-xs font-medium text-muted-foreground uppercase tracking-wide relative shrink-0">
      {leadingContent}
      
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="column-headers" direction="horizontal">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="flex items-center gap-4 flex-1"
            >
              {visibleColumns.map((col, index) => {
                const colDef = columnDefinitions[col.id];
                if (!colDef) return null;

                const isCentered = col.id === 'rank' || col.id === 'business_score' || col.id === 'ageing';

                return (
                  <Draggable key={col.id} draggableId={col.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={cn(
                          `${colDef.width} shrink-0 group`,
                          isCentered && 'text-center',
                          snapshot.isDragging && 'bg-card shadow-lg rounded-md px-2 py-1 z-50 border border-brand-gold/30'
                        )}
                      >
                        <div className="flex items-center gap-1">
                          <div
                            {...provided.dragHandleProps}
                            className={cn(
                              "opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing",
                              snapshot.isDragging && "opacity-100"
                            )}
                          >
                            <GripVertical className="h-3 w-3 text-muted-foreground" />
                          </div>
                          <SimpleColumnHeader
                            label={colDef.label}
                            columnId={col.id}
                            sortDirection={columnSort.columnId === col.id ? columnSort.direction : null}
                            onSort={onSort}
                          />
                        </div>
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
