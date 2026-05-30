/**
 * Fix Issues Panel Component
 * Allows users to selectively fix identified design issues
 */

import { useState } from 'react';
import Button from '@atlaskit/button/new';
import { Lozenge } from '@/components/ads';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { type DesignGap, detectedGaps } from '@/lib/designAudit/designSystemBaseline';
import { catalystToast } from '@/lib/catalystToast';
import ArrowRightIcon from '@atlaskit/icon/core/arrow-right';
import AutomationIcon from '@atlaskit/icon/core/automation';
import CheckCircleIcon from '@atlaskit/icon/core/check-circle';
import ClockIcon from '@atlaskit/icon/core/clock';
import CrossCircleIcon from '@atlaskit/icon/core/cross-circle';
import FileIcon from '@atlaskit/icon/core/file';
import RefreshIcon from '@atlaskit/icon/core/refresh';
import ToolsIcon from '@atlaskit/icon/core/tools';
import VideoPauseIcon from '@atlaskit/icon/core/video-pause';
import VideoPlayIcon from '@atlaskit/icon/core/video-play';
import WarningIcon from '@atlaskit/icon/core/warning';

interface FixTask {
  id: string;
  gap: DesignGap;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  message?: string;
}

export function FixIssuesPanel() {
  const [tasks, setTasks] = useState<FixTask[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);

  const autoFixableGaps = detectedGaps.filter(g => g.autoFixable);
  const manualGaps = detectedGaps.filter(g => !g.autoFixable);

  const initializeTasks = () => {
    const newTasks: FixTask[] = autoFixableGaps.map(gap => ({
      id: gap.id,
      gap,
      status: 'pending',
    }));
    setTasks(newTasks);
    setCurrentTaskIndex(0);
  };

  const runFixes = async () => {
    if (tasks.length === 0) {
      initializeTasks();
    }
    
    setIsRunning(true);
    
    // Simulate running fixes
    for (let i = currentTaskIndex; i < tasks.length; i++) {
      setCurrentTaskIndex(i);
      
      // Update current task to running
      setTasks(prev => prev.map((t, idx) => 
        idx === i ? { ...t, status: 'running' } : t
      ));
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Randomly succeed or fail (for demo)
      const success = Math.random() > 0.1;
      
      setTasks(prev => prev.map((t, idx) => 
        idx === i ? { 
          ...t, 
          status: success ? 'success' : 'failed',
          message: success ? 'Fixed successfully' : 'Requires manual review'
        } : t
      ));
    }
    
    setIsRunning(false);
    catalystToast.success('Fix operation completed');
  };

  const pauseFixes = () => {
    setIsRunning(false);
  };

  const resetTasks = () => {
    setTasks([]);
    setCurrentTaskIndex(0);
    setIsRunning(false);
  };

  const progress = tasks.length > 0 
    ? Math.round((tasks.filter(t => t.status !== 'pending' && t.status !== 'running').length / tasks.length) * 100)
    : 0;

  const successCount = tasks.filter(t => t.status === 'success').length;
  const failedCount = tasks.filter(t => t.status === 'failed').length;

  const getStatusIcon = (status: FixTask['status']) => {
    switch (status) {
      case 'pending': return <ClockIcon label="" size="small" />;
      case 'running': return <RefreshIcon label="" size="small" />;
      case 'success': return <CheckCircleIcon label="" size="small" />;
      case 'failed': return <CrossCircleIcon label="" size="small" />;
      case 'skipped': return <ArrowRightIcon label="" size="small" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Fix Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div style={{ background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px', padding: '16px' }}>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
              <AutomationIcon label="" size="small" />
            </div>
            <div>
              <div className="text-2xl font-bold text-success">{autoFixableGaps.length}</div>
              <div className="text-xs text-muted-foreground">Auto-fixable Issues</div>
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px', padding: '16px' }}>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <ToolsIcon label="" size="small" />
            </div>
            <div>
              <div className="text-2xl font-bold text-warning">{manualGaps.length}</div>
              <div className="text-xs text-muted-foreground">Manual Fixes Required</div>
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px', padding: '16px' }}>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-brand-primary/10 flex items-center justify-center">
              <CheckCircleIcon label="" size="small" />
            </div>
            <div>
              <div className="text-2xl font-bold text-brand-primary">{successCount}/{tasks.length || autoFixableGaps.length}</div>
              <div className="text-xs text-muted-foreground">Fixes Applied</div>
            </div>
          </div>
        </div>
      </div>

      {/* Fix Controls */}
      <div style={{ background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px' }}>
        <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--ds-border-layout, #EBECF0)' }}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base flex items-center gap-2" style={{ fontWeight: 500, margin: 0 }}>
                <ToolsIcon label="" size="small" />
                Fix Queue
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--ds-text-subtlest, #626F86)', margin: '4px 0 0' }}>Apply fixes to align with design system baseline</p>
            </div>
            <div className="flex items-center gap-2">
              {tasks.length > 0 && (
                <Button appearance="default" iconBefore={RefreshIcon} onClick={resetTasks}>
                  Reset
                </Button>
              )}
              <Button
                appearance={isRunning ? 'warning' : 'primary'}
                iconBefore={isRunning ? VideoPauseIcon : VideoPlayIcon}
                onClick={isRunning ? pauseFixes : runFixes}
              >
                {isRunning ? 'Pause' : (tasks.length > 0 ? 'Resume' : 'Start Fixes')}
              </Button>
            </div>
          </div>
        </div>

        {tasks.length > 0 && (
          <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--ds-border-layout, #EBECF0)' }}>
            <div className="flex items-center gap-4 mb-2">
              <Progress value={progress} className="flex-1 h-2" />
              <span className="text-sm font-medium">{progress}%</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <CheckCircleIcon label="" size="small" />
                {successCount} Fixed
              </span>
              <span className="flex items-center gap-1">
                <CrossCircleIcon label="" size="small" />
                {failedCount} Failed
              </span>
              <span className="flex items-center gap-1">
                <ClockIcon label="" size="small" />
                {tasks.filter(t => t.status === 'pending').length} Pending
              </span>
            </div>
          </div>
        )}

        <div>
          <ScrollArea className="h-[300px]">
            {tasks.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <ToolsIcon label="" size="small" />
                <p className="text-sm">Click "Start Fixes" to begin applying auto-fixes</p>
                <p className="text-xs mt-1">{autoFixableGaps.length} issues will be processed</p>
              </div>
            ) : (
              <div className="divide-y">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5",
                      task.status === 'running' && "bg-brand-primary/5",
                      task.status === 'success' && "bg-success/5",
                      task.status === 'failed' && "bg-destructive/5"
                    )}
                  >
                    {getStatusIcon(task.status)}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{task.gap.component}</span>
                        <Lozenge appearance="default">{task.gap.property}</Lozenge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {task.gap.current} → {task.gap.expected}
                      </div>
                    </div>

                    {task.gap.file && (
                      <code className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <FileIcon label="" size="small" />
                        {task.gap.file}
                      </code>
                    )}

                    {task.message && (
                      <span className={cn(
                        "text-xs",
                        task.status === 'success' ? "text-success" : "text-destructive"
                      )}>
                        {task.message}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>

      {/* Manual Fixes Required */}
      {manualGaps.length > 0 && (
        <div style={{ background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px' }}>
          <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--ds-border-layout, #EBECF0)' }}>
            <h3 className="text-base flex items-center gap-2" style={{ fontWeight: 500, margin: 0 }}>
              <WarningIcon label="" size="small" />
              Manual Fixes Required ({manualGaps.length})
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--ds-text-subtlest, #626F86)', margin: '4px 0 0' }}>These issues require manual code changes</p>
          </div>
          <div>
            <ScrollArea className="h-[200px]">
              <div className="divide-y">
                {manualGaps.map(gap => (
                  <div key={gap.id} className="flex items-center gap-3 px-4 py-2.5">
                    <WarningIcon label="" size="small" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{gap.component}</span>
                        <code className="text-[10px] text-muted-foreground bg-secondary px-1 rounded">
                          {gap.route}
                        </code>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {gap.property}: {gap.current} → {gap.expected}
                      </div>
                    </div>
                    {gap.file && (
                      <code className="text-[10px] text-muted-foreground">{gap.file}</code>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  );
}
