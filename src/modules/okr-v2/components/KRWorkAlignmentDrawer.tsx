import { useState, useEffect } from 'react';
import { useKRWorkContributions, useAddWorkContribution, useUpdateContributionPercent, useRemoveWorkContribution, KRWorkContribution } from '@/hooks/useKRWorkContributions';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logAuditEntry } from '@/lib/auditLogger';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, AlertCircle, Link2, Target, Layers } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { KeyResultV2 } from '@/hooks/useKeyResultsV2';

interface KRWorkAlignmentDrawerProps {
  keyResult: KeyResultV2 | null;
  open: boolean;
  onClose: () => void;
  objectiveId: string;
}

interface LocalContribution {
  id?: string;
  work_item_id: string;
  work_item_type: 'epic' | 'feature';
  work_item_name: string;
  contribution_percent: number;
  calculated_progress: number;
  isNew?: boolean;
  isDeleted?: boolean;
}

export function KRWorkAlignmentDrawer({ keyResult, open, onClose, objectiveId }: KRWorkAlignmentDrawerProps) {
  const queryClient = useQueryClient();
  const { data: contributions, isLoading } = useKRWorkContributions(keyResult?.id);
  const addContribution = useAddWorkContribution();
  const updatePercent = useUpdateContributionPercent();
  const removeContribution = useRemoveWorkContribution();

  const [localContributions, setLocalContributions] = useState<LocalContribution[]>([]);
  const [showAddSection, setShowAddSection] = useState(false);
  const [workItemType, setWorkItemType] = useState<'epic' | 'feature'>('epic');
  const [selectedWorkItemId, setSelectedWorkItemId] = useState('');
  const [newContributionPercent, setNewContributionPercent] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // Sync local state when contributions load
  useEffect(() => {
    if (contributions) {
      setLocalContributions(contributions.map(c => ({
        id: c.id,
        work_item_id: c.work_item_id,
        work_item_type: c.work_item_type as 'epic' | 'feature',
        work_item_name: c.work_item_name || c.work_item_id,
        contribution_percent: c.contribution_percent,
        calculated_progress: c.calculated_progress,
        isNew: false,
        isDeleted: false,
      })));
    }
  }, [contributions]);

  // Fetch available work items
  const { data: workItems } = useQuery({
    queryKey: ['work-items-for-alignment', workItemType],
    queryFn: async () => {
      if (workItemType === 'epic') {
        const { data, error } = await supabase
          .from('epics')
          .select('id, name, state')
          .order('name')
          .limit(100);
        if (error) throw error;
        return data?.map(item => ({ id: item.id, name: item.name || item.id, status: item.state })) || [];
      } else {
        const { data, error } = await supabase
          .from('features')
          .select('id, name, status')
          .order('name')
          .limit(100);
        if (error) throw error;
        return data?.map(item => ({ id: item.id, name: item.name || item.id, status: item.status })) || [];
      }
    },
    enabled: showAddSection,
  });

  const activeContributions = localContributions.filter(c => !c.isDeleted);
  const totalPercent = activeContributions.reduce((sum, c) => sum + c.contribution_percent, 0);
  const remainingPercent = 100 - totalPercent;
  const isValidTotal = totalPercent === 100;
  const isUnderweight = totalPercent > 0 && totalPercent < 100;
  const isOverweight = totalPercent > 100;

  // Calculate default contribution for new items
  // First item gets 100%, subsequent items get remaining %
  useEffect(() => {
    if (activeContributions.length === 0) {
      setNewContributionPercent(100);
    } else {
      setNewContributionPercent(Math.max(1, remainingPercent));
    }
  }, [remainingPercent, activeContributions.length]);

  const handleAddWorkItem = () => {
    if (!selectedWorkItemId || newContributionPercent <= 0) return;

    // Check if already linked
    const alreadyLinked = activeContributions.some(c => c.work_item_id === selectedWorkItemId);
    if (alreadyLinked) {
      return; // Don't add duplicates
    }

    const selectedItem = workItems?.find(w => w.id === selectedWorkItemId);
    
    // Calculate progress from status
    let progress = 0;
    const status = selectedItem?.status?.toLowerCase() || '';
    if (['done', 'completed', 'closed'].includes(status)) {
      progress = 100;
    }

    setLocalContributions(prev => [...prev, {
      work_item_id: selectedWorkItemId,
      work_item_type: workItemType,
      work_item_name: selectedItem?.name || selectedWorkItemId,
      contribution_percent: newContributionPercent,
      calculated_progress: progress,
      isNew: true,
    }]);

    setSelectedWorkItemId('');
    setShowAddSection(false);
  };

  const handleRemove = (index: number) => {
    setLocalContributions(prev => {
      const updated = [...prev];
      if (updated[index].isNew) {
        // Remove completely if it's a new item
        updated.splice(index, 1);
      } else {
        // Mark as deleted if it's an existing item
        updated[index] = { ...updated[index], isDeleted: true };
      }
      return updated;
    });
  };

  const handlePercentChange = (index: number, value: number) => {
    setLocalContributions(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], contribution_percent: value };
      return updated;
    });
  };

  const handleSave = async () => {
    if (!keyResult) return;
    if (isOverweight) return; // Block save if over 100%

    setIsSaving(true);
    try {
      // Process deletions
      const toDelete = localContributions.filter(c => c.isDeleted && c.id);
      for (const item of toDelete) {
        await removeContribution.mutateAsync({ id: item.id!, keyResultId: keyResult.id });
        await logAuditEntry({
          entityType: 'key_result',
          entityId: keyResult.id,
          action: 'updated',
          beforeData: { work_item_unlinked: item.work_item_id, work_item_name: item.work_item_name },
          afterData: null,
        });
      }

      // Process new additions
      const toAdd = localContributions.filter(c => c.isNew && !c.isDeleted);
      for (const item of toAdd) {
        await addContribution.mutateAsync({
          key_result_id: keyResult.id,
          work_item_id: item.work_item_id,
          work_item_type: item.work_item_type,
          work_item_name: item.work_item_name,
          contribution_percent: item.contribution_percent,
        });
        await logAuditEntry({
          entityType: 'key_result',
          entityId: keyResult.id,
          action: 'updated',
          beforeData: null,
          afterData: { work_item_linked: item.work_item_id, work_item_name: item.work_item_name, contribution_percent: item.contribution_percent },
        });
      }

      // Process updates
      const original = contributions || [];
      const toUpdate = localContributions.filter(c => !c.isNew && !c.isDeleted && c.id);
      for (const item of toUpdate) {
        const originalItem = original.find(o => o.id === item.id);
        if (originalItem && originalItem.contribution_percent !== item.contribution_percent) {
          await updatePercent.mutateAsync({
            id: item.id!,
            keyResultId: keyResult.id,
            percent: item.contribution_percent,
          });
          await logAuditEntry({
            entityType: 'key_result',
            entityId: keyResult.id,
            action: 'updated',
            beforeData: { work_item: item.work_item_name, contribution_percent: originalItem.contribution_percent },
            afterData: { work_item: item.work_item_name, contribution_percent: item.contribution_percent },
          });
        }
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['kr-work-contributions'] });
      queryClient.invalidateQueries({ queryKey: ['key-results-v2'] });
      queryClient.invalidateQueries({ queryKey: ['objectives-v2'] });
      queryClient.invalidateQueries({ queryKey: ['linked-work-v2'] });

      onClose();
    } catch (error) {
      console.error('Failed to save work alignment:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!keyResult) return null;

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-full sm:max-w-[500px] flex flex-col p-0">
        <SheetHeader className="px-6 py-5 border-b border-border bg-card">
          <div className="flex items-center gap-2 mb-1">
            <Link2 className="h-4 w-4 text-brand-gold" />
            <SheetTitle className="text-base">Align Work Items</SheetTitle>
          </div>
          <SheetDescription className="text-sm">
            {keyResult.summary}
          </SheetDescription>
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">KR Progress</span>
              <span className="font-medium">{Math.round(keyResult.progress)}%</span>
            </div>
            <Progress value={keyResult.progress} className="h-2" />
          </div>
          <div className="mt-3 flex items-center justify-between text-sm border-t border-border pt-3">
            <span className="text-muted-foreground">Contribution Total</span>
            <span className={`font-semibold ${isValidTotal ? 'text-emerald-600' : isOverweight ? 'text-destructive' : 'text-amber-600'}`}>
              {totalPercent}% / 100%
            </span>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-auto px-6 py-4 space-y-4">
          {/* Validation warning */}
          {activeContributions.length > 0 && !isValidTotal && (
            <Alert variant={isOverweight ? "destructive" : "default"} className={`py-2 ${isUnderweight ? 'border-amber-400 bg-amber-50 text-amber-800' : ''}`}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                {isOverweight 
                  ? `Contribution total exceeds 100%. Please adjust.`
                  : `Contribution total is less than 100%. Progress will be underweighted.`
                }
              </AlertDescription>
            </Alert>
          )}

          {/* Existing contributions list */}
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : activeContributions.length > 0 ? (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Linked Work Items ({activeContributions.length})
              </div>
              {activeContributions.map((contribution, index) => (
                <div
                  key={contribution.id || `new-${index}`}
                  className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {contribution.work_item_type === 'epic' ? (
                        <Target className="h-3.5 w-3.5 text-brand-gold" />
                      ) : (
                        <Layers className="h-3.5 w-3.5 text-brand-gold" />
                      )}
                      <Badge variant="outline" className="text-xs capitalize">
                        {contribution.work_item_type}
                      </Badge>
                      {contribution.isNew && (
                        <Badge variant="secondary" className="text-xs">New</Badge>
                      )}
                    </div>
                    <span className="text-sm font-medium block truncate">
                      {contribution.work_item_name}
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">Progress:</span>
                      <Progress value={contribution.calculated_progress} className="w-16 h-1" />
                      <span className="text-xs text-muted-foreground">{contribution.calculated_progress}%</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <div className="relative flex items-center">
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        step={1}
                        value={contribution.contribution_percent}
                        onChange={(e) => handlePercentChange(
                          localContributions.indexOf(contribution),
                          Math.max(1, Math.min(100, parseInt(e.target.value) || 1))
                        )}
                        className="w-[70px] h-9 text-center text-sm pr-6 border-border focus:border-brand-gold"
                      />
                      <span className="absolute right-2.5 text-sm text-muted-foreground pointer-events-none">%</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemove(localContributions.indexOf(contribution))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Link2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No work items linked yet</p>
              <p className="text-xs mt-1">Add Epics or Features to track execution</p>
            </div>
          )}

          {/* Add work item section */}
          {showAddSection ? (
            <div className="border border-border rounded-lg p-4 space-y-3 bg-card">
              <div className="text-sm font-medium">Add Work Item</div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Type</label>
                  <Select value={workItemType} onValueChange={(v) => {
                    setWorkItemType(v as 'epic' | 'feature');
                    setSelectedWorkItemId('');
                  }}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="epic">Epic</SelectItem>
                      <SelectItem value="feature">Feature</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Contribution %</label>
                  <Input
                    type="number"
                    min="1"
                    max={remainingPercent}
                    value={newContributionPercent}
                    onChange={(e) => setNewContributionPercent(Math.max(1, parseInt(e.target.value) || 0))}
                    className="h-9"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Select {workItemType}</label>
                <Select value={selectedWorkItemId} onValueChange={setSelectedWorkItemId}>
                  <SelectTrigger>
                    <SelectValue placeholder={`Select ${workItemType}...`} />
                  </SelectTrigger>
                  <SelectContent>
                    {workItems?.filter(item => !activeContributions.some(c => c.work_item_id === item.id)).map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddSection(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddWorkItem}
                  disabled={!selectedWorkItemId || newContributionPercent <= 0}
                  className="flex-1"
                >
                  Add
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={() => setShowAddSection(true)}
              className="w-full gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Add Work Item
            </Button>
          )}
        </div>

        <SheetFooter className="px-6 py-4 border-t border-border bg-card">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isOverweight || isSaving || activeContributions.length === 0}
          >
            {isSaving ? 'Saving...' : 'Save Alignment'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
