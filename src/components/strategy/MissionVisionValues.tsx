import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StrategySnapshot } from '@/data/strategyMockData';

interface MissionVisionValuesProps {
  snapshot: any;
}

export function MissionVisionValues({ snapshot }: MissionVisionValuesProps) {
  const values = Array.isArray(snapshot.values) 
    ? snapshot.values 
    : typeof snapshot.values === 'string' 
      ? JSON.parse(snapshot.values) 
      : [];
      
  return (
    <div className="grid grid-cols-3 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-primary">Mission</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {snapshot.mission}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-primary">Vision</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {snapshot.vision}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-primary">Value</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {values.map((value: string, index: number) => (
              <li key={index} className="text-sm text-muted-foreground leading-relaxed">
                • {value}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
