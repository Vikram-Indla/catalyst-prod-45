// ============================================================
// TYPE BADGE - Quick Win / Strategic / Standard
// ============================================================

import { Zap, Package, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export type IdeaType = 'quick_win' | 'strategic' | 'standard';

interface TypeBadgeProps {
  type: IdeaType;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const typeConfig = {
  quick_win: {
    label: 'Quick Win',
    icon: Zap,
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    iconClassName: 'text-emerald-600',
    solidClassName: 'bg-emerald-500 text-white',
  },
  strategic: {
    label: 'Strategic',
    icon: Package,
    className: 'bg-blue-100 text-blue-700 border-blue-200',
    iconClassName: 'text-blue-600',
    solidClassName: 'bg-blue-600 text-white',
  },
  standard: {
    label: 'Standard',
    icon: Minus,
    className: 'bg-slate-100 text-slate-600 border-slate-200',
    iconClassName: 'text-slate-500',
    solidClassName: 'bg-slate-500 text-white',
  },
};

const sizeConfig = {
  sm: {
    padding: 'px-2 py-0.5',
    text: 'text-[10px]',
    iconSize: 'w-3 h-3',
    gap: 'gap-1',
  },
  md: {
    padding: 'px-2.5 py-1',
    text: 'text-[11px]',
    iconSize: 'w-3.5 h-3.5',
    gap: 'gap-1.5',
  },
  lg: {
    padding: 'px-3 py-1.5',
    text: 'text-xs',
    iconSize: 'w-4 h-4',
    gap: 'gap-2',
  },
};

export function TypeBadge({ 
  type, 
  size = 'md', 
  showIcon = true,
  className 
}: TypeBadgeProps) {
  const config = typeConfig[type];
  const sizes = sizeConfig[size];
  const Icon = config.icon;

  return (
    <span className={cn(
      "inline-flex items-center rounded-full font-semibold uppercase tracking-wide",
      sizes.padding,
      sizes.text,
      sizes.gap,
      config.className,
      className
    )}>
      {showIcon && <Icon className={cn(sizes.iconSize, config.iconClassName)} />}
      {config.label}
    </span>
  );
}

export function TypeBadgeSolid({ 
  type, 
  size = 'md', 
  showIcon = true,
  className 
}: TypeBadgeProps) {
  const config = typeConfig[type];
  const sizes = sizeConfig[size];
  const Icon = config.icon;

  return (
    <span className={cn(
      "inline-flex items-center rounded-full font-semibold",
      sizes.padding,
      sizes.text,
      sizes.gap,
      config.solidClassName,
      className
    )}>
      {showIcon && <Icon className={sizes.iconSize} />}
      {config.label}
    </span>
  );
}
