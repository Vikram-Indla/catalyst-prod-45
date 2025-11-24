import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface PIDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pi?: any;
}

export function PIDialog({ open, onOpenChange, pi }: PIDialogProps) {
  const [name, setName] = useState(pi?.name || '');
  const [portfolioId, setPortfolioId] = useState(pi?.portfolio_id || '');
  const [state, setState] = useState(pi?.state || 'planned');
  const [startDate, setStartDate] = useState(pi?.start_date || '');
  const [endDate, setEndDate] = useState(pi?.end_date || '');

  const queryClient = useQueryClient();

  const { data: portfolios } = useQuery({
    queryKey: ['portfolios'],
    queryFn: async () => {
      const { data, error } = await supabase.from('portfolios').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (pi) {
        const { error } = await supabase
          .from('program_increments')
          .update(data)
          .eq('id', pi.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('program_increments')
          .insert([data]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-increments'] });
      toast.success(pi ? 'PI updated' : 'PI created');
      onOpenChange(false);
    },
    onError: () => {
      toast.error('Failed to save PI');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!portfolioId || !startDate || !endDate) {
      toast.error('Please fill all required fields');
      return;
    }
    mutation.mutate({
      name,
      portfolio_id: portfolioId,
      state,
      start_date: startDate,
      end_date: endDate,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{pi ? 'Edit PI' : 'Create PI'}</DialogTitle>
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="portfolio">Portfolio *</Label>
              <Select value={portfolioId} onValueChange={setPortfolioId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select portfolio" />
                </SelectTrigger>
                <SelectContent>
                  {portfolios?.map((portfolio) => (
                    <SelectItem key={portfolio.id} value={portfolio.id}>
                      {portfolio.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <Select value={state} onValueChange={setState}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date *</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
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
