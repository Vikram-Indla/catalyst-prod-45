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
    sm: 'w-8 h-8 text-[10px]',
    md: 'w-10 h-10 text-xs',
    lg: 'w-12 h-12 text-sm',
  };

  const orbitSizes = {
    sm: { size: 'w-10 h-10', radius: 16 },
    md: { size: 'w-12 h-12', radius: 20 },
    lg: { size: 'w-14 h-14', radius: 24 },
  };

  return (
    <div className="relative inline-flex items-center justify-center z-10 group/avatar360">
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
          // Default state - show avatar colors, on hover show primary colors
          isHovered 
            ? "bg-primary text-primary-foreground ring-2 ring-primary/50 shadow-[0_4px_12px_rgba(13,148,136,0.3)]" 
            : cn(bgColor, textColor),
          className
        )}
        aria-label="View 360° Work Context"
      >
        {/* Show initials by default, 360 on hover */}
        <span className={cn(
          "transition-opacity duration-200",
          isHovered ? "opacity-0 absolute" : "opacity-100"
        )}>
          {initials}
        </span>
        <span className={cn(
          "transition-opacity duration-200",
          isHovered ? "opacity-100" : "opacity-0 absolute"
        )}>
          360
        </span>
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

      {/* Tooltip - positioned above the avatar */}
      <div 
        className={cn(
          "absolute -top-10 left-1/2 -translate-x-1/2 z-[100]",
          "px-2.5 py-1.5 rounded-md",
          "bg-[#1f2937] text-white text-[11px] font-medium whitespace-nowrap",
          "shadow-lg",
          "transition-all duration-200",
          isHovered 
            ? "opacity-100 translate-y-0" 
            : "opacity-0 translate-y-1 pointer-events-none"
        )}
      >
        View 360° Work Context
        {/* Tooltip Arrow */}
        <div 
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 
                     w-2 h-2 bg-[#1f2937] rotate-45"
        />
      </div>
    </div>
  );
}
