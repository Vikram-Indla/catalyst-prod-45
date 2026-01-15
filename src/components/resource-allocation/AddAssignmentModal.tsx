/**
 * Add Assignment Modal
 * Form for adding a new project assignment with period selection
 * Catalyst V5 Enterprise Design System
 */

import { useState, useEffect, useMemo } from 'react';
import { X, Search, Check, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { getISOWeek, addWeeks, startOfWeek, format } from 'date-fns';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [periodType, setPeriodType] = useState<'weekly' | 'monthly'>(defaultView === 'weeks' ? 'weekly' : 'monthly');
  const [startPeriod, setStartPeriod] = useState<string>('');
  const [endPeriod, setEndPeriod] = useState<string>('');
  const [percentage, setPercentage] = useState(100);
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
      setEndPeriod(`${currentWeek + 4}-${currentYear}`);
    } else {
      setStartPeriod(`${currentMonth}-${currentYear}`);
      setEndPeriod(`${Math.min(12, currentMonth + 2)}-${currentYear}`);
    }
  }, [periodType, currentWeek, currentMonth, currentYear]);

  // Filter assignments
  const filteredAssignments = availableAssignments
    .filter(a => !existingAssignmentIds.includes(a.id))
    .filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // Generate period options
  const periodOptions = useMemo(() => {
    if (periodType === 'weekly') {
      const options = [];
      for (let w = 1; w <= 52; w++) {
        const weekStart = addWeeks(startOfWeek(new Date(currentYear, 0, 1), { weekStartsOn: 1 }), w - 1);
        const label = `W${w} (${format(weekStart, 'MMM d')})`;
        options.push({ value: `${w}-${currentYear}`, label });
      }
      return options;
    } else {
      const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      return months.map((month, i) => ({
        value: `${i + 1}-${currentYear}`,
        label: `${month} ${currentYear}`,
      }));
    }
  }, [periodType, currentYear]);

  const selectedAssignment = availableAssignments.find(a => a.id === selectedAssignmentId);

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
          className="bg-card rounded-xl w-full max-w-[440px] shadow-[0_16px_48px_rgba(0,0,0,0.2)] border border-border max-h-[85vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-assignment-title"
        >
          {/* Header */}
          <div className="px-5 pt-5 pb-4 border-b border-border flex-shrink-0">
            <div className="flex items-start justify-between">
              <div>
                <h3 id="add-assignment-title" className="text-[15px] font-bold text-foreground">
                  Add Assignment
                </h3>
                <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                  Assign {resourceName} to a project
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
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {/* Project Selection */}
            <div className="space-y-2">
              <Label className="text-[12px] font-semibold">Project / Assignment</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-[12px]"
                />
              </div>
              <div className="border border-border rounded-lg max-h-[140px] overflow-y-auto">
                {filteredAssignments.length === 0 ? (
                  <div className="p-4 text-center text-[12px] text-muted-foreground">
                    No available projects found
                  </div>
                ) : (
                  filteredAssignments.map((assignment) => (
                    <button
                      key={assignment.id}
                      onClick={() => setSelectedAssignmentId(assignment.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                        "hover:bg-muted/50 border-b border-border last:border-b-0",
                        selectedAssignmentId === assignment.id && "bg-primary/10"
                      )}
                    >
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: assignment.color }}
                      />
                      <span className="text-[12px] font-medium text-foreground flex-1 truncate">
                        {assignment.name}
                      </span>
                      {selectedAssignmentId === assignment.id && (
                        <Check className="w-4 h-4 text-primary" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Period Type Toggle */}
            <div className="space-y-2">
              <Label className="text-[12px] font-semibold">Period Type</Label>
              <div className="flex bg-muted/50 rounded-lg p-0.5 border border-border">
                <button
                  onClick={() => setPeriodType('weekly')}
                  className={cn(
                    "flex-1 py-2 rounded-md text-[12px] font-semibold transition-all",
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
                    "flex-1 py-2 rounded-md text-[12px] font-semibold transition-all",
                    periodType === 'monthly'
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Months
                </button>
              </div>
            </div>

            {/* Period Selection */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-[12px] font-semibold">Start {periodType === 'weekly' ? 'Week' : 'Month'}</Label>
                <Select value={startPeriod} onValueChange={setStartPeriod}>
                  <SelectTrigger className="h-9 text-[12px]">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {periodOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-[12px]">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[12px] font-semibold">End {periodType === 'weekly' ? 'Week' : 'Month'}</Label>
                <Select value={endPeriod} onValueChange={setEndPeriod}>
                  <SelectTrigger className="h-9 text-[12px]">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {periodOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-[12px]">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Allocation Percentage */}
            <div className="space-y-2">
              <Label className="text-[12px] font-semibold">Allocation %</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={0}
                  max={200}
                  value={percentage}
                  onChange={(e) => setPercentage(Number(e.target.value))}
                  className="h-9 text-[12px] w-20"
                />
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all",
                      percentage > 100 ? "bg-destructive" : "bg-primary"
                    )}
                    style={{ width: `${Math.min(100, percentage)}%` }}
                  />
                </div>
                <span className="text-[11px] font-medium text-muted-foreground w-10 text-right">
                  {percentage}%
                </span>
              </div>
            </div>

            {/* Status Toggle */}
            <div className="space-y-2">
              <Label className="text-[12px] font-semibold">Status</Label>
              <div className="flex bg-muted/50 rounded-lg p-0.5 border border-border">
                <button
                  onClick={() => setStatus('committed')}
                  className={cn(
                    "flex-1 py-2 rounded-md text-[12px] font-semibold transition-all",
                    status === 'committed'
                      ? "bg-primary text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Committed
                </button>
                <button
                  onClick={() => setStatus('forecast')}
                  className={cn(
                    "flex-1 py-2 rounded-md text-[12px] font-semibold transition-all",
                    status === 'forecast'
                      ? "bg-[#d97706] text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Forecast
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-border flex items-center justify-end gap-3 flex-shrink-0">
            <Button
              variant="outline"
              onClick={onClose}
              className="rounded-lg text-[12px]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedAssignmentId || !startPeriod || !endPeriod || isSubmitting}
              className="rounded-lg text-[12px] bg-[#0d9488] hover:bg-[#14b8a6]"
            >
              {isSubmitting ? 'Adding...' : 'Add Assignment'}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
