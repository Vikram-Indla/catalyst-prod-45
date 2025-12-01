import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface PullRankDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workItemType: 'epic' | 'feature';
  currentItemId?: string;
}

export function PullRankDialog({
  open,
  onOpenChange,
  workItemType,
  currentItemId,
}: PullRankDialogProps) {
  const [sourceType, setSourceType] = useState<'portfolio' | 'program'>('portfolio');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const pullRankMutation = useMutation({
    mutationFn: async () => {
      if (!currentItemId) {
        throw new Error('No item selected');
      }

      // Get the source rank (portfolio_rank or program_rank)
      const rankField = sourceType === 'portfolio' ? 'portfolio_rank' : 'program_rank';
      
      const { data: currentItem, error: fetchError } = await supabase
        .from(workItemType === 'epic' ? 'epics' : 'features')
        .select(`id, ${rankField}, global_rank`)
        .eq('id', currentItemId)
        .single();

      if (fetchError) throw fetchError;

      const sourceRank = (currentItem as any)[rankField];
      
      if (!sourceRank) {
        throw new Error(`No ${sourceType} rank found for this item`);
      }

      // Update global_rank to match the source rank
      const { error: updateError } = await supabase
        .from(workItemType === 'epic' ? 'epics' : 'features')
        .update({ global_rank: sourceRank })
        .eq('id', currentItemId);

      if (updateError) throw updateError;

      return sourceRank;
    },
    onSuccess: (rank) => {
      toast({
        title: 'Rank Pulled Successfully',
        description: `Global rank updated to ${rank} from ${sourceType} rank.`,
      });
      queryClient.invalidateQueries({ queryKey: [workItemType === 'epic' ? 'epics' : 'features'] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pull Rank</DialogTitle>
          <DialogDescription>
            Copy the rank from portfolio or program level to the global backlog rank.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Source Rank</Label>
            <Select value={sourceType} onValueChange={(v) => setSourceType(v as 'portfolio' | 'program')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="portfolio">Portfolio Rank</SelectItem>
                <SelectItem value="program">Program Rank</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Select which rank to copy to the global backlog rank
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pullRankMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => pullRankMutation.mutate()}
            disabled={pullRankMutation.isPending || !currentItemId}
          >
            {pullRankMutation.isPending ? 'Pulling...' : 'Pull Rank'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
