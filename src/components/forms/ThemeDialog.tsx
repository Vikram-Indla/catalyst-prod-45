import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CatalystDatePicker } from '@/components/ui/catalyst-date-picker';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { CATALYST_BRAND_COLORS, DEFAULT_THEME_COLOR } from '@/constants/brandColors';

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
  const [colorTag, setColorTag] = useState(theme?.color_tag || DEFAULT_THEME_COLOR);

  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) {
      setName(theme?.name || '');
      setDescription(theme?.description || '');
      setStatus(theme?.status || 'proposed');
      setStartDate(theme?.start_date || '');
      setEndDate(theme?.end_date || '');
      setColorTag(theme?.color_tag || DEFAULT_THEME_COLOR);
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
        // snapshot_id is required - use default strategy snapshot
        const insertData = {
          ...data,
          snapshot_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', // Default: Digital Strategy 2025
        };
        const { error } = await supabase
          .from('strategic_themes')
          .insert([insertData]);
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
                <SelectContent className="z-[400]">
                  <SelectItem value="proposed">Proposed</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate" className="mb-1.5 block">Start Date</Label>
              <CatalystDatePicker
                value={startDate || null}
                onChange={(date) => setStartDate(date ? format(date, 'yyyy-MM-dd') : '')}
                placeholder="Select start date"
              />
            </div>
            <div>
              <Label htmlFor="endDate" className="mb-1.5 block">End Date</Label>
              <CatalystDatePicker
                value={endDate || null}
                onChange={(date) => setEndDate(date ? format(date, 'yyyy-MM-dd') : '')}
                placeholder="Select end date"
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
