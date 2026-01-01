/**
 * Resource Card with Assignment-Based Avatar + 360° Hover + Edit Button
 */

import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAssignmentColor, getAllocationColors, getInitials } from '@/lib/catalyst-colors';

interface ResourceCardV2Props {
  name: string;
  role: string;
  assignmentName: string | null | undefined;
  totalAllocation: number;
  onOpen360: () => void;
  onEdit: () => void;
}

export function ResourceCardV2({ 
  name, 
  role, 
  assignmentName, 
  totalAllocation, 
  onOpen360, 
  onEdit 
}: ResourceCardV2Props) {
  const [hovered, setHovered] = useState(false);
  const avatarColor = getAssignmentColor(assignmentName);
  const allocation = getAllocationColors(totalAllocation);
  const initials = getInitials(name);

  return (
    <div
      className="relative flex items-center gap-3 p-4 bg-white border border-[#e5e5e5] rounded-xl cursor-pointer hover:border-[#d4d4d4] hover:shadow-sm transition-all"
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
          className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold text-white cursor-pointer transition-transform hover:scale-105"
          style={{ backgroundColor: avatarColor }}
        >
          {initials}
        </div>

        {/* 360° label - visible on hover */}
        <div 
          className={cn(
            'absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded text-[9px] font-bold text-white transition-opacity',
            hovered ? 'opacity-100' : 'opacity-0'
          )}
          style={{ backgroundColor: avatarColor }}
        >
          360°
        </div>
      </div>

      {/* INFO */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-[#0a0a0a] truncate">{name}</p>
        <p className="text-xs text-[#737373]">{role || 'Team Member'}</p>
      </div>

      {/* ALLOCATION BADGE — Blue for 100%, NOT orange */}
      <span
        className="px-3 py-1.5 rounded-lg text-sm font-semibold"
        style={{
          backgroundColor: allocation.bg,
          color: allocation.text,
        }}
      >
        {totalAllocation}%
      </span>
    </div>
  );
}
