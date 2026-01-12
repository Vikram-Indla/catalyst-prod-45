/**
 * TestCaseHistoryPanel - View execution history and version history for a test case
 */

import { useState } from 'react';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Clock, 
  Play, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  SkipForward,
  History,
  GitCommit,
  ExternalLink,
  ChevronRight,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExecutionRecord {
  id: string;
  runNumber: number;
  status: 'passed' | 'failed' | 'blocked' | 'skipped' | 'not_run';
  executedBy: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  cycleName: string;
  cycleId: string;
  executedAt: string;
  duration: number;
  defectsCount: number;
}

interface VersionRecord {
  id: string;
  version: number;
  changedBy: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  changedAt: string;
  summary: string;
  changes: {
    field: string;
    oldValue?: string;
    newValue?: string;
  }[];
}

interface TestCaseHistoryPanelProps {
  testCaseId: string;
  executions?: ExecutionRecord[];
  versions?: VersionRecord[];
  isLoading?: boolean;
  onViewExecution?: (executionId: string) => void;
  onViewVersion?: (version: number) => void;
  onCompareVersions?: (v1: number, v2: number) => void;
}

const statusConfig = {
  passed: { icon: CheckCircle, label: 'Passed', className: 'text-green-500 bg-green-500/10' },
  failed: { icon: XCircle, label: 'Failed', className: 'text-red-500 bg-red-500/10' },
  blocked: { icon: AlertTriangle, label: 'Blocked', className: 'text-amber-500 bg-amber-500/10' },
  skipped: { icon: SkipForward, label: 'Skipped', className: 'text-muted-foreground bg-muted' },
  not_run: { icon: Clock, label: 'Not Run', className: 'text-muted-foreground bg-muted' },
};

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

export function TestCaseHistoryPanel({
  testCaseId,
  executions = [],
  versions = [],
  isLoading = false,
  onViewExecution,
  onViewVersion,
  onCompareVersions,
}: TestCaseHistoryPanelProps) {
  const [selectedVersions, setSelectedVersions] = useState<number[]>([]);

  const handleVersionSelect = (version: number) => {
    setSelectedVersions(prev => {
      if (prev.includes(version)) {
        return prev.filter(v => v !== version);
      }
      if (prev.length >= 2) {
        return [prev[1], version];
      }
      return [...prev, version];
    });
  };

  const canCompare = selectedVersions.length === 2;

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <Tabs defaultValue="executions" className="h-full flex flex-col">
      <TabsList className="mx-4 mt-2">
        <TabsTrigger value="executions" className="gap-2">
          <Play className="h-4 w-4" />
          Executions ({executions.length})
        </TabsTrigger>
        <TabsTrigger value="versions" className="gap-2">
          <GitCommit className="h-4 w-4" />
          Versions ({versions.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="executions" className="flex-1 overflow-hidden mt-4">
        <ScrollArea className="h-full px-4">
          {executions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No execution history</p>
              <p className="text-sm">This test case hasn't been executed yet.</p>
            </div>
          ) : (
            <div className="space-y-2 pb-4">
              {executions.map((execution) => {
                const StatusIcon = statusConfig[execution.status].icon;
                return (
                  <div
                    key={execution.id}
                    className="border rounded-lg p-3 hover:bg-muted/50 transition-colors cursor-pointer group"
                    onClick={() => onViewExecution?.(execution.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'p-2 rounded-full',
                          statusConfig[execution.status].className
                        )}>
                          <StatusIcon className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Run #{execution.runNumber}</span>
                            <Badge variant="outline" className="text-xs">
                              {execution.cycleName}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Avatar className="h-4 w-4">
                              <AvatarImage src={execution.executedBy.avatarUrl} />
                              <AvatarFallback className="text-[10px]">
                                {execution.executedBy.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <span>{execution.executedBy.name}</span>
                            <span>•</span>
                            <span>{format(new Date(execution.executedAt), 'MMM d, yyyy h:mm a')}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <div className="text-right">
                          <div className="text-muted-foreground">{formatDuration(execution.duration)}</div>
                          {execution.defectsCount > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {execution.defectsCount} defect{execution.defectsCount > 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </TabsContent>

      <TabsContent value="versions" className="flex-1 overflow-hidden mt-4">
        {canCompare && (
          <div className="px-4 mb-3">
            <Button 
              size="sm" 
              onClick={() => onCompareVersions?.(selectedVersions[0], selectedVersions[1])}
            >
              Compare v{Math.min(...selectedVersions)} with v{Math.max(...selectedVersions)}
            </Button>
          </div>
        )}
        <ScrollArea className="h-full px-4">
          {versions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <GitCommit className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No version history</p>
              <p className="text-sm">This is the original version.</p>
            </div>
          ) : (
            <div className="relative pb-4">
              {/* Timeline line */}
              <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />
              
              <div className="space-y-4">
                {versions.map((version, idx) => (
                  <div key={version.id} className="relative flex gap-4">
                    {/* Timeline dot */}
                    <button
                      onClick={() => handleVersionSelect(version.version)}
                      className={cn(
                        'relative z-10 w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-medium transition-colors shrink-0',
                        selectedVersions.includes(version.version)
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'bg-background border-border hover:border-primary'
                      )}
                    >
                      v{version.version}
                    </button>

                    <div 
                      className="flex-1 border rounded-lg p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => onViewVersion?.(version.version)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={version.changedBy.avatarUrl} />
                            <AvatarFallback className="text-[10px]">
                              {version.changedBy.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{version.changedBy.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(version.changedAt), 'MMM d, yyyy h:mm a')}
                          </span>
                        </div>
                        {idx === 0 && (
                          <Badge variant="secondary" className="text-xs">Current</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{version.summary}</p>
                      {version.changes.length > 0 && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          {version.changes.slice(0, 3).map((change, i) => (
                            <span key={i} className="inline-flex items-center">
                              {i > 0 && <span className="mx-1">•</span>}
                              <span className="capitalize">{change.field}</span>
                            </span>
                          ))}
                          {version.changes.length > 3 && (
                            <span> +{version.changes.length - 3} more</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>
      </TabsContent>
    </Tabs>
  );
}
