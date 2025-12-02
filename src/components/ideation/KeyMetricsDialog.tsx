// ==============================================
// KEY METRICS DIALOG
// Based on Jira Align Ideation screenshots
// ==============================================

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import type { IdeationMetrics } from '@/types/ideation';

interface KeyMetricsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metrics: IdeationMetrics | null;
  isLoading: boolean;
}

export function KeyMetricsDialog({
  open,
  onOpenChange,
  metrics,
  isLoading,
}: KeyMetricsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Key Metrics</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Loading metrics...</div>
        ) : !metrics ? (
          <div className="py-8 text-center text-muted-foreground">No data available</div>
        ) : (
          <div className="space-y-6">
            {/* Campaign Statistics */}
            <div>
              <h3 className="font-medium mb-4">Campaign Statistics</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Total Percent Managed</span>
                    <span>{metrics.percent_managed}%</span>
                  </div>
                  <Progress value={metrics.percent_managed} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Total Percent with Votes</span>
                    <span>{metrics.percent_with_votes}%</span>
                  </div>
                  <Progress value={metrics.percent_with_votes} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Total Percent with Comments</span>
                    <span>{metrics.percent_with_comments}%</span>
                  </div>
                  <Progress value={metrics.percent_with_comments} className="h-2" />
                </div>
              </div>
            </div>

            {/* Your Contribution */}
            <div>
              <h3 className="font-medium mb-4">Your Contribution</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Percent You Contributed:</span>
                    <span className="font-medium">{metrics.percent_user_contributed}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Percent From You With Votes:</span>
                    <span className="font-medium">{metrics.percent_user_with_votes}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Percent From You With Comments:</span>
                    <span className="font-medium">{metrics.percent_user_with_comments}%</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ideas Contributed:</span>
                    <span className="font-medium">{metrics.user_contributed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Your Ideas With Votes:</span>
                    <span className="font-medium">{metrics.user_with_votes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Your Ideas With Comments:</span>
                    <span className="font-medium">{metrics.user_with_comments}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="pt-4 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Ideas in Campaign:</span>
                <span className="font-medium">{metrics.total_ideas}</span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
