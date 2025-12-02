import { useState, useEffect } from 'react';
import { LinkedCycle } from '@/types/jira-panel';
import { getCycles } from '@/services/jiraPanelService';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Calendar } from 'lucide-react';

interface CyclesTabProps {
  workItemId: string;
}

export function CyclesTab({ workItemId }: CyclesTabProps) {
  const [cycles, setCycles] = useState<LinkedCycle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCycles();

    const handleRefresh = () => loadCycles();
    window.addEventListener('jira-panel-refresh', handleRefresh);
    return () => window.removeEventListener('jira-panel-refresh', handleRefresh);
  }, [workItemId]);

  async function loadCycles() {
    setIsLoading(true);
    const data = await getCycles(workItemId);
    setCycles(data);
    setIsLoading(false);
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'not_started': return 'bg-gray-500';
      case 'completed': return 'bg-blue-500';
      case 'on_hold': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const calculateProgress = (cycle: LinkedCycle) => {
    const total = cycle.progress.total;
    if (total === 0) return 0;
    const executed = total - cycle.progress.not_run;
    return (executed / total) * 100;
  };

  if (isLoading) {
    return (
      <div className="p-4 text-center text-muted-foreground">Loading cycles...</div>
    );
  }

  if (cycles.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground mb-4">
          No cycles contain linked cases. Create a cycle to start testing.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {cycles.map((cycle) => (
        <Card key={cycle.id} className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm">{cycle.key}</span>
                  <Badge
                    variant="outline"
                    className={`${getStatusColor(cycle.status)} text-white text-xs`}
                  >
                    {cycle.status.replace('_', ' ')}
                  </Badge>
                </div>
                <h3 className="font-medium">{cycle.name}</h3>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
              <Calendar className="h-3 w-3" />
              <span>
                {new Date(cycle.start_date).toLocaleDateString()} -{' '}
                {new Date(cycle.end_date).toLocaleDateString()}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">
                  {cycle.progress.total - cycle.progress.not_run}/{cycle.progress.total} executed
                </span>
              </div>
              <Progress value={calculateProgress(cycle)} className="h-2" />
              <div className="flex gap-2 text-xs">
                <span className="text-green-600">✓ {cycle.progress.passed}</span>
                <span className="text-red-600">✗ {cycle.progress.failed}</span>
                <span className="text-orange-600">⊗ {cycle.progress.blocked}</span>
                <span className="text-blue-600">⊘ {cycle.progress.skipped}</span>
                <span className="text-gray-600">○ {cycle.progress.not_run}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
