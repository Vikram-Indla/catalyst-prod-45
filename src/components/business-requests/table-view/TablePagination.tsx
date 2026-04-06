/* V12 — TablePagination: #1A1A1A bg, JetBrains Mono for numeric text */
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export function TablePagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
}: TablePaginationProps) {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  /* V12 monospace style for numeric text */
  const monoStyle: React.CSSProperties = {
    fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
    fontSize: 12,
    fontVariantNumeric: 'tabular-nums',
  };

  return (
    <div
      className="flex items-center justify-between"
      style={{
        padding: '8px 12px', /* V12 */
        borderTop: '0.75px solid rgba(15, 23, 42, 0.06)', /* V12 */
        background: '#1A1A1A', /* V12 */
      }}
    >
      {/* Left: Items info */}
      <div style={{ ...monoStyle, color: 'var(--fg-3)' }}> {/* V12 */}
        Showing <strong style={{ color: 'var(--fg-1)' }}>{startItem}</strong> to{' '}
        <strong style={{ color: 'var(--fg-1)' }}>{endItem}</strong> of{' '}
        <strong style={{ color: 'var(--fg-1)' }}>{totalItems}</strong>
      </div>

      {/* Center: Page size selector */}
      <div className="flex items-center gap-2">
        <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>Rows per page:</span>
        <Select
          value={String(pageSize)}
          onValueChange={(val) => onPageSizeChange(Number(val))}
        >
          <SelectTrigger className="h-8 w-[70px] text-xs bg-card border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((size) => (
              <SelectItem key={size} value={String(size)} className="text-xs">
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Right: Pagination controls */}
      <div className="flex items-center gap-1">
        <span style={{ ...monoStyle, color: 'var(--fg-3)', marginInlineEnd: 8 }}>
          Page <strong style={{ color: 'var(--fg-1)' }}>{currentPage}</strong> of{' '}
          <strong style={{ color: 'var(--fg-1)' }}>{totalPages}</strong>
        </span>
        
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onPageChange(1)} disabled={currentPage === 1}>
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages}>
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}