import React from 'react';
import { cn } from '@/lib/utils';

type AccentColor = 'green' | 'gold' | 'bronze' | 'champagne' | 'none';

interface SectionCardProps {
  children: React.ReactNode;
  className?: string;
  accent?: AccentColor;
}

const accentStyles: Record<AccentColor, string> = {
  green: 'border-l-[3px] border-l-[var(--section-accent-green)]',
  gold: 'border-l-[3px] border-l-[var(--section-accent-gold)]',
  bronze: 'border-l-[3px] border-l-[var(--section-accent-bronze)]',
  champagne: 'border-l-[3px] border-l-[var(--section-accent-champagne)]',
  none: '',
};

export function SectionCard({ children, className, accent = 'none' }: SectionCardProps) {
  return (
    <section
      className={cn(
        'bg-[var(--surface-bg)] border border-[var(--border-default)] rounded-[10px]',
        'shadow-[var(--card-shadow)] transition-shadow duration-200',
        'hover:shadow-[var(--card-shadow-hover)]',
        'overflow-hidden',
        accentStyles[accent],
        className
      )}
    >
      {children}
    </section>
  );
}

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function SectionHeader({ title, subtitle, actions, className }: SectionHeaderProps) {
  return (
    <div
      className={cn(
        'px-5 py-4 border-b border-[var(--border-subtle)]',
        'flex items-center justify-between',
        className
      )}
    >
      <div>
        <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">{title}</h2>
        {subtitle && (
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-3">{actions}</div>
      )}
    </div>
  );
}

interface SectionBodyProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function SectionBody({ children, className, noPadding }: SectionBodyProps) {
  return (
    <div className={cn(!noPadding && 'p-5', className)}>
      {children}
    </div>
  );
}
