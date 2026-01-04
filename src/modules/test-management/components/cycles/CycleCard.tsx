/**
 * Cycle Card Component - Grid view card for test cycles
 */

import React from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { 
  MoreHorizontal, 
  Copy, 
  Trash2, 
  Edit, 
  Play, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Users,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { TestCycle } from '../../api/types';

interface CycleCardProps {
  cycle: TestCycle;
  onEdit?: (cycle: TestCycle) => void;
  onClone?: (cycle: TestCycle) => void;
  onDelete?: (cycle: TestCycle) => void;
}

const STATUS_CONFIG: Record<string, { label: string; class: string; icon: React.ElementType }> = {
  planned: { label: 'Planned', class: 'bg-muted text-muted-foreground', icon: Clock },
  active: { label: 'In Progress', class: 'bg-info/10 text-info border-info/20', icon: Play },
  completed: { label: 'Completed', class: 'bg-success/10 text-success border-success/20', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', class: 'bg-danger/10 text-danger border-danger/20', icon: XCircle },
};

export function CycleCard({ cycle, onEdit, onClone, onDelete }: CycleCardProps) {
  const navigate = useNavigate();
  const statusInfo = STATUS_CONFIG[cycle.status] || STATUS_CONFIG.planned;
  const StatusIcon = statusInfo.icon;

  // Calculate stats
  const stats = cycle.statistics || {
    total_cases: 0,
    not_run_count: 0,
    passed_count: 0,
    failed_count: 0,
    blocked_count: 0,
  };

  const totalExecuted = stats.total_cases - stats.not_run_count;
  const progress = stats.total_cases > 0 
    ? Math.round((totalExecuted / stats.total_cases) * 100) 
    : 0;
  const passRate = totalExecuted > 0 
    ? Math.round((stats.passed_count / totalExecuted) * 100) 
    : 0;

  const handleCardClick = () => {
    navigate(`/test-management/cycles/${cycle.id}`);
  };

  return (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer group"
      onClick={handleCardClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-primary">{cycle.cycle_key}</span>
              <Badge variant="outline" className={cn('text-xs', statusInfo.class)}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusInfo.label}
              </Badge>
            </div>
            <CardTitle className="text-lg line-clamp-1">{cycle.title}</CardTitle>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => onEdit?.(cycle)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onClone?.(cycle)}>
                <Copy className="h-4 w-4 mr-2" />
                Clone
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive"
                onClick={() => onDelete?.(cycle)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div>
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full flex">
              {stats.passed_count > 0 && (
                <div 
                  className="bg-success h-full" 
                  style={{ width: `${(stats.passed_count / stats.total_cases) * 100}%` }} 
                />
              )}
              {stats.failed_count > 0 && (
                <div 
                  className="bg-danger h-full" 
                  style={{ width: `${(stats.failed_count / stats.total_cases) * 100}%` }} 
                />
              )}
              {stats.blocked_count > 0 && (
                <div 
                  className="bg-warning h-full" 
                  style={{ width: `${(stats.blocked_count / stats.total_cases) * 100}%` }} 
                />
              )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-5 gap-2 text-center">
          <div className="space-y-0.5">
            <div className="text-lg font-bold">{stats.total_cases}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-lg font-bold text-success">{stats.passed_count}</div>
            <div className="text-xs text-muted-foreground">Passed</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-lg font-bold text-danger">{stats.failed_count}</div>
            <div className="text-xs text-muted-foreground">Failed</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-lg font-bold text-warning">{stats.blocked_count}</div>
            <div className="text-xs text-muted-foreground">Blocked</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-lg font-bold text-muted-foreground">{stats.not_run_count}</div>
            <div className="text-xs text-muted-foreground">Not Run</div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t border-border-subtle">
          <div className="flex items-center gap-4">
            {cycle.environment && (
              <span>{cycle.environment.name}</span>
            )}
            {cycle.planned_end && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(cycle.planned_end), 'MMM d, yyyy')}
              </span>
            )}
          </div>
          {cycle.status !== 'planned' && (
            <span className={cn(
              'font-semibold',
              passRate >= 80 ? 'text-success' : passRate >= 60 ? 'text-warning' : 'text-danger'
            )}>
              {passRate}% Pass Rate
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
