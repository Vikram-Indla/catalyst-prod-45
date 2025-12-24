import * as React from "react";
import { cn } from "@/lib/utils";

interface SegmentedTabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

interface SegmentedTabProps {
  value: string;
  children: React.ReactNode;
  count?: number;
  className?: string;
}

const SegmentedTabsContext = React.createContext<{
  value: string;
  onValueChange: (value: string) => void;
} | null>(null);

export function SegmentedTabs({ value, onValueChange, children, className }: SegmentedTabsProps) {
  return (
    <SegmentedTabsContext.Provider value={{ value, onValueChange }}>
      <div
        className={cn(
          "inline-flex items-center p-1 rounded-lg gap-0.5",
          // Neutral surface with subtle border (reduced champagne)
          "bg-[var(--surface-2)] border border-[var(--border-color)]",
          className
        )}
        role="tablist"
      >
        {children}
      </div>
    </SegmentedTabsContext.Provider>
  );
}

export function SegmentedTab({ value, children, count, className }: SegmentedTabProps) {
  const context = React.useContext(SegmentedTabsContext);
  if (!context) throw new Error("SegmentedTab must be used within SegmentedTabs");

  const isActive = context.value === value;

  return (
    <button
      role="tab"
      aria-selected={isActive}
      onClick={() => context.onValueChange(value)}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 dark:focus-visible:ring-gray-600",
        isActive
          // Active: grey background, foreground text (neutral, not gold)
          ? "bg-[var(--surface-1)] text-[var(--text-1)] shadow-sm"
          : "text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--surface-2)]",
        className
      )}
    >
      {children}
      {count !== undefined && (
        <span
          className={cn(
            "min-w-[18px] h-[18px] px-1 rounded text-[11px] font-medium tabular-nums inline-flex items-center justify-center",
            isActive
              // Active count badge: grey neutral (not gold)
              ? "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
              : "bg-[var(--surface-3)] text-[var(--text-2)] dark:text-foreground/60"
          )}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
