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
import { Checkbox } from '@/components/ui/checkbox';

interface DuplicateEpicDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  epicName: string;
  onConfirm: (newName: string, options: DuplicateOptions) => void;
}

interface DuplicateOptions {
  includeFeatures: boolean;
  includeCapabilities: boolean;
  includeDates: boolean;
}

export function DuplicateEpicDialog({
  open,
  onOpenChange,
  epicName,
  onConfirm
}: DuplicateEpicDialogProps) {
  const [newName, setNewName] = useState(`${epicName} (Copy)`);
  const [options, setOptions] = useState<DuplicateOptions>({
    includeFeatures: false,
    includeCapabilities: false,
    includeDates: false
  });

  const handleConfirm = () => {
    if (newName.trim()) {
      onConfirm(newName, options);
      onOpenChange(false);
      setNewName(`${epicName} (Copy)`);
      setOptions({
        includeFeatures: false,
        includeCapabilities: false,
        includeDates: false
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Duplicate Epic</DialogTitle>
          <DialogDescription>
            Create a copy of "{epicName}"
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="new-name">New Epic Name</Label>
            <Input
              id="new-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="mt-2"
            />
          </div>
          <div className="space-y-3">
            <Label>Include in copy:</Label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="features"
                checked={options.includeFeatures}
                onCheckedChange={(checked) =>
                  setOptions({ ...options, includeFeatures: !!checked })
                }
              />
              <label htmlFor="features" className="text-sm cursor-pointer">
                Features
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="capabilities"
                checked={options.includeCapabilities}
                onCheckedChange={(checked) =>
                  setOptions({ ...options, includeCapabilities: !!checked })
                }
              />
              <label htmlFor="capabilities" className="text-sm cursor-pointer">
                Capabilities
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="dates"
                checked={options.includeDates}
                onCheckedChange={(checked) =>
                  setOptions({ ...options, includeDates: !!checked })
                }
              />
              <label htmlFor="dates" className="text-sm cursor-pointer">
                Dates
              </label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Duplicate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
