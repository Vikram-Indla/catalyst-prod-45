import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface ProgramIncrementRoadmapCardProps {
  piName: string;
  progressPercent: number;
  startDate: string;
  endDate: string;
}

export function ProgramIncrementRoadmapCard({
  piName,
  progressPercent,
  startDate,
  endDate,
}: ProgramIncrementRoadmapCardProps) {
  // Parse dates for timeline visualization
  const start = new Date(startDate);
  const end = new Date(endDate);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Generate month labels across the PI duration
  const months: string[] = [];
  const current = new Date(start);
  while (current <= end) {
    months.push(monthNames[current.getMonth()]);
    current.setMonth(current.getMonth() + 1);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Program Increment Roadmap</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Timeline header with months */}
        <div className="flex justify-between text-xs text-muted-foreground border-b pb-2">
          {months.map((month, idx) => (
            <span key={idx} className="flex-1 text-center">
              {month}
            </span>
          ))}
        </div>

        {/* PI Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{piName}</span>
              <Badge variant="secondary" className="text-xs">In Progress</Badge>
            </div>
            <span className="text-sm font-semibold text-primary">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-3" />
        </div>

        {/* Date range display */}
        <div className="text-xs text-muted-foreground text-center">
          {start.toLocaleDateString()} – {end.toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  );
}
