/**
 * Date Range Picker - Preset date ranges for reports
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Calendar, ChevronDown } from 'lucide-react';
import type { DateRangePreset } from '../../api/types';
import { getDateRangeFromPreset, formatDateForDB } from '../../api/reports';
import { format } from 'date-fns';

interface DateRangePickerProps {
  value: DateRangePreset;
  onChange: (preset: DateRangePreset) => void;
}

const presetLabels: Record<DateRangePreset, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  last_7_days: 'Last 7 Days',
  last_14_days: 'Last 14 Days',
  last_30_days: 'Last 30 Days',
  last_90_days: 'Last 90 Days',
  this_week: 'This Week',
  this_month: 'This Month',
  this_quarter: 'This Quarter',
  custom: 'Custom Range',
};

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const { start, end } = getDateRangeFromPreset(value);
  const formattedRange = `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2 h-9 px-3">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{formattedRange}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => onChange('today')}>
          Today
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChange('yesterday')}>
          Yesterday
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onChange('last_7_days')}>
          Last 7 Days
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChange('last_14_days')}>
          Last 14 Days
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChange('last_30_days')}>
          Last 30 Days
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChange('last_90_days')}>
          Last 90 Days
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onChange('this_week')}>
          This Week
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChange('this_month')}>
          This Month
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChange('this_quarter')}>
          This Quarter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
