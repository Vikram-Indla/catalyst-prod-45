// =====================================================
// READINESS STATUS CARD
// Shows current release readiness and approval status
// =====================================================

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lozenge } from '@/components/ads';
import { Textarea } from '@/components/ui/textarea';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock,
  RefreshCw,
  ThumbsUp,
  Shield
} from 'lucide-react';
import { 
  useLatestReadiness, 
  useCreateReadinessSnapshot,
  useApproveReadiness 
} from '@/lib/shared-quality/hooks/useReadiness';
import { useEvaluateQualityGates } from '@/lib/shared-quality/hooks/useQualityGates';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface ReadinessStatusCardProps {
  releaseId: string;
  userId?: string;
}

const STATUS_CONFIG = {
  not_ready: {
    icon: XCircle,
    color: 'text-red-600',
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-200 dark:border-red-900',
    label: 'Not Ready',
    description: 'Blocking gates have not passed',
  },
  at_risk: {
    icon: AlertTriangle,
    color: 'text-orange-600',
    bg: 'bg-orange-50 dark:bg-orange-950/30',
    border: 'border-orange-200 dark:border-orange-900',
    label: 'At Risk',
    description: 'Some warning gates have not passed',
  },
  ready: {
    icon: CheckCircle2,
    color: 'text-green-600',
    bg: 'bg-green-50 dark:bg-green-950/30',
    border: 'border-green-200 dark:border-green-900',
    label: 'Ready',
    description: 'All blocking gates passed',
  },
  approved: {
    icon: ThumbsUp,
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-900',
    label: 'Approved',
    description: 'Release has been approved for deployment',
  },
};

export function ReadinessStatusCard({ releaseId, userId }: ReadinessStatusCardProps) {
  const { data: latestReadiness, isLoading } = useLatestReadiness(releaseId);
  const createSnapshot = useCreateReadinessSnapshot();
  const approveReadiness = useApproveReadiness();
  const evaluateGates = useEvaluateQualityGates();

  const [showRecommendation, setShowRecommendation] = useState(false);
  const [recommendation, setRecommendation] = useState('');

  const handleRefresh = () => {
    createSnapshot.mutate({
      releaseId,
      userId,
      recommendation: recommendation || undefined,
    });
    setShowRecommendation(false);
    setRecommendation('');
  };

  const handleApprove = () => {
    if (latestReadiness && userId) {
      approveReadiness.mutate({
        snapshotId: latestReadiness.id,
        userId,
        releaseId,
      });
    }
  };

  if (isLoading) {
    return <div className="animate-pulse h-48 bg-muted rounded-lg" />;
  }

  const status = latestReadiness?.overall_status || 'not_ready';
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.not_ready;
  const Icon = config.icon;

  return (
    <Card className={cn('border-2', config.border)}>
      <CardHeader className={cn('pb-3', config.bg)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className={cn('h-5 w-5', config.color)} />
            Release Readiness
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefresh}
            disabled={createSnapshot.isPending}
          >
            <RefreshCw className={cn('h-4 w-4 mr-1', createSnapshot.isPending && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {/* Status Display */}
        <div className="flex items-center gap-4">
          <div className={cn('p-3 rounded-full', config.bg)}>
            <Icon className={cn('h-8 w-8', config.color)} />
          </div>
          <div>
            <div className={cn('text-xl font-bold', config.color)}>{config.label}</div>
            <div className="text-sm text-muted-foreground">{config.description}</div>
          </div>
        </div>

        {/* Metrics */}
        {latestReadiness && (
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">
                {latestReadiness.blocking_gates_passed}/{latestReadiness.blocking_gates_total}
              </div>
              <div className="text-sm text-muted-foreground">Blocking Gates</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">
                {latestReadiness.gates_passed}/{latestReadiness.gates_total}
              </div>
              <div className="text-sm text-muted-foreground">All Gates</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {latestReadiness.test_pass_pct}%
              </div>
              <div className="text-sm text-muted-foreground">Pass Rate</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {latestReadiness.open_blockers}
              </div>
              <div className="text-sm text-muted-foreground">Open Blockers</div>
            </div>
          </div>
        )}

        {/* Recommendation Input */}
        {showRecommendation && (
          <div className="space-y-2">
            <Textarea
              placeholder="Add recommendation or notes for this snapshot..."
              value={recommendation}
              onChange={(e) => setRecommendation(e.target.value)}
              rows={2}
            />
          </div>
        )}

        {/* Last Updated */}
        {latestReadiness && (
          <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
            <span>
              Last evaluated: {format(new Date(latestReadiness.snapshot_at), 'MMM d, yyyy h:mm a')}
            </span>
            {latestReadiness.approved_at && (
              <Lozenge appearance="success">
                Approved by {latestReadiness.approved_by_name}
              </Lozenge>
            )}
          </div>
        )}

        {/* Actions */}
        {status === 'ready' && !latestReadiness?.approved_at && userId && (
          <Button 
            className="w-full" 
            onClick={handleApprove}
            disabled={approveReadiness.isPending}
          >
            <ThumbsUp className="h-4 w-4 mr-2" />
            Approve Release
          </Button>
        )}

        {!latestReadiness && (
          <Button 
            className="w-full" 
            variant="outline"
            onClick={handleRefresh}
            disabled={createSnapshot.isPending}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Evaluate Readiness
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
