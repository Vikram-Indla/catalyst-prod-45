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
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
        isActive
          ? "bg-[var(--surface-1)] text-[var(--text-1)] shadow-sm"
          : "text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--surface-3)]",
        className
      )}
    >
      {children}
      {count !== undefined && (
        <span
          className={cn(
            "min-w-[18px] h-[18px] px-1 rounded text-[11px] font-medium tabular-nums inline-flex items-center justify-center",
            isActive
              ? "bg-[var(--accent-color)] text-[var(--text-inverse)]"
              : "bg-[var(--surface-3)] text-[var(--text-2)]"
          )}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
