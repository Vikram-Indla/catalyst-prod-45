import { useState, useEffect, useRef } from "react";
import { Columns3, GripVertical } from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

export interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  default: boolean;
  width?: number;
}

interface ColumnsDropdownProps {
  columns: ColumnConfig[];
  onChange: (columns: ColumnConfig[]) => void;
  trigger?: React.ReactNode;
}

export const ColumnsDropdown = ({ columns, onChange, trigger }: ColumnsDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const toggleColumn = (columnId: string) => {
    onChange(
      columns.map((col) =>
        col.id === columnId ? { ...col, visible: !col.visible } : col
      )
    );
  };

  const resetToDefault = () => {
    onChange(columns.map((col) => ({ ...col, visible: col.default })));
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const items = Array.from(columns);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    onChange(items);
  };

  // Calculate display order (only for visible columns)
  const getVisibleOrder = (index: number): number | null => {
    let visibleCount = 0;
    for (let i = 0; i <= index; i++) {
      if (columns[i].visible) {
        visibleCount++;
      }
    }
    return columns[index].visible ? visibleCount : null;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {trigger ? (
        <div onClick={() => setIsOpen(!isOpen)}>
          {trigger}
        </div>
      ) : (
        <button
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium h-9 px-3 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
          onClick={() => setIsOpen(!isOpen)}
        >
          <Columns3 className="w-4 h-4" />
          Columns
        </button>
      )}

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 min-w-[260px] bg-card border border-border rounded shadow-lg z-[100] py-2">
          <div className="px-4 py-1.5 text-xs text-muted-foreground font-medium border-b border-border mb-1">
            Drag to reorder • Click to toggle
          </div>
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="columns-list">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="max-h-[400px] overflow-y-auto"
                >
                  {columns.map((col, index) => {
                    const visibleOrder = getVisibleOrder(index);
                    return (
                      <Draggable key={col.id} draggableId={col.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted cursor-pointer ${
                              snapshot.isDragging ? "bg-muted shadow-md" : ""
                            }`}
                            onClick={() => toggleColumn(col.id)}
                          >
                            <div
                              {...provided.dragHandleProps}
                              className="cursor-grab active:cursor-grabbing"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <GripVertical className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div
                              className={`w-4 h-4 border-2 rounded flex items-center justify-center shrink-0 ${
                                col.visible
                                  ? "bg-brand-gold border-brand-gold"
                                  : "border-border"
                              }`}
                            >
                              {col.visible && <span className="text-white text-[10px]">✓</span>}
                            </div>
                            <span className="flex-1">{col.label}</span>
                            {visibleOrder !== null && (
                              <span className="w-5 h-5 rounded-full bg-brand-gold/10 text-brand-gold text-xs font-medium flex items-center justify-center">
                                {visibleOrder}
                              </span>
                            )}
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
          <div className="h-px bg-border my-2" />
          <div
            className="px-4 py-2 text-sm text-brand-gold hover:bg-muted cursor-pointer"
            onClick={resetToDefault}
          >
            Reset to Default
          </div>
        </div>
      )}
    </div>
  );
};
