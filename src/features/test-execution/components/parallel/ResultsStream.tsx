/**
 * Module 3B-1: Live results feed display
 */

import React, { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Activity, 
  CheckCircle2, 
  XCircle, 
  PlayCircle,
  PauseCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import type { ExecutionEvent } from '../../types/parallel-runner';

const eventConfig: Record<ExecutionEvent['type'], { 
  icon: React.ReactNode; 
  color: string;
  label: string;
}> = {
  test_claimed: {
    icon: <PlayCircle className="h-4 w-4" />,
    color: 'text-primary',
    label: 'Started',
  },
  test_completed: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: 'text-success',
    label: 'Passed',
  },
  test_failed: {
    icon: <XCircle className="h-4 w-4" />,
    color: 'text-destructive',
    label: 'Failed',
  },
  worker_idle: {
    icon: <PauseCircle className="h-4 w-4" />,
    color: 'text-muted-foreground',
    label: 'Idle',
  },
  worker_error: {
    icon: <AlertCircle className="h-4 w-4" />,
    color: 'text-destructive',
    label: 'Error',
  },
};

interface ResultsStreamProps {
  events: ExecutionEvent[];
  maxHeight?: string;
  className?: string;
}

export function ResultsStream({ events, maxHeight = '300px', className }: ResultsStreamProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [events.length]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  const getRelativeTime = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          Live Results
          {events.length > 0 && (
            <Badge variant="secondary" className="ml-auto text-xs">
              {events.length} events
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea style={{ height: maxHeight }} ref={scrollRef as any}>
          <div className="p-3 space-y-2">
            {events.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No events yet</p>
                <p className="text-xs">Results will appear here as tests complete</p>
              </div>
            ) : (
              events.map((event, index) => {
                const config = eventConfig[event.type];
                
                return (
                  <div
                    key={`${event.timestamp}-${index}`}
                    className={cn(
                      'flex items-start gap-3 p-2 rounded-md',
                      'bg-muted/30 hover:bg-muted/50 transition-colors',
                      index === 0 && 'bg-primary/5 border border-primary/20'
                    )}
                  >
                    {/* Icon */}
                    <div className={cn('mt-0.5', config.color)}>
                      {config.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Badge 
                          variant="outline" 
                          className={cn('text-xs', config.color)}
                        >
                          {config.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Worker {event.workerNumber || '?'}
                        </span>
                      </div>
                      
                      {event.testTitle && (
                        <p className="text-sm truncate">{event.testTitle}</p>
                      )}
                      
                      {event.testCaseId && !event.testTitle && (
                        <p className="text-xs font-mono text-muted-foreground">
                          {event.testCaseId.slice(0, 8)}...
                        </p>
                      )}
                    </div>

                    {/* Time */}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                      <Clock className="h-3 w-3" />
                      <span title={formatTime(event.timestamp)}>
                        {getRelativeTime(event.timestamp)}
                      </span>
                    </div>
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
