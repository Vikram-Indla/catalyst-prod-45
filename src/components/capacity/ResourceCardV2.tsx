/**
 * Resource Card V2 - Enterprise Grade
 * - Progress bar under allocation badge
 * - Left border color based on status
 * - Department badge
 * - Assignment-based avatar colors
 * - 360° hover effect + edit button
 */

import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAssignmentColor, getAllocationColors, getInitials, CATALYST } from '@/lib/catalyst-colors';

interface ResourceCardV2Props {
  name: string;
  role: string;
  department?: string;
  assignmentName: string | null | undefined;
  totalAllocation: number;
  onOpen360: () => void;
  onEdit: () => void;
  compact?: boolean;
}

export function ResourceCardV2({ 
  name, 
  role, 
  department,
  assignmentName, 
  totalAllocation, 
  onOpen360, 
  onEdit,
  compact = false,
}: ResourceCardV2Props) {
  const [hovered, setHovered] = useState(false);
  const avatarColor = getAssignmentColor(assignmentName);
  const allocation = getAllocationColors(totalAllocation);
  const initials = getInitials(name);

  // Left border color based on allocation status
  const getLeftBorderColor = () => {
    if (totalAllocation === 0) return CATALYST.teal.primary;
    if (totalAllocation < 100) return CATALYST.teal.primary;
    if (totalAllocation === 100) return CATALYST.blue.primary;
    return CATALYST.bronze.primary; // Over 100%
  };

  return (
    <div
      className={cn(
        'relative flex items-center gap-3 bg-white border border-[#e5e5e5] rounded-xl cursor-pointer hover:border-[#d4d4d4] hover:shadow-md transition-all',
        'border-l-4',
        compact ? 'p-3' : 'p-4'
      )}
      style={{ borderLeftColor: getLeftBorderColor() }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onEdit}
    >
      {/* EDIT BUTTON — Appears on hover */}
      <button
        onClick={(e) => { e.stopPropagation(); onEdit(); }}
        className={cn(
          'absolute top-2 right-2 w-7 h-7 rounded-md bg-[#f5f5f4] flex items-center justify-center transition-all z-10',
          hovered ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
        )}
      >
        <Pencil className="w-3.5 h-3.5 text-[#525252]" />
      </button>

      {/* AVATAR — Assignment-based color + 360° hover */}
      <div 
        className="relative shrink-0"
        onClick={(e) => { e.stopPropagation(); onOpen360(); }}
      >
        {/* Rotating ring - visible on hover */}
        <div 
          className={cn(
            'absolute inset-[-4px] rounded-full border-2 border-dashed transition-opacity',
            hovered ? 'opacity-100 animate-spin-slow' : 'opacity-0'
          )}
          style={{ borderColor: avatarColor }}
        />

        {/* Avatar */}
        <div
          className={cn(
            'rounded-full flex items-center justify-center font-semibold text-white cursor-pointer transition-transform hover:scale-105',
            compact ? 'w-10 h-10 text-xs' : 'w-12 h-12 text-sm'
          )}
          style={{ backgroundColor: avatarColor }}
        >
          {initials}
        </div>

        {/* 360° label - visible on hover */}
        <div 
          className={cn(
            'absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded text-[8px] font-bold text-white transition-opacity',
            hovered ? 'opacity-100' : 'opacity-0'
          )}
          style={{ backgroundColor: avatarColor }}
        >
          360°
        </div>
      </div>

      {/* INFO + DEPARTMENT BADGE */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          'font-semibold text-[#0a0a0a] truncate',
          compact ? 'text-xs' : 'text-sm'
        )}>
          {name}
        </p>
        <p className={cn(
          'text-[#737373] truncate',
          compact ? 'text-[10px]' : 'text-xs'
        )}>
          {role || 'Team Member'}
        </p>
        {/* Department Badge */}
        {department && (
          <span 
            className="inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-semibold uppercase"
            style={{ 
              backgroundColor: CATALYST.blue.bg, 
              color: CATALYST.blue.primary 
            }}
          >
            {department}
          </span>
        )}
      </div>

      {/* ALLOCATION SECTION - Badge + Progress Bar */}
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        {/* Allocation Badge */}
        <span
          className={cn(
            'px-2.5 py-1 rounded-lg font-bold',
            compact ? 'text-xs' : 'text-sm'
          )}
          style={{
            backgroundColor: allocation.bg,
            color: allocation.text,
          }}
        >
          {totalAllocation}%
        </span>
        
        {/* Progress Bar */}
        <div className="w-16 h-1.5 bg-[#e5e5e5] rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all"
            style={{ 
              width: `${Math.min(totalAllocation, 100)}%`,
              backgroundColor: allocation.bar
            }}
          />
        </div>
      </div>
    </div>
  );
}
