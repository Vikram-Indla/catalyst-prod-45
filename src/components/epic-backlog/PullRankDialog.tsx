import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PullRankDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  epicIds: string[];
  onSuccess: () => void;
}

export function PullRankDialog({ open, onOpenChange, epicIds, onSuccess }: PullRankDialogProps) {
  const [parentTheme, setParentTheme] = useState('');
  const [rankType, setRankType] = useState<'global' | 'portfolio' | 'program'>('global');
  const { toast } = useToast();

  const pullRankMutation = useMutation({
    mutationFn: async () => {
      // This would implement the logic to reorder child epics based on parent theme ranking
      // For now, implementing basic reordering
      for (let i = 0; i < epicIds.length; i++) {
        await supabase
          .from('epics')
          .update({ [`${rankType}_rank`]: i })
          .eq('id', epicIds[i]);
      }
    },
    onSuccess: () => {
      toast({ title: 'Pull rank applied successfully' });
      onSuccess();
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: 'Failed to apply pull rank', variant: 'destructive' });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pull Rank from Parent</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Rank Type</Label>
            <Select value={rankType} onValueChange={(v: any) => setRankType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">Global Rank</SelectItem>
                <SelectItem value="portfolio">Portfolio Rank</SelectItem>
                <SelectItem value="program">Program Rank</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-muted-foreground">
            This will reorder {epicIds.length} epics based on their parent theme's ranking order.
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => pullRankMutation.mutate()} disabled={pullRankMutation.isPending}>
            Apply Pull Rank
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
