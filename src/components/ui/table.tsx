import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * CATALYST TABLE — V5 No-Drift Award Grade
 * 
 * DARK MODE GRAMMAR:
 * - NO outer container borders
 * - NO vertical column dividers
 * - Ultra-subtle row separators: --divider token
 * - Hover as primary row affordance: --hover token
 * - Surface contrast for header: --bg-2
 */

const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className={cn(
      "relative w-full overflow-auto rounded-lg",
      // Light mode: white background with subtle border
      "bg-card border border-border/60",
      // Dark mode: NO outer border, flush with background
      "dark:bg-transparent dark:border-0"
    )}>
      <table ref={ref} className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  ),
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead 
      ref={ref} 
      className={cn(
        // Light mode: subtle header background with border
        "bg-muted/50 border-b border-border/60",
        // Dark mode: --bg-2 surface, --divider separator
        "dark:bg-[var(--bg-2)] dark:border-b dark:border-[var(--divider)]",
        className
      )} 
      {...props} 
    />
  ),
);
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody 
      ref={ref} 
      className={cn(
        "[&_tr:last-child]:border-0",
        className
      )} 
      {...props} 
    />
  ),
);
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tfoot 
      ref={ref} 
      className={cn(
        "font-medium [&>tr]:last:border-b-0",
        "bg-muted/30 border-t border-border/60",
        // Dark mode: --bg-2 surface, --divider border
        "dark:bg-[var(--bg-2)] dark:border-[var(--divider)]",
        className
      )} 
      {...props} 
    />
  ),
);
TableFooter.displayName = "TableFooter";

/**
 * Table Row — Bloomberg/Linear compliant
 * - Hover as primary affordance (--hover token)
 * - Ultra-subtle bottom separator (--divider)
 * - Selected uses brand accent
 */
const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement> & { selected?: boolean }>(
  ({ className, selected, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        "h-10 transition-colors",
        // Light mode: subtle border
        "border-b border-border/50",
        // Dark mode: --divider separator, --hover state
        "dark:border-b dark:border-[var(--divider)]",
        // Hover: surface lift using --hover token
        "hover:bg-muted/50 dark:hover:bg-[var(--hover)]",
        // Selected: brand accent
        selected && [
          "bg-brand-primary/5 dark:bg-[var(--row-selected)]",
          "border-l-2 border-l-brand-primary"
        ],
        className
      )}
      data-state={selected ? 'selected' : undefined}
      {...props}
    />
  ),
);
TableRow.displayName = "TableRow";

/**
 * Table Head — Column headers
 * - Dark mode: NO column dividers
 * - Text uses --fg-2
 */
const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        "h-10 px-4 py-2 text-left align-middle font-semibold uppercase text-xs tracking-wide",
        "text-muted-foreground dark:text-[var(--fg-2)]",
        // Light mode: subtle column dividers
        "border-r border-border/30 last:border-r-0",
        // Dark mode: NO column dividers at all
        "dark:border-r-0",
        "[&:has([role=checkbox])]:pr-0",
        className,
      )}
      {...props}
    />
  ),
);
TableHead.displayName = "TableHead";

/**
 * Table Cell — Body cells
 * - Dark mode: NO column dividers
 * - Text uses --fg-1
 */
const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td 
      ref={ref} 
      className={cn(
        "px-4 py-2 align-middle text-foreground dark:text-[var(--fg-1)]",
        // Light mode: subtle column dividers
        "border-r border-border/20 last:border-r-0",
        // Dark mode: NO column dividers at all
        "dark:border-r-0",
        "[&:has([role=checkbox])]:pr-0",
        className
      )} 
      {...props} 
    />
  ),
);
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(
  ({ className, ...props }, ref) => (
    <caption 
      ref={ref} 
      className={cn(
        "mt-4 text-sm text-muted-foreground dark:text-[var(--fg-3)]",
        className
      )} 
      {...props} 
    />
  ),
);
TableCaption.displayName = "TableCaption";

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
