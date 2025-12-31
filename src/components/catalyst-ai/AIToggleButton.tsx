/**
 * AI Toggle Button - Gradient button with pulse indicator
 */

import React from 'react';
import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIToggleButtonProps {
  isActive?: boolean;
  onClick: () => void;
  className?: string;
}

export function AIToggleButton({
  isActive = false,
  onClick,
  className,
}: AIToggleButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative w-10 h-10 flex items-center justify-center",
        "bg-gradient-to-br from-status-success to-brand-primary",
        "border-0 rounded-xl cursor-pointer",
        "shadow-[0_2px_8px_rgba(13,148,136,0.3)]",
        "transition-all duration-200 ease-out",
        "hover:translate-y-[-2px] hover:shadow-[0_4px_16px_rgba(13,148,136,0.4)]",
        isActive && "shadow-[0_0_0_3px_rgba(13,148,136,0.2),0_4px_16px_rgba(13,148,136,0.4)]",
        className
      )}
    >
      <Zap className="w-5 h-5 text-white" />
      
      {/* Pulse indicator */}
      <span className="absolute -top-[3px] -right-[3px] w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-surface-0">
        <span className="absolute -inset-0.5 bg-green-500 rounded-full animate-ping opacity-75" />
      </span>
    </button>
  );
}
