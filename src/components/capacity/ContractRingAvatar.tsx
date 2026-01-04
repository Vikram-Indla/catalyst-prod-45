/**
 * Contract Ring Avatar Component
 * Displays avatar with colored ring indicating contract status
 * Catalyst V5 compliant colors
 */

import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { ContractStatus } from '@/hooks/useResourceProfiles';
import { Clock, Check, AlertTriangle, Infinity, Ban } from 'lucide-react';

interface ContractRingAvatarProps {
  initials: string;
  avatarUrl?: string | null;
  contractStatus: ContractStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showStatusIcon?: boolean;
}

export function ContractRingAvatar({
  initials,
  avatarUrl,
  contractStatus,
  size = 'md',
  className,
  showStatusIcon = true
}: ContractRingAvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base'
  };

  const ringSizes = {
    sm: 'ring-2',
    md: 'ring-[3px]',
    lg: 'ring-4'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4'
  };

  const iconContainerSizes = {
    sm: 'w-4 h-4 -bottom-0.5 -right-0.5',
    md: 'w-5 h-5 -bottom-0.5 -right-0.5',
    lg: 'w-6 h-6 -bottom-1 -right-1'
  };

  const StatusIcon = {
    healthy: Check,
    warning: Clock,
    critical: AlertTriangle,
    expired: Ban,
    permanent: Infinity
  }[contractStatus.status];

  const ringStyles = {
    healthy: 'ring-[#0d9488]', // Teal
    warning: 'ring-[#ca8a04]', // Gold
    critical: 'ring-[#be123c]', // Rose
    expired: 'ring-muted-foreground/40',
    permanent: 'ring-muted-foreground/30'
  };

  const iconBgStyles = {
    healthy: 'bg-[#0d9488] text-white',
    warning: 'bg-[#ca8a04] text-white',
    critical: 'bg-[#be123c] text-white',
    expired: 'bg-muted-foreground/60 text-white',
    permanent: 'bg-muted-foreground/40 text-white'
  };

  return (
    <div className={cn("relative inline-flex", className)}>
      <Avatar 
        className={cn(
          sizeClasses[size],
          ringSizes[size],
          ringStyles[contractStatus.status],
          contractStatus.status === 'critical' && 'animate-pulse'
        )}
      >
        {avatarUrl && <AvatarImage src={avatarUrl} alt={initials} />}
        <AvatarFallback className="bg-primary/10 text-primary font-medium">
          {initials}
        </AvatarFallback>
      </Avatar>
      
      {/* Status Icon Badge */}
      {showStatusIcon && (
        <div 
          className={cn(
            "absolute rounded-full flex items-center justify-center",
            iconContainerSizes[size],
            iconBgStyles[contractStatus.status]
          )}
        >
          <StatusIcon className={iconSizes[size]} />
        </div>
      )}
    </div>
  );
}
