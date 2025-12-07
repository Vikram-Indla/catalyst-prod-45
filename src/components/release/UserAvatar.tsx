import { cn } from '@/lib/utils';

interface UserAvatarProps {
  initials: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-6 h-6 text-[9px]',
  md: 'w-8 h-8 text-[11px]',
  lg: 'w-10 h-10 text-[12px]',
};

export function UserAvatar({ initials, size = 'md', className }: UserAvatarProps) {
  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-semibold shrink-0",
        sizeClasses[size],
        className
      )}
      style={{ 
        backgroundColor: 'rgba(198, 156, 109, 0.1)', 
        color: '#C69C6D' 
      }}
    >
      {initials}
    </div>
  );
}
