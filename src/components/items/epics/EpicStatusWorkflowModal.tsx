/**
 * EpicStatusWorkflowModal - Status selection modal for Epic
 * 
 * Cloned from BusinessRequest WorkflowViewerModal pattern
 * Shows Epic-specific status values:
 * - New, Analysis, Design, Technical Validation
 * - Ready for Implementation, In Implementation, On Hold, Done
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

// Epic Status values as per spec
const EPIC_STATUSES = [
  { value: 'new', label: 'New', description: 'Epic has been created' },
  { value: 'analysis', label: 'Analysis', description: 'Gathering requirements and analysis' },
  { value: 'design', label: 'Design', description: 'Solution design in progress' },
  { value: 'technical_validation', label: 'Technical Validation', description: 'Technical feasibility review' },
  { value: 'ready_for_implementation', label: 'Ready for Implementation', description: 'Approved and ready to start' },
  { value: 'in_implementation', label: 'In Implementation', description: 'Development in progress' },
  { value: 'on_hold', label: 'On Hold', description: 'Temporarily paused' },
  { value: 'done', label: 'Done', description: 'Completed and delivered' },
] as const;

interface EpicStatusWorkflowModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStatus: string;
  epicId: string;
  onStatusChange: (status: string) => void;
}

export function EpicStatusWorkflowModal({
  open,
  onOpenChange,
  currentStatus,
  epicId,
  onStatusChange,
}: EpicStatusWorkflowModalProps) {
  const handleSelectStatus = (status: string) => {
    onStatusChange(status);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Update Epic Status</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <div className="grid gap-2">
            {EPIC_STATUSES.map((status) => {
              const isActive = currentStatus === status.value;
              return (
                <Button
                  key={status.value}
                  variant="outline"
                  onClick={() => handleSelectStatus(status.value)}
                  className={cn(
                    "justify-start h-auto py-3 px-4",
                    isActive && "border-brand-gold bg-brand-gold/5"
                  )}
                >
                  <div className="flex items-start gap-3 w-full">
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5",
                      isActive ? "border-brand-gold bg-brand-gold" : "border-muted-foreground/30"
                    )}>
                      {isActive && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <div className="text-left">
                      <div className={cn(
                        "font-medium",
                        isActive && "text-brand-gold"
                      )}>
                        {status.label}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {status.description}
                      </div>
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
