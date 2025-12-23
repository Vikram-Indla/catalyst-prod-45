import { X, UserPlus, Calendar, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BulkActionsBarProps {
  selectedCount: number;
  onClear: () => void;
  onAssignOwner?: () => void;
  onSetQuarter?: () => void;
  onApprove?: () => void;
}

export function BulkActionsBar({ 
  selectedCount, 
  onClear,
  onAssignOwner,
  onSetQuarter,
  onApprove 
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div 
      className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
        "flex items-center gap-4 px-5 py-3",
        "bg-[#0f0f0f] text-white rounded-[14px]",
        "shadow-[0_8px_32px_rgba(0,0,0,0.25)]",
        "animate-in slide-in-from-bottom-4 fade-in-0 duration-300"
      )}
    >
      {/* Selected count */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">{selectedCount} selected</span>
        <div className="w-px h-5 bg-white/20" />
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        {onAssignOwner && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onAssignOwner}
            className="text-white/80 hover:text-white hover:bg-white/10"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Assign Owner
          </Button>
        )}
        
        {onSetQuarter && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSetQuarter}
            className="text-white/80 hover:text-white hover:bg-white/10"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Set Quarter
          </Button>
        )}
        
        {onApprove && (
          <Button
            size="sm"
            onClick={onApprove}
            className="bg-[var(--brand-gold)] hover:bg-[var(--brand-gold)]/90 text-white"
          >
            <Check className="h-4 w-4 mr-2" />
            Approve
          </Button>
        )}
      </div>

      {/* Close button */}
      <button
        onClick={onClear}
        className="ml-2 p-1.5 rounded-full hover:bg-white/10 transition-colors"
      >
        <X className="h-4 w-4 text-white/60 hover:text-white" />
      </button>
    </div>
  );
}
