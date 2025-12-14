import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * CATALYST DATA TABLE - Token-Based Theme-Aware Table
 * Uses semantic CSS variables for automatic light/dark mode support
 * Tokens: --surface-1/2/3, --text-1/2/3, --divider, --border-color
 */

const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div 
      className="relative w-full overflow-auto rounded-xl"
      style={{ 
        backgroundColor: 'var(--surface-2)',
        border: '1px solid var(--border-color)',
      }}
    >
      <table ref={ref} className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  ),
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead 
      ref={ref} 
      className={cn("[&_tr]:border-b", className)} 
      style={{ backgroundColor: 'var(--surface-1)' }}
      {...props} 
    />
  ),
);
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />
  ),
);
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tfoot 
      ref={ref} 
      className={cn("font-medium [&>tr]:last:border-b-0", className)} 
      style={{ 
        backgroundColor: 'var(--surface-1)',
        borderTop: '1px solid var(--divider)',
      }}
      {...props} 
    />
  ),
);
TableFooter.displayName = "TableFooter";

/**
 * Table Density: 40px row height (h-10)
 * Hover: var(--surface-3)
 * Selected: var(--nav-active-bg)
 */
const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        "h-10 transition-colors",
        "data-[state=selected]:bg-[var(--nav-active-bg)]",
        "hover:bg-[var(--surface-3)]",
        className
      )}
      style={{ borderBottom: '1px solid var(--divider)' }}
      {...props}
    />
  ),
);
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        "h-10 px-4 py-2 text-left align-middle font-medium [&:has([role=checkbox])]:pr-0",
        className,
      )}
      style={{ color: 'var(--text-2)' }}
      {...props}
    />
  ),
);
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td 
      ref={ref} 
      className={cn("px-4 py-2 align-middle [&:has([role=checkbox])]:pr-0", className)} 
      style={{ color: 'var(--text-1)' }}
      {...props} 
    />
  ),
);
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(
  ({ className, ...props }, ref) => (
    <caption 
      ref={ref} 
      className={cn("mt-4 text-sm", className)} 
      style={{ color: 'var(--text-3)' }}
      {...props} 
    />
  ),
);
TableCaption.displayName = "TableCaption";

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
