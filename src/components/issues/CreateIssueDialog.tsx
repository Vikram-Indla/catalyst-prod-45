import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface CreateIssueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectKey: string;
}

export function CreateIssueDialog({ 
  open, 
  onOpenChange, 
  projectId,
  projectKey 
}: CreateIssueDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Issue</DialogTitle>
          <DialogDescription>
            Create a new issue in {projectKey}
          </DialogDescription>
        </DialogHeader>
        <div className="py-8 text-center text-muted-foreground">
          Issue creation form will be implemented in Sprint 3
        </div>
      </DialogContent>
    </Dialog>
  );
}
