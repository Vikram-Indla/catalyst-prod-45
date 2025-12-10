import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink, Target, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { SnapshotStrategyLinks } from '@/types/strategicBacklog';
import { useOKRv2StrategyMetrics } from '@/hooks/useOKRv2StrategyMetrics';

interface GoalsTabProps {
  goals: any[]; // Legacy - kept for compatibility
  links: SnapshotStrategyLinks | null;
  snapshotId: string;
  isArchived: boolean;
}

export function GoalsTab({ snapshotId, isArchived }: GoalsTabProps) {
  const navigate = useNavigate();
  const { data: okrMetrics, isLoading } = useOKRv2StrategyMetrics(snapshotId);

  const handleOpenOKRHub = () => {
    navigate('/enterprise/okr-hub');
  };

  return (
    <div className="space-y-6">
      {/* Migration Notice */}
      <Card className="border-brand-gold/30 bg-brand-gold/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-brand-gold" />
            <CardTitle className="text-base text-foreground">Strategic Objectives</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Strategic Objectives are now managed in the <strong>OKR Hub</strong>. 
            All objectives linked to this snapshot's themes can be viewed and managed there.
          </p>
          
          {/* Quick Stats */}
          {!isLoading && okrMetrics && okrMetrics.count > 0 && (
            <div className="flex items-center gap-6 p-4 bg-background rounded-lg border">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-brand-gold" />
                <span className="text-sm font-medium">{okrMetrics.count} Objectives</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                  {okrMetrics.byHealth.good} Good
                </span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                  {okrMetrics.byHealth.fair} Fair
                </span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                  {okrMetrics.byHealth.poor} Poor
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                Avg Progress: <strong>{okrMetrics.avgProgress}%</strong>
              </div>
            </div>
          )}

          <Button 
            onClick={handleOpenOKRHub}
            className="bg-brand-gold hover:bg-brand-gold/90"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open OKR Hub
          </Button>
        </CardContent>
      </Card>

      {/* Empty state for legacy goals */}
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Legacy strategic goals have been migrated to OKRs.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Create and manage objectives in the OKR Hub for full functionality including 
            Key Results, work alignment, and progress tracking.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
