import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface CapabilityLoad {
  name: string;
  percentage: number;
}

interface PIProgressCardProps {
  piName: string;
  status: string;
  progressPercent: number;
  capabilities: CapabilityLoad[];
}

export function PIProgressCard({
  piName,
  status,
  progressPercent,
  capabilities,
}: PIProgressCardProps) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base font-semibold">{piName}</CardTitle>
          <Badge variant="default" className="bg-primary">
            {status}
          </Badge>
          <span className="text-sm text-muted-foreground ml-auto">
            {progressPercent}% Complete
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Progress */}
        <div>
          <div className="text-sm font-medium mb-2">Program Increment Progress</div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Capability List */}
        <div className="space-y-2">
          {capabilities.map((capability) => (
            <div key={capability.name} className="flex items-center justify-between text-sm">
              <span className="font-medium">{capability.name}</span>
              <span className="text-muted-foreground">{capability.percentage}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
