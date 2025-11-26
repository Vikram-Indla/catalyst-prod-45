import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface MoveToPositionModalProps {
  currentPosition: number;
  totalItems: number;
  onClose: () => void;
  onMove: (newPosition: number) => void;
}

export const MoveToPositionModal = ({
  currentPosition,
  totalItems,
  onClose,
  onMove,
}: MoveToPositionModalProps) => {
  const [newPosition, setNewPosition] = useState(currentPosition.toString());

  const handleMove = () => {
    const pos = parseInt(newPosition);
    if (!isNaN(pos) && pos >= 1 && pos <= totalItems) {
      onMove(pos);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-[1000]">
      <div className="w-[400px] bg-card rounded-lg shadow-2xl border border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">
            Move To Position
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:bg-muted rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-sm text-muted-foreground mb-4">
            Enter the new position for this epic:
          </p>

          <div className="space-y-2 mb-4">
            <p className="text-sm text-muted-foreground">
              Current position: {currentPosition}
            </p>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">
                New position:
              </label>
              <Input
                type="number"
                min={1}
                max={totalItems}
                value={newPosition}
                onChange={(e) => setNewPosition(e.target.value)}
                className="w-full"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Total items: {totalItems}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleMove}>Move</Button>
        </div>
      </div>
    </div>
  );
};
