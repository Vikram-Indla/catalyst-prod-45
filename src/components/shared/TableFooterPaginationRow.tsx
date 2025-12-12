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
    <TableRow className="border-t border-border hover:bg-transparent">
      <TableCell colSpan={columnsCount} className="py-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {startIndex + 1}-{endIndex} of {totalItems} {itemLabel}
          </p>
          
          <div className="flex items-center gap-2">
            {/* Previous Button */}
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 text-sm border border-border rounded-md transition-colors",
                currentPage === 1 
                  ? "text-muted-foreground/50 cursor-not-allowed" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
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
                  "w-8 h-8 text-sm rounded-md transition-colors",
                  currentPage === pageNum 
                    ? "bg-brand-gold text-white font-medium" 
                    : "text-muted-foreground hover:bg-muted border border-border"
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
                "flex items-center gap-1 px-3 py-1.5 text-sm border border-border rounded-md transition-colors",
                currentPage >= totalPages 
                  ? "text-muted-foreground/50 cursor-not-allowed" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
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