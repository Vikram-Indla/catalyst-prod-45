import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Info } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SnapshotProgressProps {
  snapshotId?: string;
}

export function SnapshotProgress({ snapshotId }: SnapshotProgressProps) {
  const { data: progressData = [] } = useQuery({
    queryKey: ['snapshot-progress', snapshotId],
    queryFn: async () => {
      if (!snapshotId) return [];

      // Fetch objectives grouped by level
      const { data: objectives, error } = await supabase
        .from('objectives')
        .select('level, status')
        .eq('snapshot_id', snapshotId);

      if (error) throw error;

      // Group by level and calculate completion
      const levels = ['strategic_goal', 'portfolio', 'program', 'team'];
      const levelLabels: Record<string, string> = {
        strategic_goal: 'Strategic Goals',
        portfolio: 'Portfolio Objectives',
        program: 'Program Objectives',
        team: 'Team Objectives',
      };

      return levels.map((level) => {
        const levelObjs = objectives?.filter((o: any) => o.level === level) || [];
        const total = levelObjs.length;
        const completed = levelObjs.filter((o: any) => o.status === 'completed').length;
        const acceptedPercent = total > 0 ? completed / total : 0;

        return {
          label: levelLabels[level],
          total,
          completed,
          acceptedPercent,
        };
      });
    },
    enabled: !!snapshotId,
  });
  const getDonutColor = (percent: number) => {
    if (percent >= 0.7) return 'stroke-green-500';
    if (percent >= 0.4) return 'stroke-orange-500';
    return 'stroke-red-500';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg">Snapshot Progress</CardTitle>
          <Info className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {progressData.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            No progress data available
          </div>
        ) : (
          <>
            {/* Donut Charts Row */}
            <div className="grid grid-cols-3 gap-4">
              {progressData.slice(0, 3).map((item, index) => {
            const percent = Math.round(item.acceptedPercent * 100);
            const circumference = 2 * Math.PI * 40;
            const dashoffset = circumference - (item.acceptedPercent * circumference);

            return (
              <div key={index} className="flex flex-col items-center">
                <div className="text-xs font-medium text-muted-foreground mb-2">{item.label}</div>
                <div className="relative w-24 h-24">
                  <svg className="transform -rotate-90 w-24 h-24">
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      stroke="hsl(var(--muted))"
                      strokeWidth="8"
                      fill="none"
                    />
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      className={getDonutColor(item.acceptedPercent)}
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={circumference}
                      strokeDashoffset={dashoffset}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold">{percent}%</span>
                    <span className="text-xs text-muted-foreground">Accepted</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

            {/* Progress Bars */}
            <div className="space-y-3">
              {progressData.map((item, index) => (
            <div key={index} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-medium">
                  {item.completed} / {item.total}
                </span>
              </div>
              <Progress value={item.acceptedPercent * 100} className="h-2" />
            </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
