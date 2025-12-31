import { useState } from 'react';
import { cn } from '@/lib/utils';

interface Button360Props {
  onClick: () => void;
  className?: string;
  size?: 'sm' | 'md';
}

export function Button360({ onClick, className, size = 'md' }: Button360Props) {
  const [isHovered, setIsHovered] = useState(false);

  const sizeStyles = {
    sm: 'w-8 h-8 text-[10px]',
    md: 'w-[42px] h-[42px] text-xs',
  };

  const orbitSize = size === 'sm' ? 'w-10 h-10' : 'w-[54px] h-[54px]';
  const dotOffset = size === 'sm' ? 'translateX(20px)' : 'translateX(25px)';

  return (
    <div className="relative inline-flex items-center justify-center group">
      {/* Main Button */}
      <button
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          // Base styles
          "relative rounded-full",
          "flex items-center justify-center",
          "transition-all duration-200 ease-out",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0d9488]",
          
          // Default state - subtle
          "bg-[#f5f5f4] border border-[#e5e5e5]",
          
          // Hover state - teal filled
          "hover:bg-[#0d9488] hover:border-[#0d9488]",
          "hover:shadow-[0_4px_12px_rgba(13,148,136,0.3)]",
          
          sizeStyles[size],
          className
        )}
        aria-label="View 360° Work Context"
      >
        {/* 360° Text */}
        <span className={cn(
          "font-semibold transition-colors duration-200",
          "text-[#404040] group-hover:text-white"
        )}>
          360°
        </span>

        {/* Orbital Ring - Only visible on hover */}
        <div 
          className={cn(
            "absolute inset-0 flex items-center justify-center pointer-events-none",
            "transition-opacity duration-200",
            isHovered ? "opacity-100" : "opacity-0"
          )}
          style={{ 
            width: size === 'sm' ? '40px' : '54px', 
            height: size === 'sm' ? '40px' : '54px',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)'
          }}
        >
          {/* Orbital Path */}
          <svg 
            className={cn("absolute animate-spin", orbitSize)} 
            style={{ animationDuration: '8s' }}
            viewBox="0 0 54 54"
          >
            {/* Dashed orbit ring */}
            <circle
              cx="27"
              cy="27"
              r={size === 'sm' ? 18 : 24}
              fill="none"
              stroke="rgba(13, 148, 136, 0.4)"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
          </svg>

          {/* Orbiting Dot */}
          <div 
            className="absolute w-2 h-2 bg-[#0d9488] rounded-full shadow-[0_0_6px_rgba(13,148,136,0.6)] animate-orbit"
            style={{
              '--orbit-radius': size === 'sm' ? '18px' : '24px'
            } as React.CSSProperties}
          />
        </div>
      </button>

      {/* Tooltip */}
      <div 
        className={cn(
          "absolute -bottom-9 left-1/2 -translate-x-1/2",
          "px-2.5 py-1.5 rounded-md",
          "bg-[#1f2937] text-white text-[11px] font-medium whitespace-nowrap",
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
                     w-2 h-2 bg-[#1f2937] rotate-45"
        />
      </div>
    </div>
  );
}