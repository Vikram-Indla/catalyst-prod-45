/**
 * UserAvatar — Avatar component with hash-based colors and country flag overlay
 * Per LOVABLE-USERS-MODULE-REDESIGN.md spec
 */

import { cn } from '@/lib/utils';

// Avatar colors (hash-based selection)
const AVATAR_COLORS = [
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#14b8a6', // Teal
  '#ef4444', // Red
];

// Country flags mapping
const COUNTRY_FLAGS: Record<string, string> = {
  'Saudi Arabia': '🇸🇦',
  'Pakistan': '🇵🇰',
  'Egypt': '🇪🇬',
  'India': '🇮🇳',
  'Jordan': '🇯🇴',
  'Sudan': '🇸🇩',
  'Kosovo': '🇽🇰',
  'UAE': '🇦🇪',
  'United Arab Emirates': '🇦🇪',
  'USA': '🇺🇸',
  'United States': '🇺🇸',
  'UK': '🇬🇧',
  'United Kingdom': '🇬🇧',
};

// Select color based on name hash
const getAvatarColor = (name: string | null | undefined): string => {
  if (!name) return AVATAR_COLORS[0];
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
};

// Get initials from name
const getInitials = (name: string | null | undefined): string => {
  if (!name) return '??';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

interface UserAvatarProps {
  name: string | null | undefined;
  country?: string | null;
  flagUrl?: string | null;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function UserAvatar({ 
  name, 
  country, 
  flagUrl,
  onClick, 
  size = 'md',
  className 
}: UserAvatarProps) {
  const initials = getInitials(name);
  const bgColor = getAvatarColor(name);
  const flag = country ? COUNTRY_FLAGS[country] : null;
  
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };
  
  const flagSizeClasses = {
    sm: 'w-4 h-4 text-[10px]',
    md: 'w-[18px] h-[18px] text-sm',
    lg: 'w-5 h-5 text-base',
  };

  return (
    <div 
      className={cn(
        "relative flex-shrink-0",
        sizeClasses[size].split(' ').slice(0, 2).join(' '),
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      <div 
        className={cn(
          "rounded-full flex items-center justify-center font-semibold text-white transition-transform",
          sizeClasses[size],
          onClick && "hover:scale-105"
        )}
        style={{ backgroundColor: bgColor }}
      >
        {initials}
      </div>
      {(flagUrl || flag) && (
        <div 
          className={cn(
            "absolute -bottom-0.5 -right-0.5 bg-white rounded-full flex items-center justify-center shadow-sm border border-background overflow-hidden",
            flagSizeClasses[size]
          )}
        >
          {flagUrl ? (
            <img 
              src={flagUrl} 
              alt={country || ''} 
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="leading-none">{flag}</span>
          )}
        </div>
      )}
    </div>
  );
}
