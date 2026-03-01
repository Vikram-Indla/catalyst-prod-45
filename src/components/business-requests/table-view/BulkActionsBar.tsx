import { useState, useRef, useEffect } from 'react';
import { X, UserPlus, Calendar, RefreshCw, Trash2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DRAWER_PROCESS_STEPS } from '../drawer/StatusDropdown';

interface BulkActionsBarProps {
  selectedCount: number;
  onClear: () => void;
  onAssignOwner?: () => void;
  onSetQuarter?: () => void;
  onStatusUpdate?: (status: string) => void;
  onDelete?: () => void;
}

export function BulkActionsBar({ 
  selectedCount, 
  onClear,
  onAssignOwner,
  onSetQuarter,
  onStatusUpdate,
  onDelete
}: BulkActionsBarProps) {
  const [statusOpen, setStatusOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!statusOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setStatusOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [statusOpen]);

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
        
        {onStatusUpdate && (
          <div className="relative" ref={menuRef}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStatusOpen(!statusOpen)}
              className="text-white/80 hover:text-white hover:bg-white/10"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Update Status
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>

            {statusOpen && (
              <div
                className="absolute bottom-full mb-2 left-0 w-52 bg-popover border border-border rounded-lg shadow-xl overflow-hidden"
                style={{ animation: 'fy-dropIn 0.12s ease' }}
              >
                <div className="py-1">
                  {DRAWER_PROCESS_STEPS.map((step) => (
                    <button
                      key={step.value}
                      onClick={() => {
                        onStatusUpdate(step.value);
                        setStatusOpen(false);
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors text-left"
                    >
                      {step.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
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