import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PortfolioLoadRow {
  id: string;
  capability: string;
  percentLoad: number;
}

interface ProgramIncrementLoadCardProps {
  piName: string;
  overallProgress: number;
  loadRows: PortfolioLoadRow[];
  selectedView: 'financials' | 'resources' | 'execution';
  onViewChange: (view: 'financials' | 'resources' | 'execution') => void;
}

export function ProgramIncrementLoadCard({
  piName,
  overallProgress,
  loadRows,
  selectedView,
  onViewChange,
}: ProgramIncrementLoadCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between mb-3">
          <CardTitle className="text-sm font-semibold">Program Increment Load</CardTitle>
          <Tabs value={selectedView} onValueChange={(v) => onViewChange(v as any)}>
            <TabsList className="h-8">
              <TabsTrigger value="financials" className="text-xs px-2 py-1">
                Financials
              </TabsTrigger>
              <TabsTrigger value="resources" className="text-xs px-2 py-1">
                Resources
              </TabsTrigger>
              <TabsTrigger value="execution" className="text-xs px-2 py-1">
                Execution
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{piName}</span>
            <Badge variant="secondary" className="text-xs">In Progress</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Progress value={overallProgress} className="h-2 flex-1" />
            <span className="text-xs text-muted-foreground font-medium w-16 text-right">
              {overallProgress}% Complete
            </span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-2">
        {loadRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No load data available</p>
        ) : (
          loadRows.map((row) => (
            <div key={row.id} className="flex items-center gap-2">
              <span className="text-sm flex-1">{row.capability}</span>
              <div className="flex items-center gap-2 flex-1">
                <div className="flex-1 h-5 bg-secondary/30 rounded-sm relative overflow-hidden">
                  <div
                    className="h-full bg-primary/20 transition-all"
                    style={{ width: `${row.percentLoad}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground font-medium w-10 text-right">
                  {row.percentLoad}%
                </span>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
