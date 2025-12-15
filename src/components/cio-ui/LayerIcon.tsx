import React from 'react';
import { cn } from '@/lib/utils';
import { Target, Layers, Package, FileText, LucideIcon } from 'lucide-react';

type LayerType = 'objectives' | 'themes' | 'epics' | 'features';

interface LayerIconProps {
  type: LayerType;
  className?: string;
  size?: 'sm' | 'default';
}

const layerConfig: Record<LayerType, { icon: LucideIcon; bg: string; colorClass: string }> = {
  objectives: {
    icon: Target,
    bg: 'rgba(92, 124, 92, 0.15)',
    colorClass: 'text-[#5C7C5C]',
  },
  themes: {
    icon: Layers,
    bg: 'rgba(198, 156, 109, 0.15)',
    colorClass: 'text-[#C69C6D]',
  },
  epics: {
    icon: Package,
    bg: 'rgba(139, 115, 85, 0.15)',
    colorClass: 'text-[#8B7355]',
  },
  features: {
    icon: FileText,
    bg: 'rgba(200, 204, 208, 0.25)',
    colorClass: 'text-[var(--text-muted)]',
  },
};

export function LayerIcon({ type, className, size = 'default' }: LayerIconProps) {
  const config = layerConfig[type];
  const Icon = config.icon;
  
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded',
        size === 'sm' ? 'w-6 h-6' : 'w-7 h-7',
        className
      )}
      style={{ background: config.bg }}
    >
      <Icon className={cn(size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4', config.colorClass)} />
    </div>
  );
}
