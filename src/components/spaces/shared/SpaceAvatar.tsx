// ════════════════════════════════════════════════════════════════════════════
// SPACE AVATAR COMPONENT
// ════════════════════════════════════════════════════════════════════════════

import { cn } from '@/lib/utils';

interface SpaceAvatarProps {
  name: string;
  spaceKey: string;
  color: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-[10px] rounded',
  sm: 'w-8 h-8 text-xs rounded-md',
  md: 'w-10 h-10 text-sm rounded-md',
  lg: 'w-12 h-12 text-base rounded-lg',
  xl: 'w-16 h-16 text-xl rounded-lg',
};

export function SpaceAvatar({
  name,
  spaceKey,
  color,
  size = 'md',
  className,
}: SpaceAvatarProps) {
  // Use key as display text, or generate from name
  const displayText =
    spaceKey ||
    name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

  return (
    <div
      className={cn(
        'flex items-center justify-center font-semibold text-white shrink-0',
        sizeClasses[size],
        className
      )}
      style={{ backgroundColor: color }}
    >
      {displayText}
    </div>
  );
}
