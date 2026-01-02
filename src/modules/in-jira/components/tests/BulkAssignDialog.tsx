/**
 * Bulk Assign Dialog
 * Assign multiple executions to a tester
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, User, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
}

interface BulkAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  teamMembers: TeamMember[];
  onAssign: (userId: string | null) => Promise<void>;
  isAssigning?: boolean;
}

export function BulkAssignDialog({
  open,
  onOpenChange,
  selectedCount,
  teamMembers,
  onAssign,
  isAssigning,
}: BulkAssignDialogProps) {
  const handleAssign = async (userId: string | null) => {
    await onAssign(userId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-accent-primary" />
            Assign {selectedCount} Execution{selectedCount > 1 ? 's' : ''}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[300px]">
          <div className="space-y-1">
            <Button
              variant="ghost"
              className="w-full justify-start h-10"
              onClick={() => handleAssign(null)}
              disabled={isAssigning}
            >
              <User className="h-4 w-4 mr-2 text-text-quaternary" />
              <span className="text-text-secondary">Unassign</span>
            </Button>

            {teamMembers.map(member => (
              <Button
                key={member.id}
                variant="ghost"
                className="w-full justify-start h-10"
                onClick={() => handleAssign(member.id)}
                disabled={isAssigning}
              >
                <Avatar className="h-6 w-6 mr-2">
                  <AvatarFallback className="text-[10px]">
                    {member.full_name?.slice(0, 2).toUpperCase() || '??'}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <p className="text-sm font-medium">{member.full_name}</p>
                  <p className="text-xs text-text-quaternary">{member.email}</p>
                </div>
              </Button>
            ))}
          </div>
        </ScrollArea>

        {isAssigning && (
          <div className="flex items-center justify-center py-2">
            <Loader2 className="h-5 w-5 animate-spin text-accent-primary" />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
