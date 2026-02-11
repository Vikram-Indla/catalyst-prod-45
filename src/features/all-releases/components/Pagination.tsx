/**
 * Pagination Component — Shows record count and page size selector
 */

import { cn } from '@/lib/utils';

interface PaginationProps {
  showing: number;
  total: number;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
}

export function Pagination({
  showing,
  total,
  pageSize,
  onPageSizeChange,
}: PaginationProps) {
  return (
    <div className="flex items-center justify-between mt-6 px-1">
      <span className="text-xs text-slate-500 font-medium">
        Showing 1-{showing} of {total} releases
      </span>
      
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-500 font-medium">Per page:</span>
        <div className="flex gap-1">
          {[6, 12, 24].map((size) => (
            <button
              key={size}
              onClick={() => onPageSizeChange(size)}
              className={cn(
                "px-2 py-1 text-xs font-medium border rounded transition-colors",
                pageSize === size
                  ? "bg-blue-50 border-blue-200 text-blue-600"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              )}
            >
              {size}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
