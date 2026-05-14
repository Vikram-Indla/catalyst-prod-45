/**
 * UsersPagination — Pagination controls for Users table
 * Matches spec: Previous/Next buttons, page numbers, showing X of Y
 */

import Button from '@atlaskit/button/new';
import ChevronLeftIcon from '@atlaskit/icon/glyph/chevron-left';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';

interface UsersPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function UsersPagination({ page, pageSize, total, onPageChange }: UsersPaginationProps) {
  const totalPages = Math.ceil(total / pageSize);
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, total);

  if (totalPages <= 1) {
    return (
      <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
        <span>Showing {total} of {total} users</span>
      </div>
    );
  }

  // Generate page numbers to display (show max 5, centered on current)
  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisible = 5;
    
    let start = Math.max(0, page - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages - 1, start + maxVisible - 1);
    
    // Adjust start if we're near the end
    if (end - start < maxVisible - 1) {
      start = Math.max(0, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  };

  return (
    <div className="flex items-center justify-between mt-4 px-2">
      <div className="text-xs text-muted-foreground">
        Showing <span className="font-semibold">{from}</span> to <span className="font-semibold">{to}</span> of{' '}
        <span className="font-semibold">{total}</span> users
      </div>
      
      <div className="flex items-center gap-1.5">
        <Button
          appearance="default"
          onClick={() => onPageChange(page - 1)}
          isDisabled={page === 0}
          iconBefore={ChevronLeftIcon}
        >
          Previous
        </Button>
        
        <div className="flex items-center gap-1">
          {getPageNumbers().map((pageNum) => (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                pageNum === page
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {pageNum + 1}
            </button>
          ))}
        </div>
        
        <Button
          appearance="default"
          onClick={() => onPageChange(page + 1)}
          isDisabled={page >= totalPages - 1}
          iconAfter={ChevronRightIcon}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
