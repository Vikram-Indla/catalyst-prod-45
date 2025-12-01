import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Info } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SnapshotProgressProps {
  snapshotId?: string;
}

interface StatusRecord {
  status: string | null;
}

interface ObjectiveRecord {
  level: string;
  status: string | null;
}

export function SnapshotProgress({ snapshotId }: SnapshotProgressProps) {
  const { data: progressData, isLoading } = useQuery({
    queryKey: ['snapshot-progress', snapshotId],
    queryFn: async () => {
      if (!snapshotId) return null;

      // Fetch all data - using @ts-ignore to bypass deep type inference issues
      // @ts-ignore
      const themesQuery = await supabase.from('strategic_themes').select('status').eq('is_active', true);
      // @ts-ignore
      const epicsQuery = await supabase.from('epics').select('status').is('deleted_at', null);
      // @ts-ignore
      const featuresQuery = await supabase.from('features').select('status').is('deleted_at', null);
      // @ts-ignore
      const objectivesQuery = await supabase.from('objectives').select('level, status').eq('snapshot_id', snapshotId);

      const themes = (themesQuery.data as StatusRecord[]) || [];
      const epics = (epicsQuery.data as StatusRecord[]) || [];
      const features = (featuresQuery.data as StatusRecord[]) || [];
      const objectives = (objectivesQuery.data as ObjectiveRecord[]) || [];

      // Calculate stats
      const totalThemes = themes.length;
      const acceptedThemes = themes.filter(t => t.status === 'done').length;
      const totalEpics = epics.length;
      const acceptedEpics = epics.filter(e => e.status === 'done').length;
      const totalFeatures = features.length;
      const acceptedFeatures = features.filter(f => f.status === 'done').length;

      // Group objectives
      const levels = ['strategic_goal', 'portfolio', 'program', 'team'];
      const levelLabels: Record<string, string> = {
        strategic_goal: 'Strategic Goals',
        portfolio: 'Portfolio Objectives',
        program: 'Program Objectives',
        team: 'Team Objectives',
      };

      const objectivesByLevel = levels.map(level => {
        const levelObjs = objectives.filter(o => o.level === level);
        const total = levelObjs.length;
        const completed = levelObjs.filter(o => o.status === 'on_track').length;
        return {
          label: levelLabels[level],
          total,
          completed,
          acceptedPercent: total > 0 ? completed / total : 0,
        };
      });

      return {
        themes: { total: totalThemes, accepted: acceptedThemes },
        epics: { total: totalEpics, accepted: acceptedEpics },
        features: { total: totalFeatures, accepted: acceptedFeatures },
        objectives: objectivesByLevel,
      };
    },
    enabled: !!snapshotId,
  });

  const getDonutColor = (percent: number) => {
    if (percent >= 0.7) return 'hsl(var(--success))';
    if (percent >= 0.4) return 'hsl(var(--warning))';
    return 'hsl(var(--destructive))';
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
        {isLoading ? (
          <div className="text-center py-6 text-sm text-muted-foreground">Loading progress data...</div>
        ) : !progressData ? (
          <div className="text-center py-6 text-sm text-muted-foreground">No progress data available</div>
        ) : (
          <>
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
                    <td className="text-center p-3">{progressData.themes.total}</td>
                    <td className="text-center p-3">{progressData.epics.total}</td>
                    <td className="text-center p-3">{progressData.features.total}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-3 font-medium text-muted-foreground">Accepted</td>
                    <td className="text-center p-3">—</td>
                    <td className="text-center p-3 font-semibold">{progressData.epics.accepted}/{progressData.epics.total}</td>
                    <td className="text-center p-3 font-semibold">{progressData.features.accepted}/{progressData.features.total}</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-muted-foreground">Acceptance %</td>
                    <td className="text-center p-3">—</td>
                    <td className="text-center p-3">
                      <span className="font-bold" style={{ color: 'hsl(var(--success))' }}>
                        {progressData.epics.total > 0 ? Math.round((progressData.epics.accepted / progressData.epics.total) * 100) : 0}%
                      </span>
                    </td>
                    <td className="text-center p-3">
                      <span className="font-bold" style={{ color: 'hsl(var(--warning))' }}>
                        {progressData.features.total > 0 ? Math.round((progressData.features.accepted / progressData.features.total) * 100) : 0}%
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {progressData.objectives.slice(0, 3).map((item, index) => {
                const percent = Math.round(item.acceptedPercent * 100);
                const circumference = 2 * Math.PI * 40;
                const dashoffset = circumference - (item.acceptedPercent * circumference);
                return (
                  <div key={index} className="flex flex-col items-center">
                    <div className="text-xs font-medium text-muted-foreground mb-2">{item.label}</div>
                    <div className="relative w-24 h-24">
                      <svg className="transform -rotate-90 w-24 h-24">
                        <circle cx="48" cy="48" r="40" stroke="hsl(var(--muted))" strokeWidth="8" fill="none" />
                        <circle cx="48" cy="48" r="40" stroke={getDonutColor(item.acceptedPercent)} strokeWidth="8" fill="none" strokeDasharray={circumference} strokeDashoffset={dashoffset} strokeLinecap="round" />
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

            <div className="space-y-3">
              {progressData.objectives.map((item, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-medium">{item.completed} / {item.total}</span>
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
