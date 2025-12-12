/**
 * EpicStatusModal - Status update modal for Epic drawer
 * Pattern cloned from WorkflowViewerModal
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const EPIC_STATUS_OPTIONS = [
  { value: 'new', label: 'New', description: 'Epic has been created' },
  { value: 'analysis', label: 'Analysis', description: 'Requirements being analyzed' },
  { value: 'design', label: 'Design', description: 'Solution design in progress' },
  { value: 'technical_validation', label: 'Technical validation', description: 'Technical feasibility review' },
  { value: 'ready_for_implementation', label: 'Ready for implementation', description: 'Approved and ready to build' },
  { value: 'in_implementation', label: 'In implementation', description: 'Development in progress' },
  { value: 'on_hold', label: 'On hold', description: 'Work temporarily paused' },
  { value: 'done', label: 'Done', description: 'Epic completed' },
];

interface EpicStatusModalProps {
  currentStatus: string;
  epicId: string;
  onStatusChange: (status: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EpicStatusModal({ 
  currentStatus, 
  epicId, 
  onStatusChange, 
  open, 
  onOpenChange 
}: EpicStatusModalProps) {
  const handleStatusSelect = (status: string) => {
    onStatusChange(status);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Update Epic Status</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-2 py-4">
          {EPIC_STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => handleStatusSelect(option.value)}
              className={cn(
                "w-full text-left p-3 rounded-lg border transition-colors",
                currentStatus === option.value
                  ? "border-brand-gold bg-brand-gold/10"
                  : "border-border hover:bg-muted"
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{option.label}</p>
                  <p className="text-xs text-muted-foreground">{option.description}</p>
                </div>
                {currentStatus === option.value && (
                  <span className="text-xs text-brand-gold font-medium">Current</span>
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
