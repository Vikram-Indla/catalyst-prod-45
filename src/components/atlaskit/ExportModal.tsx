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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport?: (format: 'csv' | 'excel' | 'pdf') => void;
}

export function ExportModal({ isOpen, onClose, onExport }: ExportModalProps) {
  const [format, setFormat] = useState<'csv' | 'excel' | 'pdf'>('csv');

  const handleExport = () => {
    onExport?.(format);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Requests</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <RadioGroup value={format} onValueChange={(v) => setFormat(v as 'csv' | 'excel' | 'pdf')} className="flex flex-col gap-4">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="csv" id="csv" />
              <Label htmlFor="csv" className="cursor-pointer">CSV (.csv)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="excel" id="excel" />
              <Label htmlFor="excel" className="cursor-pointer">Excel (.xlsx)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="pdf" id="pdf" />
              <Label htmlFor="pdf" className="cursor-pointer">PDF (.pdf)</Label>
            </div>
          </RadioGroup>
          
          <Alert className="mt-6">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Export will include all visible columns and filtered data.
            </AlertDescription>
          </Alert>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleExport}>
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ExportModal;
