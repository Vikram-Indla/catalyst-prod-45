import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useKeyResultsV2 } from '@/hooks/useKeyResultsV2';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Target, Layers, Link2 } from 'lucide-react';

interface LinkedWorkTabV2Props {
  objectiveId: string;
}

interface LinkedWorkItem {
  id: string;
  type: 'epic' | 'feature';
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
}

export function LinkedWorkTabV2({ objectiveId }: LinkedWorkTabV2Props) {
  const { data: keyResults, isLoading: isLoadingKRs } = useKeyResultsV2(objectiveId);
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
      const krMap = new Map(keyResults?.map(kr => [kr.id, { name: kr.summary, progress: kr.progress }]) || []);

      for (const kr of keyResults || []) {
        const krContributions = contributions?.filter(c => c.key_result_id === kr.id) || [];
        if (krContributions.length === 0) continue;

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
            }

            const contributionPercent = c.contribution_percent || 0;
            const effectiveContribution = Math.round((progress * contributionPercent) / 100);

            return {
              id: c.id,
              type: c.work_item_type as 'epic' | 'feature',
              name,
              status,
              progress,
              contributionPercent,
              effectiveContribution,
            };
          })
        );

        groups.push({
          krId: kr.id,
          krName: kr.summary,
          krProgress: kr.progress,
          workItems,
        });
      }

      return groups;
    },
    enabled: krIds.length > 0,
    staleTime: 30000,
  });

  const isLoading = isLoadingKRs || isLoadingWork;

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const hasLinkedWork = (workGroups?.length || 0) > 0;

  return (
    <div className="p-6 space-y-6">
      {hasLinkedWork ? (
        <>
          {/* Summary */}
          <div className="text-sm text-muted-foreground">
            Work items linked via Key Results. Edit alignment from the Key Results tab.
          </div>

          {/* KR groups */}
          {workGroups?.map((group) => (
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

              {/* Work items table */}
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Work Item</th>
                      <th className="px-3 py-2 font-medium w-20">Type</th>
                      <th className="px-3 py-2 font-medium w-24 text-right">Progress</th>
                      <th className="px-3 py-2 font-medium w-28 text-right">Contribution</th>
                      <th className="px-3 py-2 font-medium w-24 text-right">Effective</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.workItems.map((item) => (
                      <tr key={item.id} className="border-t border-border hover:bg-muted/30">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            {item.type === 'epic' ? (
                              <Target className="h-3.5 w-3.5 text-muted-foreground" />
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
                        <td className="px-3 py-2 text-right text-xs">
                          {item.contributionPercent}%
                        </td>
                        <td className="px-3 py-2 text-right text-xs font-medium">
                          {item.effectiveContribution}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <Link2 className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm font-medium">No work items linked yet</p>
          <p className="text-xs mt-1 max-w-xs mx-auto">
            Add Epics or Features via the Key Results tab to start tracking execution.
          </p>
        </div>
      )}
    </div>
  );
}
