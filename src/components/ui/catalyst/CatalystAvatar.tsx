import { cn } from '@/lib/utils';

interface CatalystAvatarProps {
  initials: string;
  variant?: 'default' | 'muted' | 'gold';
  interactive?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

// Catalyst-compliant variants - removed teal (not in design system)
const avatarVariants = {
  default: 'bg-muted text-foreground',
  muted: 'bg-muted-foreground/20 text-muted-foreground',
  gold: 'bg-brand-gold/15 text-brand-gold border border-brand-gold/30',
};

const avatarSizes = {
  xs: 'w-4 h-4 text-[8px]',
  sm: 'w-5 h-5 text-[9px]',
  md: 'w-6 h-6 text-[10px]',
  lg: 'w-8 h-8 text-[12px]',
};

/**
 * CatalystAvatar - Simple avatar with initials
 * For full ownership semantics (human/ai/system), use CatalystOwnerAvatar instead
 */
export const CatalystAvatar = ({ 
  initials, 
  variant = 'default', 
  interactive = false,
  size = 'md',
  className 
}: CatalystAvatarProps) => (
  <div className={cn(
    "rounded-full flex items-center justify-center",
    "font-semibold flex-shrink-0",
    avatarVariants[variant],
    avatarSizes[size],
    interactive && "cursor-pointer hover:ring-2 hover:ring-brand-gold/50",
    className
  )}>
    {initials}
  </div>
);

export default CatalystAvatar;
