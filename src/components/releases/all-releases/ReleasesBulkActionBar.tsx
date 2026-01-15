// =====================================================
// RELEASES BULK ACTION BAR
// Floating action bar when items are selected
// =====================================================

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ArrowLeftRight, UserPen, Archive, X } from 'lucide-react';

interface Props {
  selectedCount: number;
  onClear: () => void;
  onChangeStatus: () => void;
  onReassign: () => void;
  onArchive: () => void;
}

export function ReleasesBulkActionBar({ selectedCount, onClear, onChangeStatus, onReassign, onArchive }: Props) {
  return (
    <div className={cn(
      "fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 rounded-2xl px-6 py-4 flex items-center gap-4 shadow-2xl transition-all duration-300 z-50",
      selectedCount > 0 ? "translate-y-0 opacity-100" : "translate-y-24 opacity-0 pointer-events-none"
    )}>
      <div className="flex items-center gap-3">
        <span className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold">
          {selectedCount}
        </span>
        <span className="text-sm font-medium text-white">selected</span>
      </div>
      
      <div className="h-6 w-px bg-slate-600" />
      
      <Button variant="ghost" className="text-white hover:bg-slate-700" onClick={onChangeStatus}>
        <ArrowLeftRight className="w-4 h-4 mr-2" />
        Change Status
      </Button>
      
      <Button variant="ghost" className="text-white hover:bg-slate-700" onClick={onReassign}>
        <UserPen className="w-4 h-4 mr-2" />
        Reassign
      </Button>
      
      <Button variant="ghost" className="text-white hover:bg-slate-700" onClick={onArchive}>
        <Archive className="w-4 h-4 mr-2" />
        Archive
      </Button>
      
      <div className="h-6 w-px bg-slate-600" />
      
      <Button variant="ghost" className="text-red-400 hover:bg-red-900/30" onClick={onClear}>
        <X className="w-4 h-4 mr-2" />
        Clear
      </Button>
    </div>
  );
}
