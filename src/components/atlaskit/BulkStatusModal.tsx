import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useProcessSteps } from '@/contexts/ProcessStepsContext';
import { Loader2 } from 'lucide-react';

interface BulkStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (status: string) => void;
  selectedCount: number;
}

export function BulkStatusModal({ isOpen, onClose, onConfirm, selectedCount }: BulkStatusModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const { processStepOptions, isLoading } = useProcessSteps();

  const handleConfirm = () => {
    if (selectedStatus) {
      onConfirm(selectedStatus);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Status</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <p className="mb-4 text-muted-foreground text-sm">
            Change status for {selectedCount} selected request{selectedCount > 1 ? 's' : ''}
          </p>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <RadioGroup value={selectedStatus} onValueChange={setSelectedStatus} className="flex flex-col gap-3">
              {processStepOptions.map((step) => (
                <div key={step.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={step.value} id={step.value} />
                  <Label htmlFor={step.value} className="cursor-pointer">{step.label}</Label>
                </div>
              ))}
            </RadioGroup>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedStatus || isLoading}>
            Update {selectedCount} Request{selectedCount > 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default BulkStatusModal;
