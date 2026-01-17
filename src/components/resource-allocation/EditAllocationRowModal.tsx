/**
 * Edit Allocation Row Modal
 * Modal for editing an entire allocation row (percentage, status, dates)
 * Catalyst V5 Enterprise Design System
 */

import { useState, useEffect } from 'react';
import { X, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format, parseISO } from 'date-fns';
import type { AllocationStatus, TimelineBar } from '@/types/resource-allocation.types';

interface EditAllocationRowModalProps {
  allocation: TimelineBar;
  onSave: (data: { 
    id: string; 
    percentage?: number; 
    status?: AllocationStatus;
    startDate?: string;
    endDate?: string;
  }) => Promise<void>;
  onClose: () => void;
}

export function EditAllocationRowModal({
  allocation,
  onSave,
  onClose,
}: EditAllocationRowModalProps) {
  const [percentage, setPercentage] = useState(allocation.percentage);
  const [status, setStatus] = useState<AllocationStatus>(allocation.status);
  const [startDate, setStartDate] = useState<Date>(() => {
    try {
      return parseISO(allocation.startDate);
    } catch {
      return new Date();
    }
  });
  const [endDate, setEndDate] = useState<Date>(() => {
    try {
      return parseISO(allocation.endDate);
    } catch {
      return new Date();
    }
  });
  const [isSaving, setIsSaving] = useState(false);

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

  const presets = [0, 25, 50, 75, 100];

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        id: allocation.allocationId,
        percentage,
        status,
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
      });
      onClose();
    } catch (error) {
      console.error('Failed to save allocation:', error);
    } finally {
      setIsSaving(false);
    }
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
          className="bg-card rounded-xl w-full max-w-[380px] shadow-[0_16px_48px_rgba(0,0,0,0.2)] border border-border"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-row-modal-title"
        >
          {/* Header */}
          <div className="px-5 pt-5 pb-4 border-b border-border">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                {/* Color dot */}
                <div 
                  className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                  style={{ backgroundColor: allocation.assignmentColor }}
                />
                <div>
                  <h3 id="edit-row-modal-title" className="text-[14px] font-bold text-foreground">
                    Edit Allocation
                  </h3>
                  <p className="text-[12px] font-semibold text-foreground mt-0.5">
                    {allocation.assignmentName}
                  </p>
                </div>
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
            {/* Section: Allocation Time */}
            <div>
              <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.08em] block mb-3">
                Allocation Time
              </label>
              <div className="grid grid-cols-2 gap-3">
                {/* Start Date */}
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1.5 block">Start Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal h-10",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, 'MMM d, yyyy') : 'Select date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-[1200]" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={startDate}
                        onSelect={(date) => date && setStartDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                {/* End Date */}
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1.5 block">End Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal h-10",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, 'MMM d, yyyy') : 'Select date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-[1200]" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={endDate}
                        onSelect={(date) => date && setEndDate(date)}
                        disabled={(date) => date < startDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            {/* Section: Allocation Percentage */}
            <div>
              <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.08em] block mb-4">
                Allocation Percentage
              </label>

              {/* Hero Number */}
              <div className="text-center mb-6">
                <span className="text-[40px] font-extrabold text-foreground tracking-[-0.03em]">
                  {percentage}%
                </span>
              </div>

              {/* Slider */}
              <div className="px-1">
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
                      "flex-1 h-10 rounded-[8px] text-[12px] font-bold transition-all",
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
                Allocation Status
              </label>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setStatus('committed')}
                  className={cn(
                    "p-4 rounded-[10px] border-2 text-center transition-all",
                    status === 'committed'
                      ? "bg-primary/[0.06] border-primary"
                      : "bg-card border-border hover:border-muted-foreground/50"
                  )}
                >
                  <div className={cn(
                    "text-[12px] font-bold",
                    status === 'committed' ? "text-primary" : "text-foreground"
                  )}>
                    Committed
                  </div>
                  <div className="text-[9px] text-muted-foreground mt-0.5 mb-2">
                    Confirmed allocation
                  </div>
                  {/* Preview bar - solid */}
                  <div className="w-full h-2 rounded bg-primary" />
                </button>

                <button
                  onClick={() => setStatus('forecast')}
                  className={cn(
                    "p-4 rounded-[10px] border-2 text-center transition-all",
                    status === 'forecast'
                      ? "bg-primary/[0.06] border-primary"
                      : "bg-card border-border hover:border-muted-foreground/50"
                  )}
                >
                  <div className={cn(
                    "text-[12px] font-bold",
                    status === 'forecast' ? "text-primary" : "text-foreground"
                  )}>
                    Forecast
                  </div>
                  <div className="text-[9px] text-muted-foreground mt-0.5 mb-2">
                    Projected allocation
                  </div>
                  {/* Preview bar - striped with dashed border */}
                  <div 
                    className="w-full h-2 rounded border border-dashed border-primary"
                    style={{
                      background: 'repeating-linear-gradient(-45deg, rgba(37,99,235,0.3), rgba(37,99,235,0.3) 2px, rgba(37,99,235,0.5) 2px, rgba(37,99,235,0.5) 4px)'
                    }}
                  />
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
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

export default EditAllocationRowModal;
