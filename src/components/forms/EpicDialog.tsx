import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface EpicDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  epic?: any;
}

export function EpicDialog({ open, onOpenChange, epic }: EpicDialogProps) {
  const [name, setName] = useState(epic?.name || '');
  const [description, setDescription] = useState(epic?.description || '');
  const [status, setStatus] = useState(epic?.status || 'proposed');
  const [health, setHealth] = useState(epic?.health || 'green');
  const [themeId, setThemeId] = useState(epic?.theme_id || '');
  const [programId, setProgramId] = useState(epic?.primary_program_id || '');
  const [estimate, setEstimate] = useState(epic?.estimate || 0);
  const [startDate, setStartDate] = useState(epic?.start_date || '');
  const [endDate, setEndDate] = useState(epic?.end_date || '');

  const queryClient = useQueryClient();

  const { data: themes } = useQuery({
    queryKey: ['themes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('strategic_themes').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: programs } = useQuery({
    queryKey: ['programs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('programs').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (epic) {
        const { error } = await supabase
          .from('epics')
          .update(data)
          .eq('id', epic.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('epics')
          .insert([data]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epics'] });
      toast.success(epic ? 'Epic updated' : 'Epic created');
      onOpenChange(false);
    },
    onError: () => {
      toast.error('Failed to save epic');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      name,
      description,
      status,
      health,
      theme_id: themeId || null,
      primary_program_id: programId || null,
      estimate,
      start_date: startDate || null,
      end_date: endDate || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{epic ? 'Edit Epic' : 'Create Epic'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="proposed">Proposed</SelectItem>
                  <SelectItem value="analyzing">Analyzing</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="health">Health</Label>
              <Select value={health} onValueChange={setHealth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="green">Green</SelectItem>
                  <SelectItem value="yellow">Yellow</SelectItem>
                  <SelectItem value="red">Red</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="estimate">Estimate</Label>
              <Input
                id="estimate"
                type="number"
                value={estimate}
                onChange={(e) => setEstimate(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="theme">Theme</Label>
              <Select value={themeId} onValueChange={setThemeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  {themes?.map((theme) => (
                    <SelectItem key={theme.id} value={theme.id}>
                      {theme.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="program">Primary Program</Label>
              <Select value={programId} onValueChange={setProgramId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select program" />
                </SelectTrigger>
                <SelectContent>
                  {programs?.map((program) => (
                    <SelectItem key={program.id} value={program.id}>
                      {program.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
