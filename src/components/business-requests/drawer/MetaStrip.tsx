/**
 * MetaStrip - Single source of truth for ownership fields
 * Status, Business Owner, Department, Target Date - editable inline
 */

import { format } from 'date-fns';
import { User, Building2, Calendar, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DepartmentSelect } from '@/components/business-requests/DepartmentSelect';
import { BusinessOwnerSelect } from '@/components/business-requests/BusinessOwnerSelect';
import { CatalystDatePicker } from '@/components/ui/catalyst-date-picker';
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
  onBusinessOwnerChange?: (id: string, name: string) => void;
  onDepartmentChange?: (id: string, name: string) => void;
  onTargetDateChange?: (date: string | null) => void;
  className?: string;
}

export function MetaStrip({
  businessOwner,
  businessOwnerId,
  department,
  departmentId,
  targetDate,
  onBusinessOwnerChange,
  onDepartmentChange,
  onTargetDateChange,
  className
}: MetaStripProps) {
  const [ownerOpen, setOwnerOpen] = useState(false);
  const [deptOpen, setDeptOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);

  return (
    <div 
      className={cn("flex items-center gap-3 flex-wrap", className)}
    >
      {/* Business Owner - Editable */}
      <Popover open={ownerOpen} onOpenChange={setOwnerOpen}>
        <PopoverTrigger asChild>
          <button
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors hover:bg-[var(--surface-3)]"
            style={{ 
              background: 'var(--surface-2)', 
              border: '1px solid var(--border-color)',
              color: 'var(--text-1)'
            }}
          >
            <User className="h-3 w-3 shrink-0" style={{ color: 'var(--text-3)' }} />
            <span className="truncate max-w-[100px]">{businessOwner || 'No owner'}</span>
            <ChevronDown className="h-3 w-3 shrink-0" style={{ color: 'var(--text-3)' }} />
          </button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[200px] p-2 z-[400]" 
          align="start"
          style={{ background: 'var(--surface-1)', borderColor: 'var(--border-color)' }}
        >
          <BusinessOwnerSelect
            value={businessOwnerId || null}
            onChange={(id) => {
              // We need to get the name - this will be handled by parent
              onBusinessOwnerChange?.(id, '');
              setOwnerOpen(false);
            }}
            departmentId={departmentId || null}
            placeholder="Select owner..."
          />
        </PopoverContent>
      </Popover>

      {/* Department - Editable */}
      <Popover open={deptOpen} onOpenChange={setDeptOpen}>
        <PopoverTrigger asChild>
          <button
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors hover:bg-[var(--surface-3)]"
            style={{ 
              background: 'var(--surface-2)', 
              border: '1px solid var(--border-color)',
              color: 'var(--text-1)'
            }}
          >
            <Building2 className="h-3 w-3 shrink-0" style={{ color: 'var(--text-3)' }} />
            <span className="truncate max-w-[100px]">{department || 'No dept'}</span>
            <ChevronDown className="h-3 w-3 shrink-0" style={{ color: 'var(--text-3)' }} />
          </button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[200px] p-2 z-[400]" 
          align="start"
          style={{ background: 'var(--surface-1)', borderColor: 'var(--border-color)' }}
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

      {/* Target Date - Editable */}
      <Popover open={dateOpen} onOpenChange={setDateOpen}>
        <PopoverTrigger asChild>
          <button
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors hover:bg-[var(--surface-3)]"
            style={{ 
              background: 'var(--surface-2)', 
              border: '1px solid var(--border-color)',
              color: 'var(--text-1)'
            }}
          >
            <Calendar className="h-3 w-3 shrink-0" style={{ color: 'var(--text-3)' }} />
            <span className="truncate">
              {targetDate ? format(new Date(targetDate), 'MMM d, yyyy') : 'No target'}
            </span>
            <ChevronDown className="h-3 w-3 shrink-0" style={{ color: 'var(--text-3)' }} />
          </button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-auto p-2 z-[400]" 
          align="start"
          style={{ background: 'var(--surface-1)', borderColor: 'var(--border-color)' }}
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
    </div>
  );
}
