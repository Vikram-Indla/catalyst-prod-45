import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface ThemeProgress {
  id: string;
  name: string;
  state: string;
  percentComplete: number;
}

interface ThemeProgressCardProps {
  themes: ThemeProgress[];
}

export function ThemeProgressCard({ themes }: ThemeProgressCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Theme Program Increment Progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {themes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No themes found for selected filters</p>
        ) : (
          themes.map((theme) => (
            <div key={theme.id} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium truncate">{theme.name}</span>
                <Badge variant="secondary" className="text-xs shrink-0">
                  {theme.state}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={theme.percentComplete} className="h-2 flex-1" />
                <span className="text-xs text-muted-foreground font-medium w-10 text-right">
                  {theme.percentComplete}%
                </span>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
