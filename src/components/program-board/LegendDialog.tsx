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
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold mb-3 text-sm uppercase text-muted-foreground">Status</h3>
              <ul className="text-sm space-y-2">
                <li className="flex items-center gap-2">
                  <span className="inline-block w-4 h-4 bg-green-600 rounded"></span>
                  <span>Done</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="inline-block w-4 h-4 bg-gray-400 rounded"></span>
                  <span>Not Started</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="inline-block w-4 h-4 bg-blue-600 rounded"></span>
                  <span>In Progress</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="inline-block w-4 h-4 bg-yellow-500 rounded"></span>
                  <span>Risks Apply</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="inline-block w-4 h-4 bg-orange-500 rounded"></span>
                  <span>Scheduling Issues</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="inline-block w-4 h-4 bg-red-600 rounded"></span>
                  <span>Blocked</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="inline-block w-4 h-4 bg-amber-800 rounded"></span>
                  <span>Cancelled</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="inline-block w-4 h-4 bg-gray-900 rounded"></span>
                  <span>Orphan</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="inline-block w-4 h-4 bg-green-600 rounded relative">
                    <span className="absolute -top-1 -right-1 text-green-700 text-xs">✓</span>
                  </span>
                  <span>Accepted</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="inline-block w-4 h-4 bg-green-600 rounded relative">
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-600 rounded-sm"></span>
                  </span>
                  <span>Accepted with Planning Issues</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-3 text-sm uppercase text-muted-foreground">Legend</h3>
              <ul className="text-sm space-y-2">
                <li className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-5 h-5 bg-gray-400 text-white text-[10px] font-bold" style={{clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'}}>O</span>
                  <span>Objective</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-5 h-5 bg-gray-400 text-white text-[10px] font-bold" style={{clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'}}>M</span>
                  <span>Milestone</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="inline-block w-5 h-4 bg-gray-400 rounded-sm"></span>
                  <span>Feature</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="inline-block w-5 h-4 bg-gray-400 rounded-sm relative">
                    <span className="absolute right-0 top-0 bottom-0 w-1 bg-gray-600"></span>
                  </span>
                  <span>Parent of split Feature</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="inline-block w-5 h-4 bg-gray-400 rounded-sm relative">
                    <span className="absolute left-0 top-0 bottom-0 w-1 bg-gray-600"></span>
                  </span>
                  <span>Child of split Feature</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-5 h-4 bg-gray-400 text-white text-[10px] font-bold" style={{clipPath: 'polygon(0% 50%, 25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%)'}}>D</span>
                  <span>Dependency</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-lg">▶</span>
                  <span>Into Program requested Dependency</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-lg">◀</span>
                  <span>Out of Program depends on Dependency</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-blue-500">🔗</span>
                  <span>Predecessor Feature with successors</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-blue-500">🔗</span>
                  <span>Successor Feature with predecessors</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-blue-500">🔗</span>
                  <span>Feature with successors and predecessors</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
