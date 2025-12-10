import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Info } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOKRv2StrategyMetrics } from '@/hooks/useOKRv2StrategyMetrics';

interface SnapshotProgressProps {
  snapshotId?: string;
}

interface StatusRecord {
  status: string | null;
}

export function SnapshotProgress({ snapshotId }: SnapshotProgressProps) {
  // Fetch themes, epics, features progress
  const { data: progressData, isLoading } = useQuery({
    queryKey: ['snapshot-progress', snapshotId],
    queryFn: async () => {
      if (!snapshotId) return null;

      // Fetch all data - using @ts-ignore to bypass deep type inference issues
      // @ts-ignore
      const themesQuery = await supabase.from('strategic_themes').select('status').eq('snapshot_id', snapshotId);
      // @ts-ignore
      const epicsQuery = await supabase.from('epics').select('status').is('deleted_at', null);
      // @ts-ignore
      const featuresQuery = await supabase.from('features').select('status').is('deleted_at', null);

      const themes = (themesQuery.data as StatusRecord[]) || [];
      const epics = (epicsQuery.data as StatusRecord[]) || [];
      const features = (featuresQuery.data as StatusRecord[]) || [];

      // Calculate stats
      const totalThemes = themes.length;
      const acceptedThemes = themes.filter(t => t.status === 'done').length;
      const totalEpics = epics.length;
      const acceptedEpics = epics.filter(e => e.status === 'done').length;
      const totalFeatures = features.length;
      const acceptedFeatures = features.filter(f => f.status === 'done').length;

      return {
        themes: { total: totalThemes, accepted: acceptedThemes },
        epics: { total: totalEpics, accepted: acceptedEpics },
        features: { total: totalFeatures, accepted: acceptedFeatures },
      };
    },
    enabled: !!snapshotId,
  });

  // Fetch OKR v2 objectives metrics
  const { data: okrMetrics, isLoading: okrLoading } = useOKRv2StrategyMetrics(snapshotId);

  const getDonutColor = (percent: number) => {
    if (percent >= 70) return 'hsl(var(--success))';
    if (percent >= 40) return 'hsl(var(--warning))';
    return 'hsl(var(--destructive))';
  };

  // Calculate accepted objectives (completed/accepted status)
  const acceptedObjectives = okrMetrics?.objectives.filter(obj => 
    ['completed', 'accepted', 'done', 'closed'].includes(obj.status?.toLowerCase() || '')
  ).length || 0;
  const totalObjectives = okrMetrics?.count || 0;
  const objectivesAcceptedPercent = totalObjectives > 0 
    ? Math.round((acceptedObjectives / totalObjectives) * 100) 
    : 0;

  return (
    <Card className="border-l-4 border-l-brand-gold">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg">Snapshot Progress</CardTitle>
          <Info className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading || okrLoading ? (
          <div className="text-center py-6 text-sm text-muted-foreground">Loading progress data...</div>
        ) : !progressData ? (
          <div className="text-center py-6 text-sm text-muted-foreground">No progress data available</div>
        ) : (
          <>
            {/* Category Table */}
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
                      <span className="font-bold" style={{ color: progressData.epics.total > 0 ? getDonutColor(Math.round((progressData.epics.accepted / progressData.epics.total) * 100)) : 'hsl(var(--muted-foreground))' }}>
                        {progressData.epics.total > 0 ? Math.round((progressData.epics.accepted / progressData.epics.total) * 100) : 0}%
                      </span>
                    </td>
                    <td className="text-center p-3">
                      <span className="font-bold" style={{ color: progressData.features.total > 0 ? getDonutColor(Math.round((progressData.features.accepted / progressData.features.total) * 100)) : 'hsl(var(--muted-foreground))' }}>
                        {progressData.features.total > 0 ? Math.round((progressData.features.accepted / progressData.features.total) * 100) : 0}%
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Single Objectives KPI Circle */}
            <div className="flex justify-center">
              <div className="flex flex-col items-center">
                <div className="text-xs font-medium text-muted-foreground mb-2">Objectives</div>
                <div className="relative w-24 h-24">
                  <svg className="transform -rotate-90 w-24 h-24">
                    <circle cx="48" cy="48" r="40" stroke="hsl(var(--muted))" strokeWidth="8" fill="none" />
                    <circle 
                      cx="48" 
                      cy="48" 
                      r="40" 
                      stroke={getDonutColor(objectivesAcceptedPercent)} 
                      strokeWidth="8" 
                      fill="none" 
                      strokeDasharray={2 * Math.PI * 40} 
                      strokeDashoffset={(2 * Math.PI * 40) - ((objectivesAcceptedPercent / 100) * (2 * Math.PI * 40))} 
                      strokeLinecap="round" 
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold">{objectivesAcceptedPercent}%</span>
                    <span className="text-xs text-muted-foreground">Accepted</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Single Objectives Progress Bar */}
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Objectives</span>
                  <span className="font-medium">{acceptedObjectives} / {totalObjectives}</span>
                </div>
                <Progress value={objectivesAcceptedPercent} className="h-2" />
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
