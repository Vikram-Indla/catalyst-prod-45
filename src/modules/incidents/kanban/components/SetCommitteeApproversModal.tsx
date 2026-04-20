/**
 * SetCommitteeApproversModal
 * Modal for setting/editing committee approvers
 * Enterprise-clean design with proper validation
 * Supports both create (new transition) and edit (existing committee) modes
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Users, Calendar, FileText, AlertCircle, X, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Lozenge } from '@/components/ads';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useAvailableApprovers } from '@/hooks/useIncidentUserProfiles';
import type { IncidentUserProfile, Incident } from '@/types/incident';

export interface CommitteeSetupData {
  approverIds: string[];
  dueDate: string;
  notes: string;
}

interface SetCommitteeApproversModalProps {
  open: boolean;
  incidentKey?: string;
  incidentTitle?: string;
  onConfirm: (data: CommitteeSetupData) => void;
  onCancel: () => void;
  // Edit mode props
  mode?: 'create' | 'edit';
  initialApproverIds?: string[];
  initialDueDate?: string;
  initialNotes?: string;
}

export function SetCommitteeApproversModal({
  open,
  incidentKey,
  incidentTitle,
  onConfirm,
  onCancel,
  mode = 'create',
  initialApproverIds = [],
  initialDueDate = '',
  initialNotes = '',
}: SetCommitteeApproversModalProps) {
  const [selectedApprovers, setSelectedApprovers] = useState<IncidentUserProfile[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [approverPopoverOpen, setApproverPopoverOpen] = useState(false);
  const [validationError, setValidationError] = useState('');

  const { data: availableApprovers = [], isLoading } = useAvailableApprovers();

  // Initialize state when modal opens or initial values change
  useEffect(() => {
    if (open && availableApprovers.length > 0) {
      // Set initial approvers from IDs
      const initialApprovers = availableApprovers.filter(a => 
        initialApproverIds.includes(a.id)
      );
      setSelectedApprovers(initialApprovers);
      setDueDate(initialDueDate ? initialDueDate.slice(0, 16) : '');
      setNotes(initialNotes);
      setValidationError('');
    }
  }, [open, availableApprovers, initialApproverIds, initialDueDate, initialNotes]);

  // Filter out already selected approvers
  const unselectedApprovers = useMemo(() => {
    const selectedIds = new Set(selectedApprovers.map(a => a.id));
    return availableApprovers.filter(a => !selectedIds.has(a.id));
  }, [availableApprovers, selectedApprovers]);

  const handleSelectApprover = useCallback((approver: IncidentUserProfile) => {
    setSelectedApprovers(prev => [...prev, approver]);
    setValidationError('');
    setApproverPopoverOpen(false);
  }, []);

  const handleRemoveApprover = useCallback((approverId: string) => {
    setSelectedApprovers(prev => prev.filter(a => a.id !== approverId));
  }, []);

  const handleConfirm = useCallback(() => {
    if (selectedApprovers.length === 0) {
      setValidationError('Add at least one approver to place in Committee.');
      return;
    }

    onConfirm({
      approverIds: selectedApprovers.map(a => a.id),
      dueDate,
      notes: notes.trim(),
    });

    // Reset state
    setSelectedApprovers([]);
    setDueDate('');
    setNotes('');
    setValidationError('');
  }, [selectedApprovers, dueDate, notes, onConfirm]);

  const handleCancel = useCallback(() => {
    setSelectedApprovers([]);
    setDueDate('');
    setNotes('');
    setValidationError('');
    onCancel();
  }, [onCancel]);

  // Get default due date (3 business days from now)
  const getDefaultDueDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 3);
    return date.toISOString().slice(0, 16);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleCancel()}>
      <DialogContent className="sm:max-w-[520px] bg-[var(--surface-1)] border-[var(--border-default)]">
        <DialogHeader className="space-y-3 pb-4 border-b border-[var(--border-subtle)]">
          <DialogTitle className="text-lg font-semibold text-[var(--text-1)] flex items-center gap-2">
            <Users className="h-5 w-5 text-[var(--brand-gold)]" />
            {mode === 'edit' ? 'Edit Committee Approvers' : 'Set Committee Approvers'}
          </DialogTitle>
          {(incidentKey || incidentTitle) && (
            <p className="text-sm text-[var(--text-3)]">
              {incidentKey && <span className="font-mono text-[var(--text-2)]">{incidentKey}</span>}
              {incidentKey && incidentTitle && ' • '}
              {incidentTitle && <span className="truncate">{incidentTitle}</span>}
            </p>
          )}
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Approvers Multi-Select */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[var(--text-2)] flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Approvers <span className="text-[var(--brand-gold)]">*</span>
            </Label>
            
            {/* Selected Approvers */}
            {selectedApprovers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedApprovers.map(approver => (
                  <span key={approver.id} className="inline-flex items-center gap-1">
                    <Lozenge appearance="default">
                      {approver.full_name}
                    </Lozenge>
                    <button
                      onClick={() => handleRemoveApprover(approver.id)}
                      className="p-0.5 rounded hover:bg-destructive/20 hover:text-destructive transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Approver Picker */}
            <Popover open={approverPopoverOpen} onOpenChange={setApproverPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={approverPopoverOpen}
                  className={cn(
                    "w-full justify-start text-left font-normal h-9",
                    "bg-[var(--surface-2)] border-[var(--border-default)] hover:bg-[var(--surface-3)]",
                    selectedApprovers.length === 0 && "text-[var(--text-3)]"
                  )}
                >
                  <Users className="mr-2 h-4 w-4 text-[var(--text-3)]" />
                  {selectedApprovers.length === 0 
                    ? "Select approvers..." 
                    : `Add another approver (${selectedApprovers.length} selected)`}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command className="bg-[var(--surface-1)]">
                  <CommandInput placeholder="Search users..." className="h-9" />
                  <CommandList>
                    <CommandEmpty>
                      {isLoading ? 'Loading...' : 'No users found.'}
                    </CommandEmpty>
                    <CommandGroup>
                      <ScrollArea className="h-[200px]">
                        {unselectedApprovers.map(approver => (
                          <CommandItem
                            key={approver.id}
                            value={approver.full_name || approver.email || ''}
                            onSelect={() => handleSelectApprover(approver)}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <div className="h-6 w-6 rounded-full bg-[var(--surface-3)] flex items-center justify-center text-xs font-medium text-[var(--text-2)]">
                              {approver.avatar_initials || approver.full_name?.charAt(0) || '?'}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm text-[var(--text-1)]">{approver.full_name}</span>
                              {approver.email && (
                                <span className="text-xs text-[var(--text-3)]">{approver.email}</span>
                              )}
                            </div>
                            <Check className="ml-auto h-4 w-4 opacity-0" />
                          </CommandItem>
                        ))}
                      </ScrollArea>
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Validation Error */}
            {validationError && (
              <div className="flex items-center gap-1.5 text-destructive text-xs mt-1">
                <AlertCircle className="h-3.5 w-3.5" />
                {validationError}
              </div>
            )}
          </div>

          {/* Due Date / Response-by Time */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[var(--text-2)] flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Response Due By
            </Label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              placeholder={getDefaultDueDate()}
              className={cn(
                "w-full h-9 px-3 rounded-md text-sm",
                "bg-[var(--surface-2)] border border-[var(--border-default)]",
                "text-[var(--text-1)] placeholder:text-[var(--text-3)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--brand-gold)]/30 focus:border-[var(--brand-gold)]"
              )}
            />
            <p className="text-xs text-[var(--text-3)]">
              When approvers should respond by
            </p>
          </div>

          {/* Notes / Instructions */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[var(--text-2)] flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Notes <span className="text-[var(--text-3)] font-normal">(optional)</span>
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Instructions or context for approvers..."
              rows={2}
              className={cn(
                "resize-none text-sm",
                "bg-[var(--surface-2)] border-[var(--border-default)]",
                "focus:ring-[var(--brand-gold)]/30 focus:border-[var(--brand-gold)]"
              )}
              maxLength={500}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 pt-4 border-t border-[var(--border-subtle)]">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="bg-transparent border-[var(--border-default)] text-[var(--text-2)] hover:bg-[var(--surface-2)]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            className="bg-[var(--brand-gold)] text-[var(--surface-1)] hover:bg-[var(--brand-gold)]/90"
          >
            {mode === 'edit' ? 'Save Changes' : 'Confirm Committee'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
