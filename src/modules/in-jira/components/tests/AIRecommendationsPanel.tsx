/**
 * AI Recommendations Panel
 * AI-4: Risk-Based Test Runway Recommendations
 */

import React from 'react';
import { Sparkles, Loader2, CheckCircle2, XCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useTestRecommendations, TestRecommendation } from '../../hooks/useTestRecommendations';

interface AIRecommendationsPanelProps {
  programId?: string;
  compact?: boolean;
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'critical': return 'text-status-error bg-status-error/10';
    case 'high': return 'text-status-warning bg-status-warning/10';
    case 'medium': return 'text-accent-primary bg-accent-subtle';
    default: return 'text-text-tertiary bg-surface-3';
  }
}

export function AIRecommendationsPanel({ programId, compact = false }: AIRecommendationsPanelProps) {
  const {
    recommendations,
    isLoading,
    openRecommendations,
    executeRecommendation,
    dismissRecommendation,
    isExecuting,
  } = useTestRecommendations(programId || null);

  const completedCount = recommendations.filter(r => r.status === 'done').length;

  const handleExecute = async (rec: TestRecommendation) => {
    try {
      await executeRecommendation(rec);
      toast.success('Action executed');
    } catch (error) {
      toast.error('Failed to execute');
    }
  };

  const handleDismiss = async (recId: string) => {
    try {
      await dismissRecommendation({ recommendationId: recId, reason: 'Manually dismissed' });
      toast.info('Dismissed');
    } catch (error) {
      toast.error('Failed to dismiss');
    }
  };

  if (compact) {
    return (
      <Card className="bg-surface-2 border-border-default">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium text-text-primary flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent-primary" />
            AI Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-12 bg-surface-3 animate-pulse rounded" />)}</div>
          ) : openRecommendations.length === 0 ? (
            <div className="text-center py-4 text-text-tertiary">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-status-success" />
              <p className="text-sm">All caught up!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {openRecommendations.slice(0, 3).map(rec => (
                <div key={rec.id} className="p-3 bg-surface-3 rounded-lg border border-border-default">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <Badge className={cn('text-xs', getPriorityColor(rec.priority))}>{rec.priority}</Badge>
                      <p className="text-sm text-text-primary truncate mt-1">{rec.title}</p>
                    </div>
                    <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => handleExecute(rec)} disabled={isExecuting}>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-border-default">
        <div>
          <h3 className="text-lg font-medium text-text-primary flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent-primary" />AI Recommendations
          </h3>
          <p className="text-sm text-text-tertiary mt-0.5">{openRecommendations.length} pending · {completedCount} completed</p>
        </div>
      </div>
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-4 space-y-3">{[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-surface-2 animate-pulse rounded-lg" />)}</div>
        ) : openRecommendations.length === 0 ? (
          <div className="text-center py-16 text-text-tertiary">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-status-success" />
            <p className="text-lg font-medium text-text-primary">All Caught Up!</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {openRecommendations.map(rec => (
              <div key={rec.id} className="p-4 bg-surface-2 rounded-lg border border-border-default">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={cn('text-xs', getPriorityColor(rec.priority))}>{rec.priority}</Badge>
                      <Badge variant="outline" className="text-xs">{rec.recommendation_type.replace('_', ' ')}</Badge>
                    </div>
                    <p className="text-sm font-medium text-text-primary">{rec.title}</p>
                    {rec.description && <p className="text-sm text-text-tertiary mt-1">{rec.description}</p>}
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-default">
                  <Button variant="ghost" size="sm" className="h-7" onClick={() => handleDismiss(rec.id)}>
                    <XCircle className="h-4 w-4 mr-1" />Dismiss
                  </Button>
                  <Button size="sm" className="h-7" onClick={() => handleExecute(rec)} disabled={isExecuting}>
                    {isExecuting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ArrowRight className="h-4 w-4 mr-1" />}Execute
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

export default AIRecommendationsPanel;
