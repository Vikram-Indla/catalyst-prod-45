/**
 * Assignment Row - Individual table row with inline editing
 */

import React, { useState } from 'react';
import { format } from 'date-fns';
import { 
  MoreHorizontal, CheckCircle, XCircle, AlertTriangle, Clock, PlayCircle,
  Bot, User, Settings, ExternalLink
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { CATALYST_V5, TEST_STATUS_COLORS, TEST_PRIORITY_COLORS } from '@/lib/catalyst-colors';
import { StatusSelect } from './StatusSelect';
import { AssigneeSelect } from './AssigneeSelect';
import { PrioritySelect } from './PrioritySelect';
import { DatePickerCell } from './DatePickerCell';
import type { CycleAssignment, TestStatus, TestPriority, TeamMemberOption } from '@/types/assignment-table.types';

interface AssignmentRowProps {
  assignment: CycleAssignment;
  index: number;
  isSelected: boolean;
  onSelect: (shiftKey: boolean) => void;
  onEdit: (field: string, value: any) => void;
  onOpenDetails: () => void;
  teamMembers: TeamMemberOption[];
  visibleColumns: string[];
}

const STATUS_ICONS = {
  passed: CheckCircle,
  failed: XCircle,
  blocked: AlertTriangle,
  in_progress: PlayCircle,
  not_started: Clock,
};

const AUTOMATION_ICONS = {
  automated: { icon: Bot, color: CATALYST_V5.teal },
  manual: { icon: User, color: CATALYST_V5.slate[400] },
  partial: { icon: Settings, color: CATALYST_V5.warning },
};

export function AssignmentRow({
  assignment,
  index,
  isSelected,
  onSelect,
  onEdit,
  onOpenDetails,
  teamMembers,
  visibleColumns,
}: AssignmentRowProps) {
  const statusStyle = TEST_STATUS_COLORS[assignment.status];
  const priorityStyle = TEST_PRIORITY_COLORS[assignment.priority];
  const StatusIcon = STATUS_ICONS[assignment.status];
  const automationConfig = AUTOMATION_ICONS[assignment.automationStatus];
  const AutoIcon = automationConfig.icon;

  const cellClass = "px-3 py-2.5 text-sm";
  const isEvenRow = index % 2 === 1;

  return (
    <tr 
      className={cn(
        "group transition-colors",
        isSelected && "border-l-2",
        !isSelected && isEvenRow && "bg-slate-50/50"
      )}
      style={{
        backgroundColor: isSelected ? CATALYST_V5.primaryLighter : undefined,
        borderLeftColor: isSelected ? CATALYST_V5.primary : 'transparent',
      }}
    >
      {/* Checkbox */}
      {visibleColumns.includes('select') && (
        <td className={cn(cellClass, "sticky left-0 z-10 bg-inherit w-10")}>
          <Checkbox 
            checked={isSelected} 
            onCheckedChange={() => {}} 
            onClick={(e) => onSelect(e.shiftKey)}
          />
        </td>
      )}

      {/* Test ID */}
      {visibleColumns.includes('testId') && (
        <td className={cellClass}>
          <button
            onClick={onOpenDetails}
            className="font-medium hover:underline"
            style={{ color: CATALYST_V5.primary }}
          >
            {assignment.testCaseCode}
          </button>
        </td>
      )}

      {/* Title */}
      {visibleColumns.includes('title') && (
        <td className={cn(cellClass, "max-w-[300px]")}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="block truncate text-foreground">
                  {assignment.title}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-md">
                {assignment.title}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </td>
      )}

      {/* Status */}
      {visibleColumns.includes('status') && (
        <td className={cellClass}>
          <StatusSelect
            value={assignment.status}
            onChange={(value) => onEdit('status', value)}
          />
        </td>
      )}

      {/* Assignee */}
      {visibleColumns.includes('assignee') && (
        <td className={cellClass}>
          <AssigneeSelect
            value={assignment.assigneeId}
            assigneeName={assignment.assigneeName}
            teamMembers={teamMembers}
            onChange={(value) => onEdit('assigneeId', value)}
          />
        </td>
      )}

      {/* Priority */}
      {visibleColumns.includes('priority') && (
        <td className={cellClass}>
          <PrioritySelect
            value={assignment.priority}
            onChange={(value) => onEdit('priority', value)}
          />
        </td>
      )}

      {/* Due Date */}
      {visibleColumns.includes('dueDate') && (
        <td className={cellClass}>
          <DatePickerCell
            value={assignment.dueDate}
            onChange={(value) => onEdit('dueDate', value)}
          />
        </td>
      )}

      {/* Module */}
      {visibleColumns.includes('module') && (
        <td className={cellClass}>
          <span style={{ color: CATALYST_V5.slate[600] }}>
            {assignment.module}
          </span>
        </td>
      )}

      {/* Type */}
      {visibleColumns.includes('type') && (
        <td className={cellClass}>
          <Badge 
            variant="outline" 
            className="text-xs capitalize"
            style={{ 
              borderColor: CATALYST_V5.slate[200],
              color: CATALYST_V5.slate[600],
            }}
          >
            {assignment.testType}
          </Badge>
        </td>
      )}

      {/* Duration */}
      {visibleColumns.includes('duration') && (
        <td className={cellClass}>
          <span style={{ color: CATALYST_V5.slate[500] }}>
            {assignment.estimatedDurationMinutes 
              ? `${assignment.estimatedDurationMinutes}m`
              : '—'}
          </span>
        </td>
      )}

      {/* Defects */}
      {visibleColumns.includes('defects') && (
        <td className={cellClass}>
          {assignment.defectCount > 0 ? (
            <Badge 
              className="text-xs"
              style={{ 
                backgroundColor: CATALYST_V5.dangerLight, 
                color: CATALYST_V5.danger 
              }}
            >
              {assignment.defectCount}
            </Badge>
          ) : (
            <span style={{ color: CATALYST_V5.slate[400] }}>—</span>
          )}
        </td>
      )}

      {/* Automation */}
      {visibleColumns.includes('automation') && (
        <td className={cellClass}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <AutoIcon 
                  className="h-4 w-4" 
                  style={{ color: automationConfig.color }} 
                />
              </TooltipTrigger>
              <TooltipContent>
                {assignment.automationStatus.charAt(0).toUpperCase() + assignment.automationStatus.slice(1)}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </td>
      )}

      {/* Actions */}
      {visibleColumns.includes('actions') && (
        <td className={cn(cellClass, "sticky right-0 z-10 bg-inherit w-10")}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onOpenDetails}>
                <ExternalLink className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onEdit('status', 'in_progress')}>
                Start Execution
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit('status', 'passed')}>
                Mark as Passed
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit('status', 'failed')}>
                Mark as Failed
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
                Remove from Cycle
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </td>
      )}
    </tr>
  );
}
