import { Card, CardContent } from '@/components/ui/card';
import { Loader2, X } from 'lucide-react';

interface WorkTreeDashboardProps {
  view: 'top-down' | 'bottom-up' | 'team';
  data: any;
  isLoading: boolean;
  teamId?: string;
  currentPI?: { id: string; name: string; end_date: string } | null;
  hiddenCards: string[];
  onHideCard: (cardId: string) => void;
}

export function WorkTreeDashboard({ 
  view, 
  data, 
  isLoading, 
  teamId, 
  currentPI,
  hiddenCards,
  onHideCard
}: WorkTreeDashboardProps) {
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
      id: 'epic',
      label: 'Epic Progress',
      total: data?.epicTotal || 0,
      completed: data?.epicCompleted || 0,
      progress: data?.epicTotal ? Math.round((data.epicCompleted / data.epicTotal) * 100) : 0,
      subtext: `${data?.epicCompleted || 0} out of ${data?.epicTotal || 0} Epics accepted.`
    },
    {
      id: 'feature',
      label: 'Feature Progress',
      total: data?.featureTotal || 0,
      completed: data?.featureCompleted || 0,
      progress: data?.featureTotal ? Math.round((data.featureCompleted / data.featureTotal) * 100) : 0,
      subtext: `${data?.featureCompleted || 0} out of ${data?.featureTotal || 0} Features accepted.`
    },
    {
      id: 'story',
      label: 'Story Progress',
      total: data?.storyTotal || 0,
      completed: data?.storyCompleted || 0,
      progress: data?.storyTotal ? Math.round((data.storyCompleted / data.storyTotal) * 100) : 0,
      subtext: `${data?.storyCompleted || 0} out of ${data?.storyTotal || 0} Stories accepted`
    },
    {
      id: 'task',
      label: 'Task Progress',
      total: data?.taskTotal || 0,
      completed: data?.taskCompleted || 0,
      progress: data?.taskTotal ? Math.round((data.taskCompleted / data.taskTotal) * 100) : 0,
      subtext: `${data?.taskCompleted || 0} out of ${data?.taskTotal || 0} Tasks done`
    }
  ];

  // Filter out hidden metrics
  const visibleMetrics = metrics.filter(m => !hiddenCards.includes(m.id));

  return (
    <div className="flex flex-wrap gap-4">
      {/* PI Days Left Card - Only show in Team View */}
      {view === 'team' && (
        <Card className="border-l-4 border-l-brand-gold min-w-[200px] flex-shrink-0">
          <CardContent className="p-4">
            <div className="mb-3">
              <span className="text-xs font-semibold text-brand-gold uppercase tracking-wide">
                PROGRAM INCREMENT:
              </span>
              <div className="text-sm font-medium text-brand-gold mt-0.5">
                {currentPI?.name || 'N/A'}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Days</div>
                <div className="text-xs text-muted-foreground">Left</div>
                <div className="text-4xl font-bold mt-1">{daysLeft}</div>
              </div>
              <div className="flex-1 flex flex-col items-center">
                {/* Mini gauge for story points */}
                <div className="relative w-16 h-16">
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
                <div className="text-xs text-center text-muted-foreground mt-1">
                  % Story points accepted
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress Metrics */}
      {visibleMetrics.map((metric) => (
        <Card key={metric.id} className="min-w-[180px] flex-shrink-0">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <span className="text-sm font-semibold leading-tight">
                {metric.label.split(' ')[0]}<br />
                {metric.label.split(' ')[1]}
              </span>
              <button 
                className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
                onClick={() => onHideCard(metric.id)}
                aria-label={`Hide ${metric.label}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="relative h-24 flex items-center justify-center">
              <div className="relative w-20 h-20">
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
                  <span className="text-xl font-bold">{metric.progress}%</span>
                </div>
              </div>
            </div>
            <div className="text-xs text-center text-muted-foreground mt-2">
              {metric.subtext}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Export metric IDs for use in parent component
export const METRIC_IDS = ['epic', 'feature', 'story', 'task'] as const;
export type MetricId = typeof METRIC_IDS[number];
