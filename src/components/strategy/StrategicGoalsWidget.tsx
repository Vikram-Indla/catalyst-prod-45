import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Target, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface StrategicGoalsWidgetProps {
  snapshotId?: string;
}

export function StrategicGoalsWidget({ snapshotId }: StrategicGoalsWidgetProps) {
  const { data: goalsData = [] } = useQuery({
    queryKey: ['strategic-goals', snapshotId],
    queryFn: async () => {
      if (!snapshotId) return [];

      const { data: goals, error } = await supabase
        .from('goals')
        .select('id, title, status')
        .eq('snapshot_id', snapshotId)
        .eq('level', 'strategic_goal')
        .limit(4);

      if (error) throw error;

      // Calculate progress for each goal
      return goals?.map(goal => ({
        ...goal,
        progress: goal.status === 'completed' ? 100 : 
                 goal.status === 'on_track' ? 66 :
                 goal.status === 'at_risk' ? 40 : 20
      })) || [];
    },
    enabled: !!snapshotId,
  });

  const avgProgress = goalsData.length > 0
    ? Math.round(goalsData.reduce((sum, g) => sum + g.progress, 0) / goalsData.length)
    : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Strategic Goals</CardTitle>
          </div>
          <div className="flex items-center gap-1 text-sm">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <span className="font-semibold">{avgProgress}%</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {goalsData.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            No strategic goals defined
          </div>
        ) : (
          <div className="space-y-4">
            {goalsData.map((goal) => (
              <div key={goal.id} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium truncate flex-1">{goal.title}</span>
                  <span className="text-muted-foreground ml-2">{goal.progress}%</span>
                </div>
                <Progress value={goal.progress} className="h-2" />
              </div>
            ))}
            
            <div className="pt-3 mt-3 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold">Overall Progress</span>
                <span className="font-bold text-primary">{avgProgress}%</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
