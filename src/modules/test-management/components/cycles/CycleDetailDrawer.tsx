/**
 * Cycle Detail Drawer
 * Side panel showing detailed cycle information, progress, and actions
 */

import React from 'react';
import { format } from 'date-fns';
import { 
  X, 
  Edit, 
  Play, 
  CheckCircle2, 
  Copy, 
  Trash2,
  Calendar,
  Users,
  Folder,
  Clock,
  Target,
  AlertTriangle,
  ExternalLink,
  BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { TestCycle, CycleStatus } from '../../api/types';

interface CycleDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cycle: TestCycle | null;
  onEdit: (cycle: TestCycle) => void;
  onStart: (cycle: TestCycle) => void;
  onComplete: (cycle: TestCycle) => void;
  onClone: (cycle: TestCycle) => void;
  onDelete: (cycle: TestCycle) => void;
  onViewExecution: (cycle: TestCycle) => void;
}

const STATUS_CONFIG: Record<CycleStatus, { label: string; className: string; icon: React.ReactNode }> = {
  planned: { 
    label: 'Planned', 
    className: 'bg-muted text-muted-foreground border-border',
    icon: <Calendar className="h-3.5 w-3.5" />
  },
  active: { 
    label: 'In Progress', 
    className: 'bg-info/10 text-info border-info/20',
    icon: <Play className="h-3.5 w-3.5" />
  },
  completed: { 
    label: 'Completed', 
    className: 'bg-success/10 text-success border-success/20',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />
  },
  cancelled: { 
    label: 'Cancelled', 
    className: 'bg-destructive/10 text-destructive border-destructive/20',
    icon: <X className="h-3.5 w-3.5" />
  },
};

export function CycleDetailDrawer({
  open,
  onOpenChange,
  cycle,
  onEdit,
  onStart,
  onComplete,
  onClone,
  onDelete,
  onViewExecution,
}: CycleDetailDrawerProps) {
  if (!cycle) return null;

  const stats = cycle.statistics || { total_cases: 0, passed_count: 0, failed_count: 0, blocked_count: 0, not_run_count: 0 };
  const totalCases = stats.total_cases;
  const executedCount = stats.passed_count + stats.failed_count + stats.blocked_count;
  const progressPercent = totalCases > 0 ? Math.round((executedCount / totalCases) * 100) : 0;
  const passRate = executedCount > 0 ? Math.round((stats.passed_count / executedCount) * 100) : 0;

  const statusConfig = STATUS_CONFIG[cycle.status] || STATUS_CONFIG.planned;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[480px] sm:max-w-[480px] p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-muted-foreground">{cycle.cycle_key}</span>
                <Badge variant="outline" className={cn('text-xs', statusConfig.className)}>
                  {statusConfig.icon}
                  <span className="ml-1">{statusConfig.label}</span>
                </Badge>
              </div>
              <SheetTitle className="text-lg font-semibold">{cycle.title}</SheetTitle>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-180px)]">
          <div className="p-6 space-y-6">
            {/* Progress Overview */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                Execution Progress
              </h3>
              <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Overall Progress</span>
                  <span className="font-medium">{progressPercent}%</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
                
                {/* Segmented Progress */}
                <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                  {stats.passed_count > 0 && (
                    <div 
                      className="bg-success transition-all"
                      style={{ width: `${(stats.passed_count / totalCases) * 100}%` }}
                    />
                  )}
                  {stats.failed_count > 0 && (
                    <div 
                      className="bg-destructive transition-all"
                      style={{ width: `${(stats.failed_count / totalCases) * 100}%` }}
                    />
                  )}
                  {stats.blocked_count > 0 && (
                    <div 
                      className="bg-warning transition-all"
                      style={{ width: `${(stats.blocked_count / totalCases) * 100}%` }}
                    />
                  )}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-4 gap-2 pt-2">
                  <div className="text-center">
                    <div className="text-lg font-bold text-success">{stats.passed_count}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">Passed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-destructive">{stats.failed_count}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">Failed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-warning">{stats.blocked_count}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">Blocked</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-muted-foreground">{stats.not_run_count}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">Not Run</div>
                  </div>
                </div>

                {passRate > 0 && (
                  <div className="flex items-center justify-between pt-2 border-t text-sm">
                    <span className="text-muted-foreground">Pass Rate</span>
                    <span className={cn('font-medium', passRate >= 80 ? 'text-success' : passRate >= 60 ? 'text-warning' : 'text-destructive')}>
                      {passRate}%
                    </span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Details</h3>
              
              {cycle.description && (
                <p className="text-sm text-muted-foreground">{cycle.description}</p>
              )}

              <div className="space-y-3">
                {/* Schedule */}
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="text-muted-foreground">Planned: </span>
                    {cycle.planned_start && cycle.planned_end ? (
                      <span>
                        {format(new Date(cycle.planned_start), 'MMM d')} - {format(new Date(cycle.planned_end), 'MMM d, yyyy')}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Not scheduled</span>
                    )}
                  </div>
                </div>

                {/* Environment */}
                {cycle.environment && (
                  <div className="flex items-center gap-3 text-sm">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="text-muted-foreground">Environment: </span>
                      <span>{cycle.environment.name}</span>
                    </div>
                  </div>
                )}

                {/* Total Cases */}
                <div className="flex items-center gap-3 text-sm">
                  <Folder className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="text-muted-foreground">Test Cases: </span>
                    <span>{totalCases} cases</span>
                  </div>
                </div>

                {/* Created */}
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="text-muted-foreground">Created: </span>
                    <span>{format(new Date(cycle.created_at), 'MMM d, yyyy')}</span>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Quick Actions */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onViewExecution(cycle)}
                  className="justify-start"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Execution
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onEdit(cycle)}
                  className="justify-start"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Cycle
                </Button>
                {cycle.status === 'planned' && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => onStart(cycle)}
                    className="justify-start"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Cycle
                  </Button>
                )}
                {cycle.status === 'active' && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => onComplete(cycle)}
                    className="justify-start"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Complete
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onClone(cycle)}
                  className="justify-start"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Clone
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onDelete(cycle)}
                  className="justify-start text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-background">
          <Button className="w-full" onClick={() => onViewExecution(cycle)}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Cycle Execution
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default CycleDetailDrawer;
