/**
 * UserAvatar — Avatar component with photo support, hash-based fallback colors, and country flag overlay
 * Priority: Real photo > Initials fallback
 * Color constraint: No purple, magenta, or pink (reserved for AI features)
 */

import { useState } from 'react';
import { CircleUser } from 'lucide-react';
import { cn } from '@/lib/utils';
import { resolveAvatarUrl } from '@/lib/avatars';

// Avatar colors — neutral blue-gray palette + approved Catalyst hues (no purple/pink/magenta)
const AVATAR_COLORS = [
  '#475569', // Slate
  '#334155', // Slate dark
  '#3b82f6', // Blue
  '#0d9488', // Teal
  '#d97706', // Amber
  '#2563eb', // Blue 600
  '#0f766e', // Teal dark
  '#1e40af', // Blue 800
  '#065f46', // Emerald dark
  '#0369a1', // Sky 700
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
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
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
  avatarUrl?: string | null;
  country?: string | null;
  flagUrl?: string | null;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function UserAvatar({ 
  name, 
  avatarUrl,
  country, 
  flagUrl,
  onClick, 
  size = 'md',
  className 
}: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);
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

  const resolvedLocalUrl = avatarUrl ? null : resolveAvatarUrl(name);
  const effectiveUrl = avatarUrl ?? resolvedLocalUrl;
  const showPhoto = effectiveUrl && !imgError;

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
      {showPhoto ? (
        <img
          src={effectiveUrl}
          alt={name || 'User'}
          onError={() => setImgError(true)}
          className={cn(
            "rounded-full object-cover transition-transform",
            sizeClasses[size],
            onClick && "hover:scale-105"
          )}
        />
      ) : (
        <div
          className={cn(
            "rounded-full flex items-center justify-center font-semibold text-white transition-transform",
            sizeClasses[size],
            onClick && "hover:scale-105"
          )}
          style={{ backgroundColor: bgColor }}
        >
          <CircleUser className="w-[70%] h-[70%]" strokeWidth={1.5} />
        </div>
      )}
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
