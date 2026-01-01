import { useState } from 'react';
import { cn } from '@/lib/utils';

interface Avatar360Props {
  initials: string;
  onClick: () => void;
  bgColor?: string;
  textColor?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Avatar360({ 
  initials, 
  onClick, 
  bgColor = 'bg-muted', 
  textColor = 'text-foreground',
  size = 'md',
  className 
}: Avatar360Props) {
  const [isHovered, setIsHovered] = useState(false);

  const sizeStyles = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  const orbitSizes = {
    sm: { size: 'w-10 h-10', radius: 16 },
    md: { size: 'w-12 h-12', radius: 20 },
    lg: { size: 'w-14 h-14', radius: 24 },
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      {/* Avatar Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "relative rounded-full flex items-center justify-center font-semibold",
          "transition-all duration-200 ease-out",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary",
          sizeStyles[size],
          bgColor,
          textColor,
          // Hover state
          isHovered && "ring-2 ring-primary/50 shadow-[0_4px_12px_rgba(13,148,136,0.3)]",
          className
        )}
        aria-label="View 360° Work Context"
      >
        {initials}
      </button>

      {/* Orbital Ring - Only visible on hover */}
      <div 
        className={cn(
          "absolute inset-0 flex items-center justify-center pointer-events-none",
          "transition-opacity duration-200",
          isHovered ? "opacity-100" : "opacity-0"
        )}
        style={{ 
          width: orbitSizes[size].size.split(' ')[0].replace('w-', '') + 'px',
          height: orbitSizes[size].size.split(' ')[0].replace('w-', '') + 'px',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)'
        }}
      >
        {/* Orbital Path */}
        <svg 
          className={cn("absolute animate-spin", orbitSizes[size].size)} 
          style={{ animationDuration: '8s' }}
          viewBox="0 0 56 56"
        >
          {/* Dashed orbit ring */}
          <circle
            cx="28"
            cy="28"
            r={orbitSizes[size].radius}
            fill="none"
            stroke="hsl(var(--primary) / 0.4)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
        </svg>

        {/* Orbiting Dot */}
        <div 
          className="absolute w-2 h-2 bg-primary rounded-full shadow-[0_0_6px_hsl(var(--primary)/0.6)] animate-orbit"
          style={{
            '--orbit-radius': `${orbitSizes[size].radius}px`
          } as React.CSSProperties}
        />
      </div>

      {/* Tooltip */}
      <div 
        className={cn(
          "absolute -bottom-9 left-1/2 -translate-x-1/2 z-50",
          "px-2.5 py-1.5 rounded-md",
          "bg-popover text-popover-foreground text-[11px] font-medium whitespace-nowrap",
          "border border-border shadow-md",
          "transition-all duration-200",
          isHovered 
            ? "opacity-100 translate-y-0" 
            : "opacity-0 translate-y-1 pointer-events-none"
        )}
      >
        View 360° Work Context
        {/* Tooltip Arrow */}
        <div 
          className="absolute -top-1 left-1/2 -translate-x-1/2 
                     w-2 h-2 bg-popover border-l border-t border-border rotate-45"
        />
      </div>
    </div>
  );
}
