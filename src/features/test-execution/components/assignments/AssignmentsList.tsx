/**
 * Module 4C-1: Run Case Assignments List
 */

import React, { useState } from 'react';
import {
  Play,
  CheckCircle,
  XCircle,
  AlertCircle,
  SkipForward,
  Clock,
  User,
  MoreHorizontal,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { RunCaseAssignment, AssignmentStatus } from '../../types/run-assignments';
import { ASSIGNMENT_STATUS_CONFIG } from '../../types/run-assignments';

interface AssignmentsListProps {
  assignments: RunCaseAssignment[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onStatusChange: (assignmentId: string, status: AssignmentStatus) => void;
  onRemove: (assignmentId: string, caseId: string) => void;
  onExecute?: (assignmentId: string) => void;
  isRunActive?: boolean;
}

export function AssignmentsList({
  assignments,
  selectedIds,
  onSelectionChange,
  onStatusChange,
  onRemove,
  onExecute,
  isRunActive = false,
}: AssignmentsListProps) {
  const toggleSelection = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((i) => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const selectAll = () => {
    onSelectionChange(assignments.map((a) => a.id));
  };

  const clearSelection = () => {
    onSelectionChange([]);
  };

  const getStatusIcon = (status: AssignmentStatus) => {
    const icons: Record<AssignmentStatus, React.ReactNode> = {
      pending: <Clock className="h-4 w-4 text-muted-foreground" />,
      in_progress: <Play className="h-4 w-4 text-blue-500" />,
      passed: <CheckCircle className="h-4 w-4 text-green-500" />,
      failed: <XCircle className="h-4 w-4 text-red-500" />,
      blocked: <AlertCircle className="h-4 w-4 text-amber-500" />,
      skipped: <SkipForward className="h-4 w-4 text-gray-400" />,
    };
    return icons[status];
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (assignments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg bg-muted/20">
        <Clock className="h-10 w-10 text-muted-foreground/50 mb-3" />
        <h3 className="font-medium text-foreground">No Test Cases Assigned</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Add test cases to this run to begin execution
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Selection header */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={selectedIds.length === assignments.length}
            onCheckedChange={(checked) => (checked ? selectAll() : clearSelection())}
          />
          <span className="text-muted-foreground">
            {selectedIds.length > 0
              ? `${selectedIds.length} selected`
              : `${assignments.length} test cases`}
          </span>
        </div>
      </div>

      {/* Assignments list */}
      <ScrollArea className="h-[400px] rounded-md border">
        <div className="divide-y">
          {assignments.map((assignment) => {
            const statusConfig = ASSIGNMENT_STATUS_CONFIG[assignment.status];
            const isSelected = selectedIds.includes(assignment.id);

            return (
              <div
                key={assignment.id}
                className={cn(
                  'flex items-center gap-3 p-3 transition-colors',
                  isSelected && 'bg-primary/5'
                )}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleSelection(assignment.id)}
                />

                {/* Status icon */}
                <div className="flex-shrink-0">{getStatusIcon(assignment.status)}</div>

                {/* Case info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {assignment.case_key}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn('text-xs', statusConfig.bgClass, statusConfig.textClass)}
                    >
                      {statusConfig.label}
                    </Badge>
                  </div>
                  <p className="text-sm truncate">{assignment.case_title}</p>
                </div>

                {/* Assigned tester */}
                <div className="flex-shrink-0">
                  {assignment.assigned_tester_name ? (
                    <div className="flex items-center gap-1.5">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[10px]">
                          {getInitials(assignment.assigned_tester_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        {assignment.assigned_tester_name.split(' ')[0]}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span className="text-xs hidden sm:inline">Unassigned</span>
                    </div>
                  )}
                </div>

                {/* Duration */}
                <div className="text-xs text-muted-foreground w-16 text-right hidden md:block">
                  {formatDuration(assignment.duration_seconds)}
                </div>

                {/* Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {isRunActive && assignment.status === 'pending' && onExecute && (
                      <DropdownMenuItem onClick={() => onExecute(assignment.id)}>
                        <Play className="h-4 w-4 mr-2" />
                        Execute
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => onStatusChange(assignment.id, 'passed')}>
                      <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                      Mark Passed
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onStatusChange(assignment.id, 'failed')}>
                      <XCircle className="h-4 w-4 mr-2 text-red-500" />
                      Mark Failed
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onStatusChange(assignment.id, 'blocked')}>
                      <AlertCircle className="h-4 w-4 mr-2 text-amber-500" />
                      Mark Blocked
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onStatusChange(assignment.id, 'skipped')}>
                      <SkipForward className="h-4 w-4 mr-2 text-gray-400" />
                      Skip
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onRemove(assignment.id, assignment.test_case_id)}
                      className="text-destructive"
                      disabled={assignment.status !== 'pending'}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
