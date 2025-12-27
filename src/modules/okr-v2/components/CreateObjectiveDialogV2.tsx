import { useState } from 'react';
import { useCreateObjectiveV2, ObjectiveStatusV2, ObjectiveHealthV2 } from '@/hooks/useObjectivesV2';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { CatalystDatePicker } from '@/components/ui/catalyst-date-picker';
import { cn } from '@/lib/utils';
import { Target, X, AlertCircle } from 'lucide-react';

interface CreateObjectiveDialogV2Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateObjectiveDialogV2({ open, onOpenChange }: CreateObjectiveDialogV2Props) {
  const createObjective = useCreateObjectiveV2();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [themeId, setThemeId] = useState<string>('');
  const [ownerId, setOwnerId] = useState<string>('');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [status, setStatus] = useState<ObjectiveStatusV2>('pending');
  const [health, setHealth] = useState<ObjectiveHealthV2>('at_risk');
  const [notes, setNotes] = useState('');

  // Fetch themes
  const { data: themes } = useQuery({
    queryKey: ['strategic-themes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('strategic_themes')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch users for owner selection
  const { data: users } = useQuery({
    queryKey: ['profiles-for-owner'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name');
      if (error) throw error;
      return data;
    },
  });

  const handleClose = () => {
    setName('');
    setDescription('');
    setThemeId('');
    setOwnerId('');
    setStartDate(undefined);
    setEndDate(undefined);
    setStatus('pending');
    setHealth('at_risk');
    setNotes('');
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    
    if (!themeId) {
      toast.error('Theme is required');
      return;
    }

    await createObjective.mutateAsync({
      name: name.trim(),
      description: description.trim() || undefined,
      theme_id: themeId,
      owner_id: ownerId || undefined,
      start_date: startDate ? startDate.toISOString().split('T')[0] : undefined,
      end_date: endDate ? endDate.toISOString().split('T')[0] : undefined,
      status,
    });

    handleClose();
  };

  const isValid = name.trim() && themeId;

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
              <Target className="h-5 w-5 text-[#2563eb]" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-[#f5f5f5]">
                Create Objective
              </h2>
            </div>
            <button 
              onClick={handleClose} 
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-5">
            {/* Name (required) */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 dark:text-[#e6e6e6]">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter objective name"
                required
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
                placeholder="Describe this objective"
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

            {/* Theme (required) */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 dark:text-[#e6e6e6]">
                Theme <span className="text-red-500">*</span>
              </Label>
              <Select value={themeId} onValueChange={setThemeId} disabled={!themes?.length}>
                <SelectTrigger className={inputClasses}>
                  <SelectValue placeholder={themes?.length ? "Select theme" : "No themes available"} />
                </SelectTrigger>
                <SelectContent className="z-[400] bg-white dark:bg-[#1a1a1a] border-gray-200 dark:border-[#333333]">
                  {themes?.filter(theme => theme.id).map((theme) => (
                    <SelectItem key={theme.id} value={theme.id}>
                      {theme.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!themes?.length && (
                <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                  <AlertCircle className="h-3 w-3" />
                  Create a theme first to create objectives
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Status */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 dark:text-[#e6e6e6]">
                  Status
                </Label>
                <Select value={status} onValueChange={(v) => setStatus(v as ObjectiveStatusV2)}>
                  <SelectTrigger className={inputClasses}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[400] bg-white dark:bg-[#1a1a1a] border-gray-200 dark:border-[#333333]">
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="on_track">On Track</SelectItem>
                    <SelectItem value="at_risk">At Risk</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Health */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 dark:text-[#e6e6e6]">
                  Health
                </Label>
                <Select value={health} onValueChange={(v) => setHealth(v as ObjectiveHealthV2)}>
                  <SelectTrigger className={inputClasses}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[400] bg-white dark:bg-[#1a1a1a] border-gray-200 dark:border-[#333333]">
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                    <SelectItem value="poor">Poor</SelectItem>
                    <SelectItem value="at_risk">At Risk</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Start Date */}
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

              {/* End Date */}
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

            {/* Owner */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 dark:text-[#e6e6e6]">
                Owner
              </Label>
              <Select value={ownerId || "__unassigned__"} onValueChange={(v) => setOwnerId(v === "__unassigned__" ? "" : v)}>
                <SelectTrigger className={inputClasses}>
                  <SelectValue placeholder="Select owner" />
                </SelectTrigger>
                <SelectContent className="z-[400] bg-white dark:bg-[#1a1a1a] border-gray-200 dark:border-[#333333]">
                  <SelectItem value="__unassigned__">Unassigned</SelectItem>
                  {users?.filter(user => user.id).map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || 'Unknown'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 dark:text-[#e6e6e6]">
                Notes
              </Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes..."
                rows={2}
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
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-[#333333] bg-gray-50 dark:bg-[#1a1a1a]">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              className="text-gray-600 dark:text-[#a3a3a3] hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#262626]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isValid || createObjective.isPending}
              className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-6"
            >
              {createObjective.isPending ? 'Creating...' : 'Create Objective'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
