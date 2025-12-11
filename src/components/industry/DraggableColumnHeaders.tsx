import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { GripVertical } from "lucide-react";
import { SimpleColumnHeader, SortDirection } from "./SimpleColumnHeader";
import { ColumnConfig } from "@/components/backlog/ColumnsDropdown";
import { cn } from "@/lib/utils";
import { useState, useCallback, useEffect, useRef } from "react";

interface ColumnDefinition {
  label: string;
  defaultWidth: number;
  minWidth: number;
}

export interface ColumnWidths {
  [key: string]: number;
}

interface DraggableColumnHeadersProps {
  columns: ColumnConfig[];
  columnDefinitions: Record<string, ColumnDefinition>;
  columnSort: { columnId: string; direction: SortDirection };
  onSort: (columnId: string) => void;
  onReorder: (columns: ColumnConfig[]) => void;
  leadingContent?: React.ReactNode;
  columnWidths: ColumnWidths;
  onColumnResize: (columnId: string, width: number) => void;
}

export function DraggableColumnHeaders({
  columns,
  columnDefinitions,
  columnSort,
  onSort,
  onReorder,
  leadingContent,
  columnWidths,
  onColumnResize,
}: DraggableColumnHeadersProps) {
  const [resizing, setResizing] = useState<string | null>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

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

  const handleResizeMouseDown = useCallback((e: React.MouseEvent, columnId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setResizing(columnId);
    startXRef.current = e.clientX;
    const colDef = columnDefinitions[columnId];
    startWidthRef.current = columnWidths[columnId] || colDef?.defaultWidth || 100;
  }, [columnWidths, columnDefinitions]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!resizing) return;
    
    const delta = e.clientX - startXRef.current;
    const colDef = columnDefinitions[resizing];
    const minWidth = colDef?.minWidth || 50;
    const newWidth = Math.max(minWidth, startWidthRef.current + delta);
    
    onColumnResize(resizing, newWidth);
  }, [resizing, columnDefinitions, onColumnResize]);

  const handleMouseUp = useCallback(() => {
    setResizing(null);
  }, []);

  useEffect(() => {
    if (resizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [resizing, handleMouseMove, handleMouseUp]);

  const visibleColumns = columns.filter(col => col.visible);

  return (
    <div className="flex items-center px-4 py-2.5 bg-muted/50 border-b text-xs font-medium text-muted-foreground uppercase tracking-wide relative shrink-0">
      <div className="flex items-center shrink-0" style={{ gap: '16px' }}>
        {leadingContent}
      </div>
      
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="column-headers" direction="horizontal">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="flex items-center flex-1"
            >
              {visibleColumns.map((col, index) => {
                const colDef = columnDefinitions[col.id];
                if (!colDef) return null;

                const isCentered = col.id === 'rank' || col.id === 'business_score' || col.id === 'ageing';
                const width = columnWidths[col.id] || colDef.defaultWidth;

                return (
                  <Draggable key={col.id} draggableId={col.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={cn(
                          "relative shrink-0 group",
                          isCentered && 'text-center',
                          snapshot.isDragging && 'bg-card shadow-lg rounded-md px-2 py-1 z-50 border border-brand-gold/30'
                        )}
                        style={{ 
                          width: `${width}px`,
                          ...provided.draggableProps.style 
                        }}
                      >
                        <div className="flex items-center gap-1 pr-2">
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
                        
                        {/* Resize Handle */}
                        <div
                          className={cn(
                            "absolute right-0 top-0 h-full w-1.5 cursor-col-resize z-10",
                            "hover:bg-brand-gold/50 active:bg-brand-gold transition-colors",
                            resizing === col.id && "bg-brand-gold"
                          )}
                          onMouseDown={(e) => handleResizeMouseDown(e, col.id)}
                        />
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

// Hook for managing column widths with localStorage persistence
export function useColumnWidths(storageKey: string, defaultWidths: ColumnWidths) {
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return { ...defaultWidths, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error('Failed to load column widths:', e);
    }
    return defaultWidths;
  });

  const handleColumnResize = useCallback((columnId: string, width: number) => {
    setColumnWidths(prev => {
      const newWidths = { ...prev, [columnId]: width };
      try {
        localStorage.setItem(storageKey, JSON.stringify(newWidths));
      } catch (e) {
        console.error('Failed to save column widths:', e);
      }
      return newWidths;
    });
  }, [storageKey]);

  const resetColumnWidths = useCallback(() => {
    setColumnWidths(defaultWidths);
    localStorage.removeItem(storageKey);
  }, [storageKey, defaultWidths]);

  return { columnWidths, handleColumnResize, resetColumnWidths };
}
