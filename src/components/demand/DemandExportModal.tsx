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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, FileText, FileSpreadsheet, File } from 'lucide-react';

interface DemandExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport?: (format: 'csv' | 'excel' | 'pdf') => void;
}

const formatOptions = [
  { value: 'csv', label: 'CSV (.csv)', icon: FileText, description: 'Comma-separated values, works with any spreadsheet app' },
  { value: 'excel', label: 'Excel (.xlsx)', icon: FileSpreadsheet, description: 'Microsoft Excel format with formatting' },
  { value: 'pdf', label: 'PDF (.pdf)', icon: File, description: 'Portable document for printing and sharing' },
] as const;

export function DemandExportModal({ isOpen, onClose, onExport }: DemandExportModalProps) {
  const [format, setFormat] = useState<'csv' | 'excel' | 'pdf'>('csv');

  const handleExport = () => {
    onExport?.(format);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Requests</DialogTitle>
          <DialogDescription>
            Choose a format to export your demand requests
          </DialogDescription>
        </DialogHeader>
        
        <RadioGroup 
          value={format} 
          onValueChange={(val) => setFormat(val as typeof format)}
          className="space-y-3"
        >
          {formatOptions.map((option) => {
            const Icon = option.icon;
            return (
              <div 
                key={option.value}
                className="flex items-start space-x-3 p-3 rounded-md border hover:bg-muted/50 cursor-pointer"
                onClick={() => setFormat(option.value)}
              >
                <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
                <Icon className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor={option.value} className="cursor-pointer font-medium">
                    {option.label}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {option.description}
                  </p>
                </div>
              </div>
            );
          })}
        </RadioGroup>
        
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Export will include all visible columns and filtered data.
          </AlertDescription>
        </Alert>
        
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

export default DemandExportModal;
