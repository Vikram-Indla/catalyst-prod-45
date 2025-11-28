import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface FeatureProgress {
  totalStories: number;
  accepted: number;
  inProgress: number;
  notStarted: number;
}

interface FeatureProgressVisualizationProps {
  progress: FeatureProgress;
  featureState?: string;
}

export function FeatureProgressVisualization({ progress, featureState }: FeatureProgressVisualizationProps) {
  // If feature state is "Accepted", show 100% regardless of child states
  const isAccepted = featureState === 'done' || featureState === 'accepted';
  
  const acceptedPct = isAccepted ? 100 : progress.totalStories > 0 
    ? (progress.accepted / progress.totalStories) * 100 
    : 0;
  
  const inProgressPct = isAccepted ? 0 : progress.totalStories > 0 
    ? (progress.inProgress / progress.totalStories) * 100 
    : 0;
  
  const notStartedPct = isAccepted ? 0 : progress.totalStories > 0 
    ? (progress.notStarted / progress.totalStories) * 100 
    : 0;

  // Calculate angles for doughnut chart (in degrees)
  const acceptedAngle = (acceptedPct / 100) * 360;
  const inProgressAngle = (inProgressPct / 100) * 360;
  const notStartedAngle = (notStartedPct / 100) * 360;

  // Create conic gradient for doughnut chart
  const createConicGradient = () => {
    if (isAccepted) {
      return 'conic-gradient(from 0deg, hsl(var(--chart-1)) 0deg 360deg)';
    }
    
    let currentAngle = 0;
    const segments = [];
    
    if (acceptedPct > 0) {
      segments.push(`hsl(var(--chart-1)) ${currentAngle}deg ${currentAngle + acceptedAngle}deg`);
      currentAngle += acceptedAngle;
    }
    
    if (inProgressPct > 0) {
      segments.push(`hsl(var(--chart-2)) ${currentAngle}deg ${currentAngle + inProgressAngle}deg`);
      currentAngle += inProgressAngle;
    }
    
    if (notStartedPct > 0) {
      segments.push(`hsl(var(--chart-3)) ${currentAngle}deg ${currentAngle + notStartedAngle}deg`);
      currentAngle += notStartedAngle;
    }
    
    if (segments.length === 0) {
      return 'conic-gradient(from 0deg, hsl(var(--muted)) 0deg 360deg)';
    }
    
    return `conic-gradient(from 0deg, ${segments.join(', ')})`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Progress Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          {/* Doughnut Chart */}
          <div className="relative w-32 h-32 flex-shrink-0">
            <div 
              className="w-full h-full rounded-full"
              style={{
                background: createConicGradient(),
                maskImage: 'radial-gradient(circle, transparent 40%, black 40%)',
                WebkitMaskImage: 'radial-gradient(circle, transparent 40%, black 40%)',
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold">{Math.round(acceptedPct)}%</div>
                <div className="text-xs text-muted-foreground">Complete</div>
              </div>
            </div>
          </div>

          {/* Progress Dials */}
          <div className="flex-1 space-y-4">
            {/* Accepted */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(var(--chart-1))' }} />
                  <span>Accepted</span>
                </div>
                <span className="font-medium">{progress.accepted} / {progress.totalStories}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full transition-all"
                  style={{ 
                    width: `${acceptedPct}%`,
                    backgroundColor: 'hsl(var(--chart-1))'
                  }}
                />
              </div>
            </div>

            {/* In Progress */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(var(--chart-2))' }} />
                  <span>In Progress</span>
                </div>
                <span className="font-medium">{progress.inProgress} / {progress.totalStories}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full transition-all"
                  style={{ 
                    width: `${inProgressPct}%`,
                    backgroundColor: 'hsl(var(--chart-2))'
                  }}
                />
              </div>
            </div>

            {/* Not Started */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(var(--chart-3))' }} />
                  <span>Not Started</span>
                </div>
                <span className="font-medium">{progress.notStarted} / {progress.totalStories}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full transition-all"
                  style={{ 
                    width: `${notStartedPct}%`,
                    backgroundColor: 'hsl(var(--chart-3))'
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {isAccepted && (
          <div className="mt-4 text-sm text-muted-foreground">
            Feature is marked as accepted (100% complete)
          </div>
        )}

        {progress.totalStories === 0 && !isAccepted && (
          <div className="mt-4 text-sm text-muted-foreground">
            No child stories found for this feature
          </div>
        )}
      </CardContent>
    </Card>
  );
}
