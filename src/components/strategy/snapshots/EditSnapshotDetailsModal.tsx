import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { StrategicSnapshot, useUpdateSnapshot } from '@/hooks/useStrategicSnapshots';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { catalystToast } from '@/lib/catalystToast';

interface EditSnapshotDetailsModalProps {
  open: boolean;
  onClose: () => void;
  snapshot: StrategicSnapshot;
}

export function EditSnapshotDetailsModal({ open, onClose, snapshot }: EditSnapshotDetailsModalProps) {
  const [description, setDescription] = useState(snapshot.description || '');
  const [startDate, setStartDate] = useState<Date | undefined>(
    snapshot.start_date ? new Date(snapshot.start_date) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    snapshot.end_date ? new Date(snapshot.end_date) : undefined
  );
  const [error, setError] = useState<string | null>(null);
  
  const updateSnapshot = useUpdateSnapshot();

  useEffect(() => {
    if (open) {
      setDescription(snapshot.description || '');
      setStartDate(snapshot.start_date ? new Date(snapshot.start_date) : undefined);
      setEndDate(snapshot.end_date ? new Date(snapshot.end_date) : undefined);
      setError(null);
    }
  }, [open, snapshot]);

  const validate = (): boolean => {
    if (!startDate) {
      setError('Start date is required');
      return false;
    }
    if (!endDate) {
      setError('End date is required');
      return false;
    }
    if (startDate > endDate) {
      setError('Start date must be before or equal to end date');
      return false;
    }
    setError(null);
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;

    try {
      await updateSnapshot.mutateAsync({
        id: snapshot.id,
        data: {
          description: description.trim(),
          start_date: startDate!.toISOString().split('T')[0],
          end_date: endDate!.toISOString().split('T')[0],
        },
      });
      catalystToast.success('Success', 'Snapshot updated');
      onClose();
    } catch {
      // Error handled by mutation
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[480px]" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle>Edit snapshot details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter snapshot description..."
              className="min-h-[100px] resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start date <span className="text-destructive">*</span></Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !startDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'MMM d, yyyy') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>End date <span className="text-destructive">*</span></Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !endDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, 'MMM d, yyyy') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateSnapshot.isPending}>
            {updateSnapshot.isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
