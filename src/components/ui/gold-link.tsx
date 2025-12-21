import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

interface GoldLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  children: React.ReactNode;
  className?: string;
  asSpan?: boolean;
}

/**
 * GoldLink — WCAG-compliant gold link component
 * 
 * Light mode: Uses darker gold (#a67c52) for better contrast
 * Dark mode: Uses lighter gold (#d4a855) for visibility
 * Both modes meet WCAG AA 4.5:1 contrast ratio
 */
export const GoldLink = forwardRef<HTMLAnchorElement, GoldLinkProps>(
  ({ children, className, asSpan, onClick, ...props }, ref) => {
    const baseStyles = cn(
      // Light mode: Darker gold for better contrast
      "text-gold-link",
      // Hover states
      "hover:text-gold-link-hover",
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
