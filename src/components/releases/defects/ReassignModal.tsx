import { useState, useEffect } from 'react';
import { UserPlus, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface Assignee {
  name: string;
  initials: string;
  color: string;
}

interface ReassignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentAssignee: Assignee | null;
  onReassign: (assigneeId: string) => void;
}

const assignees = [
  { id: 'VS', name: 'Vikram S.', initials: 'VS', color: 'blue' },
  { id: 'AA', name: 'Ahmed A.', initials: 'AA', color: 'green' },
  { id: 'SK', name: 'Sara K.', initials: 'SK', color: 'purple' },
  { id: 'MR', name: 'Mohammed R.', initials: 'MR', color: 'orange' },
];

const avatarColors: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-700',
  teal: 'bg-teal-100 text-teal-700',
  purple: 'bg-purple-100 text-purple-700',
  orange: 'bg-amber-100 text-amber-700',
  amber: 'bg-amber-100 text-amber-700',
  green: 'bg-teal-100 text-teal-700',
  gray: 'bg-muted text-muted-foreground',
};

export function ReassignModal({ open, onOpenChange, currentAssignee, onReassign }: ReassignModalProps) {
  const [selectedAssignee, setSelectedAssignee] = useState('');

  useEffect(() => {
    if (open) {
      setSelectedAssignee(currentAssignee?.initials || '');
    }
  }, [open, currentAssignee]);

  const handleReassign = () => {
    onReassign(selectedAssignee);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <UserPlus className="w-5 h-5" />
            Reassign Defect
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <label className="text-sm font-medium text-foreground">Select Assignee</label>
          <div className="mt-3 space-y-2">
            {/* Unassign option */}
            <div
              className={cn(
                "p-3 rounded-lg border cursor-pointer transition-all",
                selectedAssignee === '' 
                  ? "border-primary bg-primary/5" 
                  : "border-border hover:border-muted-foreground/30"
              )}
              onClick={() => setSelectedAssignee('')}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">
                  ?
                </div>
                <span className="font-medium text-foreground">Unassigned</span>
                {selectedAssignee === '' && (
                  <CheckCircle className="w-5 h-5 text-primary ml-auto" />
                )}
              </div>
            </div>

            {assignees.map(person => (
              <div
                key={person.id}
                className={cn(
                  "p-3 rounded-lg border cursor-pointer transition-all",
                  selectedAssignee === person.id 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-muted-foreground/30"
                )}
                onClick={() => setSelectedAssignee(person.id)}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                    avatarColors[person.color] || avatarColors.gray
                  )}>
                    {person.initials}
                  </div>
                  <span className="font-medium text-foreground">{person.name}</span>
                  {selectedAssignee === person.id && (
                    <CheckCircle className="w-5 h-5 text-primary ml-auto" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleReassign}>
            Reassign
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
