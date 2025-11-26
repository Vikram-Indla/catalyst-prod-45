import { useState } from "react";
import { X, GripVertical } from "lucide-react";
import { Epic } from "@/types/backlog.types";
import { Button } from "@/components/ui/button";

interface PrioritizeModalProps {
  sectionTitle: string;
  items: Epic[];
  onClose: () => void;
  onSave: (reorderedItems: Epic[]) => void;
}

export const PrioritizeModal = ({
  sectionTitle,
  items,
  onClose,
  onSave,
}: PrioritizeModalProps) => {
  const [orderedItems, setOrderedItems] = useState(items);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newItems = [...orderedItems];
    const draggedItem = newItems[draggedIndex];
    newItems.splice(draggedIndex, 1);
    newItems.splice(index, 0, draggedItem);

    setOrderedItems(newItems);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-[1000]">
      <div className="w-[600px] max-h-[80vh] bg-card rounded-lg shadow-2xl flex flex-col border border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">
            Prioritize {sectionTitle}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:bg-muted rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <p className="text-sm text-muted-foreground mb-4">
            Drag items to reorder priority. Top = highest priority.
          </p>

          <div className="border border-border rounded">
            {orderedItems.map((item, index) => (
              <div
                key={item.id}
                className={`flex items-center gap-3 p-3 border-b border-border last:border-b-0 cursor-grab hover:bg-muted transition-colors ${
                  draggedIndex === index ? "opacity-50 bg-primary/10" : ""
                }`}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
              >
                <span className="w-[30px] text-sm font-medium text-muted-foreground">
                  {index + 1}
                </span>
                <span className="w-[60px] text-sm text-muted-foreground">
                  {item.numericId}
                </span>
                <span className="flex-1 text-sm text-foreground truncate">
                  {item.title}
                </span>
                <GripVertical className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onSave(orderedItems);
              onClose();
            }}
          >
            Save Priority Order
          </Button>
        </div>
      </div>
    </div>
  );
};
