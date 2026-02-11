import {
  Flame, RefreshCcw, Target, Puzzle, Route,
  Gauge, Shield, Eye, Layers,
} from 'lucide-react';
import { TestSetType, TEST_SET_TYPE_CONFIG } from '@/types/test-sets';
import { cn } from '@/lib/utils';

const iconMap = { Flame, RefreshCcw, Target, Puzzle, Route, Gauge, Shield, Eye, Layers };

interface SetTypeBadgeProps {
  type: TestSetType;
  size?: 'sm' | 'md';
}

export function SetTypeBadge({ type, size = 'md' }: SetTypeBadgeProps) {
  const config = TEST_SET_TYPE_CONFIG[type];
  const Icon = iconMap[config.icon as keyof typeof iconMap];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
      )}
      style={{ backgroundColor: `${config.color}15`, color: config.color }}
    >
      <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
      {config.label}
    </span>
  );
}
