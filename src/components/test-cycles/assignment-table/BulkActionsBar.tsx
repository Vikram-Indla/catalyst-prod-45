/**
 * Bulk Actions Bar - Multi-select actions
 */

import React, { useState } from 'react';
import { X, Users, Flag, Activity, Calendar, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CATALYST_V5 } from '@/lib/catalyst-colors';
import type { TeamMemberOption, TestPriority, TestStatus } from '@/types/assignment-table.types';

interface BulkActionsBarProps {
  selectedCount: number;
  teamMembers: TeamMemberOption[];
  onAssign: (userId: string | null) => void;
  onChangePriority: (priority: TestPriority) => void;
  onChangeStatus: (status: TestStatus) => void;
  onSetDueDate: (date: Date | null) => void;
  onRemove: () => void;
  onClearSelection: () => void;
}

export function BulkActionsBar({
  selectedCount,
  teamMembers,
  onAssign,
  onChangePriority,
  onChangeStatus,
  onSetDueDate,
  onRemove,
  onClearSelection,
}: BulkActionsBarProps) {
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [dueDateOpen, setDueDateOpen] = useState(false);

  const buttonClass = "h-7 text-xs gap-1.5 bg-white/20 hover:bg-white/30 text-white border-0";

  return (
    <>
      <div 
        className="sticky top-0 z-20 flex items-center justify-between px-4 py-2.5 rounded-lg mb-4"
        style={{ backgroundColor: CATALYST_V5.primary }}
      >
        {/* Left: Selection info */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-white">
            {selectedCount} selected
          </span>
          <button
            onClick={onClearSelection}
            className="text-xs text-white/80 hover:text-white underline"
          >
            Clear
          </button>
        </div>

        {/* Center: Actions */}
        <div className="flex items-center gap-2">
          {/* Assign To */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className={buttonClass}>
                <Users className="h-3.5 w-3.5" />
                Assign To
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-48">
              <DropdownMenuItem onClick={() => onAssign(null)}>
                <span className="text-muted-foreground">Unassign</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {teamMembers.map(member => (
                <DropdownMenuItem key={member.id} onClick={() => onAssign(member.id)}>
                  <div className="flex items-center gap-2 w-full">
                    <div 
                      className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-medium text-white"
                      style={{ backgroundColor: CATALYST_V5.primary }}
                    >
                      {member.name.charAt(0)}
                    </div>
                    <span className="flex-1">{member.name}</span>
                    <span className="text-xs text-muted-foreground">{member.workload}</span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Priority */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className={buttonClass}>
                <Flag className="h-3.5 w-3.5" />
                Priority
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              <DropdownMenuItem onClick={() => onChangePriority('critical')}>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: CATALYST_V5.danger }} />
                  Critical
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onChangePriority('high')}>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: CATALYST_V5.warning }} />
                  High
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onChangePriority('medium')}>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: CATALYST_V5.primary }} />
                  Medium
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onChangePriority('low')}>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: CATALYST_V5.slate[400] }} />
                  Low
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Status */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className={buttonClass}>
                <Activity className="h-3.5 w-3.5" />
                Status
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              <DropdownMenuItem onClick={() => onChangeStatus('not_started')}>
                Not Started
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onChangeStatus('in_progress')}>
                In Progress
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onChangeStatus('passed')}>
                Passed
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onChangeStatus('failed')}>
                Failed
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onChangeStatus('blocked')}>
                Blocked
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Due Date */}
          <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className={buttonClass}>
                <Calendar className="h-3.5 w-3.5" />
                Due Date
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <CalendarComponent
                mode="single"
                onSelect={(date) => {
                  onSetDueDate(date || null);
                  setDueDateOpen(false);
                }}
                initialFocus
              />
              <div className="p-2 border-t">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full h-7 text-xs"
                  onClick={() => {
                    onSetDueDate(null);
                    setDueDateOpen(false);
                  }}
                >
                  Clear Due Date
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Right: Remove */}
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 text-xs gap-1.5 bg-red-500/20 hover:bg-red-500/30 text-white border-0"
          onClick={() => setShowRemoveDialog(true)}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Remove from Cycle
        </Button>
      </div>

      {/* Remove confirmation dialog */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Tests from Cycle?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {selectedCount} test{selectedCount !== 1 ? 's' : ''} from this cycle. 
              The test cases will still exist in the test library.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onRemove();
                setShowRemoveDialog(false);
              }}
              style={{ backgroundColor: CATALYST_V5.danger }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
