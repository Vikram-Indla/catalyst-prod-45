import { useState } from 'react';
import { Calendar, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { subDays, startOfWeek, startOfMonth, startOfQuarter } from 'date-fns';
import { DateRange } from '@/types/reports';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ReportFiltersProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  selectedRelease?: string;
  onReleaseChange?: (releaseId: string) => void;
}

const presetRanges = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 14 days', days: 14 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'This week', preset: 'week' as const },
  { label: 'This month', preset: 'month' as const },
  { label: 'This quarter', preset: 'quarter' as const },
];

export function ReportFilters({ dateRange, onDateRangeChange, onRefresh, isLoading, selectedRelease, onReleaseChange }: ReportFiltersProps) {
  const [open, setOpen] = useState(false);

  const { data: releases } = useQuery({
    queryKey: ['report-releases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('releases')
        .select('id, name')
        .order('name');
      if (error) throw new Error(error.message);
      return data || [];
    },
  });

  const handlePresetSelect = (preset: typeof presetRanges[0]) => {
    const end = new Date();
    let start: Date;
    if (preset.days) { start = subDays(end, preset.days); }
    else if (preset.preset === 'week') { start = startOfWeek(end); }
    else if (preset.preset === 'month') { start = startOfMonth(end); }
    else if (preset.preset === 'quarter') { start = startOfQuarter(end); }
    else { start = subDays(end, 30); }
    onDateRangeChange({ start, end, label: preset.label });
    setOpen(false);
  };

  return (
    <div className="flex items-center gap-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Calendar className="h-4 w-4" />
            {dateRange.label}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2" align="start">
          <div className="space-y-1">
            {presetRanges.map((preset) => (
              <Button key={preset.label} variant="ghost" size="sm" className="w-full justify-start" onClick={() => handlePresetSelect(preset)}>
                {preset.label}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      {onReleaseChange && (
        <Select value={selectedRelease || 'all'} onValueChange={v => onReleaseChange(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Releases" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Releases</SelectItem>
            {releases?.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      {onRefresh && (
        <Button variant="outline" size="icon" onClick={onRefresh} disabled={isLoading}>
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
        </Button>
      )}
    </div>
  );
}