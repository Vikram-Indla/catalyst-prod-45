/**
 * Module 3B-1: Queued tests list display
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ListOrdered, 
  Clock, 
  Zap,
  AlertCircle,
  ChevronRight
} from 'lucide-react';
import type { QueueItem, QUEUE_STATUS_STYLES } from '../../types/parallel-runner';

const priorityStyles: Record<number, { label: string; color: string }> = {
  100: { label: 'Critical', color: 'text-destructive bg-destructive/10' },
  75: { label: 'High', color: 'text-warning bg-warning/10' },
  50: { label: 'Medium', color: 'text-muted-foreground bg-muted' },
  25: { label: 'Low', color: 'text-muted-foreground/70 bg-muted/50' },
};

const getPriorityStyle = (priority: number) => {
  if (priority >= 100) return priorityStyles[100];
  if (priority >= 75) return priorityStyles[75];
  if (priority >= 50) return priorityStyles[50];
  return priorityStyles[25];
};

const statusStyles: Record<string, { bg: string; text: string }> = {
  queued: { bg: 'bg-muted/50', text: 'text-muted-foreground' },
  claimed: { bg: 'bg-primary/10', text: 'text-primary' },
  running: { bg: 'bg-info/10', text: 'text-info' },
  completed: { bg: 'bg-success/10', text: 'text-success' },
  failed: { bg: 'bg-destructive/10', text: 'text-destructive' },
  skipped: { bg: 'bg-warning/10', text: 'text-warning' },
};

interface TestQueueProps {
  queue: QueueItem[];
  maxHeight?: string;
  className?: string;
}

export function TestQueue({ queue, maxHeight = '400px', className }: TestQueueProps) {
  const queuedItems = queue.filter(q => q.status === 'queued');
  const runningItems = queue.filter(q => q.status === 'claimed' || q.status === 'running');
  const completedItems = queue.filter(q => q.status === 'completed' || q.status === 'failed');

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListOrdered className="h-4 w-4 text-muted-foreground" />
            Test Queue
          </div>
          <div className="flex gap-2 text-xs font-normal">
            <Badge variant="outline" className="bg-muted/50">
              <Clock className="h-3 w-3 mr-1" />
              {queuedItems.length} queued
            </Badge>
            <Badge variant="outline" className="bg-primary/10 text-primary">
              <Zap className="h-3 w-3 mr-1" />
              {runningItems.length} running
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea style={{ height: maxHeight }}>
          <div className="p-3 space-y-1">
            {queue.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ListOrdered className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No tests in queue</p>
              </div>
            ) : (
              queue.map((item, index) => {
                const priorityStyle = getPriorityStyle(item.priority);
                const status = statusStyles[item.status] || statusStyles.queued;
                const testCase = item.test_case || (item as any).test_cases;

                return (
                  <div
                    key={item.id}
                    className={cn(
                      'flex items-center gap-3 p-2 rounded-md transition-colors',
                      'hover:bg-muted/50',
                      item.status === 'running' && 'bg-primary/5 border border-primary/20',
                      item.status === 'claimed' && 'bg-primary/5'
                    )}
                  >
                    {/* Position */}
                    <span className="w-6 text-xs text-muted-foreground text-center font-mono">
                      {item.position || index + 1}
                    </span>

                    {/* Priority Badge */}
                    <Badge 
                      variant="secondary" 
                      className={cn('text-xs shrink-0', priorityStyle.color)}
                    >
                      {priorityStyle.label}
                    </Badge>

                    {/* Test Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">
                          {testCase?.case_number || 'TC-???'}
                        </span>
                        {item.retry_count > 0 && (
                          <Badge variant="outline" className="text-xs text-warning">
                            Retry #{item.retry_count}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm truncate">
                        {testCase?.title || 'Unknown Test'}
                      </p>
                    </div>

                    {/* Status */}
                    <Badge 
                      variant="outline" 
                      className={cn('text-xs capitalize shrink-0', status.bg, status.text)}
                    >
                      {item.status === 'claimed' ? 'Starting' : item.status}
                    </Badge>

                    {/* Arrow for running */}
                    {(item.status === 'running' || item.status === 'claimed') && (
                      <ChevronRight className="h-4 w-4 text-primary animate-pulse" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
