import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, AlertTriangle, Target, AlertCircle } from 'lucide-react';

type KPIStatus = 'default' | 'success' | 'warning' | 'danger';

interface KPITileProps {
  label: string;
  value: string | number;
  description?: string;
  status?: KPIStatus;
  icon?: React.ReactNode;
  progress?: number;
  onClick?: () => void;
  isEmpty?: boolean;
  className?: string;
}

const statusAccentColors: Record<KPIStatus, string> = {
  default: 'var(--section-accent-green)',
  success: 'var(--section-accent-green)',
  warning: 'var(--section-accent-gold)',
  danger: 'var(--danger)',
};

const defaultIcons: Record<string, React.ReactNode> = {
  progress: <TrendingUp className="h-4 w-4" />,
  'at-risk': <AlertTriangle className="h-4 w-4" />,
  gaps: <Target className="h-4 w-4" />,
  risk: <AlertCircle className="h-4 w-4" />,
};

export function KPITile({
  label,
  value,
  description,
  status = 'default',
  icon,
  progress,
  onClick,
  isEmpty,
  className,
}: KPITileProps) {
  const accentColor = statusAccentColors[status];
  
  return (
    <div
      onClick={onClick}
      className={cn(
        'relative p-5 rounded-lg cursor-pointer',
        'bg-[var(--surface-tinted)] border border-[var(--kpi-border)]',
        'transition-all duration-200',
        'hover:border-[var(--border-accent)] hover:-translate-y-0.5 hover:shadow-[var(--card-shadow-hover)]',
        'group',
        className
      )}
    >
      {/* Top accent bar on hover */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px] rounded-t-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style={{ background: accentColor }}
      />
      
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
          {label}
        </span>
        {icon && (
          <span className="text-[var(--text-muted)]">{icon}</span>
        )}
      </div>
      
      {/* Value */}
      <div
        className={cn(
          'text-[32px] font-bold leading-none mb-1',
          isEmpty ? 'text-[24px] text-[var(--text-faint)]' : 'text-[var(--text-primary)]'
        )}
      >
        {isEmpty ? '—' : value}
      </div>
      
      {/* Description */}
      {description && (
        <p className="text-xs text-[var(--text-muted)]">{description}</p>
      )}
      
      {/* Progress bar (for Overall Progress) */}
      {typeof progress === 'number' && (
        <div className="mt-3 h-1 bg-[var(--progress-bg)] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${Math.min(100, Math.max(0, progress))}%`,
              background: progress >= 70 ? 'var(--section-accent-green)' : progress >= 30 ? 'var(--section-accent-gold)' : 'var(--danger)',
            }}
          />
        </div>
      )}
    </div>
  );
}

interface KPIGridProps {
  children: React.ReactNode;
  className?: string;
}

export function KPIGrid({ children, className }: KPIGridProps) {
  return (
    <div
      className={cn(
        'grid gap-4',
        'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
        className
      )}
    >
      {children}
    </div>
  );
}
