import { Card, CardContent } from '@/components/ui/card';
import { Loader2, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface WorkTreeDashboardProps {
  view: 'top-down' | 'bottom-up' | 'team';
  data: any;
  isLoading: boolean;
  teamId?: string;
}

export function WorkTreeDashboard({ view, data, isLoading, teamId }: WorkTreeDashboardProps) {
  // Fetch current PI for "Days Left" calculation
  const { data: currentPI } = useQuery({
    queryKey: ['current-pi-for-work-tree'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('program_increments')
        .select('id, name, start_date, end_date')
        .lte('start_date', today)
        .gte('end_date', today)
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Calculate days left in PI
  const daysLeft = currentPI?.end_date 
    ? Math.max(0, Math.ceil((new Date(currentPI.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  // Calculate story points accepted percentage
  const storyPointsTotal = data?.storyPointsTotal || 0;
  const storyPointsAccepted = data?.storyPointsAccepted || 0;
  const storyPointsAcceptedPct = storyPointsTotal > 0 
    ? Math.round((storyPointsAccepted / storyPointsTotal) * 100) 
    : 0;

  // 4 progress donuts: Epic, Feature, Story, Task (NO Capability per hard guardrail)
  const metrics = [
    {
      label: 'Epic Progress',
      total: data?.epicTotal || 0,
      completed: data?.epicCompleted || 0,
      progress: data?.epicTotal ? Math.round((data.epicCompleted / data.epicTotal) * 100) : 0,
      subtext: `${data?.epicCompleted || 0} out of ${data?.epicTotal || 0} Epics accepted.`
    },
    {
      label: 'Feature Progress',
      total: data?.featureTotal || 0,
      completed: data?.featureCompleted || 0,
      progress: data?.featureTotal ? Math.round((data.featureCompleted / data.featureTotal) * 100) : 0,
      subtext: `${data?.featureCompleted || 0} out of ${data?.featureTotal || 0} Features accepted.`
    },
    {
      label: 'Story Progress',
      total: data?.storyTotal || 0,
      completed: data?.storyCompleted || 0,
      progress: data?.storyTotal ? Math.round((data.storyCompleted / data.storyTotal) * 100) : 0,
      subtext: `${data?.storyCompleted || 0} out of ${data?.storyTotal || 0} Stories accepted`
    },
    {
      label: 'Task Progress',
      total: data?.taskTotal || 0,
      completed: data?.taskCompleted || 0,
      progress: data?.taskTotal ? Math.round((data.taskCompleted / data.taskTotal) * 100) : 0,
      subtext: `${data?.taskCompleted || 0} out of ${data?.taskTotal || 0} Tasks done`
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
      {/* PI Days Left Card - Only show in Team View */}
      {view === 'team' && (
        <Card className="border-r-4 border-r-brand-gold">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-brand-gold uppercase">
                PROGRAM INCREMENT: {currentPI?.name || 'N/A'}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Days Left</div>
                <div className="text-4xl font-bold">{daysLeft}</div>
              </div>
              <div className="flex-1">
                {/* Mini gauge for story points */}
                <div className="relative h-16 flex items-center justify-center">
                  <div className="relative w-14 h-14">
                    <svg className="w-full h-full" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="hsl(var(--muted))"
                        strokeWidth="8"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="hsl(var(--brand-gold))"
                        strokeWidth="8"
                        strokeDasharray={`${storyPointsAcceptedPct * 2.51} 251`}
                        strokeLinecap="round"
                        transform="rotate(-90 50 50)"
                      />
                    </svg>
                  </div>
                </div>
                <div className="text-xs text-center text-muted-foreground mt-1">
                  % Story points accepted
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress Metrics */}
      {metrics.map((metric) => (
        <Card key={metric.label}>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{metric.label}</span>
              <button className="text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            </div>
            <div className="relative h-20 flex items-center justify-center">
              <div className="relative w-16 h-16">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="hsl(var(--muted))"
                    strokeWidth="10"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="hsl(var(--brand-gold))"
                    strokeWidth="10"
                    strokeDasharray={`${metric.progress * 2.51} 251`}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-semibold">{metric.progress}%</span>
                </div>
              </div>
            </div>
            <div className="text-xs text-center text-muted-foreground">
              {metric.subtext}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
