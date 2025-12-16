import { useState } from 'react';
import { useCreateObjectiveV2, ObjectiveStatusV2, ObjectiveHealthV2 } from '@/hooks/useObjectivesV2';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { CatalystDatePicker } from '@/components/ui/catalyst-date-picker';

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

    // Reset form
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

  const isValid = name.trim() && themeId;

  const inputClasses = "w-full px-3 py-2.5 rounded-lg text-sm bg-white dark:bg-[#0D1117] border border-[#E1E4E8] dark:border-[#30363D] text-[#24292F] dark:text-[#E6EDF3] placeholder:text-[#8B949E] dark:placeholder:text-[#6E7681] focus:border-[#C69C6D] focus:ring-1 focus:ring-[rgba(198,156,109,0.3)] outline-none";
  const labelClasses = "text-sm font-medium text-[#24292F] dark:text-[#E6EDF3]";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-white dark:bg-[#161B22] border-[#E1E4E8] dark:border-[#30363D]">
        <DialogHeader>
          <DialogTitle className="text-[#24292F] dark:text-[#E6EDF3]">Create Objective</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name (required) */}
          <div className="space-y-2">
            <label htmlFor="name" className={labelClasses}>Name *</label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter objective name"
              required
              className={inputClasses}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label htmlFor="description" className={labelClasses}>Description</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this objective"
              rows={3}
              className={inputClasses}
            />
          </div>

          {/* Theme (required) */}
          <div className="space-y-2">
            <label className={labelClasses}>Theme *</label>
            <Select value={themeId} onValueChange={setThemeId} disabled={!themes?.length}>
              <SelectTrigger className={`${inputClasses} ${!themeId ? 'border-2 border-[#B85C5C]' : ''}`}>
                <SelectValue placeholder={themes?.length ? "Select theme (required)" : "No themes available"} />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-[#161B22] border-[#E1E4E8] dark:border-[#30363D]">
                {themes?.filter(theme => theme.id).map((theme) => (
                  <SelectItem key={theme.id} value={theme.id}>
                    {theme.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!themeId && themes?.length ? (
              <p className="text-xs text-[#B85C5C]">Theme is required</p>
            ) : null}
            {!themes?.length && (
              <p className="text-xs text-[#8B949E] dark:text-[#6E7681]">Create a theme first to create objectives</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Status */}
            <div className="space-y-2">
              <label className={labelClasses}>Status</label>
              <Select value={status} onValueChange={(v) => setStatus(v as ObjectiveStatusV2)}>
                <SelectTrigger className={inputClasses}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#161B22] border-[#E1E4E8] dark:border-[#30363D]">
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
              <label className={labelClasses}>Health</label>
              <Select value={health} onValueChange={(v) => setHealth(v as ObjectiveHealthV2)}>
                <SelectTrigger className={inputClasses}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#161B22] border-[#E1E4E8] dark:border-[#30363D]">
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
              <label className={labelClasses}>Start Date</label>
              <CatalystDatePicker
                value={startDate}
                onChange={setStartDate}
                placeholder="Select start date"
              />
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <label className={labelClasses}>End Date</label>
              <CatalystDatePicker
                value={endDate}
                onChange={setEndDate}
                placeholder="Select end date"
              />
            </div>
          </div>

          {/* Owner */}
          <div className="space-y-2">
            <label className={labelClasses}>Owner</label>
            <Select value={ownerId || "__unassigned__"} onValueChange={(v) => setOwnerId(v === "__unassigned__" ? "" : v)}>
              <SelectTrigger className={inputClasses}>
                <SelectValue placeholder="Select owner" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-[#161B22] border-[#E1E4E8] dark:border-[#30363D]">
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
            <label htmlFor="notes" className={labelClasses}>Notes</label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes..."
              rows={2}
              className={inputClasses}
            />
          </div>

          <DialogFooter>
            <button 
              type="button" 
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-white dark:bg-[#161B22] border border-[#E1E4E8] dark:border-[#30363D] text-[#57606A] dark:text-[#8B949E] hover:bg-[#F6F8FA] dark:hover:bg-[#21262D]"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={!isValid || createObjective.isPending}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-[#C69C6D] hover:bg-[#B8905F] text-white disabled:opacity-50"
            >
              {createObjective.isPending ? 'Creating...' : 'Create Objective'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
