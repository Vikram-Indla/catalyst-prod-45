import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * CATALYST V5 DATA TABLE - Dark Mode Compliant
 * Uses Catalyst v5 semantic tokens for proper light/dark support
 * 
 * Token Reference:
 * - Surfaces: surface-0 (#262626), surface-2 (#1f1f1f), surface-3 (#2d2d2d), surface-elevated (#333333)
 * - Text: text-primary (#f5f5f5), text-secondary (#a3a3a3), text-muted (#737373)
 * - Borders: border-subtle (#333333), border-default (#404040), border-strong (#595959)
 */

const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="relative w-full overflow-auto rounded-xl bg-[var(--surface-bg)] dark:bg-[var(--surface-0)] border border-[var(--border-subtle-hex)] dark:border-[var(--border-subtle-hex)]">
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
        "[&_tr]:border-b",
        "bg-[var(--table-header-bg)] dark:bg-[var(--surface-2)]",
        "border-b border-[var(--border-default-hex)] dark:border-[var(--border-default-hex)]",
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
        "bg-[var(--surface-subtle)] dark:bg-[var(--surface-2)]",
        "border-t border-[var(--border-default-hex)] dark:border-[var(--border-default-hex)]",
        className
      )} 
      {...props} 
    />
  ),
);
TableFooter.displayName = "TableFooter";

/**
 * Table Row - 40px height (h-10)
 * Hover: surface-3 (#2d2d2d) in dark mode
 * Selected: surface-elevated (#333333) with brand accent border
 */
const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement> & { selected?: boolean }>(
  ({ className, selected, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        "h-10 transition-colors",
        "border-b border-[var(--border-subtle-hex)] dark:border-[var(--border-subtle-hex)]",
        "hover:bg-[var(--surface-hover)] dark:hover:bg-[var(--surface-3)]",
        selected && [
          "bg-[var(--selection-row-bg)] dark:bg-[var(--surface-elevated)]",
          "border-l-2 border-l-[var(--brand-primary-hex)] dark:border-l-[var(--brand-primary-hex)]"
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
 * Text: text-primary in dark mode for readability
 * Uses border-subtle for column dividers
 */
const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        "h-10 px-4 py-2 text-left align-middle font-semibold uppercase text-xs tracking-wide",
        "text-[var(--text-2)] dark:text-[var(--text-1)]",
        "border-r border-[var(--border-subtle-hex)] dark:border-[var(--border-subtle-hex)] last:border-r-0",
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
 * Primary text: text-primary (#f5f5f5) in dark mode
 * Column dividers for grid integrity
 */
const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td 
      ref={ref} 
      className={cn(
        "px-4 py-2 align-middle",
        "text-[var(--text-1)] dark:text-[var(--text-1)]",
        "border-r border-[var(--border-subtle-hex)] dark:border-[var(--border-subtle-hex)] last:border-r-0",
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
