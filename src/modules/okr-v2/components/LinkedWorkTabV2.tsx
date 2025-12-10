import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useKeyResultsV2 } from '@/hooks/useKeyResultsV2';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Target, Layers } from 'lucide-react';

interface LinkedWorkTabV2Props {
  objectiveId: string;
}

interface LinkedWorkItem {
  id: string;
  type: 'epic' | 'feature';
  name: string;
  status?: string;
  progress: number;
  krName: string;
  contributionPercent: number;
}

export function LinkedWorkTabV2({ objectiveId }: LinkedWorkTabV2Props) {
  const { data: keyResults } = useKeyResultsV2(objectiveId);
  const krIds = keyResults?.map(kr => kr.id) || [];

  // Fetch all work contributions for this objective's KRs
  const { data: linkedWork, isLoading } = useQuery({
    queryKey: ['linked-work-v2', objectiveId, krIds],
    queryFn: async () => {
      if (krIds.length === 0) return [];

      const { data: contributions, error } = await supabase
        .from('kr_work_contributions')
        .select('*')
        .in('key_result_id', krIds);

      if (error) throw error;

      // Map contributions to linked work items with KR names
      const krMap = new Map(keyResults?.map(kr => [kr.id, kr.summary]) || []);

      return (contributions || []).map(c => ({
        id: c.id,
        type: c.work_item_type as 'epic' | 'feature',
        name: c.work_item_name || c.work_item_id,
        progress: c.calculated_progress || 0,
        krName: krMap.get(c.key_result_id) || 'Unknown KR',
        contributionPercent: c.contribution_percent || 0,
      })) as LinkedWorkItem[];
    },
    enabled: krIds.length > 0,
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  // Group by work item type
  const epics = linkedWork?.filter(w => w.type === 'epic') || [];
  const features = linkedWork?.filter(w => w.type === 'feature') || [];

  const hasLinkedWork = (linkedWork?.length || 0) > 0;

  return (
    <div className="p-6 space-y-6">
      {hasLinkedWork ? (
        <>
          {/* Summary */}
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Target className="h-4 w-4" />
              <span>{epics.length} Epics</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Layers className="h-4 w-4" />
              <span>{features.length} Features</span>
            </div>
          </div>

          {/* Epics section */}
          {epics.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Target className="h-4 w-4 text-brand-gold" />
                Epics
              </h4>
              <div className="space-y-2">
                {epics.map((item) => (
                  <WorkItemCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          )}

          {/* Features section */}
          {features.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Layers className="h-4 w-4 text-brand-gold" />
                Features
              </h4>
              <div className="space-y-2">
                {features.map((item) => (
                  <WorkItemCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Target className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No work items linked yet</p>
          <p className="text-xs mt-1">
            Link epics and features to key results to track execution
          </p>
        </div>
      )}
    </div>
  );
}

interface WorkItemCardProps {
  item: LinkedWorkItem;
}

function WorkItemCard({ item }: WorkItemCardProps) {
  return (
    <div className="p-3 bg-card border border-border rounded-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs capitalize">
              {item.type}
            </Badge>
            <span className="text-sm font-medium truncate">{item.name}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Linked to: {item.krName} ({item.contributionPercent}%)
          </div>
        </div>

        <div className="flex-shrink-0 w-24 text-right">
          <div className="text-xs text-muted-foreground mb-1">Progress</div>
          <div className="flex items-center gap-2">
            <Progress value={item.progress} className="h-1.5 flex-1" />
            <span className="text-xs font-medium">{item.progress}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
