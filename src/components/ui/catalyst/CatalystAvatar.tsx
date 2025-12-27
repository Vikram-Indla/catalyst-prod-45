import { cn } from '@/lib/utils';

interface CatalystAvatarProps {
  initials: string;
  variant?: 'blue' | 'teal' | 'gray';
  interactive?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const avatarVariants = {
  blue: 'bg-gradient-to-br from-[#2563eb] to-[#1d4ed8]',
  teal: 'bg-gradient-to-br from-[#0d9488] to-[#0f766e]',
  gray: 'bg-gradient-to-br from-[#6b7280] to-[#4b5563]',
};

const avatarSizes = {
  sm: 'w-6 h-6 text-[10px]',
  md: 'w-7 h-7 text-[11px]',
  lg: 'w-9 h-9 text-xs',
};

export const CatalystAvatar = ({ 
  initials, 
  variant = 'blue', 
  interactive = false,
  size = 'md',
  className 
}: CatalystAvatarProps) => (
  <div className={cn(
    "rounded-full flex items-center justify-center",
    "text-white font-bold shadow-sm flex-shrink-0",
    avatarVariants[variant],
    avatarSizes[size],
    interactive && "avatar-ring cursor-pointer",
    className
  )}>
    {initials}
  </div>
);

export default CatalystAvatar;
