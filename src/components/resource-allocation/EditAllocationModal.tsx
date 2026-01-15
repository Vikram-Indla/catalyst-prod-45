/**
 * Edit Allocation Modal
 * Modal for editing a single allocation cell (percentage + status)
 * Catalyst V5 Enterprise Design System
 */

import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import type { Allocation, AllocationStatus } from '@/types/resource-allocation.types';
import { ASSIGNMENT_COLORS } from '@/types/resource-allocation.types';

interface EditAllocationModalProps {
  allocation: Allocation | null;
  assignmentName: string;
  weekLabel: string;
  weekDateRange: string;
  assignmentColor: keyof typeof ASSIGNMENT_COLORS;
  onSave: (percentage: number, status: AllocationStatus) => void;
  onClose: () => void;
}

export function EditAllocationModal({
  allocation,
  assignmentName,
  weekLabel,
  weekDateRange,
  assignmentColor,
  onSave,
  onClose,
}: EditAllocationModalProps) {
  const [percentage, setPercentage] = useState(allocation?.percentage ?? 0);
  const [status, setStatus] = useState<AllocationStatus>(allocation?.status ?? 'committed');
  const modalRef = useRef<HTMLDivElement>(null);
  const color = ASSIGNMENT_COLORS[assignmentColor] || ASSIGNMENT_COLORS.primary;

  // Focus trap
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Focus slider on open
  useEffect(() => {
    const slider = modalRef.current?.querySelector('[role="slider"]');
    if (slider instanceof HTMLElement) {
      slider.focus();
    }
  }, []);

  const presets = [0, 25, 50, 75, 100];

  const handleApply = () => {
    onSave(percentage, status);
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 z-[1100] animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] bg-card rounded-[16px] shadow-xl z-[1101] animate-in fade-in slide-in-from-bottom-5 duration-300"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <div id="modal-title" className="text-[14px] font-bold text-foreground">
              Edit {status === 'committed' ? 'Committed' : 'Forecast'} Allocation
            </div>
            <div className="text-[11px] font-medium text-muted-foreground mt-0.5">
              {weekLabel} • {assignmentName}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-[6px] bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Percentage Display */}
          <div className="text-center mb-6">
            <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.08em] mb-2">
              Allocation Percentage
            </div>
            <div
              className="text-[32px] font-extrabold tracking-[-0.03em]"
              style={{ color }}
            >
              {percentage}%
            </div>
          </div>

          {/* Slider */}
          <div className="mb-5">
            <Slider
              value={[percentage]}
              onValueChange={([val]) => setPercentage(val)}
              min={0}
              max={100}
              step={5}
              className="w-full"
            />
          </div>

          {/* Preset Buttons */}
          <div className="flex gap-2 mb-6">
            {presets.map((preset) => (
              <button
                key={preset}
                onClick={() => setPercentage(preset)}
                className={cn(
                  "flex-1 h-9 rounded-[6px] text-[11px] font-bold transition-colors",
                  percentage === preset
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground hover:bg-primary hover:text-primary-foreground border border-border"
                )}
              >
                {preset}%
              </button>
            ))}
          </div>

          {/* Status Toggle */}
          <div className="mb-5">
            <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.08em] mb-2">
              Status
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setStatus('committed')}
                className={cn(
                  "py-3 px-4 rounded-[8px] border-2 transition-all text-left",
                  status === 'committed'
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-muted-foreground/30"
                )}
              >
                <div
                  className={cn(
                    "text-[11px] font-bold",
                    status === 'committed' ? "text-primary" : "text-foreground"
                  )}
                >
                  Committed
                </div>
                <div className="text-[9px] text-muted-foreground">Agreed</div>
              </button>
              <button
                onClick={() => setStatus('forecast')}
                className={cn(
                  "py-3 px-4 rounded-[8px] border-2 transition-all text-left",
                  status === 'forecast'
                    ? "border-[#d97706] bg-[#d97706]/5"
                    : "border-border bg-card hover:border-muted-foreground/30"
                )}
              >
                <div
                  className={cn(
                    "text-[11px] font-bold",
                    status === 'forecast' ? "text-[#d97706]" : "text-foreground"
                  )}
                >
                  Forecast
                </div>
                <div className="text-[9px] text-muted-foreground">Projected</div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-4 border-t border-border bg-muted/20 rounded-b-[16px]">
          <Button variant="ghost" size="sm" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" className="flex-1" onClick={handleApply}>
            Apply
          </Button>
        </div>
      </div>
    </>
  );
}
