import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

interface GoldLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  children: React.ReactNode;
  className?: string;
  asSpan?: boolean;
}

/**
 * GoldLink — WCAG-compliant link component
 * 
 * Updated to use Blue palette for consistency:
 * Light mode: Uses Blue (#2563eb) for WCAG compliance
 * Dark mode: Uses lighter blue (#60a5fa) for visibility
 * Both modes meet WCAG AA 4.5:1 contrast ratio
 */
export const GoldLink = forwardRef<HTMLAnchorElement, GoldLinkProps>(
  ({ children, className, asSpan, onClick, ...props }, ref) => {
    const baseStyles = cn(
      // Light mode: Blue for consistency with new palette
      "text-[#2563eb]",
      // Hover states
      "hover:text-[#1d4ed8]",
      // Dark mode
      "dark:text-[#60a5fa] dark:hover:text-[#93c5fd]",
      // Interaction
      "hover:underline cursor-pointer transition-colors",
      // Font
      "font-medium",
      className
    );

    if (asSpan) {
      return (
        <span 
          className={baseStyles} 
          onClick={onClick}
          role={onClick ? "button" : undefined}
          tabIndex={onClick ? 0 : undefined}
        >
          {children}
        </span>
      );
    }

    return (
      <a ref={ref} className={baseStyles} {...props}>
        {children}
      </a>
    );
  }
);

GoldLink.displayName = 'GoldLink';
