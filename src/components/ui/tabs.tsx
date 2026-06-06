/**
 * Tabs — ADS-canonical tabs.
 * Delegates to @atlaskit/tabs. Preserves shadcn compound API.
 */
import * as React from "react";
import AkTabs, { Tab, TabList, TabPanel } from "@atlaskit/tabs";
import { cn } from "@/lib/utils";

const Tabs = ({ children, className, defaultValue, value, onValueChange, ...props }: {
  children: React.ReactNode;
  className?: string;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}) => (
  <div className={cn("w-full", className)} {...props}>{children}</div>
);

const TabsList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      role="tablist"
      className={cn(
        "inline-flex h-10 items-center justify-start gap-0 border-b border-[var(--ds-border,#DFE1E6)] w-full",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
TabsList.displayName = "TabsList";

const TabsTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { value?: string }>(
  ({ className, children, value, ...props }, ref) => (
    <button
      ref={ref}
      role="tab"
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap px-3 py-2 text-sm font-medium transition-all",
        "text-[var(--ds-text-subtle,#42526E)] hover:text-[var(--ds-text,#172B4D)]",
        "border-b-2 border-transparent data-[state=active]:border-[var(--ds-icon-brand,#0C66E4)] data-[state=active]:text-[var(--ds-text,#172B4D)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-icon-brand,#0C66E4)]",
        "disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
);
TabsTrigger.displayName = "TabsTrigger";

const TabsContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { value?: string }>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      role="tabpanel"
      className={cn("mt-2 focus-visible:outline-none", className)}
      {...props}
    >
      {children}
    </div>
  )
);
TabsContent.displayName = "TabsContent";

export { Tabs, TabsList, TabsTrigger, TabsContent };
