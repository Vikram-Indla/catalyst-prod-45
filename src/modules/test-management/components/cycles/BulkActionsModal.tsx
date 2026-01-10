/**
 * Bulk Actions Modal for Test Cycles
 * Allows bulk operations on multiple selected cycles
 */

import React, { useState } from 'react';
import { format } from 'date-fns';
import { 
  Trash2, 
  Play, 
  CheckCircle2, 
  Copy, 
  FolderInput,
  CalendarIcon,
  Loader2,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import type { TestCycle } from '../../api/types';
import type { CycleFolder } from './CyclesFolderTree';

type BulkAction = 'delete' | 'start' | 'complete' | 'clone' | 'move' | 'reschedule';

interface BulkActionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCycles: TestCycle[];
  folders?: CycleFolder[];
  onBulkDelete: () => void;
  onBulkStart: () => void;
  onBulkComplete: () => void;
  onBulkClone: () => void;
  onBulkMove: (folderId: string) => void;
  onBulkReschedule: (startDate: string, endDate: string) => void;
  isLoading?: boolean;
}

export function BulkActionsModal({
  open,
  onOpenChange,
  selectedCycles,
  folders = [],
  onBulkDelete,
  onBulkStart,
  onBulkComplete,
  onBulkClone,
  onBulkMove,
  onBulkReschedule,
  isLoading,
}: BulkActionsModalProps) {
  const [selectedAction, setSelectedAction] = useState<BulkAction | null>(null);
  const [targetFolderId, setTargetFolderId] = useState('');
  const [newStartDate, setNewStartDate] = useState<Date | undefined>();
  const [newEndDate, setNewEndDate] = useState<Date | undefined>();

  const handleConfirm = () => {
    switch (selectedAction) {
      case 'delete':
        onBulkDelete();
        break;
      case 'start':
        onBulkStart();
        break;
      case 'complete':
        onBulkComplete();
        break;
      case 'clone':
        onBulkClone();
        break;
      case 'move':
        if (targetFolderId) onBulkMove(targetFolderId);
        break;
      case 'reschedule':
        if (newStartDate && newEndDate) {
          onBulkReschedule(newStartDate.toISOString(), newEndDate.toISOString());
        }
        break;
    }
    onOpenChange(false);
    setSelectedAction(null);
  };

  const canConfirm = () => {
    if (!selectedAction) return false;
    if (selectedAction === 'move' && !targetFolderId) return false;
    if (selectedAction === 'reschedule' && (!newStartDate || !newEndDate)) return false;
    return true;
  };

  const actions: { id: BulkAction; icon: React.ReactNode; label: string; description: string; variant?: 'destructive' | 'default' }[] = [
    { id: 'start', icon: <Play className="h-4 w-4" />, label: 'Start Cycles', description: 'Begin execution for planned cycles' },
    { id: 'complete', icon: <CheckCircle2 className="h-4 w-4" />, label: 'Complete Cycles', description: 'Mark active cycles as completed' },
    { id: 'clone', icon: <Copy className="h-4 w-4" />, label: 'Clone Cycles', description: 'Create copies of selected cycles' },
    { id: 'move', icon: <FolderInput className="h-4 w-4" />, label: 'Move to Folder', description: 'Move cycles to a different folder' },
    { id: 'reschedule', icon: <CalendarIcon className="h-4 w-4" />, label: 'Reschedule', description: 'Update dates for all selected' },
    { id: 'delete', icon: <Trash2 className="h-4 w-4" />, label: 'Delete Cycles', description: 'Permanently remove selected cycles', variant: 'destructive' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Actions</DialogTitle>
          <DialogDescription>
            Apply action to {selectedCycles.length} selected cycle{selectedCycles.length !== 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Action Selection */}
          <div className="grid gap-2">
            {actions.map((action) => (
              <button
                key={action.id}
                onClick={() => setSelectedAction(action.id)}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border text-left transition-colors',
                  selectedAction === action.id
                    ? action.variant === 'destructive'
                      ? 'border-destructive bg-destructive/5'
                      : 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted/50'
                )}
              >
                <div className={cn(
                  'p-2 rounded-lg',
                  action.variant === 'destructive' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
                )}>
                  {action.icon}
                </div>
                <div>
                  <p className={cn(
                    'font-medium text-sm',
                    action.variant === 'destructive' && selectedAction === action.id && 'text-destructive'
                  )}>
                    {action.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{action.description}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Move Options */}
          {selectedAction === 'move' && (
            <div className="grid gap-2 pt-2 border-t">
              <Label>Target Folder</Label>
              <Select value={targetFolderId} onValueChange={setTargetFolderId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select folder" />
                </SelectTrigger>
                <SelectContent>
                  {folders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      {folder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Reschedule Options */}
          {selectedAction === 'reschedule' && (
            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
              <div className="grid gap-2">
                <Label>New Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'justify-start text-left font-normal',
                        !newStartDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newStartDate ? format(newStartDate, 'MMM d') : 'Pick date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={newStartDate}
                      onSelect={setNewStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid gap-2">
                <Label>New End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'justify-start text-left font-normal',
                        !newEndDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newEndDate ? format(newEndDate, 'MMM d') : 'Pick date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={newEndDate}
                      onSelect={setNewEndDate}
                      disabled={(date) => newStartDate ? date < newStartDate : false}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!canConfirm() || isLoading}
            variant={selectedAction === 'delete' ? 'destructive' : 'default'}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {selectedAction === 'delete' ? 'Delete' : 'Apply'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default BulkActionsModal;
