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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface MoveToPositionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  epicName: string;
  maxPosition: number;
  onConfirm: (position: number) => void;
}

export function MoveToPositionDialog({
  open,
  onOpenChange,
  epicName,
  maxPosition,
  onConfirm
}: MoveToPositionDialogProps) {
  const [position, setPosition] = useState('1');

  const handleConfirm = () => {
    const pos = parseInt(position);
    if (!isNaN(pos) && pos >= 1 && pos <= maxPosition) {
      onConfirm(pos);
      onOpenChange(false);
      setPosition('1');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Move to Position</DialogTitle>
          <DialogDescription>
            Move "{epicName}" to a specific position in the list
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="position">
            Position (1 - {maxPosition})
          </Label>
          <Input
            id="position"
            type="number"
            min="1"
            max={maxPosition}
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            className="mt-2"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
