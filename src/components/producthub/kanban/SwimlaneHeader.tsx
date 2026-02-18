import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SwimlaneHeaderProps {
  label: string;
  count: number;
  isCollapsed: boolean;
  onToggle: () => void;
}

export const SwimlaneHeader: React.FC<SwimlaneHeaderProps> = ({
  label,
  count,
  isCollapsed,
  onToggle,
}) => (
  <button
    onClick={onToggle}
    className={cn(
      'w-full flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors',
      'bg-zinc-50 hover:bg-zinc-100 group'
    )}
  >
    {isCollapsed ? (
      <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
    )}
    <span className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wide">
      {label || 'Unassigned'}
    </span>
    <span className="text-[10px] text-zinc-400">({count})</span>
  </button>
);
