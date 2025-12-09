import Button from '@atlaskit/button';
import { token } from '@atlaskit/tokens';
import ChevronLeftLargeIcon from '@atlaskit/icon/glyph/chevron-left-large';
import ChevronRightLargeIcon from '@atlaskit/icon/glyph/chevron-right-large';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ 
  currentPage, 
  totalPages, 
  totalItems, 
  itemsPerPage,
  onPageChange 
}: PaginationProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);
  
  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
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
  
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: token('space.300', '24px'),
      borderTop: `1px solid ${token('color.border', '#DFE1E6')}`,
    }}>
      <div style={{
        fontSize: '12px',
        color: token('color.text.subtlest', '#6B778C'),
      }}>
        Showing {startItem}-{endItem} of {totalItems}
      </div>
      
      <div style={{
        display: 'flex',
        gap: token('space.100', '8px'),
        alignItems: 'center',
      }}>
        <Button
          appearance="subtle"
          iconBefore={<ChevronLeftLargeIcon label="Previous" size="small" />}
          isDisabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Previous
        </Button>
        
        {getPageNumbers().map((pageNum, idx) => (
          pageNum === '...' ? (
            <span 
              key={`ellipsis-${idx}`}
              style={{ 
                padding: `0 ${token('space.100', '8px')}`,
                color: token('color.text.subtlest', '#6B778C'),
              }}
            >
              ...
            </span>
          ) : (
            <Button
              key={pageNum}
              appearance="subtle"
              isSelected={currentPage === pageNum}
              onClick={() => onPageChange(pageNum as number)}
            >
              {pageNum}
            </Button>
          )
        ))}
        
        <Button
          appearance="subtle"
          iconAfter={<ChevronRightLargeIcon label="Next" size="small" />}
          isDisabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export default Pagination;
