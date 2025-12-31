/**
 * For You Pagination - Page navigation with count display
 */

import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ForYouPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

const PAGE_SIZES = [10, 25, 50, 100];

export function ForYouPagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: ForYouPaginationProps) {
  // Hide pagination when no items
  if (totalItems === 0) {
    return null;
  }

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between px-4 py-3 mt-4 border border-border rounded-lg bg-surface-0">
      {/* Item count */}
      <div className="text-sm text-text-muted">
        Showing <span className="font-medium text-text-secondary">{startItem}-{endItem}</span> of{' '}
        <span className="font-medium text-text-secondary">{totalItems}</span>
      </div>

      {/* Page navigation */}
      <div className="flex items-center gap-1">
        {/* First page */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className={cn(
            "p-1.5 rounded hover:bg-surface-hover transition-colors",
            "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          )}
          aria-label="First page"
        >
          <ChevronsLeft className="w-4 h-4 text-text-muted" />
        </button>

        {/* Previous page */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={cn(
            "p-1.5 rounded hover:bg-surface-hover transition-colors",
            "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          )}
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4 text-text-muted" />
        </button>

        {/* Page numbers */}
        <div className="flex items-center gap-1 mx-2">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum: number;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }

            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={cn(
                  "min-w-[32px] h-8 px-2 rounded text-sm font-medium transition-colors",
                  currentPage === pageNum
                    ? "bg-brand-primary text-white"
                    : "text-text-secondary hover:bg-surface-hover"
                )}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Next page */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={cn(
            "p-1.5 rounded hover:bg-surface-hover transition-colors",
            "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          )}
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4 text-text-muted" />
        </button>

        {/* Last page */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className={cn(
            "p-1.5 rounded hover:bg-surface-hover transition-colors",
            "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          )}
          aria-label="Last page"
        >
          <ChevronsRight className="w-4 h-4 text-text-muted" />
        </button>
      </div>

      {/* Page size selector */}
      {onPageSizeChange && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-muted">Per page:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="px-2 py-1 text-sm border border-border rounded bg-surface-0 text-text-secondary focus:outline-none focus:ring-2 focus:ring-brand-primary"
          >
            {PAGE_SIZES.map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
