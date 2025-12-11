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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { PROCESS_STEPS } from '@/types/business-request';

interface DemandBulkStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (status: string) => void;
  selectedCount: number;
}

export function DemandBulkStatusModal({ isOpen, onClose, onConfirm, selectedCount }: DemandBulkStatusModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  const handleConfirm = () => {
    if (selectedStatus) {
      onConfirm(selectedStatus);
      onClose();
      setSelectedStatus('');
    }
  };

  const handleClose = () => {
    onClose();
    setSelectedStatus('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Status</DialogTitle>
          <DialogDescription>
            Change status for {selectedCount} selected request{selectedCount > 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>
        
        <RadioGroup 
          value={selectedStatus} 
          onValueChange={setSelectedStatus}
          className="space-y-3"
        >
          {PROCESS_STEPS.map((step) => (
            <div key={step.value} className="flex items-center space-x-3">
              <RadioGroupItem value={step.value} id={step.value} />
              <Label htmlFor={step.value} className="cursor-pointer">
                {step.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!selectedStatus}
          >
            Update {selectedCount} Request{selectedCount > 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default DemandBulkStatusModal;
