import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CatalystDatePicker } from '@/components/ui/catalyst-date-picker';
import { useCreateTheme } from '@/hooks/useStrategicBacklog';
import { CATALYST_BRAND_COLORS, DEFAULT_THEME_COLOR } from '@/constants/brandColors';

// Status options - these map to CreateThemeInput types
const STATUS_OPTIONS = [
  { value: 'draft', label: 'Proposed' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Done' },
];

interface CreateThemeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshotId?: string;
}

export function CreateThemeDialog({ open, onOpenChange, snapshotId }: CreateThemeDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [colorTag, setColorTag] = useState(DEFAULT_THEME_COLOR);
  const [status, setStatus] = useState<'draft' | 'active' | 'archived'>('draft');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  const createTheme = useCreateTheme();

  const handleSubmit = async () => {
    if (!name.trim()) return;

    await createTheme.mutateAsync({
      name,
      description,
      color_tag: colorTag,
      snapshot_id: snapshotId,
      status: status,
      start_date: startDate?.toISOString().split('T')[0],
      end_date: endDate?.toISOString().split('T')[0],
    });

    // Reset form
    setName('');
    setDescription('');
    setColorTag(DEFAULT_THEME_COLOR);
    setStatus('draft');
    setStartDate(undefined);
    setEndDate(undefined);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setName('');
    setDescription('');
    setColorTag(DEFAULT_THEME_COLOR);
    setStatus('draft');
    setStartDate(undefined);
    setEndDate(undefined);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Create Theme</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label>Name <span className="text-destructive">*</span></Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter theme name"
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter theme description (optional)"
              rows={3}
            />
          </div>

          {/* Status & Color Tag Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as 'draft' | 'active' | 'archived')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="z-[400]">
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Color Tag</Label>
              <div className="flex gap-2 pt-1">
                {CATALYST_BRAND_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setColorTag(color.value)}
                    className={`w-8 h-8 rounded-lg border-2 transition-all ${
                      colorTag === color.value ? 'border-foreground scale-110 ring-2 ring-offset-1 ring-foreground/20' : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Start Date & End Date Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <CatalystDatePicker
                value={startDate}
                onChange={setStartDate}
                placeholder="Select start date"
              />
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <CatalystDatePicker
                value={endDate}
                onChange={setEndDate}
                placeholder="Select end date"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || createTheme.isPending}
            className="bg-brand-primary hover:bg-brand-primary/90"
          >
            {createTheme.isPending ? 'Creating...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
