// ════════════════════════════════════════════════════════════════════════════
// VERSION STATUS BADGE COMPONENT
// ════════════════════════════════════════════════════════════════════════════

import { cn } from '@/lib/utils';
import { VERSION_STATUS_CONFIG } from '@/lib/space-constants';
import type { VersionStatus } from '@/types/spaces';

interface VersionStatusBadgeProps {
  status: VersionStatus;
  className?: string;
}

export function VersionStatusBadge({ status, className }: VersionStatusBadgeProps) {
  const config = VERSION_STATUS_CONFIG[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground',
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', config.dotColor)} />
      {config.label}
    </span>
  );
}
