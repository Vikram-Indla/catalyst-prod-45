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

interface InitiativeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initiative?: any;
}

export function InitiativeDialog({ open, onOpenChange, initiative }: InitiativeDialogProps) {
  const [name, setName] = useState(initiative?.name || '');
  const [description, setDescription] = useState(initiative?.description || '');
  const [status, setStatus] = useState(initiative?.status || 'proposed');
  const [themeId, setThemeId] = useState(initiative?.theme_id || '');
  const [wsjfScore, setWsjfScore] = useState(initiative?.wsjf_score || 0);
  const [benefitScore, setBenefitScore] = useState(initiative?.benefit_score || 0);

  const queryClient = useQueryClient();

  const { data: themes } = useQuery({
    queryKey: ['themes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('strategic_themes').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (initiative) {
        const { error } = await supabase
          .from('initiatives')
          .update(data)
          .eq('id', initiative.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('initiatives')
          .insert([data]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['initiatives'] });
      toast.success(initiative ? 'Initiative updated' : 'Initiative created');
      onOpenChange(false);
    },
    onError: () => {
      toast.error('Failed to save initiative');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!themeId) {
      toast.error('Please select a theme');
      return;
    }
    mutation.mutate({
      name,
      description,
      status,
      theme_id: themeId,
      wsjf_score: wsjfScore,
      benefit_score: benefitScore,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initiative ? 'Edit Initiative' : 'Create Initiative'}</DialogTitle>
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
              <Label htmlFor="theme">Theme *</Label>
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
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="wsjf">WSJF Score</Label>
              <Input
                id="wsjf"
                type="number"
                value={wsjfScore}
                onChange={(e) => setWsjfScore(Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="benefit">Benefit Score</Label>
              <Input
                id="benefit"
                type="number"
                value={benefitScore}
                onChange={(e) => setBenefitScore(Number(e.target.value))}
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
