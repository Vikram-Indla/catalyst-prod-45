/**
 * Fix Issues Panel Component
 * Allows users to selectively fix identified design issues
 */

import { useState } from 'react';
import { 
  Wrench, CheckCircle2, XCircle, Clock, Play, Pause, 
  RefreshCw, FileCode, AlertTriangle, Zap, ArrowRight 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { type DesignGap, detectedGaps } from '@/lib/designAudit/designSystemBaseline';
import { toast } from 'sonner';

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
    toast.success('Fix operation completed');
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
      case 'pending': return <Clock className="h-4 w-4 text-muted-foreground" />;
      case 'running': return <RefreshCw className="h-4 w-4 text-brand-gold animate-spin" />;
      case 'success': return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'failed': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'skipped': return <ArrowRight className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Fix Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-success/30 bg-success/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <Zap className="h-5 w-5 text-success" />
              </div>
              <div>
                <div className="text-2xl font-bold text-success">{autoFixableGaps.length}</div>
                <div className="text-xs text-muted-foreground">Auto-fixable Issues</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <Wrench className="h-5 w-5 text-warning" />
              </div>
              <div>
                <div className="text-2xl font-bold text-warning">{manualGaps.length}</div>
                <div className="text-xs text-muted-foreground">Manual Fixes Required</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className={cn(
          tasks.length > 0 && progress === 100 && "border-brand-gold/30 bg-brand-gold/5"
        )}>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-brand-gold/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-brand-gold" />
              </div>
              <div>
                <div className="text-2xl font-bold text-brand-gold">{successCount}/{tasks.length || autoFixableGaps.length}</div>
                <div className="text-xs text-muted-foreground">Fixes Applied</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fix Controls */}
      <Card>
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Wrench className="h-4 w-4 text-brand-gold" />
                Fix Queue
              </CardTitle>
              <CardDescription>Apply fixes to align with design system baseline</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {tasks.length > 0 && (
                <Button variant="outline" size="sm" onClick={resetTasks}>
                  <RefreshCw className="h-4 w-4 mr-1.5" />
                  Reset
                </Button>
              )}
              <Button 
                size="sm" 
                onClick={isRunning ? pauseFixes : runFixes}
                className={isRunning ? "bg-warning hover:bg-warning/90" : "bg-brand-gold hover:bg-brand-gold-hover"}
              >
                {isRunning ? (
                  <>
                    <Pause className="h-4 w-4 mr-1.5" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-1.5" />
                    {tasks.length > 0 ? 'Resume' : 'Start Fixes'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        {tasks.length > 0 && (
          <>
            <Separator />
            <CardContent className="py-3">
              <div className="flex items-center gap-4 mb-2">
                <Progress value={progress} className="flex-1 h-2" />
                <span className="text-sm font-medium">{progress}%</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-success" />
                  {successCount} Fixed
                </span>
                <span className="flex items-center gap-1">
                  <XCircle className="h-3 w-3 text-destructive" />
                  {failedCount} Failed
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {tasks.filter(t => t.status === 'pending').length} Pending
                </span>
              </div>
            </CardContent>
          </>
        )}
        
        <CardContent className="p-0">
          <ScrollArea className="h-[300px]">
            {tasks.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Wrench className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Click "Start Fixes" to begin applying auto-fixes</p>
                <p className="text-xs mt-1">{autoFixableGaps.length} issues will be processed</p>
              </div>
            ) : (
              <div className="divide-y">
                {tasks.map((task, idx) => (
                  <div 
                    key={task.id}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5",
                      task.status === 'running' && "bg-brand-gold/5",
                      task.status === 'success' && "bg-success/5",
                      task.status === 'failed' && "bg-destructive/5"
                    )}
                  >
                    {getStatusIcon(task.status)}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{task.gap.component}</span>
                        <Badge variant="outline" className="text-[10px]">{task.gap.property}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {task.gap.current} → {task.gap.expected}
                      </div>
                    </div>
                    
                    {task.gap.file && (
                      <code className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <FileCode className="h-3 w-3" />
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
        </CardContent>
      </Card>

      {/* Manual Fixes Required */}
      {manualGaps.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Manual Fixes Required ({manualGaps.length})
            </CardTitle>
            <CardDescription>These issues require manual code changes</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[200px]">
              <div className="divide-y">
                {manualGaps.map(gap => (
                  <div key={gap.id} className="flex items-center gap-3 px-4 py-2.5">
                    <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
