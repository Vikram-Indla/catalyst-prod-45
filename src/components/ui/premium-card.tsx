import * as React from "react";
import { cn } from "@/lib/utils";

interface PremiumCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
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

const PremiumCard = React.forwardRef<HTMLDivElement, PremiumCardProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-[10px] border overflow-hidden",
        "bg-[var(--card-bg)]",
        className
      )}
      style={{
        borderColor: 'var(--card-border)',
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
        "flex items-center justify-between px-4 py-3 border-b",
        className
      )}
      style={{
        borderColor: 'var(--divider)',
        backgroundColor: 'var(--card-bg)',
      }}
      {...props}
    >
      <div className="flex flex-col gap-0.5">
        <h3 
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: 'var(--text-1)' }}
        >
          {title}
        </h3>
        {subtitle && (
          <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <div className="flex items-center gap-2">
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
        noPadding ? "" : "p-4",
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
