import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { mockExecutionAgainstOutcomes } from '@/data/strategyMockData';

interface ExecutionAgainstOutcomesProps {
  onLevelClick: (level: string) => void;
}

export function ExecutionAgainstOutcomes({ onLevelClick }: ExecutionAgainstOutcomesProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Execution Against Outcomes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {mockExecutionAgainstOutcomes.map((item, index) => (
          <Button
            key={index}
            variant="ghost"
            className="w-full justify-between h-auto py-3 px-4 hover:bg-accent"
            onClick={() => onLevelClick(item.level)}
          >
            <span className="text-sm font-medium text-muted-foreground">
              {item.level}
            </span>
            <div className="text-right">
              <span className="text-xs text-muted-foreground">{item.workItemType}</span>
              <span className="ml-2 font-semibold">{item.completionPercent}%</span>
            </div>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
