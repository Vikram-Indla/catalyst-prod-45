/**
 * Cycle Row Component - List view row for test cycles
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
  Clock 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TableCell, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { TestCycle } from '../../api/types';

interface CycleRowProps {
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

export function CycleRow({ cycle, onEdit, onClone, onDelete }: CycleRowProps) {
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

  const handleRowClick = () => {
    navigate(`/test-management/cycles/${cycle.id}`);
  };

  return (
    <TableRow 
      className="cursor-pointer hover:bg-muted/50"
      onClick={handleRowClick}
    >
      <TableCell>
        <span className="font-mono text-sm text-primary">{cycle.cycle_key}</span>
      </TableCell>
      <TableCell>
        <span className="font-medium line-clamp-1">{cycle.title}</span>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={cn('text-xs', statusInfo.class)}>
          <StatusIcon className="h-3 w-3 mr-1" />
          {statusInfo.label}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2 min-w-[120px]">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full flex">
              {stats.passed_count > 0 && (
                <div 
                  className="bg-success h-full" 
                  style={{ width: `${(stats.passed_count / (stats.total_cases || 1)) * 100}%` }} 
                />
              )}
              {stats.failed_count > 0 && (
                <div 
                  className="bg-danger h-full" 
                  style={{ width: `${(stats.failed_count / (stats.total_cases || 1)) * 100}%` }} 
                />
              )}
              {stats.blocked_count > 0 && (
                <div 
                  className="bg-warning h-full" 
                  style={{ width: `${(stats.blocked_count / (stats.total_cases || 1)) * 100}%` }} 
                />
              )}
            </div>
          </div>
          <span className="text-sm font-medium w-10 text-right">{progress}%</span>
        </div>
      </TableCell>
      <TableCell className="text-success font-medium">{stats.passed_count}</TableCell>
      <TableCell className="text-danger font-medium">{stats.failed_count}</TableCell>
      <TableCell className="text-warning font-medium">{stats.blocked_count}</TableCell>
      <TableCell className="text-muted-foreground">
        {cycle.planned_end ? format(new Date(cycle.planned_end), 'MMM d') : '—'}
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
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
      </TableCell>
    </TableRow>
  );
}
