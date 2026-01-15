/**
 * Add Assignment Modal
 * Form for adding a new project assignment with period selection
 * Catalyst V5 Enterprise Design System - Matches Linear/Notion Design
 */

import { useState, useEffect, useMemo } from 'react';
import { X, ChevronDown, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { 
  Assignment, 
  CreateAllocationInput, 
  TimelineView,
  AllocationStatus,
} from '@/types/resource-allocation.types';
import { getISOWeek, addWeeks, startOfWeek, format, addMonths, startOfMonth } from 'date-fns';

interface AddAssignmentModalProps {
  resourceId: string;
  resourceName: string;
  existingAssignmentIds: string[];
  availableAssignments: Assignment[];
  defaultView?: TimelineView;
  onAdd: (data: CreateAllocationInput) => Promise<void>;
  onClose: () => void;
}

export function AddAssignmentModal({
  resourceId,
  resourceName,
  existingAssignmentIds,
  availableAssignments,
  defaultView = 'weeks',
  onAdd,
  onClose,
}: AddAssignmentModalProps) {
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>('');
  const [periodType, setPeriodType] = useState<'weekly' | 'monthly'>(defaultView === 'weeks' ? 'weekly' : 'monthly');
  const [startPeriod, setStartPeriod] = useState<string>('');
  const [endPeriod, setEndPeriod] = useState<string>('');
  const [percentage, setPercentage] = useState(50);
  const [status, setStatus] = useState<AllocationStatus>('committed');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const today = new Date('2026-01-15');
  const currentYear = today.getFullYear();
  const currentWeek = getISOWeek(today);
  const currentMonth = today.getMonth() + 1;

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Set default periods
  useEffect(() => {
    if (periodType === 'weekly') {
      setStartPeriod(`${currentWeek}-${currentYear}`);
      setEndPeriod(`${Math.min(52, currentWeek + 9)}-${currentYear}`);
    } else {
      setStartPeriod(`${currentMonth}-${currentYear}`);
      setEndPeriod(`${Math.min(12, currentMonth + 2)}-${currentYear}`);
    }
  }, [periodType, currentWeek, currentMonth, currentYear]);

  // Filter assignments (exclude already assigned)
  const filteredAssignments = availableAssignments
    .filter(a => !existingAssignmentIds.includes(a.id));

  // Generate period options with formatted labels
  const periodOptions = useMemo(() => {
    if (periodType === 'weekly') {
      const options = [];
      const yearStart = startOfWeek(new Date(currentYear, 0, 4), { weekStartsOn: 1 }); // Week 1 starts around Jan 4
      for (let w = 1; w <= 52; w++) {
        const weekStart = addWeeks(yearStart, w - 1);
        const label = `W${w} · ${format(weekStart, 'MMM d')}`;
        options.push({ value: `${w}-${currentYear}`, label });
      }
      return options;
    } else {
      const options = [];
      for (let m = 1; m <= 12; m++) {
        const monthStart = startOfMonth(new Date(currentYear, m - 1, 1));
        const label = `${format(monthStart, 'MMM')} · ${format(monthStart, 'MMMM yyyy')}`;
        options.push({ value: `${m}-${currentYear}`, label });
      }
      return options;
    }
  }, [periodType, currentYear]);

  // Get selected period label
  const getSelectedLabel = (value: string) => {
    const option = periodOptions.find(o => o.value === value);
    return option?.label || 'Select...';
  };

  const handleSubmit = async () => {
    if (!selectedAssignmentId || !startPeriod || !endPeriod) return;

    setIsSubmitting(true);
    try {
      const [startNum, startYear] = startPeriod.split('-').map(Number);
      const [endNum, endYear] = endPeriod.split('-').map(Number);

      const input: CreateAllocationInput = {
        resource_id: resourceId,
        assignment_id: selectedAssignmentId,
        period_type: periodType,
        start_year: startYear,
        end_year: endYear,
        allocation_percentage: percentage,
        status,
      };

      if (periodType === 'weekly') {
        input.start_week = startNum;
        input.end_week = endNum;
      } else {
        input.start_month = startNum;
        input.end_month = endNum;
      }

      await onAdd(input);
    } finally {
      setIsSubmitting(false);
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
          className="bg-card rounded-2xl w-full max-w-[420px] shadow-[0_20px_60px_rgba(0,0,0,0.25)] border border-border"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-assignment-title"
        >
          {/* Header */}
          <div className="px-6 pt-5 pb-4 flex items-start justify-between">
            <h3 id="add-assignment-title" className="text-[18px] font-bold text-foreground">
              Add Assignment
            </h3>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors -mt-1 -mr-1"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Divider */}
          <div className="h-1 bg-gradient-to-r from-primary via-[#0d9488] to-[#7c3aed]" />

          {/* Content */}
          <div className="px-6 py-5 space-y-6">
            {/* Assignment Selection */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-primary uppercase tracking-wider">
                ASSIGNMENT
              </label>
              <Select value={selectedAssignmentId} onValueChange={setSelectedAssignmentId}>
                <SelectTrigger className="h-12 text-[14px] rounded-xl border-border bg-muted/30">
                  <SelectValue placeholder="Select an assignment..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {filteredAssignments.length === 0 ? (
                    <div className="p-4 text-center text-[12px] text-muted-foreground">
                      No available assignments
                    </div>
                  ) : (
                    filteredAssignments.map((assignment) => (
                      <SelectItem 
                        key={assignment.id} 
                        value={assignment.id}
                        className="text-[13px] py-2.5"
                      >
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: assignment.color }}
                          />
                          {assignment.name}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Period Section */}
            <div className="space-y-3">
              <label className="text-[11px] font-bold text-primary uppercase tracking-wider">
                PERIOD
              </label>
              
              {/* Period Type Toggle */}
              <div className="flex bg-muted/50 rounded-xl p-1 border border-border">
                <button
                  onClick={() => setPeriodType('weekly')}
                  className={cn(
                    "flex-1 py-2.5 rounded-lg text-[13px] font-semibold transition-all",
                    periodType === 'weekly'
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Weeks
                </button>
                <button
                  onClick={() => setPeriodType('monthly')}
                  className={cn(
                    "flex-1 py-2.5 rounded-lg text-[13px] font-semibold transition-all",
                    periodType === 'monthly'
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Months
                </button>
              </div>

              {/* Start/End Period Selects */}
              <div className="flex items-center gap-3">
                <Select value={startPeriod} onValueChange={setStartPeriod}>
                  <SelectTrigger className="flex-1 h-11 text-[13px] rounded-xl border-border bg-muted/30">
                    <SelectValue placeholder="Start..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[240px] rounded-xl">
                    {periodOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-[12px]">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                
                <Select value={endPeriod} onValueChange={setEndPeriod}>
                  <SelectTrigger className="flex-1 h-11 text-[13px] rounded-xl border-border bg-muted/30">
                    <SelectValue placeholder="End..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[240px] rounded-xl">
                    {periodOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-[12px]">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Allocation & Status Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Allocation */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-primary uppercase tracking-wider">
                  ALLOCATION
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    max={200}
                    value={percentage}
                    onChange={(e) => setPercentage(Number(e.target.value))}
                    className="h-11 text-[15px] font-semibold rounded-xl border-border bg-muted/30 pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[14px] text-muted-foreground font-medium">
                    %
                  </span>
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-primary uppercase tracking-wider">
                  STATUS
                </label>
                <div className="flex bg-muted/50 rounded-xl p-1 border border-border h-11">
                  <button
                    onClick={() => setStatus('committed')}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 rounded-lg text-[12px] font-semibold transition-all",
                      status === 'committed'
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                    Committed
                  </button>
                  <button
                    onClick={() => setStatus('forecast')}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 rounded-lg text-[12px] font-semibold transition-all",
                      status === 'forecast'
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div className="w-2.5 h-2.5 rounded-full border-2 border-dashed border-[#d97706]" />
                    Forecast
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border flex items-center gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 h-11 rounded-xl text-[13px] font-semibold"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedAssignmentId || !startPeriod || !endPeriod || isSubmitting}
              className="flex-1 h-11 rounded-xl text-[13px] font-semibold bg-[#0d9488] hover:bg-[#14b8a6] text-white"
            >
              {isSubmitting ? 'Adding...' : '+ Add Assignment'}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
