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
import { useProcessSteps } from '@/contexts/ProcessStepsContext';
import { Loader2 } from 'lucide-react';

interface DemandBulkStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (status: string) => void;
  selectedCount: number;
}

export function DemandBulkStatusModal({ isOpen, onClose, onConfirm, selectedCount }: DemandBulkStatusModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const { processStepOptions, isLoading } = useProcessSteps();

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
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <RadioGroup 
            value={selectedStatus} 
            onValueChange={setSelectedStatus}
            className="space-y-3"
          >
            {processStepOptions.map((step) => (
              <div key={step.value} className="flex items-center space-x-3">
                <RadioGroupItem value={step.value} id={step.value} />
                <Label htmlFor={step.value} className="cursor-pointer">
                  {step.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!selectedStatus || isLoading}
          >
            Update {selectedCount} Request{selectedCount > 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default DemandBulkStatusModal;
