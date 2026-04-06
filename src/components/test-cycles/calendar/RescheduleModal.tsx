import React, { useState } from 'react';
import { format, addDays } from 'date-fns';
import { Calendar, ArrowRight, AlertTriangle, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { DateRange } from '@/types/calendar.types';

interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  cycleRange: DateRange;
  totalTests: number;
  onReschedule: (params: { shiftDays: number } | { fromDate: Date; toDate: Date }) => void;
}

export function RescheduleModal({
  isOpen,
  onClose,
  cycleRange,
  totalTests,
  onReschedule,
}: RescheduleModalProps) {
  const [mode, setMode] = useState<'shift' | 'range'>('shift');
  const [shiftDays, setShiftDays] = useState(0);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const handleShift = (delta: number) => {
    setShiftDays(prev => prev + delta);
  };

  const previewDate = addDays(new Date(), shiftDays);
  const isExtendingPastCycle = shiftDays > 0 && previewDate > cycleRange.end;

  const handleSubmit = () => {
    if (mode === 'shift') {
      onReschedule({ shiftDays });
    } else {
      onReschedule({ fromDate: new Date(fromDate), toDate: new Date(toDate) });
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[#2563eb]" />
            Reschedule Tests
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <RadioGroup value={mode} onValueChange={(v) => setMode(v as 'shift' | 'range')}>
            {/* Shift all option */}
            <div
              className={cn(
                'p-4 rounded-lg border-2 cursor-pointer',
                mode === 'shift' ? 'border-[#2563eb] bg-[#eff6ff]' : 'border-[#e2e8f0]'
              )}
              onClick={() => setMode('shift')}
            >
              <div className="flex items-start gap-3">
                <RadioGroupItem value="shift" id="shift" className="mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor="shift" className="text-sm font-medium cursor-pointer">
                    Shift all tests by days
                  </Label>
                  <p className="text-xs text-[#64748b] mt-1">
                    Move all {totalTests} tests forward or backward
                  </p>

                  {mode === 'shift' && (
                    <div className="flex items-center gap-4 mt-4">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => handleShift(-1)}
                        className="h-10 w-10 border-[#e2e8f0]"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-[#0f172a]">
                          {shiftDays > 0 && '+'}{shiftDays}
                        </div>
                        <div className="text-xs text-[#64748b]">days</div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => handleShift(1)}
                        className="h-10 w-10 border-[#e2e8f0]"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Date range option */}
            <div
              className={cn(
                'p-4 rounded-lg border-2 cursor-pointer',
                mode === 'range' ? 'border-[#2563eb] bg-[#eff6ff]' : 'border-[#e2e8f0]'
              )}
              onClick={() => setMode('range')}
            >
              <div className="flex items-start gap-3">
                <RadioGroupItem value="range" id="range" className="mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor="range" className="text-sm font-medium cursor-pointer">
                    Move date range
                  </Label>
                  <p className="text-xs text-[#64748b] mt-1">
                    Move tests from one range to another
                  </p>

                  {mode === 'range' && (
                    <div className="mt-4 space-y-3">
                      <div>
                        <Label className="text-xs text-[#64748b]">From date</Label>
                        <Input
                          type="date"
                          value={fromDate}
                          onChange={(e) => setFromDate(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div className="flex justify-center">
                        <ArrowRight className="h-4 w-4 text-[#94a3b8]" />
                      </div>
                      <div>
                        <Label className="text-xs text-[#64748b]">To date</Label>
                        <Input
                          type="date"
                          value={toDate}
                          onChange={(e) => setToDate(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </RadioGroup>

          {/* Warning */}
          {isExtendingPastCycle && (
            <div className="flex items-start gap-2 p-3 bg-[#fef3c7] rounded-lg">
              <AlertTriangle className="h-4 w-4 text-[#d97706] shrink-0 mt-0.5" />
              <div className="text-xs text-[#92400e]">
                <strong>Warning:</strong> This will extend tests past the cycle end date
                ({format(cycleRange.end, 'MMM d')}). Consider extending the cycle.
              </div>
            </div>
          )}

          {/* Preview */}
          {mode === 'shift' && shiftDays !== 0 && (
            <div className="p-3 bg-[#f1f5f9] rounded-lg">
              <div className="text-xs font-medium text-[#64748b] mb-1">Preview</div>
              <div className="text-sm text-[rgba(237,237,237,0.53)]">
                {totalTests} tests will be moved{' '}
                <strong>{Math.abs(shiftDays)} days {shiftDays > 0 ? 'forward' : 'backward'}</strong>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={mode === 'shift' && shiftDays === 0}
            className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white"
          >
            Apply Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
