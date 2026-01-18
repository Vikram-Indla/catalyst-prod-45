/**
 * Bulk Reassign Dialog
 * Dialog for reassigning multiple releases to a new owner
 */

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';

interface BulkReassignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onConfirm: (ownerId: string, ownerName: string) => Promise<void>;
}

export function BulkReassignDialog({
  open,
  onOpenChange,
  selectedCount,
  onConfirm,
}: BulkReassignDialogProps) {
  const [ownerId, setOwnerId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-members-for-reassign'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const selectedMember = teamMembers.find(m => m.id === ownerId);

  const handleConfirm = async () => {
    if (!ownerId || !selectedMember) return;
    setIsSubmitting(true);
    try {
      await onConfirm(ownerId, selectedMember.full_name || 'Unknown');
      onOpenChange(false);
      setOwnerId('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reassign Releases</DialogTitle>
          <DialogDescription>
            Reassign {selectedCount} selected release{selectedCount !== 1 ? 's' : ''} to a new owner.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="owner">New Owner</Label>
            <Select value={ownerId} onValueChange={setOwnerId}>
              <SelectTrigger id="owner">
                <SelectValue placeholder="Select team member" />
              </SelectTrigger>
              <SelectContent className="bg-white max-h-64">
                {teamMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={member.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(member.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span>{member.full_name || 'Unknown'}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedMember && (
            <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
              Reassign <strong>{selectedCount} release{selectedCount !== 1 ? 's' : ''}</strong> to{' '}
              <strong>{selectedMember.full_name}</strong>
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!ownerId || isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Reassigning...
              </>
            ) : (
              'Confirm'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
