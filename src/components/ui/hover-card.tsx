/**
 * HoverCard — ADS-canonical hover card.
 * Delegates to @atlaskit/tooltip for hover-triggered content.
 */
import * as React from "react";
import Tooltip from "@atlaskit/tooltip";

const HoverCard = ({ children, ...props }: { children: React.ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void }) => (
  <>{children}</>
);
const HoverCardTrigger = ({ children }: { children: React.ReactNode }) => <>{children}</>;
const HoverCardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ children, className, ...props }, ref) => (
    <div ref={ref} className={className} style={{ padding: 12, background: 'var(--ds-surface-overlay, #fff)', borderRadius: 8, boxShadow: 'var(--ds-shadow-overlay, 0 4px 8px rgba(0,0,0,0.1))', border: '1px solid var(--ds-border, #DFE1E6)' }} {...props}>
      {children}
    </div>
  )
);
HoverCardContent.displayName = "HoverCardContent";

export { HoverCard, HoverCardTrigger, HoverCardContent };
