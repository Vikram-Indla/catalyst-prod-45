// ════════════════════════════════════════════════════════════════════════════
// SPACE TYPE BADGE COMPONENT
// ════════════════════════════════════════════════════════════════════════════

import { LayoutGrid, FileText, Headphones } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SPACE_TYPE_CONFIG } from '@/lib/space-constants';
import type { SpaceType } from '@/types/spaces';

interface SpaceTypeBadgeProps {
  type: SpaceType;
  showIcon?: boolean;
  className?: string;
}

const iconMap = {
  kanban: LayoutGrid,
  business: FileText,
  service: Headphones,
};

export function SpaceTypeBadge({ type, showIcon = true, className }: SpaceTypeBadgeProps) {
  const config = SPACE_TYPE_CONFIG[type];
  const Icon = iconMap[type];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        config.color,
        className
      )}
    >
      {showIcon && <Icon className="w-3 h-3" />}
      {config.label}
    </span>
  );
}
