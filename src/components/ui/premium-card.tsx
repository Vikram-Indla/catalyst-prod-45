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
        "rounded-xl border overflow-hidden",
        className
      )}
      style={{
        backgroundColor: 'var(--card-bg)',
        borderColor: 'var(--card-border)',
        boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)',
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
        "flex items-center justify-between px-4 py-2.5 border-b",
        className
      )}
      style={{
        borderColor: 'var(--divider)',
        backgroundColor: 'var(--surface-2)',
      }}
      {...props}
    >
      <div className="flex flex-col gap-0">
        <h3 
          className="text-[13px] font-semibold tracking-wide"
          style={{ color: 'var(--text-1)' }}
        >
          {title}
        </h3>
        {subtitle && (
          <p className="text-[12px]" style={{ color: 'var(--text-2)' }}>
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
