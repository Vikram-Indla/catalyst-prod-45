import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface EpicRoadmapCardProps {
  selectedPI: string | null;
  piProgress?: {
    percentage: number;
    startDate: string;
    endDate: string;
  };
}

export function EpicRoadmapCard({ selectedPI, piProgress }: EpicRoadmapCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Program Increment Roadmap</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {piProgress ? (
          <>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{piProgress.startDate}</span>
              <span>{piProgress.endDate}</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{selectedPI || 'PI'}</span>
                <span className="text-sm text-muted-foreground">{piProgress.percentage}%</span>
              </div>
              <Progress value={piProgress.percentage} className="h-2" />
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No PI selected</p>
        )}
      </CardContent>
    </Card>
  );
}
