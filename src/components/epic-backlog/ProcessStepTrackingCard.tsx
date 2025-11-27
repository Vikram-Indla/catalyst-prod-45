import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, TrendingUp } from 'lucide-react';
import { useProcessStepTracking, useCurrentProcessStepDuration, useProcessFlowDuration } from '@/hooks/useProcessStepTracking';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ProcessStepTrackingCardProps {
  epicId: string;
}

export function ProcessStepTrackingCard({ epicId }: ProcessStepTrackingCardProps) {
  const { data: history, isLoading } = useProcessStepTracking(epicId);
  const { data: currentDuration } = useCurrentProcessStepDuration(epicId);
  const { data: flowDuration } = useProcessFlowDuration(epicId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Process Step Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  const formatDuration = (days: number, hours?: number) => {
    if (days === 0 && hours === 0) return '< 1 hour';
    if (days === 0) return `${hours}h`;
    if (hours === 0) return `${days}d`;
    return `${days}d ${hours}h`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Process Step Tracking
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Step Duration */}
        {currentDuration && (currentDuration.days > 0 || currentDuration.hours > 0) && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Current Step</span>
            </div>
            <Badge variant="default">
              {formatDuration(currentDuration.days, currentDuration.hours)}
            </Badge>
          </div>
        )}

        {/* Total Flow Duration */}
        {flowDuration && (flowDuration.days > 0 || flowDuration.hours > 0) && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-accent/50 border">
            <span className="text-sm font-medium">Total in Process Flow</span>
            <Badge variant="secondary">
              {formatDuration(flowDuration.days, flowDuration.hours)}
            </Badge>
          </div>
        )}

        {/* Process Step History */}
        {history && history.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase">History</h4>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
              <div className="space-y-2">
                {history.map((entry) => {
                  const durationDays = entry.exited_at 
                    ? Math.floor((new Date(entry.exited_at).getTime() - new Date(entry.entered_at).getTime()) / (1000 * 60 * 60 * 24))
                    : Math.floor((new Date().getTime() - new Date(entry.entered_at).getTime()) / (1000 * 60 * 60 * 24));
                  
                  return (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between p-2 rounded-md border bg-card hover:bg-accent/30 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {entry.process_step_id || 'Unknown Step'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(entry.entered_at).toLocaleDateString()}
                          {entry.exited_at && ` - ${new Date(entry.exited_at).toLocaleDateString()}`}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {durationDays}d
                      </Badge>
                    </div>
                  );
                })}
              </div>
              </div>
            </ScrollArea>
          </div>
        )}

        {(!history || history.length === 0) && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No process step history available
          </p>
        )}
      </CardContent>
    </Card>
  );
}
