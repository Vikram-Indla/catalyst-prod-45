/**
 * CycleCardView - Grid card view for test cycles
 * Based on Catalyst V5 Phase 5 spec
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { format, differenceInDays } from 'date-fns';
import { 
  MoreHorizontal, 
  Copy, 
  Trash2, 
  Edit, 
  Play, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Calendar,
  ArrowRight,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { TestCycle } from '../../api/types';

interface CycleCardViewProps {
  cycles: TestCycle[];
  onCycleClick?: (cycle: TestCycle) => void;
  onEdit?: (cycle: TestCycle) => void;
  onClone?: (cycle: TestCycle) => void;
  onDelete?: (cycle: TestCycle) => void;
}

const STATUS_CONFIG: Record<string, { label: string; class: string; icon: React.ElementType }> = {
  planned: { label: 'Not Started', class: 'bg-muted text-muted-foreground', icon: Clock },
  active: { label: 'In Progress', class: 'bg-info/10 text-info border-info/20', icon: Play },
  completed: { label: 'Completed', class: 'bg-success/10 text-success border-success/20', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', class: 'bg-danger/10 text-danger border-danger/20', icon: XCircle },
};

export function CycleCardView({ cycles, onCycleClick, onEdit, onClone, onDelete }: CycleCardViewProps) {
  const navigate = useNavigate();

  const handleCardClick = (cycle: TestCycle) => {
    if (onCycleClick) {
      onCycleClick(cycle);
    } else {
      navigate(`/tests/cycles/${cycle.id}`);
    }
  };

  const getDaysLeft = (cycle: TestCycle) => {
    if (cycle.status === 'completed') return null;
    if (cycle.status === 'cancelled') return null;
    if (!cycle.planned_end) return null;
    
    const daysLeft = differenceInDays(new Date(cycle.planned_end), new Date());
    if (daysLeft < 0) {
      return { text: `${Math.abs(daysLeft)}d overdue`, color: 'text-danger' };
    }
    if (daysLeft <= 2) {
      return { text: `${daysLeft}d left`, color: 'text-danger' };
    }
    return { text: `${daysLeft}d left`, color: 'text-muted-foreground' };
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {cycles.map((cycle) => {
        const statusInfo = STATUS_CONFIG[cycle.status] || STATUS_CONFIG.planned;
        const StatusIcon = statusInfo.icon;
        const stats = cycle.statistics || { total_cases: 0, passed_count: 0, failed_count: 0, blocked_count: 0, not_run_count: 0 };
        const total = stats.total_cases || 1;
        const executed = total - stats.not_run_count;
        const progress = Math.round((executed / total) * 100);
        const passRate = executed > 0 ? Math.round((stats.passed_count / executed) * 100) : 0;
        const daysInfo = getDaysLeft(cycle);

        return (
          <Card 
            key={cycle.id}
            className="hover:shadow-md transition-shadow cursor-pointer group"
            onClick={() => handleCardClick(cycle)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-primary">{cycle.cycle_key}</span>
                    <Badge variant="outline" className={cn('text-xs', statusInfo.class)}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusInfo.label}
                    </Badge>
                    {daysInfo && (
                      <span className={cn('text-xs', daysInfo.color)}>{daysInfo.text}</span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold line-clamp-1">{cycle.title}</h3>
                  {cycle.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{cycle.description}</p>
                  )}
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
                        style={{ width: `${(stats.passed_count / total) * 100}%` }} 
                      />
                    )}
                    {stats.failed_count > 0 && (
                      <div 
                        className="bg-danger h-full" 
                        style={{ width: `${(stats.failed_count / total) * 100}%` }} 
                      />
                    )}
                    {stats.blocked_count > 0 && (
                      <div 
                        className="bg-warning h-full" 
                        style={{ width: `${(stats.blocked_count / total) * 100}%` }} 
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
              <div className="flex items-center justify-between text-sm text-muted-foreground pt-3 border-t border-border">
                <div className="flex items-center gap-3 flex-wrap">
                  {cycle.planned_start && cycle.planned_end && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {format(new Date(cycle.planned_start), 'MMM d')} - {format(new Date(cycle.planned_end), 'MMM d')}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCardClick(cycle);
                  }}
                >
                  View Details
                </Button>
                <div className="flex items-center gap-2">
                  {cycle.status !== 'planned' && executed > 0 && (
                    <span className={cn(
                      'text-sm font-medium',
                      passRate >= 80 ? 'text-success' : passRate >= 60 ? 'text-warning' : 'text-danger'
                    )}>
                      {passRate}% pass
                    </span>
                  )}
                  {(cycle.status === 'active' || cycle.status === 'planned') && stats.not_run_count > 0 && (
                    <Button 
                      size="sm" 
                      className="gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/tests/cycles/${cycle.id}`);
                      }}
                    >
                      {cycle.status === 'planned' ? 'Start' : 'Continue'}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default CycleCardView;
