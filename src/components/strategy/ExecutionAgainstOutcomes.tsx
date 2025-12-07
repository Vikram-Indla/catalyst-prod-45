import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';

interface ExecutionItem {
  level: string;
  workItemType: string;
  completionPercent: number;
}

interface ExecutionAgainstOutcomesProps {
  onLevelClick: (level: string) => void;
  data?: ExecutionItem[];
}

export function ExecutionAgainstOutcomes({ onLevelClick, data = [] }: ExecutionAgainstOutcomesProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Execution Against Outcomes</CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <FileText className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No execution data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Execution Against Outcomes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {data.map((item, index) => (
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
