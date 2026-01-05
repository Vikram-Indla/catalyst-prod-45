/**
 * Execution Context Panel - Right sidebar with tabs (Summary, Queue, Defects, Activity)
 */

import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  Bug,
  Plus,
  Clock,
  User,
} from 'lucide-react';
import type { TestRun, CycleScope, ExecutionStatus } from '../../../api/types';

interface ExecutionContextPanelProps {
  run?: TestRun | null;
  scope: CycleScope[];
  currentScopeId: string | null;
  activeTab: 'summary' | 'queue' | 'defects' | 'activity';
  onTabChange: (tab: 'summary' | 'queue' | 'defects' | 'activity') => void;
  onSelectCase: (scope: CycleScope) => void;
  onLogDefect: () => void;
}

export function ExecutionContextPanel({
  run,
  scope,
  currentScopeId,
  activeTab,
  onTabChange,
  onSelectCase,
  onLogDefect,
}: ExecutionContextPanelProps) {
  // Calculate stats from steps
  const steps = run?.step_results || [];
  const passedCount = steps.filter(s => s.status === 'passed').length;
  const failedCount = steps.filter(s => s.status === 'failed').length;
  const blockedCount = steps.filter(s => s.status === 'blocked').length;
  const pendingCount = steps.filter(s => s.status === 'not_run' || s.status === 'in_progress').length;

  // Count defects (would come from API in real implementation)
  const defectCount = 0;

  return (
    <div className="w-[380px] flex-shrink-0 bg-background border-l flex flex-col overflow-hidden">
      {/* Tabs Header */}
      <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as any)} className="flex flex-col h-full">
        <TabsList className="w-full justify-start rounded-none bg-muted/50 border-b h-auto p-0">
          <TabsTrigger 
            value="summary" 
            className="flex-1 py-3 px-2 rounded-none data-[state=active]:bg-background data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary text-xs font-medium"
          >
            Summary
          </TabsTrigger>
          <TabsTrigger 
            value="queue" 
            className="flex-1 py-3 px-2 rounded-none data-[state=active]:bg-background data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary text-xs font-medium"
          >
            Queue
            <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[9px] bg-teal-100 text-teal-700">
              {scope.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger 
            value="defects" 
            className="flex-1 py-3 px-2 rounded-none data-[state=active]:bg-background data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary text-xs font-medium"
          >
            Defects
            {defectCount > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[9px] bg-destructive/10 text-destructive">
                {defectCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="activity" 
            className="flex-1 py-3 px-2 rounded-none data-[state=active]:bg-background data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary text-xs font-medium"
          >
            Activity
          </TabsTrigger>
        </TabsList>

        {/* Tab Contents */}
        <ScrollArea className="flex-1">
          <div className="p-4">
            {/* Summary Tab */}
            <TabsContent value="summary" className="m-0">
              <SummaryTab
                run={run}
                passedCount={passedCount}
                failedCount={failedCount}
                blockedCount={blockedCount}
                pendingCount={pendingCount}
              />
            </TabsContent>

            {/* Queue Tab */}
            <TabsContent value="queue" className="m-0">
              <QueueTab
                scope={scope}
                currentScopeId={currentScopeId}
                onSelectCase={onSelectCase}
              />
            </TabsContent>

            {/* Defects Tab */}
            <TabsContent value="defects" className="m-0">
              <DefectsTab onLogDefect={onLogDefect} />
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity" className="m-0">
              <ActivityTab />
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>
    </div>
  );
}

// Summary Tab Component
function SummaryTab({
  run,
  passedCount,
  failedCount,
  blockedCount,
  pendingCount,
}: {
  run?: TestRun | null;
  passedCount: number;
  failedCount: number;
  blockedCount: number;
  pendingCount: number;
}) {
  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          Run Summary
        </span>
      </div>

      {/* Summary Card */}
      <div className="p-4 bg-gradient-to-br from-muted/30 to-muted/50 border rounded-xl">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold">Current Run</span>
          <span className="text-xs text-muted-foreground">
            Run #{run?.run_number || 1}
          </span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-2">
          <div className="flex flex-col items-center p-2.5 bg-background border rounded-lg">
            <span className="text-lg font-bold text-teal-500">{passedCount}</span>
            <span className="text-[9px] font-semibold text-muted-foreground uppercase mt-0.5">
              Passed
            </span>
          </div>
          <div className="flex flex-col items-center p-2.5 bg-background border rounded-lg">
            <span className="text-lg font-bold text-destructive">{failedCount}</span>
            <span className="text-[9px] font-semibold text-muted-foreground uppercase mt-0.5">
              Failed
            </span>
          </div>
          <div className="flex flex-col items-center p-2.5 bg-background border rounded-lg">
            <span className="text-lg font-bold text-orange-500">{blockedCount}</span>
            <span className="text-[9px] font-semibold text-muted-foreground uppercase mt-0.5">
              Blocked
            </span>
          </div>
          <div className="flex flex-col items-center p-2.5 bg-background border rounded-lg">
            <span className="text-lg font-bold text-muted-foreground">{pendingCount}</span>
            <span className="text-[9px] font-semibold text-muted-foreground uppercase mt-0.5">
              Pending
            </span>
          </div>
        </div>
      </div>

      {/* Run Info */}
      {run && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span>Executed by {run.executed_by_user?.full_name || 'Unknown'}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Started {new Date(run.started_at).toLocaleTimeString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Queue Tab Component
function QueueTab({
  scope,
  currentScopeId,
  onSelectCase,
}: {
  scope: CycleScope[];
  currentScopeId: string | null;
  onSelectCase: (scope: CycleScope) => void;
}) {
  const statusConfig: Record<string, {
    icon: React.ReactNode;
    className: string;
  }> = {
    not_run: {
      icon: null,
      className: 'bg-muted text-muted-foreground',
    },
    in_progress: {
      icon: <Play className="h-2.5 w-2.5" />,
      className: 'bg-primary text-primary-foreground animate-pulse',
    },
    passed: {
      icon: <CheckCircle2 className="h-2.5 w-2.5" />,
      className: 'bg-teal-500 text-white',
    },
    failed: {
      icon: <XCircle className="h-2.5 w-2.5" />,
      className: 'bg-destructive text-destructive-foreground',
    },
    blocked: {
      icon: <AlertTriangle className="h-2.5 w-2.5" />,
      className: 'bg-orange-500 text-white',
    },
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          Test Case Queue
        </span>
      </div>

      <div className="space-y-1.5">
        {scope.map((item) => {
          const isCurrent = item.id === currentScopeId;
          const isCompleted = ['passed', 'failed', 'blocked'].includes(item.current_status);
          const config = statusConfig[item.current_status] || statusConfig.not_run;

          return (
            <div
              key={item.id}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2.5 border rounded-xl cursor-pointer transition-all',
                isCurrent
                  ? 'bg-primary/5 border-primary/30'
                  : 'bg-muted/50 hover:bg-background hover:border-border',
                isCompleted && 'opacity-60'
              )}
              onClick={() => onSelectCase(item)}
            >
              {/* Status Icon */}
              <div className={cn(
                'flex items-center justify-center w-6 h-6 rounded-full flex-shrink-0',
                config.className
              )}>
                {config.icon}
              </div>

              {/* Case Info */}
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold text-muted-foreground font-mono">
                  {item.test_case?.case_key || 'TC-000'}
                </div>
                <div className="text-[11px] text-foreground truncate">
                  {item.test_case?.title || 'Untitled'}
                </div>
              </div>
            </div>
          );
        })}

        {scope.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No test cases in queue
          </div>
        )}
      </div>
    </div>
  );
}

// Defects Tab Component
function DefectsTab({ onLogDefect }: { onLogDefect: () => void }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          Linked Defects
        </span>
      </div>

      {/* Empty State / Add Button */}
      <Button
        variant="outline"
        className="w-full justify-center gap-1.5 border-dashed border-destructive/30 text-destructive hover:bg-destructive/5"
        onClick={onLogDefect}
      >
        <Plus className="h-3.5 w-3.5" />
        <Bug className="h-3.5 w-3.5" />
        Log New Defect
      </Button>

      <div className="text-center py-6 text-muted-foreground text-sm">
        No defects logged yet
      </div>
    </div>
  );
}

// Activity Tab Component
function ActivityTab() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          Activity Feed
        </span>
      </div>

      <div className="text-center py-8 text-muted-foreground text-sm">
        No activity yet
      </div>
    </div>
  );
}
