import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MissionVisionValuesProps {
  snapshot: {
    mission?: string | null;
    vision?: string | null;
    values?: unknown;
  } | null;
}

export function MissionVisionValues({ snapshot }: MissionVisionValuesProps) {
  const values = Array.isArray(snapshot?.values) 
    ? snapshot.values 
    : typeof snapshot?.values === 'string' 
      ? JSON.parse(snapshot.values) 
      : [];
      
  return (
    <div className="grid grid-cols-3 gap-4">
      <Card className="cursor-pointer hover:border-primary/50 transition-colors">
        <CardHeader>
          <CardTitle className="text-primary text-base">Mission</CardTitle>
          <p className="text-xs text-muted-foreground italic">Why do we exist?</p>
        </CardHeader>
        <CardContent>
          {snapshot?.mission ? (
            <p className="text-sm text-foreground leading-relaxed">
              {snapshot.mission}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground italic">None found.</p>
          )}
        </CardContent>
      </Card>

      <Card className="cursor-pointer hover:border-primary/50 transition-colors">
        <CardHeader>
          <CardTitle className="text-primary text-base">Vision</CardTitle>
          <p className="text-xs text-muted-foreground italic">What value do we provide?</p>
        </CardHeader>
        <CardContent>
          {snapshot?.vision ? (
            <p className="text-sm text-foreground leading-relaxed">
              {snapshot.vision}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground italic">None found.</p>
          )}
        </CardContent>
      </Card>

      <Card className="cursor-pointer hover:border-primary/50 transition-colors">
        <CardHeader>
          <CardTitle className="text-primary text-base">Values</CardTitle>
          <p className="text-xs text-muted-foreground italic">How do we behave?</p>
        </CardHeader>
        <CardContent>
          {values.length > 0 ? (
            <ul className="space-y-2">
              {values.map((value: string, index: number) => (
                <li key={index} className="text-sm text-foreground leading-relaxed">
                  {value}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground italic">None found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
