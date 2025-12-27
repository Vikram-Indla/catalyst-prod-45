import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CatalystDatePicker } from '@/components/ui/catalyst-date-picker';
import { useCreateTheme } from '@/hooks/useStrategicBacklog';
import { CATALYST_BRAND_COLORS, DEFAULT_THEME_COLOR } from '@/constants/brandColors';
import { cn } from '@/lib/utils';
import { Circle, X } from 'lucide-react';

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
      snapshot_id: snapshotId || undefined,
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

  const inputClasses = cn(
    "h-11 bg-white dark:bg-[#1a1a1a]",
    "border-gray-300 dark:border-[#333333]",
    "text-gray-900 dark:text-[#f5f5f5]",
    "placeholder:text-gray-400 dark:placeholder:text-[#525252]",
    "focus:border-[#2563eb] focus:ring-[#2563eb]/30"
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "sm:max-w-[560px] max-h-[90vh] p-0 flex flex-col overflow-hidden",
        "bg-white dark:bg-[#141414]",
        "rounded-lg",
        "shadow-xl",
        "border border-gray-200 dark:border-[#333333]",
        "[&>button]:hidden"
      )}>
        {/* Accent Bar */}
        <div className="h-1 bg-gradient-to-r from-[#2563eb] via-[#0d9488] to-[#60a5fa] flex-shrink-0" />

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-[#333333] flex-shrink-0 bg-white dark:bg-[#141414]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Circle className="h-5 w-5 text-[#2563eb] fill-[#2563eb]" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-[#f5f5f5]">
                Create Theme
              </h2>
            </div>
            <button 
              onClick={handleCancel} 
              className={cn(
                "p-1.5 rounded-md",
                "text-gray-400 hover:text-gray-600 dark:text-[#737373] dark:hover:text-[#a3a3a3]",
                "hover:bg-gray-100 dark:hover:bg-[#1a1a1a]",
                "transition-colors"
              )}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {!snapshotId && (
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              You can create a theme now and link it to a snapshot later.
            </div>
          )}
          <div className="space-y-5">
            {/* Name */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 dark:text-[#e6e6e6]">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter theme name"
                autoFocus
                className={inputClasses}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 dark:text-[#e6e6e6]">
                Description
              </Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter theme description (optional)"
                rows={3}
                className={cn(
                  "bg-white dark:bg-[#1a1a1a]",
                  "border-gray-300 dark:border-[#333333]",
                  "text-gray-900 dark:text-[#f5f5f5]",
                  "placeholder:text-gray-400 dark:placeholder:text-[#525252]",
                  "focus:border-[#2563eb] focus:ring-[#2563eb]/30",
                  "resize-y"
                )}
              />
            </div>

            {/* Status & Color Tag Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 dark:text-[#e6e6e6]">
                  Status
                </Label>
                <Select value={status} onValueChange={(value) => setStatus(value as 'draft' | 'active' | 'archived')}>
                  <SelectTrigger className={inputClasses}>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="z-[400] bg-white dark:bg-[#1a1a1a] border-gray-200 dark:border-[#333333]">
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 dark:text-[#e6e6e6]">
                  Color Tag
                </Label>
                <div className="flex gap-2 pt-1">
                  {CATALYST_BRAND_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setColorTag(color.value)}
                      className={cn(
                        "w-8 h-8 rounded-lg border-2 transition-all",
                        colorTag === color.value 
                          ? 'border-foreground scale-110 ring-2 ring-offset-1 ring-foreground/20' 
                          : 'border-transparent hover:scale-105'
                      )}
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
                <Label className="text-sm font-medium text-gray-700 dark:text-[#e6e6e6]">
                  Start Date
                </Label>
                <CatalystDatePicker
                  value={startDate}
                  onChange={setStartDate}
                  placeholder="Select start date"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 dark:text-[#e6e6e6]">
                  End Date
                </Label>
                <CatalystDatePicker
                  value={endDate}
                  onChange={setEndDate}
                  placeholder="Select end date"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-[#333333] bg-gray-50 dark:bg-[#1a1a1a]">
          <Button
            variant="ghost"
            onClick={handleCancel}
            className="text-gray-600 dark:text-[#a3a3a3] hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#262626]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || createTheme.isPending}
            className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-6"
          >
            {createTheme.isPending ? 'Creating...' : 'Create Theme'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
