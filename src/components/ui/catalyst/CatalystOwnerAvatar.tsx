import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bot, CircleUser, Settings } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type OwnerType = 'human' | 'ai' | 'system' | 'placeholder';
export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg';

export interface CatalystOwnerAvatarProps {
  /** Type of owner - affects icon/styling */
  type?: OwnerType;
  /** Full name for tooltip and initials generation */
  name?: string;
  /** Override initials (auto-generated from name if not provided) */
  initials?: string;
  /** Avatar image URL */
  avatarUrl?: string;
  /** Size variant */
  size?: AvatarSize;
  /** Show tooltip on hover */
  showTooltip?: boolean;
  /** Additional class names */
  className?: string;
}

const sizeMap: Record<AvatarSize, string> = {
  xs: 'w-4 h-4 text-[8px]',
  sm: 'w-5 h-5 text-[9px]',
  md: 'w-6 h-6 text-[10px]',
  lg: 'w-8 h-8 text-[12px]',
};

const iconSizeMap: Record<AvatarSize, string> = {
  xs: 'w-2.5 h-2.5',
  sm: 'w-3 h-3',
  md: 'w-3.5 h-3.5',
  lg: 'w-4 h-4',
};

/**
 * Generates initials from a full name
 */
function getInitials(name?: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * CatalystOwnerAvatar - Canonical avatar component for Catalyst
 * 
 * Supports:
 * - Human owners (initials)
 * - AI-assigned items (robot icon with gold accent)
 * - System-generated items (gear icon)
 * - Placeholder/unassigned state
 * 
 * All sizes and colors follow Catalyst design tokens.
 */
export function CatalystOwnerAvatar({
  type = 'human',
  name,
  initials,
  avatarUrl,
  size = 'md',
  showTooltip = true,
  className,
}: CatalystOwnerAvatarProps) {
  const displayInitials = initials || getInitials(name);
  
  const getTooltipLabel = () => {
    if (type === 'ai') return name ? `${name} (AI-assigned)` : 'AI-assigned';
    if (type === 'system') return name ? `${name} (System)` : 'System-generated';
    if (type === 'placeholder') return 'Unassigned';
    return name || 'Unknown';
  };

  const avatarContent = (
    <Avatar className={cn(sizeMap[size], 'flex-shrink-0', className)}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
      <AvatarFallback
        className={cn(
          'font-semibold',
          type === 'human' && 'bg-brand-primary text-white',
          type === 'ai' && 'bg-brand-gold/15 text-brand-gold border border-brand-gold/30',
          type === 'system' && 'bg-muted text-muted-foreground',
          type === 'placeholder' && 'bg-muted text-muted-foreground border border-dashed border-muted-foreground/30',
        )}
      >
        {type === 'ai' ? (
          <Bot className={iconSizeMap[size]} />
        ) : type === 'system' ? (
          <Settings className={iconSizeMap[size]} />
        ) : (
          <CircleUser className={iconSizeMap[size]} strokeWidth={1.5} />
        )}
      </AvatarFallback>
    </Avatar>
  );

  if (!showTooltip) return avatarContent;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{avatarContent}</TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {getTooltipLabel()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Stacked avatars for multi-owner display
 */
export interface StackedAvatarsProps {
  owners: Array<{
    type?: OwnerType;
    name?: string;
    initials?: string;
    avatarUrl?: string;
  }>;
  size?: AvatarSize;
  maxVisible?: number;
  className?: string;
}

export function StackedAvatars({
  owners,
  size = 'md',
  maxVisible = 3,
  className,
}: StackedAvatarsProps) {
  const visible = owners.slice(0, maxVisible);
  const remaining = owners.length - maxVisible;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('flex -space-x-2', className)}>
            {visible.map((owner, idx) => (
              <CatalystOwnerAvatar
                key={idx}
                type={owner.type}
                name={owner.name}
                initials={owner.initials}
                avatarUrl={owner.avatarUrl}
                size={size}
                showTooltip={false}
                className="ring-2 ring-background"
              />
            ))}
            {remaining > 0 && (
              <Avatar className={cn(sizeMap[size], 'flex-shrink-0 ring-2 ring-background')}>
                <AvatarFallback className="bg-muted text-muted-foreground font-semibold">
                  +{remaining}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {owners.map(o => o.name).filter(Boolean).join(', ') || 'Multiple owners'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default CatalystOwnerAvatar;
