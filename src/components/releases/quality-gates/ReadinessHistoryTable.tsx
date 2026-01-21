// =====================================================
// READINESS HISTORY TABLE
// Shows history of readiness evaluations
// =====================================================

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ThumbsUp,
  Clock,
  History
} from 'lucide-react';
import { useReleaseReadinessHistory } from '@/hooks/releases/useReleaseReadiness';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface ReadinessHistoryTableProps {
  releaseId: string;
}

const STATUS_ICONS = {
  not_ready: XCircle,
  at_risk: AlertTriangle,
  ready: CheckCircle2,
  approved: ThumbsUp,
};

const STATUS_COLORS = {
  not_ready: 'text-red-600',
  at_risk: 'text-orange-600',
  ready: 'text-green-600',
  approved: 'text-blue-600',
};

export function ReadinessHistoryTable({ releaseId }: ReadinessHistoryTableProps) {
  const { data: history = [], isLoading } = useReleaseReadinessHistory(releaseId);

  if (isLoading) {
    return <div className="animate-pulse h-64 bg-muted rounded-lg" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <History className="h-5 w-5 text-muted-foreground" />
          Readiness History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No readiness evaluations yet</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="space-y-3">
              {history.map((snapshot, index) => {
                const Icon = STATUS_ICONS[snapshot.overall_status as keyof typeof STATUS_ICONS] || Clock;
                const color = STATUS_COLORS[snapshot.overall_status as keyof typeof STATUS_COLORS] || 'text-muted-foreground';

                return (
                  <div
                    key={snapshot.id}
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-lg border',
                      index === 0 && 'bg-muted/50'
                    )}
                  >
                    <Icon className={cn('h-5 w-5 mt-0.5', color)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={color}>
                          {snapshot.overall_status.replace('_', ' ').toUpperCase()}
                        </Badge>
                        {snapshot.approved_at && (
                          <Badge variant="secondary" className="text-xs">
                            Approved
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(snapshot.snapshot_at), 'MMM d, yyyy h:mm a')}
                        {snapshot.created_by_name && (
                          <span> · by {snapshot.created_by_name}</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3 mt-2 text-xs">
                        <span>
                          Gates: {snapshot.gates_passed}/{snapshot.gates_total}
                        </span>
                        <span>
                          Pass: {snapshot.test_pass_pct}%
                        </span>
                        <span>
                          Exec: {snapshot.test_execution_pct}%
                        </span>
                        <span className="text-red-600">
                          Blockers: {snapshot.open_blockers}
                        </span>
                      </div>
                      {snapshot.recommendation && (
                        <div className="mt-2 text-sm italic text-muted-foreground">
                          "{snapshot.recommendation}"
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
