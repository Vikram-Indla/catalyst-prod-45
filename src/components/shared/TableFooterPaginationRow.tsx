import { TableRow, TableCell } from '@/components/ui/table';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TableFooterPaginationRowProps {
  columnsCount: number;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  itemLabel?: string;
  onPageChange: (page: number) => void;
}

export function TableFooterPaginationRow({
  columnsCount,
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  itemLabel = 'items',
  onPageChange,
}: TableFooterPaginationRowProps) {
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

  if (totalItems === 0) return null;

  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={columnsCount} className="py-4 px-4">
        <div className="flex items-center justify-between gap-4 flex-wrap min-w-0">
          <p className="text-sm whitespace-nowrap text-[var(--text-3)]">
            Showing {startIndex + 1}-{endIndex} of {totalItems} {itemLabel}
          </p>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Previous Button */}
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 text-sm rounded-md transition-colors whitespace-nowrap",
                "border border-[var(--border-color)]",
                currentPage === 1 
                  ? "text-[var(--text-3)] opacity-50 cursor-not-allowed" 
                  : "text-[var(--text-2)] hover:bg-[var(--surface-3)] hover:text-[var(--text-1)]"
              )}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            
            {/* Page Numbers */}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={cn(
                  "w-8 h-8 text-sm rounded-md transition-colors flex-shrink-0",
                  currentPage === pageNum 
                    ? "bg-brand-gold text-white font-medium" 
                    : "text-[var(--text-2)] hover:bg-[var(--surface-3)] border border-[var(--border-color)]"
                )}
              >
                {pageNum}
              </button>
            ))}
            
            {/* Next Button */}
            <button
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 text-sm rounded-md transition-colors whitespace-nowrap",
                "border border-[var(--border-color)]",
                currentPage >= totalPages 
                  ? "text-[var(--text-3)] opacity-50 cursor-not-allowed" 
                  : "text-[var(--text-2)] hover:bg-[var(--surface-3)] hover:text-[var(--text-1)]"
              )}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}