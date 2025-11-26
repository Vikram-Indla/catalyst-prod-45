import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface PILoadItem {
  name: string;
  percentage: number;
}

interface PILoadCardProps {
  selectedPI: string | null;
  loadData?: PILoadItem[];
}

export function PILoadCard({ selectedPI, loadData }: PILoadCardProps) {
  const defaultLoadData: PILoadItem[] = [
    { name: 'Features', percentage: 45 },
    { name: 'Defects', percentage: 15 },
    { name: 'Tech Debt', percentage: 20 },
    { name: 'Enablers', percentage: 20 },
  ];

  const data = loadData || defaultLoadData;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">
          {selectedPI || 'PI'} Load
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.map((item) => (
          <div key={item.name} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{item.name}</span>
              <span className="text-sm text-muted-foreground">{item.percentage}%</span>
            </div>
            <Progress value={item.percentage} className="h-2" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
