import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HistoryPaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export function HistoryPagination({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
}: HistoryPaginationProps) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 4;
    
    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= maxVisible; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - maxVisible + 1; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  if (totalItems === 0) return null;

  return (
    <div className="flex items-center justify-between px-5 py-4">
      <span className="text-[13px] text-[#64748b]">
        Showing {startItem}-{endItem} of {totalItems} generations
      </span>
      
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={cn(
            'w-9 h-9 flex items-center justify-center border rounded-md text-[13px] transition-colors',
            currentPage === 1
              ? 'opacity-50 cursor-not-allowed border-[#e2e8f0] text-[#94a3b8]'
              : 'border-[#e2e8f0] text-[#475569] hover:border-[#2563eb] hover:text-[#2563eb]'
          )}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        
        {getPageNumbers().map((page, index) => (
          <React.Fragment key={index}>
            {page === '...' ? (
              <span className="w-9 h-9 flex items-center justify-center text-[13px] text-[#64748b]">
                ...
              </span>
            ) : (
              <button
                onClick={() => onPageChange(page as number)}
                className={cn(
                  'min-w-9 h-9 px-2 flex items-center justify-center border rounded-md text-[13px] transition-colors',
                  currentPage === page
                    ? 'bg-[#2563eb] border-[#2563eb] text-white'
                    : 'border-[#e2e8f0] text-[#475569] hover:border-[#2563eb] hover:text-[#2563eb]'
                )}
              >
                {page}
              </button>
            )}
          </React.Fragment>
        ))}
        
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={cn(
            'w-9 h-9 flex items-center justify-center border rounded-md text-[13px] transition-colors',
            currentPage === totalPages
              ? 'opacity-50 cursor-not-allowed border-[#e2e8f0] text-[#94a3b8]'
              : 'border-[#e2e8f0] text-[#475569] hover:border-[#2563eb] hover:text-[#2563eb]'
          )}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
