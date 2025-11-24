import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface ThemeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  theme?: any;
}

export function ThemeDialog({ open, onOpenChange, theme }: ThemeDialogProps) {
  const [name, setName] = useState(theme?.name || '');
  const [description, setDescription] = useState(theme?.description || '');
  const [status, setStatus] = useState(theme?.status || 'proposed');
  const [startDate, setStartDate] = useState(theme?.start_date || '');
  const [endDate, setEndDate] = useState(theme?.end_date || '');
  const [colorTag, setColorTag] = useState(theme?.color_tag || '#3B82F6');

  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) {
      setName(theme?.name || '');
      setDescription(theme?.description || '');
      setStatus(theme?.status || 'proposed');
      setStartDate(theme?.start_date || '');
      setEndDate(theme?.end_date || '');
      setColorTag(theme?.color_tag || '#3B82F6');
    }
  }, [open, theme]);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (theme) {
        const { error } = await supabase
          .from('strategic_themes')
          .update(data)
          .eq('id', theme.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('strategic_themes')
          .insert([data]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['themes'] });
      toast.success(theme ? 'Theme updated' : 'Theme created');
      onOpenChange(false);
    },
    onError: () => {
      toast.error('Failed to save theme');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      name,
      description,
      status,
      start_date: startDate || null,
      end_date: endDate || null,
      color_tag: colorTag,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{theme ? 'Edit Theme' : 'Create Theme'}</DialogTitle>
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="proposed">Proposed</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="color">Color Tag</Label>
              <Input
                id="color"
                type="color"
                value={colorTag}
                onChange={(e) => setColorTag(e.target.value)}
              />
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
