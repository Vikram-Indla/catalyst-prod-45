/**
 * AIIntelligenceButton — Standardized AI button with purple gradient icon + bordered style
 * Matches the compact "Intelligence" button pattern used across the platform.
 */
import React from 'react';
import { cn } from '@/lib/utils';

interface AIIntelligenceButtonProps {
  label: string;
  isActive?: boolean;
  onClick: () => void;
  className?: string;
}

export function AIIntelligenceButton({
  label,
  isActive = false,
  onClick,
  className,
}: AIIntelligenceButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex items-center gap-1.5 px-3.5 py-[7px] rounded-lg transition-all duration-200 cursor-pointer",
        isActive
          ? "border-[1.5px] border-purple-500 bg-purple-50"
          : "border border-slate-200 bg-white hover:border-purple-300 hover:bg-[#FAFAFF] hover:shadow-[0_2px_8px_rgba(124,58,237,0.08)]",
        className
      )}
    >
      <div
        className={cn(
          "w-[18px] h-[18px] rounded-[5px] flex items-center justify-center shrink-0",
          isActive ? "bg-purple-600" : ""
        )}
        style={isActive ? undefined : { background: 'linear-gradient(135deg, #7C3AED, #6D28D9)' }}
      >
        <span className="text-white text-[9px] font-extrabold leading-none">✦</span>
      </div>
      <span
        className={cn(
          "text-[12px] font-semibold transition-colors",
          isActive ? "text-purple-700" : "text-slate-600 group-hover:text-purple-700"
        )}
      >
        {label}
      </span>
    </button>
  );
}
