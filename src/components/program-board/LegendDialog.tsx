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
        <div className="p-6">
          <div className="grid grid-cols-2 gap-12">
            <div>
              <h3 className="font-semibold mb-4 text-xs uppercase tracking-wide text-muted-foreground">STATUS</h3>
              <ul className="space-y-2.5">
                <li className="flex items-center gap-2.5">
                  <span className="inline-block w-5 h-5 bg-emerald-400 rounded"></span>
                  <span className="text-sm">Done</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="inline-block w-5 h-5 bg-slate-300 rounded"></span>
                  <span className="text-sm">Not Started</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="inline-block w-5 h-5 bg-blue-500 rounded"></span>
                  <span className="text-sm">In Progress</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="inline-block w-5 h-5 bg-yellow-500 rounded"></span>
                  <span className="text-sm">Risks Apply</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="inline-block w-5 h-5 bg-orange-500 rounded"></span>
                  <span className="text-sm">Scheduling Issues</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="inline-block w-5 h-5 bg-red-500 rounded"></span>
                  <span className="text-sm">Blocked</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="inline-block w-5 h-5 bg-amber-800 rounded"></span>
                  <span className="text-sm">Cancelled</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="inline-block w-5 h-5 bg-gray-900 rounded"></span>
                  <span className="text-sm">Orphan</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="inline-block w-5 h-5 bg-emerald-400 rounded relative">
                    <span className="absolute -top-1 -right-1 text-white text-xs font-bold">✓</span>
                  </span>
                  <span className="text-sm">Accepted</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="inline-block w-5 h-5 bg-emerald-400 rounded relative">
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-sm"></span>
                  </span>
                  <span className="text-sm">Accepted with Planning Issues</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4 text-xs uppercase tracking-wide text-muted-foreground">LEGEND</h3>
              <ul className="space-y-2.5">
                <li className="flex items-center gap-2.5">
                  <span className="inline-flex items-center justify-center w-6 h-6 bg-gray-400 text-white text-[10px] font-bold rounded-sm">O</span>
                  <span className="text-sm">Objective</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="inline-flex items-center justify-center w-6 h-6 bg-gray-400 text-white text-[10px] font-bold" style={{clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'}}>M</span>
                  <span className="text-sm">Milestone</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="inline-block w-6 h-5 bg-gray-400 rounded-sm"></span>
                  <span className="text-sm">Feature</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="inline-block w-6 h-5 bg-gray-400 rounded-sm relative">
                    <span className="absolute right-0 top-0 bottom-0 w-1 bg-gray-700"></span>
                  </span>
                  <span className="text-sm">Parent of split Feature</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="inline-block w-6 h-5 bg-gray-400 rounded-sm relative">
                    <span className="absolute left-0 top-0 bottom-0 w-1 bg-gray-700"></span>
                  </span>
                  <span className="text-sm">Child of split Feature</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="inline-flex items-center justify-center w-6 h-5 bg-gray-400 text-white text-[10px] font-bold rounded-sm">D</span>
                  <span className="text-sm">Dependency</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="text-base">▶</span>
                  <span className="text-sm">Into Program requested Dependency</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="text-base">◀</span>
                  <span className="text-sm">Out of Program depends on Dependency</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="text-blue-500 text-base">🔗</span>
                  <span className="text-sm">Predecessor Feature with successors</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="text-blue-500 text-base">🔗</span>
                  <span className="text-sm">Successor Feature with predecessors</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="text-blue-500 text-base">🔗</span>
                  <span className="text-sm">Feature with successors and predecessors</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
