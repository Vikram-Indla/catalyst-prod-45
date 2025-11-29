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

  // Calculate summary statistics
  const totalThemes = 1; // From documentation
  const totalEpics = progressData.find(p => p.label === 'Portfolio Objectives')?.total || 0;
  const totalFeatures = progressData.find(p => p.label === 'Program Objectives')?.total || 0;
  
  const acceptedEpics = progressData.find(p => p.label === 'Portfolio Objectives')?.completed || 0;
  const acceptedFeatures = progressData.find(p => p.label === 'Program Objectives')?.completed || 0;

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
            {/* Summary Statistics Table */}
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-semibold">Category</th>
                    <th className="text-center p-3 font-semibold">Themes</th>
                    <th className="text-center p-3 font-semibold">Epics*</th>
                    <th className="text-center p-3 font-semibold">Features*</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="p-3 font-medium text-muted-foreground">Total Count</td>
                    <td className="text-center p-3">{totalThemes}</td>
                    <td className="text-center p-3">{totalEpics}</td>
                    <td className="text-center p-3">{totalFeatures}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-3 font-medium text-muted-foreground">Accepted</td>
                    <td className="text-center p-3">—</td>
                    <td className="text-center p-3 font-semibold">{acceptedEpics}/{totalEpics}</td>
                    <td className="text-center p-3 font-semibold">{acceptedFeatures}/{totalFeatures}</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-muted-foreground">Acceptance %</td>
                    <td className="text-center p-3">—</td>
                    <td className="text-center p-3">
                      <span className="font-bold text-success">
                        {totalEpics > 0 ? Math.round((acceptedEpics / totalEpics) * 100) : 0}%
                      </span>
                    </td>
                    <td className="text-center p-3">
                      <span className="font-bold text-warning">
                        {totalFeatures > 0 ? Math.round((acceptedFeatures / totalFeatures) * 100) : 0}%
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

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
