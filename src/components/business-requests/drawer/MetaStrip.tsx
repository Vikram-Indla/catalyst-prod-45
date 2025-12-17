/**
 * MetaStrip - Single source of truth for ownership fields
 * Catalyst Design System: Champagne (#D4B896), Bronze (#8B7355), Olive (#5C7C5C)
 */

import { format } from 'date-fns';
import { User, Building2, Calendar, Layers, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DepartmentSelect } from '@/components/business-requests/DepartmentSelect';
import { BusinessOwnerSelect } from '@/components/business-requests/BusinessOwnerSelect';
import { CatalystDatePicker } from '@/components/ui/catalyst-date-picker';
import { DeliveryPlatformSelect } from '@/components/ui/lookup-select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useState } from 'react';

interface MetaStripProps {
  businessOwner?: string | null;
  businessOwnerId?: string | null;
  department?: string | null;
  departmentId?: string | null;
  targetDate?: string | null;
  deliveryPlatform?: string | null;
  priorityScore?: number | null;
  onBusinessOwnerChange?: (id: string, name: string) => void;
  onDepartmentChange?: (id: string, name: string) => void;
  onTargetDateChange?: (date: string | null) => void;
  onDeliveryPlatformChange?: (value: string | null) => void;
  className?: string;
}

export function MetaStrip({
  businessOwner,
  businessOwnerId,
  department,
  departmentId,
  targetDate,
  deliveryPlatform,
  priorityScore,
  onBusinessOwnerChange,
  onDepartmentChange,
  onTargetDateChange,
  onDeliveryPlatformChange,
  className
}: MetaStripProps) {
  const [ownerOpen, setOwnerOpen] = useState(false);
  const [deptOpen, setDeptOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [platformOpen, setPlatformOpen] = useState(false);

  const formatDate = (date?: string | null) => {
    if (!date) return 'No date';
    return format(new Date(date), 'd MMM yyyy');
  };

  const getScoreDisplay = () => {
    if (priorityScore) {
      return `${priorityScore.toFixed(1)}`;
    }
    return 'Unscored';
  };

  // Chip base styles - light gray background with gray border
  const chipBase = "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer transition-colors border";
  const chipDefaultStyle = {
    background: 'hsl(var(--muted) / 0.5)',
    borderColor: 'hsl(var(--border))',
    color: 'hsl(var(--foreground))',
  };

  // Score chip uses champagne background
  const scoreChipStyle = {
    background: '#D4B896',
    borderColor: 'rgba(139, 115, 85, 0.3)',
    color: '#6D5A43',
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Row 1: Business Owner, Department, Target Date */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Business Owner Chip */}
        <Popover open={ownerOpen} onOpenChange={setOwnerOpen}>
          <PopoverTrigger asChild>
            <button className={chipBase} style={chipDefaultStyle}>
              <User className="h-4 w-4 text-muted-foreground" />
              {businessOwner || 'Unassigned'}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[220px] p-2 z-[400]" align="start">
            <BusinessOwnerSelect
              value={businessOwnerId || null}
              onChange={(id) => {
                onBusinessOwnerChange?.(id, '');
                setOwnerOpen(false);
              }}
              departmentId={departmentId || null}
              placeholder="Select owner..."
            />
          </PopoverContent>
        </Popover>

        {/* Department Chip */}
        <Popover open={deptOpen} onOpenChange={setDeptOpen}>
          <PopoverTrigger asChild>
            <button className={chipBase} style={chipDefaultStyle}>
              <Building2 className="h-4 w-4 text-muted-foreground" />
              {department || 'No Department'}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[220px] p-2 z-[400]" align="start">
            <DepartmentSelect
              value={departmentId || null}
              onChange={(id) => {
                onDepartmentChange?.(id, '');
                setDeptOpen(false);
              }}
              placeholder="Select dept..."
            />
          </PopoverContent>
        </Popover>

        {/* Target Date Chip */}
        <Popover open={dateOpen} onOpenChange={setDateOpen}>
          <PopoverTrigger asChild>
            <button className={chipBase} style={chipDefaultStyle}>
              <Calendar className="h-4 w-4 text-muted-foreground" />
              {formatDate(targetDate)}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2 z-[400]" align="start">
            <CatalystDatePicker
              value={targetDate || null}
              onChange={(date) => {
                onTargetDateChange?.(date ? format(date, 'yyyy-MM-dd') : null);
                setDateOpen(false);
              }}
              placeholder="Select target date"
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Row 2: Delivery Platform */}
      <div className="flex items-center gap-2 flex-wrap">
        <Popover open={platformOpen} onOpenChange={setPlatformOpen}>
          <PopoverTrigger asChild>
            <button className={chipBase} style={chipDefaultStyle}>
              <Layers className="h-4 w-4 text-muted-foreground" />
              {deliveryPlatform || 'No Platform'}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[220px] p-2 z-[400]" align="start">
            <DeliveryPlatformSelect
              value={deliveryPlatform || null}
              onChange={(value) => {
                onDeliveryPlatformChange?.(value);
                setPlatformOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Row 3: Score Chip (champagne background) */}
      <div className="flex items-center gap-2">
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border"
          style={scoreChipStyle}
        >
          <Star className="h-4 w-4" />
          {getScoreDisplay()}
        </div>
      </div>
    </div>
  );
}
