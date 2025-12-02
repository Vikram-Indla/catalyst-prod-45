import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, TrendingUp, Calendar, Target } from 'lucide-react';
import type { KeyResult } from '../../types/keyResult.types';
import { format } from 'date-fns';
import { ProgressBar } from '../shared/ProgressBar';

interface KeyResultReportsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  keyResults: any[]; // Using any due to extended fields from useObjectiveDetail
  objectiveTitle?: string;
}

export function KeyResultReportsModal({
  open,
  onOpenChange,
  keyResults,
  objectiveTitle,
}: KeyResultReportsModalProps) {
  const handleExport = () => {
    // TODO: Implement CSV/PDF export
    console.log('Export key results report');
  };

  const calculateOverallProgress = () => {
    if (keyResults.length === 0) return 0;
    const totalProgress = keyResults.reduce((sum, kr) => {
      const startValue = kr.baseline_value ?? kr.start_value ?? 0;
      const targetValue = kr.goal_value ?? kr.target_value ?? 0;
      const currentValue = kr.current_value ?? 0;
      if (!targetValue) return sum;
      const progress = ((currentValue - startValue) / (targetValue - startValue)) * 100;
      return sum + Math.min(100, Math.max(0, progress));
    }, 0);
    return totalProgress / keyResults.length;
  };

  const onTrackCount = keyResults.filter(kr => {
    const startValue = kr.baseline_value ?? kr.start_value ?? 0;
    const targetValue = kr.goal_value ?? kr.target_value ?? 0;
    const currentValue = kr.current_value ?? 0;
    if (!targetValue) return false;
    const progress = ((currentValue - startValue) / (targetValue - startValue));
    return progress >= 0.7;
  }).length;

  const atRiskCount = keyResults.filter(kr => {
    const startValue = kr.baseline_value ?? kr.start_value ?? 0;
    const targetValue = kr.goal_value ?? kr.target_value ?? 0;
    const currentValue = kr.current_value ?? 0;
    if (!targetValue) return false;
    const progress = ((currentValue - startValue) / (targetValue - startValue));
    return progress >= 0.4 && progress < 0.7;
  }).length;

  const offTrackCount = keyResults.length - onTrackCount - atRiskCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Key Results Report</span>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </DialogTitle>
          {objectiveTitle && (
            <p className="text-sm text-muted-foreground">{objectiveTitle}</p>
          )}
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
            <TabsTrigger value="progress" className="flex-1">Progress Tracking</TabsTrigger>
            <TabsTrigger value="checkins" className="flex-1">Check-in History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-[var(--s4)]">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--s4)]">
              <Card className="p-[var(--s4)]">
                <div className="flex items-center gap-[var(--s3)] mb-[var(--s2)]">
                  <Target className="h-5 w-5 text-brand-gold" />
                  <span className="text-sm font-medium">Total Key Results</span>
                </div>
                <p className="text-2xl font-bold">{keyResults.length}</p>
              </Card>

              <Card className="p-[var(--s4)]">
                <div className="flex items-center gap-[var(--s3)] mb-[var(--s2)]">
                  <TrendingUp className="h-5 w-5 text-success" />
                  <span className="text-sm font-medium">On Track</span>
                </div>
                <p className="text-2xl font-bold text-success">{onTrackCount}</p>
              </Card>

              <Card className="p-[var(--s4)]">
                <div className="flex items-center gap-[var(--s3)] mb-[var(--s2)]">
                  <Calendar className="h-5 w-5 text-warning" />
                  <span className="text-sm font-medium">At Risk</span>
                </div>
                <p className="text-2xl font-bold text-warning">{atRiskCount}</p>
              </Card>
            </div>

            {/* Overall Progress */}
            <Card className="p-[var(--s4)]">
              <h3 className="font-medium mb-[var(--s3)]">Overall Progress</h3>
              <ProgressBar
                progress={calculateOverallProgress()}
                height="lg"
                showLabel
              />
            </Card>

            {/* Key Results List */}
            <div className="space-y-[var(--s3)]">
              <h3 className="font-medium">All Key Results</h3>
              {keyResults.map((kr) => {
                const startValue = kr.baseline_value ?? kr.start_value ?? 0;
                const targetValue = kr.goal_value ?? kr.target_value ?? 0;
                const currentValue = kr.current_value ?? 0;
                const progress = targetValue
                  ? ((currentValue - startValue) / (targetValue - startValue)) * 100
                  : 0;
                const clampedProgress = Math.min(100, Math.max(0, progress));
                const title = kr.summary ?? kr.title;

                return (
                  <Card key={kr.id} className="p-[var(--s4)]">
                    <div className="flex items-start justify-between gap-[var(--s3)] mb-[var(--s3)]">
                      <div>
                        <h4 className="font-medium text-sm mb-1">{title}</h4>
                        {kr.description && (
                          <p className="text-xs text-muted-foreground">{kr.description}</p>
                        )}
                      </div>
                      <span className="text-xs font-medium">{clampedProgress.toFixed(0)}%</span>
                    </div>
                    <ProgressBar progress={clampedProgress} height="sm" />
                    <div className="flex items-center justify-between mt-[var(--s2)] text-xs text-muted-foreground">
                      <span>{startValue} → {targetValue}</span>
                      <span>Current: {currentValue}</span>
                    </div>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="progress" className="space-y-[var(--s3)]">
            <Card className="p-[var(--s4)]">
              <p className="text-sm text-muted-foreground">
                Progress tracking visualization will be implemented in a future update.
              </p>
            </Card>
          </TabsContent>

          <TabsContent value="checkins" className="space-y-[var(--s3)]">
            {keyResults.map((kr) => {
              const title = kr.summary ?? kr.title;
              return (
                <Card key={kr.id} className="p-[var(--s4)]">
                  <h4 className="font-medium mb-[var(--s3)]">{title}</h4>
                  {kr.checkins && kr.checkins.length > 0 ? (
                    <div className="space-y-[var(--s2)]">
                      {kr.checkins.map((checkin: any) => (
                      <div key={checkin.id} className="flex items-start justify-between text-sm border-l-2 border-brand-gold pl-[var(--s3)] py-[var(--s2)]">
                        <div>
                          <p className="font-medium">{checkin.value}</p>
                          {checkin.note_richtext && (
                            <p className="text-xs text-muted-foreground mt-1">{checkin.note_richtext}</p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(checkin.checked_in_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No check-ins recorded</p>
                )}
              </Card>
              );
            })}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
