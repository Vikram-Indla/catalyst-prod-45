import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown } from "lucide-react";

interface ExecutionAgainstOutcomesWidgetProps {
  snapshotId?: string;
  piIds: string[];
}

export function ExecutionAgainstOutcomesWidget({ snapshotId, piIds }: ExecutionAgainstOutcomesWidgetProps) {
  const { data: executionData, isLoading } = useQuery({
    queryKey: ['execution-against-outcomes', snapshotId, piIds],
    queryFn: async () => {
      if (!snapshotId) return null;

      // Fetch objectives with their key results
      const { data: objectives, error } = await supabase
        .from('objectives')
        .select(`
          id, 
          summary,
          level,
          program_increment_ids
        `)
        .eq('snapshot_id', snapshotId);

      if (error) throw error;

      // Fetch key results for these objectives
      const objectiveIds = objectives?.map((obj: any) => obj.id) || [];
      const { data: keyResults } = await supabase
        .from('key_results')
        .select('objective_id, current_value, target_value')
        .in('objective_id', objectiveIds);

      // Filter objectives relevant to selected PIs
      const relevantObjectives = objectives?.filter((obj: any) => {
        if (obj.level === 'strategic_goal') return true; // Strategic always included
        const objPiIds = Array.isArray(obj.program_increment_ids) 
          ? obj.program_increment_ids.map((id: any) => String(id)) 
          : [];
        return piIds.some((piId) => objPiIds.includes(piId));
      }) || [];

      // Calculate work progress and key result progress for each objective
      const objectivesWithProgress = relevantObjectives.map((obj: any) => {
        const objKeyResults = keyResults?.filter((kr: any) => kr.objective_id === obj.id) || [];
        
        // Calculate key result progress
        const krProgress = objKeyResults.length > 0
          ? objKeyResults.reduce((sum: number, kr: any) => {
              const progress = kr.target_value > 0 
                ? Math.min(1, kr.current_value / kr.target_value) 
                : 0;
              return sum + progress;
            }, 0) / objKeyResults.length
          : 0;

        return {
          ...obj,
          key_result_progress: krProgress,
          work_progress: krProgress, // For now, work progress = key result progress
        };
      });

      // Calculate aggregate metrics
      const totalObjectives = objectivesWithProgress.length;
      const avgWorkProgress = totalObjectives > 0
        ? objectivesWithProgress.reduce((sum: number, obj: any) => sum + (obj.work_progress || 0), 0) / totalObjectives
        : 0;
      const avgKRProgress = totalObjectives > 0
        ? objectivesWithProgress.reduce((sum: number, obj: any) => sum + (obj.key_result_progress || 0), 0) / totalObjectives
        : 0;

      // Calculate gap (execution vs outcomes)
      const gap = (avgWorkProgress - avgKRProgress) * 100;

      return {
        totalObjectives,
        avgWorkProgress: Math.round(avgWorkProgress * 100),
        avgKRProgress: Math.round(avgKRProgress * 100),
        gap: Math.round(gap),
        topObjectives: objectivesWithProgress
          .sort((a: any, b: any) => (b.key_result_progress || 0) - (a.key_result_progress || 0))
          .slice(0, 5),
      };
    },
    enabled: !!snapshotId && piIds.length > 0,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Execution Against Outcomes</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : !executionData ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            No data available
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Work Progress</div>
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold">{executionData.avgWorkProgress}%</div>
                  <Badge variant="outline" className="text-xs">
                    {executionData.totalObjectives} OKRs
                  </Badge>
                </div>
                <Progress value={executionData.avgWorkProgress} className="h-2" />
              </div>

              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Key Results</div>
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold">{executionData.avgKRProgress}%</div>
                  {executionData.gap > 5 ? (
                    <TrendingUp className="h-4 w-4 text-success" />
                  ) : executionData.gap < -5 ? (
                    <TrendingDown className="h-4 w-4 text-destructive" />
                  ) : null}
                </div>
                <Progress value={executionData.avgKRProgress} className="h-2" />
              </div>
            </div>

            {/* Gap Indicator */}
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Execution Gap</span>
                <span className={`text-sm font-bold ${
                  executionData.gap > 5 ? 'text-success' : 
                  executionData.gap < -5 ? 'text-destructive' : 
                  'text-muted-foreground'
                }`}>
                  {executionData.gap > 0 ? '+' : ''}{executionData.gap}%
                </span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {Math.abs(executionData.gap) < 5 ? 'Aligned' : 
                 executionData.gap > 0 ? 'Work ahead of outcomes' : 
                 'Outcomes ahead of work'}
              </div>
            </div>

            {/* Top Objectives */}
            <div className="space-y-2">
              <div className="text-xs font-medium">Top Performing OKRs</div>
              {executionData.topObjectives.map((obj: any) => (
                <div key={obj.id} className="flex items-center justify-between text-xs">
                  <span className="truncate flex-1">{obj.summary}</span>
                  <Badge variant="outline" className="text-[10px] ml-2">
                    {Math.round((obj.key_result_progress || 0) * 100)}%
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
