import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * CATALYST V5 DATA TABLE - Executive-Grade Dark Mode
 * Bloomberg/Linear compliant table styling
 * 
 * DARK MODE BORDER DISCIPLINE:
 * - Borders never dominate content
 * - Row separation via surface contrast, not borders
 * - Single subtle outer border on container
 * - No bright borders anywhere
 */

const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className={cn(
      "relative w-full overflow-auto rounded-xl",
      // Light mode: white background with subtle border
      "bg-[var(--surface-bg)] border border-[var(--border-subtle-hex)]",
      // Dark mode: surface-0 with very subtle border (darker than content, never bright)
      "dark:bg-[var(--surface-0)] dark:border-[#262626]"
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
        "bg-[var(--table-header-bg)]",
        // Dark mode: slightly darker surface for header separation (NO bright border)
        "dark:bg-[#1a1a1a]",
        // Border only in light mode - dark mode uses surface contrast
        "border-b border-[var(--border-default-hex)] dark:border-[#2a2a2a]",
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
        "bg-[var(--surface-bg)] dark:bg-[var(--surface-0)]",
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
        "bg-[var(--surface-subtle)] dark:bg-[#1a1a1a]",
        // Very subtle top border in dark mode
        "border-t border-[var(--border-default-hex)] dark:border-[#2a2a2a]",
        className
      )} 
      {...props} 
    />
  ),
);
TableFooter.displayName = "TableFooter";

/**
 * Table Row - Bloomberg/Linear compliant
 * - NO bright borders in dark mode
 * - Row separation via alternating backgrounds or ultra-subtle dividers
 * - Hover uses surface tint, not border highlights
 * - Selected uses surface elevation, not border
 */
const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement> & { selected?: boolean }>(
  ({ className, selected, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        "h-10 transition-colors",
        // Light mode: subtle border
        "border-b border-[var(--border-subtle-hex)]",
        // Dark mode: ultra-subtle divider (barely visible, never white)
        "dark:border-b dark:border-[#232323]",
        // Hover: surface tint lift, NOT border highlight
        "hover:bg-[var(--surface-hover)] dark:hover:bg-[#2a2a2a]",
        // Selected: surface elevation with subtle brand accent
        selected && [
          "bg-[var(--selection-row-bg)] dark:bg-[#1f1f1f]",
          "border-l-2 border-l-[var(--brand-primary-hex)]"
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
 * Table Head - Column headers
 * - Dark mode: NO visible column dividers (content clarity over borders)
 * - Light mode: subtle dividers allowed
 */
const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        "h-10 px-4 py-2 text-left align-middle font-semibold uppercase text-xs tracking-wide",
        // Text color for both modes
        "text-[var(--text-2)] dark:text-[var(--text-1)]",
        // Light mode: subtle column dividers
        "border-r border-[var(--border-subtle-hex)] last:border-r-0",
        // Dark mode: NO column dividers (cleaner executive look)
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
 * Table Cell - Body cells
 * - Dark mode: NO visible column dividers
 * - Content is the focus, not grid lines
 */
const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td 
      ref={ref} 
      className={cn(
        "px-4 py-2 align-middle",
        "text-[var(--text-1)] dark:text-[var(--text-1)]",
        // Light mode: subtle column dividers
        "border-r border-[var(--border-subtle-hex)] last:border-r-0",
        // Dark mode: NO column dividers
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
        "mt-4 text-sm",
        "text-[var(--text-3)] dark:text-[var(--text-secondary-hex)]",
        className
      )} 
      {...props} 
    />
  ),
);
TableCaption.displayName = "TableCaption";

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
