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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ApplyWSJFToRankDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workItemType: 'epic' | 'feature';
  scopeType?: 'portfolio' | 'program' | 'pi';
  scopeId?: string;
}

export function ApplyWSJFToRankDialog({
  open,
  onOpenChange,
  workItemType,
  scopeType,
  scopeId,
}: ApplyWSJFToRankDialogProps) {
  const [previewCount, setPreviewCount] = useState<number>(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const applyWSJFMutation = useMutation({
    mutationFn: async () => {
      let items: Array<{ id: string; wsjf_score: number; global_rank: number | null }> = [];

      if (workItemType === 'epic') {
        // For epics, WSJF is in epic_wsjf table
        let epicQuery = supabase
          .from('epic_wsjf')
          .select('epic_id, wsjf_score, epics!inner(id, global_rank, portfolio_id, primary_program_id)')
          .not('wsjf_score', 'is', null)
          .order('wsjf_score', { ascending: false });

        const { data: epicData, error: epicError } = await epicQuery;
        if (epicError) throw epicError;

        items = epicData?.map(item => ({
          id: item.epic_id,
          wsjf_score: item.wsjf_score || 0,
          global_rank: (item.epics as any)?.global_rank || null,
        })) || [];
      } else {
        // For features, WSJF is directly on the table
        let featureQuery = supabase
          .from('features')
          .select('id, wsjf_score, global_rank, program_id, pi_id')
          .not('wsjf_score', 'is', null)
          .order('wsjf_score', { ascending: false });

        if (scopeType === 'program' && scopeId) {
          featureQuery = featureQuery.eq('program_id', scopeId);
        } else if (scopeType === 'pi' && scopeId) {
          featureQuery = featureQuery.eq('pi_id', scopeId);
        }

        const { data: featureData, error: featureError } = await featureQuery;
        if (featureError) throw featureError;

        items = featureData || [];
      }

      setPreviewCount(items.length);

      // Update ranks based on WSJF order
      for (let i = 0; i < items.length; i++) {
        const { error: updateError } = await supabase
          .from(workItemType === 'epic' ? 'epics' : 'features')
          .update({ global_rank: i + 1 })
          .eq('id', items[i].id);

        if (updateError) throw updateError;
      }

      return items.length;
    },
    onSuccess: (count) => {
      toast({
        title: 'WSJF Applied to Ranking',
        description: `Successfully updated ${count} ${workItemType}${count !== 1 ? 's' : ''} based on WSJF scores.`,
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
          <DialogTitle>Apply WSJF to Rank</DialogTitle>
          <DialogDescription>
            This will reorder {workItemType === 'epic' ? 'epics' : 'features'} based on their WSJF scores
            (highest to lowest).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert className="bg-card">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">What will happen:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Work items with WSJF scores will be ranked by score (highest first)</li>
                  <li>Current ranking will be overwritten</li>
                  <li>Work items without WSJF scores will remain unaffected</li>
                  {scopeType && <li>Only {workItemType}s in the selected {scopeType} will be reranked</li>}
                </ul>
              </div>
            </AlertDescription>
          </Alert>

          {previewCount > 0 && (
            <Alert className="bg-card">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription>
                Ready to rerank {previewCount} {workItemType}{previewCount !== 1 ? 's' : ''}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={applyWSJFMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => applyWSJFMutation.mutate()}
            disabled={applyWSJFMutation.isPending}
          >
            {applyWSJFMutation.isPending ? 'Applying...' : 'Apply WSJF to Rank'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
