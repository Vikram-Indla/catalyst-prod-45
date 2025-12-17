/**
 * MetaStrip - Single source of truth for ownership fields
 * Catalyst Design System styling with inline editable chips
 */

import { format } from 'date-fns';
import { User, Building2, Calendar, Layers } from 'lucide-react';
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
  onBusinessOwnerChange?: (id: string, name: string) => void;
  onDepartmentChange?: (id: string, name: string) => void;
  onTargetDateChange?: (date: string | null) => void;
  onDeliveryPlatformChange?: (value: string | null) => void;
  className?: string;
}

const chipStyles = {
  base: "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium cursor-pointer transition-colors",
};

export function MetaStrip({
  businessOwner,
  businessOwnerId,
  department,
  departmentId,
  targetDate,
  deliveryPlatform,
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

  return (
    <div className={cn("flex items-center gap-2 flex-wrap", className)}>
      {/* Business Owner Chip */}
      <Popover open={ownerOpen} onOpenChange={setOwnerOpen}>
        <PopoverTrigger asChild>
          <button
            className={chipStyles.base}
            style={{
              background: 'var(--surface-hover, hsl(var(--muted)))',
              border: '1px solid var(--border-default, hsl(var(--border)))',
              color: 'var(--text-secondary, hsl(var(--muted-foreground)))',
            }}
          >
            <User className="h-3.5 w-3.5" style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }} />
            {businessOwner || 'Unassigned'}
          </button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[220px] p-2 z-[400]" 
          align="start"
          style={{ background: 'var(--surface-bg, hsl(var(--background)))', borderColor: 'var(--border-default, hsl(var(--border)))' }}
        >
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
          <button
            className={chipStyles.base}
            style={{
              background: 'var(--surface-hover, hsl(var(--muted)))',
              border: '1px solid var(--border-default, hsl(var(--border)))',
              color: 'var(--text-secondary, hsl(var(--muted-foreground)))',
            }}
          >
            <Building2 className="h-3.5 w-3.5" style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }} />
            {department || 'No Department'}
          </button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[220px] p-2 z-[400]" 
          align="start"
          style={{ background: 'var(--surface-bg, hsl(var(--background)))', borderColor: 'var(--border-default, hsl(var(--border)))' }}
        >
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
          <button
            className={chipStyles.base}
            style={{
              background: 'var(--surface-hover, hsl(var(--muted)))',
              border: '1px solid var(--border-default, hsl(var(--border)))',
              color: 'var(--text-secondary, hsl(var(--muted-foreground)))',
            }}
          >
            <Calendar className="h-3.5 w-3.5" style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }} />
            {formatDate(targetDate)}
          </button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-auto p-2 z-[400]" 
          align="start"
          style={{ background: 'var(--surface-bg, hsl(var(--background)))', borderColor: 'var(--border-default, hsl(var(--border)))' }}
        >
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

      {/* Platform Chip - Only show if has value */}
      {deliveryPlatform && (
        <Popover open={platformOpen} onOpenChange={setPlatformOpen}>
          <PopoverTrigger asChild>
            <button
              className={chipStyles.base}
              style={{
                background: 'var(--surface-hover, hsl(var(--muted)))',
                border: '1px solid var(--border-default, hsl(var(--border)))',
                color: 'var(--text-secondary, hsl(var(--muted-foreground)))',
              }}
            >
              <Layers className="h-3.5 w-3.5" style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }} />
              {deliveryPlatform}
            </button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-[220px] p-2 z-[400]" 
            align="start"
            style={{ background: 'var(--surface-bg, hsl(var(--background)))', borderColor: 'var(--border-default, hsl(var(--border)))' }}
          >
            <DeliveryPlatformSelect
              value={deliveryPlatform || null}
              onChange={(value) => {
                onDeliveryPlatformChange?.(value);
                setPlatformOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
