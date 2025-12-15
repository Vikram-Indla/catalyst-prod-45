import * as React from "react";
import { cn } from "@/lib/utils";

type AccentColor = 'green' | 'gold' | 'bronze' | 'champagne' | 'none';

interface PremiumCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  accent?: AccentColor;
}

interface PremiumCardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

interface PremiumCardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  noPadding?: boolean;
}

const accentColors: Record<AccentColor, string> = {
  green: 'var(--section-accent-green)',
  gold: 'var(--section-accent-gold)',
  bronze: 'var(--section-accent-bronze)',
  champagne: 'var(--section-accent-champagne)',
  none: 'transparent',
};

const PremiumCard = React.forwardRef<HTMLDivElement, PremiumCardProps>(
  ({ className, children, accent = 'none', ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-[10px] border overflow-hidden transition-shadow duration-200 hover:shadow-[var(--card-shadow-hover)]",
        accent !== 'none' && 'border-l-[3px]',
        className
      )}
      style={{
        backgroundColor: 'var(--surface-bg)',
        borderColor: 'var(--border-default)',
        borderLeftColor: accent !== 'none' ? accentColors[accent] : 'var(--border-default)',
        boxShadow: 'var(--card-shadow)',
      }}
      {...props}
    >
      {children}
    </div>
  )
);
PremiumCard.displayName = "PremiumCard";

const PremiumCardHeader = React.forwardRef<HTMLDivElement, PremiumCardHeaderProps>(
  ({ title, subtitle, action, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex items-center justify-between px-5 py-4 border-b",
        className
      )}
      style={{
        borderColor: 'var(--border-subtle)',
      }}
      {...props}
    >
      <div className="flex flex-col gap-0.5">
        <h3 
          className="text-[15px] font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <div className="flex items-center gap-3">
          {action}
        </div>
      )}
    </div>
  )
);
PremiumCardHeader.displayName = "PremiumCardHeader";

const PremiumCardContent = React.forwardRef<HTMLDivElement, PremiumCardContentProps>(
  ({ className, children, noPadding, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        noPadding ? "" : "p-5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
PremiumCardContent.displayName = "PremiumCardContent";

export { PremiumCard, PremiumCardHeader, PremiumCardContent };
