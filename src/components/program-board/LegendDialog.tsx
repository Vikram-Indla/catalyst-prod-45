import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface LegendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LegendDialog({ open, onOpenChange }: LegendDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Legend</DialogTitle>
        </DialogHeader>
        <div className="p-4 space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Symbols</h3>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>Hexagon - Objective</li>
              <li>Rectangle - Feature</li>
              <li>Bowtie - Dependency</li>
              <li>Diamond - Milestone</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Status Colors</h3>
            <ul className="text-sm space-y-1">
              <li><span className="inline-block w-4 h-4 bg-green-600 rounded mr-2"></span>Done/Accepted</li>
              <li><span className="inline-block w-4 h-4 bg-blue-600 rounded mr-2"></span>In Progress</li>
              <li><span className="inline-block w-4 h-4 bg-red-600 rounded mr-2"></span>Blocked</li>
              <li><span className="inline-block w-4 h-4 bg-orange-500 rounded mr-2"></span>Planning Issues</li>
              <li><span className="inline-block w-4 h-4 bg-yellow-500 rounded mr-2"></span>Risks Apply</li>
              <li><span className="inline-block w-4 h-4 bg-gray-400 rounded mr-2"></span>Not Started</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
