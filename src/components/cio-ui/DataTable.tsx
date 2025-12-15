import React from 'react';
import { cn } from '@/lib/utils';

interface DataTableProps {
  children: React.ReactNode;
  className?: string;
}

export function DataTable({ children, className }: DataTableProps) {
  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <table className="w-full border-collapse">
        {children}
      </table>
    </div>
  );
}

interface DataTableHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function DataTableHeader({ children, className }: DataTableHeaderProps) {
  return (
    <thead className={cn('bg-[var(--table-header-bg)]', className)}>
      {children}
    </thead>
  );
}

interface DataTableHeadProps {
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

export function DataTableHead({ children, className, align = 'left', width }: DataTableHeadProps) {
  return (
    <th
      className={cn(
        'px-4 py-3 text-left',
        'text-[11px] font-semibold uppercase tracking-wide',
        'text-[var(--table-header-text)]',
        'border-b border-[var(--border-default)]',
        align === 'center' && 'text-center',
        align === 'right' && 'text-right',
        className
      )}
      style={{ width }}
    >
      {children}
    </th>
  );
}

interface DataTableBodyProps {
  children: React.ReactNode;
  className?: string;
}

export function DataTableBody({ children, className }: DataTableBodyProps) {
  return (
    <tbody className={className}>
      {children}
    </tbody>
  );
}

interface DataTableRowProps {
  children: React.ReactNode;
  className?: string;
  selected?: boolean;
  onClick?: () => void;
}

export function DataTableRow({ children, className, selected, onClick }: DataTableRowProps) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        'bg-[var(--table-row-bg)] transition-colors duration-150',
        'hover:bg-[var(--table-row-hover)]',
        selected && 'bg-[var(--table-row-selected)] border-l-2 border-l-[var(--section-accent-gold)]',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </tr>
  );
}

interface DataTableCellProps {
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

export function DataTableCell({ children, className, align = 'left' }: DataTableCellProps) {
  return (
    <td
      className={cn(
        'px-4 py-3.5',
        'border-b border-[var(--table-border)]',
        'text-sm text-[var(--text-primary)]',
        align === 'center' && 'text-center',
        align === 'right' && 'text-right',
        className
      )}
    >
      {children}
    </td>
  );
}
