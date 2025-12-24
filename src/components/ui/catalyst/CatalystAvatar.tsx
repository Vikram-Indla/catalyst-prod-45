import { cn } from '@/lib/utils';

interface CatalystAvatarProps {
  initials: string;
  variant?: 'gold' | 'olive' | 'bronze';
  interactive?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const avatarVariants = {
  gold: 'bg-gradient-to-br from-[#c69c6d] to-[#8b7355]',
  olive: 'bg-gradient-to-br from-[#5c7c5c] to-[#4a6a4a]',
  bronze: 'bg-gradient-to-br from-[#8b7355] to-[#6b5a45]',
};

const avatarSizes = {
  sm: 'w-6 h-6 text-[10px]',
  md: 'w-7 h-7 text-[11px]',
  lg: 'w-9 h-9 text-xs',
};

export const CatalystAvatar = ({ 
  initials, 
  variant = 'gold', 
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
