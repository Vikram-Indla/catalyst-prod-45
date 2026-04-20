/**
 * ChangeNumberSelect — Dropdown for selecting Change Numbers
 * Only shows "open" status change numbers
 */

import { useQuery } from '@tanstack/react-query';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getOpenChangeNumbers, getChangeNumbersByRelease } from '@/services/changeNumberService';
import { Info } from 'lucide-react';
import { Tooltip } from '@/components/ads';
import { cn } from '@/lib/utils';

interface ChangeNumberSelectProps {
  value: string | null;
  onChange: (value: string | null) => void;
  releaseId?: string;      // Optional: filter by specific release
  disabled?: boolean;
  placeholder?: string;
  showLabel?: boolean;     // Whether to show the label above
  className?: string;
}

export function ChangeNumberSelect({
  value,
  onChange,
  releaseId,
  disabled = false,
  placeholder = 'Select Change Number...',
  showLabel = true,
  className,
}: ChangeNumberSelectProps) {
  const { data: changeNumbers = [], isLoading } = useQuery({
    queryKey: ['change-numbers', releaseId || 'all'],
    queryFn: () =>
      releaseId
        ? getChangeNumbersByRelease(releaseId)
        : getOpenChangeNumbers(),
  });

  return (
    <div className={cn('space-y-2', className)}>
      {showLabel && (
        <div className="flex items-center gap-1">
          <label className="block text-sm font-medium text-foreground">Change Number</label>
          <Tooltip content={<p className="text-xs">Select from open change numbers in Release Calendar</p>}>
            <Info className="w-3 h-3 text-muted-foreground" />
          </Tooltip>
        </div>
      )}
      <Select
        value={value || ''}
        onValueChange={(v) => onChange(v || null)}
        disabled={disabled || isLoading}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={isLoading ? 'Loading...' : placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">
            <span className="text-muted-foreground">None</span>
          </SelectItem>
          {changeNumbers.map((cn) => (
            <SelectItem key={cn.id} value={cn.id}>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                  {cn.number}
                </span>
                {cn.description && (
                  <span className="text-muted-foreground truncate max-w-[180px]">
                    {cn.description}
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
          {changeNumbers.length === 0 && !isLoading && (
            <div className="py-2 px-3 text-sm text-muted-foreground">
              No open change numbers available
            </div>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
