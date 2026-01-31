/**
 * Capacity Avatar - V10 Unified Style
 * Rounded square with blue border, light blue background, blue initials
 * With optional country flag overlay
 */

import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface CapacityAvatarProps {
  initials: string;
  flagUrl?: string | null;
  countryName?: string | null;
  size?: 'sm' | 'md' | 'lg';
  onClick?: (e?: React.MouseEvent) => void;
  className?: string;
  showTooltip?: boolean;
}

const sizeStyles = {
  sm: {
    avatar: 'w-8 h-8 text-[11px] rounded-lg',
    flag: 'w-4 h-4 -bottom-0.5 -right-0.5',
    flagImg: 'w-full h-full',
  },
  md: {
    avatar: 'w-11 h-11 text-[15px] rounded-xl',
    flag: 'w-5 h-5 -bottom-1 -right-1',
    flagImg: 'w-full h-full',
  },
  lg: {
    avatar: 'w-14 h-14 text-lg rounded-xl',
    flag: 'w-6 h-6 -bottom-1 -right-1',
    flagImg: 'w-full h-full',
  },
};

export function CapacityAvatar({
  initials,
  flagUrl,
  countryName,
  size = 'md',
  onClick,
  className,
  showTooltip = true,
}: CapacityAvatarProps) {
  const styles = sizeStyles[size];

  const avatarContent = (
    <div 
      className={cn(
        "relative flex-shrink-0",
        onClick && "cursor-pointer",
        className
      )}
      onClick={(e) => onClick?.(e)}
    >
      {/* Rounded square avatar with blue border */}
      <div
        className={cn(
          "flex items-center justify-center font-bold transition-transform duration-150",
          onClick && "hover:scale-105",
          styles.avatar
        )}
        style={{
          backgroundColor: '#eff6ff',
          color: '#3b82f6',
          border: '2px solid #93c5fd',
          boxShadow: '0 1px 3px rgba(59, 130, 246, 0.1)',
        }}
      >
        {initials}
      </div>
      
      {/* Flag overlay - positioned at bottom-right */}
      {flagUrl && (
        <span
          className={cn(
            "absolute rounded-full bg-white flex items-center justify-center overflow-hidden",
            styles.flag
          )}
          style={{
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            border: '1.5px solid white',
          }}
        >
          <img
            src={flagUrl}
            alt={countryName || ''}
            className={cn("object-cover", styles.flagImg)}
          />
        </span>
      )}
    </div>
  );

  if (showTooltip && countryName) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{avatarContent}</TooltipTrigger>
        <TooltipContent
          side="top"
          className="bg-slate-900 text-white text-xs font-medium px-2.5 py-1.5"
        >
          {countryName}
        </TooltipContent>
      </Tooltip>
    );
  }

  return avatarContent;
}
