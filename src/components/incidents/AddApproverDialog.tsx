import { useState } from 'react';
import { UserPlus, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
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
import { cn } from '@/lib/utils';
import type { IncidentUserProfile } from '@/types/incident';

interface AddApproverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableApprovers: IncidentUserProfile[];
  existingApproverIds: string[];
  onAdd: (userId: string, hasVeto: boolean, note: string) => void;
}

export function AddApproverDialog({ 
  open, 
  onOpenChange, 
  availableApprovers,
  existingApproverIds,
  onAdd 
}: AddApproverDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [hasVeto, setHasVeto] = useState(false);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter out already added approvers
  const eligibleApprovers = availableApprovers.filter(
    u => !existingApproverIds.includes(u.id)
  );

  const handleAdd = async () => {
    if (!selectedUserId) return;
    
    setIsSubmitting(true);
    try {
      await onAdd(selectedUserId, hasVeto, note);
      onOpenChange(false);
      setSelectedUserId('');
      setHasVeto(false);
      setNote('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedUser = availableApprovers.find(u => u.id === selectedUserId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-brand-primary" />
            Add Committee Approver
          </DialogTitle>
          <DialogDescription>
            Add a member to the CAP Committee for this incident
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Approver Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Select Approver <span className="text-red-500">*</span>
            </label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose an approver..." />
              </SelectTrigger>
              <SelectContent className="z-[500]">
                {eligibleApprovers.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    No available approvers
                  </div>
                ) : (
                  eligibleApprovers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium">
                          {user.avatar_initials || user.full_name?.charAt(0) || '?'}
                        </div>
                        <span>{user.full_name}</span>
                        {user.has_veto_power && (
                          <span className="text-[10px] text-orange-600">(Veto Power)</span>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Veto Toggle */}
          <div className={cn(
            "flex items-start gap-3 p-3 rounded-lg border",
            hasVeto ? "bg-orange-50 border-orange-200" : "bg-muted/50 border-border"
          )}>
            <Checkbox
              id="has-veto"
              checked={hasVeto}
              onCheckedChange={(checked) => setHasVeto(checked === true)}
              className="mt-0.5"
            />
            <div className="flex-1">
              <label 
                htmlFor="has-veto" 
                className="text-sm font-medium text-foreground cursor-pointer flex items-center gap-2"
              >
                Grant Veto Power
                <AlertTriangle className="h-3.5 w-3.5 text-orange-600" />
              </label>
              <p className="text-xs text-muted-foreground mt-1">
                A veto vote will override all other approvals and reject the conversion request.
              </p>
            </div>
          </div>

          {/* Optional Note */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Note <span className="text-muted-foreground">(optional)</span>
            </label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add context for why this approver is being added..."
              className="min-h-[80px] text-sm"
            />
          </div>

          {/* Selected Preview */}
          {selectedUser && (
            <div className="p-3 bg-muted/50 rounded-lg border border-border">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Preview</span>
              <div className="mt-2 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                  {selectedUser.avatar_initials || selectedUser.full_name?.charAt(0)}
                </div>
                <div>
                  <span className="text-sm font-medium text-foreground block">{selectedUser.full_name}</span>
                  <span className="text-xs text-muted-foreground">{selectedUser.email}</span>
                </div>
                {hasVeto && (
                  <span className="ml-auto text-xs font-medium text-orange-600 bg-orange-100 px-2 py-0.5 rounded">
                    VETO
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleAdd} 
            disabled={!selectedUserId || isSubmitting}
            className="bg-brand-primary text-white hover:bg-brand-primary/90"
          >
            {isSubmitting ? 'Adding...' : 'Add Approver'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
