import { useState } from 'react';
import { useKRWorkContributions, useAddWorkContribution, useUpdateContributionPercent, useRemoveWorkContribution } from '@/hooks/useKRWorkContributions';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface KRWorkContributionsV2Props {
  keyResultId: string;
}

export function KRWorkContributionsV2({ keyResultId }: KRWorkContributionsV2Props) {
  const { data: contributions, isLoading } = useKRWorkContributions(keyResultId);
  const removeContribution = useRemoveWorkContribution();
  const updatePercent = useUpdateContributionPercent();
  const [showAddDialog, setShowAddDialog] = useState(false);

  const totalPercent = contributions?.reduce((sum, c) => sum + c.contribution_percent, 0) || 0;
  const isValidTotal = totalPercent >= 99 && totalPercent <= 101; // Allow small rounding tolerance

  if (isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }

  return (
    <div className="space-y-3">
      {/* Validation warning */}
      {contributions && contributions.length > 0 && !isValidTotal && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Contribution percentages must sum to 100%. Current total: {totalPercent}%
          </AlertDescription>
        </Alert>
      )}

      {/* Contribution list */}
      {contributions && contributions.length > 0 ? (
        <div className="space-y-2">
          {contributions.map((contribution) => (
            <div
              key={contribution.id}
              className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">
                    {contribution.work_item_type}
                  </Badge>
                  <span className="text-sm font-medium truncate">
                    {contribution.work_item_name || contribution.work_item_id}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Progress: {contribution.calculated_progress}%</span>
                  <Progress value={contribution.calculated_progress} className="w-20 h-1" />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={contribution.contribution_percent}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    if (value > 0 && value <= 100) {
                      updatePercent.mutate({
                        id: contribution.id,
                        keyResultId,
                        percent: value,
                      });
                    }
                  }}
                  className="w-16 h-8 text-center text-sm"
                />
                <span className="text-sm text-muted-foreground">%</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => removeContribution.mutate({ id: contribution.id, keyResultId })}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          {/* Total row */}
          <div className="flex items-center justify-between pt-2 border-t border-border text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className={`font-medium ${isValidTotal ? 'text-green-600' : 'text-destructive'}`}>
              {totalPercent}%
            </span>
          </div>
        </div>
      ) : (
        <div className="text-center py-4 text-muted-foreground text-sm">
          No work items linked yet
        </div>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowAddDialog(true)}
        className="w-full gap-1.5"
      >
        <Plus className="h-4 w-4" />
        Link Work Item
      </Button>

      <AddWorkContributionDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        keyResultId={keyResultId}
        currentTotal={totalPercent}
      />
    </div>
  );
}

interface AddWorkContributionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  keyResultId: string;
  currentTotal: number;
}

function AddWorkContributionDialog({ open, onOpenChange, keyResultId, currentTotal }: AddWorkContributionDialogProps) {
  const addContribution = useAddWorkContribution();
  
  const [workItemType, setWorkItemType] = useState<'epic' | 'feature'>('epic');
  const [workItemId, setWorkItemId] = useState('');
  const [contributionPercent, setContributionPercent] = useState(Math.min(100 - currentTotal, 100));

  // Fetch available work items based on type
  const { data: workItems } = useQuery({
    queryKey: ['work-items-for-kr', workItemType],
    queryFn: async () => {
      const table = workItemType === 'epic' ? 'epics' : 'features';
      const nameField = workItemType === 'epic' ? 'title' : 'title';
      
      const { data, error } = await supabase
        .from(table)
        .select(`id, ${nameField}`)
        .order(nameField)
        .limit(100);
      
      if (error) throw error;
      return data?.map(item => ({
        id: item.id,
        name: (item as any)[nameField] || item.id,
      }));
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workItemId || contributionPercent <= 0) return;

    const selectedItem = workItems?.find(w => w.id === workItemId);

    await addContribution.mutateAsync({
      key_result_id: keyResultId,
      work_item_id: workItemId,
      work_item_type: workItemType,
      work_item_name: selectedItem?.name,
      contribution_percent: contributionPercent,
    });

    // Reset
    setWorkItemId('');
    setContributionPercent(100 - currentTotal - contributionPercent);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Link Work Item</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Work Item Type</label>
            <Select value={workItemType} onValueChange={(v) => {
              setWorkItemType(v as 'epic' | 'feature');
              setWorkItemId('');
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="epic">Epic</SelectItem>
                <SelectItem value="feature">Feature</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Select {workItemType}</label>
            <Select value={workItemId} onValueChange={setWorkItemId}>
              <SelectTrigger>
                <SelectValue placeholder={`Select ${workItemType}...`} />
              </SelectTrigger>
              <SelectContent>
                {workItems?.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Contribution %</label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="1"
                max={100 - currentTotal}
                value={contributionPercent}
                onChange={(e) => setContributionPercent(parseInt(e.target.value) || 0)}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">
                (Remaining: {100 - currentTotal}%)
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!workItemId || contributionPercent <= 0 || addContribution.isPending}
            >
              {addContribution.isPending ? 'Linking...' : 'Link'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
