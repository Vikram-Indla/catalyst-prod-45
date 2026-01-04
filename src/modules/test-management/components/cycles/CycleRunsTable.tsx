/**
 * Cycle Runs Table Component
 */

import React from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Circle,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { TestRun, ExecutionStatus } from '../../api/types';

interface CycleRunsTableProps {
  runs: TestRun[];
  onViewRun: (runId: string) => void;
}

const STATUS_CONFIG: Record<ExecutionStatus, { 
  label: string; 
  icon: React.ElementType;
  className: string;
}> = {
  not_run: { label: 'Not Run', icon: Circle, className: 'text-muted-foreground' },
  in_progress: { label: 'In Progress', icon: Loader2, className: 'text-info' },
  passed: { label: 'Passed', icon: CheckCircle2, className: 'text-success' },
  failed: { label: 'Failed', icon: XCircle, className: 'text-danger' },
  blocked: { label: 'Blocked', icon: AlertTriangle, className: 'text-warning' },
  skipped: { label: 'Skipped', icon: Circle, className: 'text-muted-foreground' },
};

export function CycleRunsTable({ runs, onViewRun }: CycleRunsTableProps) {
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : `${secs}s`;
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-20">Run #</TableHead>
            <TableHead>Case</TableHead>
            <TableHead className="w-36">Executor</TableHead>
            <TableHead className="w-28">Status</TableHead>
            <TableHead className="w-20">Duration</TableHead>
            <TableHead className="w-32">Started</TableHead>
            <TableHead className="w-20">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {runs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                No test runs yet. Execute test cases to see runs here.
              </TableCell>
            </TableRow>
          ) : (
            runs.map((run) => {
              const statusConfig = STATUS_CONFIG[run.status];
              const StatusIcon = statusConfig.icon;
              
              return (
                <TableRow key={run.id} className="group">
                  <TableCell>
                    <span className="font-mono text-sm">#{run.run_number}</span>
                  </TableCell>
                  <TableCell>
                    <span className="line-clamp-1">
                      {run.scope?.test_case?.case_key || 'Unknown'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {run.executed_by_user ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={run.executed_by_user.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {getInitials(run.executed_by_user.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm truncate">
                          {run.executed_by_user.full_name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className={cn('flex items-center gap-1.5', statusConfig.className)}>
                      <StatusIcon className="h-4 w-4" />
                      <span className="text-sm">{statusConfig.label}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDuration(run.duration_seconds)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {run.started_at 
                      ? formatDistanceToNow(new Date(run.started_at), { addSuffix: true })
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => onViewRun(run.id)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
