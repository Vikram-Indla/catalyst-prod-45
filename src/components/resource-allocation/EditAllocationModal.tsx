/**
 * Edit Allocation Modal
 * Secondary modal for editing a single allocation cell
 * Catalyst V5 Enterprise Design System
 */

import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import type { Allocation, AllocationStatus } from '@/types/resource-allocation.types';

interface EditAllocationModalProps {
  assignmentId: string;
  assignmentName: string;
  weekStart: string;
  weekLabel: string;
  currentAllocation?: Allocation;
  onApply: (percentage: number, status: AllocationStatus) => void;
  onClose: () => void;
}

export function EditAllocationModal({
  assignmentId,
  assignmentName,
  weekStart,
  weekLabel,
  currentAllocation,
  onApply,
  onClose,
}: EditAllocationModalProps) {
  const [percentage, setPercentage] = useState(currentAllocation?.percentage ?? 0);
  const [status, setStatus] = useState<AllocationStatus>(currentAllocation?.status ?? 'forecast');
  const sliderRef = useRef<HTMLDivElement>(null);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Focus slider on mount
  useEffect(() => {
    if (sliderRef.current) {
      const slider = sliderRef.current.querySelector('[role="slider"]');
      if (slider instanceof HTMLElement) {
        slider.focus();
      }
    }
  }, []);

  const presets = [0, 25, 50, 75, 100];

  const handleApply = () => {
    onApply(percentage, status);
  };

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-[1100] animate-in fade-in duration-150"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div 
        className="fixed inset-0 z-[1101] flex items-center justify-center p-4 animate-in fade-in slide-in-from-bottom-2 duration-200"
      >
        <div 
          className="bg-card rounded-xl w-full max-w-[320px] shadow-[0_16px_48px_rgba(0,0,0,0.2)] border border-border"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-modal-title"
        >
          {/* Header */}
          <div className="px-5 pt-5 pb-4 border-b border-border">
            <div className="flex items-start justify-between">
              <div>
                <h3 id="edit-modal-title" className="text-[14px] font-bold text-foreground">
                  Edit {status === 'committed' ? 'Committed' : 'Forecast'} Allocation
                </h3>
                <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                  {weekLabel} • {assignmentName}
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-md bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors -mt-1 -mr-1"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-5 py-6 space-y-6">
            {/* Section: Allocation Percentage */}
            <div>
              <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.08em] block mb-4">
                Allocation Percentage
              </label>

              {/* Hero Number */}
              <div className="text-center mb-6">
                <span className="text-[32px] font-extrabold text-foreground tracking-[-0.03em]">
                  {percentage}%
                </span>
              </div>

              {/* Slider */}
              <div ref={sliderRef} className="px-1">
                <Slider
                  value={[percentage]}
                  onValueChange={(value) => setPercentage(value[0])}
                  max={100}
                  min={0}
                  step={5}
                  className="w-full"
                />
              </div>

              {/* Preset Buttons */}
              <div className="flex gap-2 mt-4">
                {presets.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setPercentage(preset)}
                    className={cn(
                      "flex-1 h-9 rounded-md text-[11px] font-bold transition-all",
                      percentage === preset
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted/50 border border-border text-muted-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary"
                    )}
                  >
                    {preset}%
                  </button>
                ))}
              </div>
            </div>

            {/* Section: Status Toggle */}
            <div>
              <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.08em] block mb-3">
                Status
              </label>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setStatus('committed')}
                  className={cn(
                    "p-3 rounded-lg border-2 text-left transition-all",
                    status === 'committed'
                      ? "bg-primary/8 border-primary"
                      : "bg-card border-border hover:border-muted-foreground/50"
                  )}
                >
                  <div className={cn(
                    "text-[11px] font-bold",
                    status === 'committed' ? "text-primary" : "text-foreground"
                  )}>
                    Committed
                  </div>
                  <div className="text-[9px] text-muted-foreground mt-0.5">
                    Agreed allocation
                  </div>
                </button>

                <button
                  onClick={() => setStatus('forecast')}
                  className={cn(
                    "p-3 rounded-lg border-2 text-left transition-all",
                    status === 'forecast'
                      ? "bg-primary/8 border-primary"
                      : "bg-card border-border hover:border-muted-foreground/50"
                  )}
                >
                  <div className={cn(
                    "text-[11px] font-bold",
                    status === 'forecast' ? "text-primary" : "text-foreground"
                  )}>
                    Forecast
                  </div>
                  <div className="text-[9px] text-muted-foreground mt-0.5">
                    Projected allocation
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-border flex items-center justify-end gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleApply}
            >
              Apply
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

export default EditAllocationModal;
