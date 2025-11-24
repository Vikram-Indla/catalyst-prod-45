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

interface BusinessRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessRequest?: any;
}

export function BusinessRequestDialog({ open, onOpenChange, businessRequest }: BusinessRequestDialogProps) {
  const [name, setName] = useState(businessRequest?.name || '');
  const [description, setDescription] = useState(businessRequest?.description || '');
  const [status, setStatus] = useState(businessRequest?.status || 'proposed');
  const [health, setHealth] = useState(businessRequest?.health || 'green');
  const [themeId, setThemeId] = useState(businessRequest?.theme_id || '');
  const [initiativeId, setInitiativeId] = useState(businessRequest?.initiative_id || '');
  const [estimateSwag, setEstimateSwag] = useState(businessRequest?.estimate_swag || 0);
  const [wsjfScore, setWsjfScore] = useState(businessRequest?.wsjf_score || 0);

  const queryClient = useQueryClient();

  const { data: themes } = useQuery({
    queryKey: ['themes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('strategic_themes').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: initiatives } = useQuery({
    queryKey: ['initiatives'],
    queryFn: async () => {
      const { data, error } = await supabase.from('initiatives').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (businessRequest) {
        const { error } = await supabase
          .from('business_requests')
          .update(data)
          .eq('id', businessRequest.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('business_requests')
          .insert([data]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-requests'] });
      toast.success(businessRequest ? 'Business request updated' : 'Business request created');
      onOpenChange(false);
    },
    onError: () => {
      toast.error('Failed to save business request');
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
      initiative_id: initiativeId || null,
      estimate_swag: estimateSwag,
      wsjf_score: wsjfScore,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{businessRequest ? 'Edit Business Request' : 'Create Business Request'}</DialogTitle>
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
              <Label htmlFor="estimate">Estimate (SWAG)</Label>
              <Input
                id="estimate"
                type="number"
                value={estimateSwag}
                onChange={(e) => setEstimateSwag(Number(e.target.value))}
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
              <Label htmlFor="initiative">Initiative</Label>
              <Select value={initiativeId} onValueChange={setInitiativeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select initiative" />
                </SelectTrigger>
                <SelectContent>
                  {initiatives?.map((initiative) => (
                    <SelectItem key={initiative.id} value={initiative.id}>
                      {initiative.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="wsjf">WSJF Score</Label>
            <Input
              id="wsjf"
              type="number"
              value={wsjfScore}
              onChange={(e) => setWsjfScore(Number(e.target.value))}
            />
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
