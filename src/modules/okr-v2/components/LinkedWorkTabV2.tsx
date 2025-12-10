import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useKeyResultsV2 } from '@/hooks/useKeyResultsV2';
import { useUpdateContributionPercent, useRemoveWorkContribution } from '@/hooks/useKRWorkContributions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Target, Layers, Link2, Plus, Trash2, AlertCircle } from 'lucide-react';
import { KRWorkAlignmentDrawer } from './KRWorkAlignmentDrawer';
import { KeyResultV2 } from '@/hooks/useKeyResultsV2';

interface LinkedWorkTabV2Props {
  objectiveId: string;
}

interface LinkedWorkItem {
  id: string;
  work_item_id: string;
  type: 'epic' | 'feature' | 'story';
  name: string;
  status?: string;
  progress: number;
  contributionPercent: number;
  effectiveContribution: number;
}

interface KRWorkGroup {
  krId: string;
  krName: string;
  krProgress: number;
  workItems: LinkedWorkItem[];
  totalContribution: number;
}

export function LinkedWorkTabV2({ objectiveId }: LinkedWorkTabV2Props) {
  const queryClient = useQueryClient();
  const { data: keyResults, isLoading: isLoadingKRs } = useKeyResultsV2(objectiveId);
  const updatePercent = useUpdateContributionPercent();
  const removeContribution = useRemoveWorkContribution();

  const [editingItem, setEditingItem] = useState<{ id: string; value: number } | null>(null);
  const [unlinkConfirm, setUnlinkConfirm] = useState<{ id: string; krId: string; name: string } | null>(null);
  const [alignDrawerKR, setAlignDrawerKR] = useState<KeyResultV2 | null>(null);

  const krIds = keyResults?.map(kr => kr.id) || [];

  // Fetch all work contributions for this objective's KRs grouped by KR
  const { data: workGroups, isLoading: isLoadingWork } = useQuery({
    queryKey: ['linked-work-v2-grouped', objectiveId, krIds],
    queryFn: async () => {
      if (krIds.length === 0) return [];

      const { data: contributions, error } = await supabase
        .from('kr_work_contributions')
        .select('*')
        .in('key_result_id', krIds);

      if (error) throw error;

      // Group by KR
      const groups: KRWorkGroup[] = [];

      for (const kr of keyResults || []) {
        const krContributions = contributions?.filter(c => c.key_result_id === kr.id) || [];

        // Fetch work item details for this KR's contributions
        const workItems: LinkedWorkItem[] = await Promise.all(
          krContributions.map(async (c) => {
            let name = c.work_item_id;
            let progress = c.calculated_progress || 0;
            let status = '';
            
            if (c.work_item_type === 'epic') {
              const { data } = await supabase.from('epics').select('name, state').eq('id', c.work_item_id).single();
              if (data) {
                name = data.name;
                status = data.state || '';
                if (['done', 'completed', 'closed'].includes(status.toLowerCase())) {
                  progress = 100;
                }
              }
            } else if (c.work_item_type === 'feature') {
              const { data } = await supabase.from('features').select('name, status').eq('id', c.work_item_id).single();
              if (data) {
                name = data.name;
                status = data.status || '';
                if (['done', 'completed', 'closed'].includes(status.toLowerCase())) {
                  progress = 100;
                }
              }
            } else if (c.work_item_type === 'story') {
              const { data } = await supabase.from('stories').select('name, status').eq('id', c.work_item_id).single();
              if (data) {
                name = data.name;
                status = data.status || '';
                if (['done', 'completed', 'closed'].includes(status.toLowerCase())) {
                  progress = 100;
                }
              }
            }

            const contributionPercent = c.contribution_percent || 0;
            const effectiveContribution = Math.round((progress * contributionPercent) / 100);

            return {
              id: c.id,
              work_item_id: c.work_item_id,
              type: c.work_item_type as 'epic' | 'feature' | 'story',
              name,
              status,
              progress,
              contributionPercent,
              effectiveContribution,
            };
          })
        );

        const totalContribution = workItems.reduce((sum, item) => sum + item.contributionPercent, 0);

        // Always include KR in groups (even if no work items) so we can show + Add
        groups.push({
          krId: kr.id,
          krName: kr.summary,
          krProgress: kr.progress,
          workItems,
          totalContribution,
        });
      }

      return groups;
    },
    enabled: krIds.length > 0,
    staleTime: 30000,
  });

  const isLoading = isLoadingKRs || isLoadingWork;

  const handleContributionChange = (id: string, krId: string, value: number) => {
    const clampedValue = Math.max(1, Math.min(100, value));
    updatePercent.mutate(
      { id, keyResultId: krId, percent: clampedValue },
      {
        onSuccess: () => {
          setEditingItem(null);
          queryClient.invalidateQueries({ queryKey: ['linked-work-v2-grouped'] });
          queryClient.invalidateQueries({ queryKey: ['key-results-v2'] });
          queryClient.invalidateQueries({ queryKey: ['objectives-v2'] });
        },
      }
    );
  };

  const handleUnlink = () => {
    if (!unlinkConfirm) return;
    removeContribution.mutate(
      { id: unlinkConfirm.id, keyResultId: unlinkConfirm.krId },
      {
        onSuccess: () => {
          setUnlinkConfirm(null);
          queryClient.invalidateQueries({ queryKey: ['linked-work-v2-grouped'] });
          queryClient.invalidateQueries({ queryKey: ['kr-work-contributions'] });
          queryClient.invalidateQueries({ queryKey: ['key-results-v2'] });
          queryClient.invalidateQueries({ queryKey: ['objectives-v2'] });
        },
      }
    );
  };

  const openAlignDrawer = (krId: string) => {
    const kr = keyResults?.find(k => k.id === krId);
    if (kr) {
      setAlignDrawerKR(kr);
    }
  };

  const getContributionStatus = (total: number) => {
    if (total === 100) return { valid: true, underweight: false, overweight: false };
    if (total > 100) return { valid: false, underweight: false, overweight: true };
    return { valid: false, underweight: true, overweight: false };
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const hasAnyKRs = (workGroups?.length || 0) > 0;
  const hasLinkedWork = workGroups?.some(g => g.workItems.length > 0);

  return (
    <div className="p-6 space-y-6">
      {hasAnyKRs ? (
        <>
          {/* Summary */}
          <div className="text-sm text-muted-foreground">
            Work items linked via Key Results. Edit contributions directly in this tab or from Key Results.
          </div>

          {/* KR groups */}
          {workGroups?.map((group) => {
            const status = getContributionStatus(group.totalContribution);
            const hasWorkItems = group.workItems.length > 0;

            return (
              <div key={group.krId} className="space-y-3">
                {/* KR header */}
                <div className="flex items-center gap-3 pb-2 border-b border-border">
                  <Target className="h-4 w-4 text-brand-gold flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">KR – {group.krName}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Progress value={group.krProgress} className="w-20 h-1.5" />
                    <span className="text-xs text-muted-foreground">{Math.round(group.krProgress)}%</span>
                  </div>
                </div>

                {/* Contribution total indicator */}
                {hasWorkItems && (
                  <div className="flex items-center justify-between text-xs px-1">
                    <span className="text-muted-foreground">Contribution Total</span>
                    <span className={`font-semibold ${status.valid ? 'text-emerald-600' : status.overweight ? 'text-destructive' : 'text-amber-600'}`}>
                      {group.totalContribution}% / 100%
                    </span>
                  </div>
                )}

                {/* Validation warning */}
                {hasWorkItems && !status.valid && (
                  <Alert variant={status.overweight ? "destructive" : "default"} className={`py-2 ${status.underweight ? 'border-amber-400 bg-amber-50 text-amber-800' : ''}`}>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      {status.overweight 
                        ? `Contribution total exceeds 100%. Please adjust.`
                        : `Contribution total is less than 100%. Progress will be underweighted.`
                      }
                    </AlertDescription>
                  </Alert>
                )}

                {/* Work items table */}
                {hasWorkItems && (
                  <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr className="text-left text-xs text-muted-foreground">
                          <th className="px-3 py-2 font-medium">Work Item</th>
                          <th className="px-3 py-2 font-medium w-20">Type</th>
                          <th className="px-3 py-2 font-medium w-24 text-right">Progress</th>
                          <th className="px-3 py-2 font-medium w-28 text-right">Contribution</th>
                          <th className="px-3 py-2 font-medium w-24 text-right">Effective</th>
                          <th className="px-3 py-2 font-medium w-12"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.workItems.map((item) => (
                          <tr key={item.id} className="border-t border-border hover:bg-muted/30">
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                {item.type === 'epic' ? (
                                  <Target className="h-3.5 w-3.5 text-muted-foreground" />
                                ) : item.type === 'feature' ? (
                                  <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                                ) : (
                                  <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                                )}
                                <span className="truncate">{item.name}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <Badge variant="outline" className="text-xs capitalize">
                                {item.type}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Progress value={item.progress} className="w-12 h-1" />
                                <span className="text-xs">{item.progress}%</span>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right">
                              {editingItem?.id === item.id ? (
                                <div className="flex items-center justify-end gap-1">
                                  <Input
                                    type="number"
                                    min={1}
                                    max={100}
                                    autoFocus
                                    value={editingItem.value}
                                    onChange={(e) => setEditingItem({ id: item.id, value: parseInt(e.target.value) || 1 })}
                                    onBlur={() => handleContributionChange(item.id, group.krId, editingItem.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        handleContributionChange(item.id, group.krId, editingItem.value);
                                      } else if (e.key === 'Escape') {
                                        setEditingItem(null);
                                      }
                                    }}
                                    className="w-16 h-7 text-xs text-center"
                                  />
                                  <span className="text-xs">%</span>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setEditingItem({ id: item.id, value: item.contributionPercent })}
                                  className="text-xs px-2 py-1 rounded hover:bg-muted border border-transparent hover:border-border transition-colors cursor-pointer"
                                >
                                  {item.contributionPercent}%
                                </button>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right text-xs font-medium">
                              {item.effectiveContribution}%
                            </td>
                            <td className="px-3 py-2 text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => setUnlinkConfirm({ id: item.id, krId: group.krId, name: item.name })}
                                title="Unlink from Key Result"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Add Work Item CTA */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-dashed"
                  onClick={() => openAlignDrawer(group.krId)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Work Item
                </Button>
              </div>
            );
          })}
        </>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <Link2 className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm font-medium">No Key Results yet</p>
          <p className="text-xs mt-1 max-w-xs mx-auto">
            Create Key Results first, then link work items to track execution.
          </p>
        </div>
      )}

      {/* Unlink confirmation dialog */}
      <AlertDialog open={!!unlinkConfirm} onOpenChange={(open) => !open && setUnlinkConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlink Work Item</AlertDialogTitle>
            <AlertDialogDescription>
              Remove "{unlinkConfirm?.name}" from this Key Result? This will recalculate progress.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnlink} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Unlink
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Align Work Items drawer */}
      <KRWorkAlignmentDrawer
        keyResult={alignDrawerKR}
        open={!!alignDrawerKR}
        onClose={() => {
          setAlignDrawerKR(null);
          queryClient.invalidateQueries({ queryKey: ['linked-work-v2-grouped'] });
        }}
        objectiveId={objectiveId}
      />
    </div>
  );
}
