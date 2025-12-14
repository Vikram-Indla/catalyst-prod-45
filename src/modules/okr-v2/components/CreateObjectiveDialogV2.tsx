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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
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
      due_date: dueDate ? dueDate.toISOString().split('T')[0] : undefined,
      status,
    });

    // Reset form
    setName('');
    setDescription('');
    setThemeId('');
    setOwnerId('');
    setStartDate(undefined);
    setDueDate(undefined);
    setStatus('pending');
    setHealth('at_risk');
    setNotes('');
    onOpenChange(false);
  };

  const isValid = name.trim() && themeId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Objective</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name (required) */}
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter objective name"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this objective"
              rows={3}
            />
          </div>

          {/* Theme (required) */}
          <div className="space-y-2">
            <Label>Theme *</Label>
            <Select value={themeId} onValueChange={setThemeId} disabled={!themes?.length}>
              <SelectTrigger className={!themeId ? 'border-destructive' : ''}>
                <SelectValue placeholder={themes?.length ? "Select theme (required)" : "No themes available"} />
              </SelectTrigger>
              <SelectContent>
                {themes?.filter(theme => theme.id).map((theme) => (
                  <SelectItem key={theme.id} value={theme.id}>
                    {theme.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!themeId && themes?.length ? (
              <p className="text-xs text-destructive">Theme is required</p>
            ) : null}
            {!themes?.length && (
              <p className="text-xs text-muted-foreground">Create a theme first to create objectives</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ObjectiveStatusV2)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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
              <Label>Health</Label>
              <Select value={health} onValueChange={(v) => setHealth(v as ObjectiveHealthV2)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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
              <Label>Start Date</Label>
              <CatalystDatePicker
                value={startDate}
                onChange={setStartDate}
                placeholder="Select start date"
              />
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label>Due Date</Label>
              <CatalystDatePicker
                value={dueDate}
                onChange={setDueDate}
                placeholder="Select due date"
              />
            </div>
          </div>

          {/* Owner */}
          <div className="space-y-2">
            <Label>Owner</Label>
            <Select value={ownerId || "__unassigned__"} onValueChange={(v) => setOwnerId(v === "__unassigned__" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select owner" />
              </SelectTrigger>
              <SelectContent>
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
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid || createObjective.isPending}>
              {createObjective.isPending ? 'Creating...' : 'Create Objective'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
