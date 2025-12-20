/**
 * ReportTable — Enterprise-grade report table
 * 
 * Matches IncidentListTable styling exactly:
 * - 32px header, 36px rows
 * - Same typography tokens
 * - Same hover states
 * - Content-driven height (no forced viewport stretch)
 */

import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

// Enterprise typography - matches IncidentListTable
const HEADER_TEXT = 'text-[10px] font-semibold text-muted-foreground uppercase tracking-wider';
const CELL_TEXT = 'text-[12px] leading-4 text-foreground';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const PAGE_SIZE_STORAGE_KEY = 'catalyst.reports.pageSize';

export interface ReportColumn<T> {
  key: string;
  label: string;
  width?: number;
  minWidth?: number;
  centered?: boolean;
  render: (item: T) => React.ReactNode;
}

interface ReportTableProps<T> {
  data: T[];
  columns: ReportColumn<T>[];
  isLoading?: boolean;
  getRowId: (item: T) => string;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
}

function LoadingSkeleton<T>({ columns }: { columns: ReportColumn<T>[] }) {
  return (
    <div className="rounded-md border border-border overflow-hidden bg-card">
      {/* Header */}
      <div className="grid items-center h-8 bg-muted border-b border-border" 
        style={{ gridTemplateColumns: columns.map(c => `${c.width || c.minWidth || 100}px`).join(' ') }}>
        {columns.map(col => (
          <div key={col.key} className={cn("px-3 flex items-center h-full", col.centered && "justify-center")}>
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
      {/* Rows */}
      {[...Array(8)].map((_, i) => (
        <div key={i} className="grid items-center h-9 border-b border-border last:border-b-0"
          style={{ gridTemplateColumns: columns.map(c => `${c.width || c.minWidth || 100}px`).join(' ') }}>
          {columns.map(col => (
            <div key={col.key} className={cn("px-3 flex items-center h-full", col.centered && "justify-center")}>
              <Skeleton className="h-3 w-full max-w-[80%]" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function ReportTable<T>({ 
  data, 
  columns, 
  isLoading, 
  getRowId, 
  onRowClick,
  emptyMessage = "No data found"
}: ReportTableProps<T>) {
  const navigate = useNavigate();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  
  const [pageSize, setPageSize] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(PAGE_SIZE_STORAGE_KEY);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (PAGE_SIZE_OPTIONS.includes(parsed)) return parsed;
      }
    } catch {}
    return 25;
  });

  const handlePageSizeChange = useCallback((newSize: string) => {
    const size = parseInt(newSize, 10);
    setPageSize(size);
    setPage(1);
    try {
      localStorage.setItem(PAGE_SIZE_STORAGE_KEY, newSize);
    } catch {}
  }, []);

  // Grid template
  const gridTemplate = useMemo(() => 
    columns.map(c => `${c.width || c.minWidth || 100}px`).join(' '),
    [columns]
  );

  // Pagination
  const totalPages = Math.ceil(data.length / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = data.slice(startIndex, endIndex);
  const startItem = data.length > 0 ? startIndex + 1 : 0;
  const endItem = Math.min(endIndex, data.length);

  if (isLoading) {
    return <LoadingSkeleton columns={columns} />;
  }

  return (
    <div className="flex flex-col">
      {/* Table container - content-driven height */}
      <div className="rounded-md border border-border overflow-hidden bg-card">
        <div className="overflow-x-auto">
          {/* Header - 32px */}
          <div 
            className="grid items-center h-8 bg-muted border-b border-border"
            style={{ gridTemplateColumns: gridTemplate }}
          >
            {columns.map((col, idx) => (
              <div 
                key={col.key} 
                className={cn(
                  "px-3 flex items-center h-full min-w-0 overflow-hidden",
                  idx === 0 && "pl-4",
                  col.centered && "justify-center"
                )}
              >
                <span className={cn(HEADER_TEXT, "truncate")}>{col.label}</span>
              </div>
            ))}
          </div>

          {/* Body */}
          {paginatedData.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">{emptyMessage}</p>
            </div>
          ) : (
            paginatedData.map((item) => {
              const rowId = getRowId(item);
              return (
                <div
                  key={rowId}
                  className={cn(
                    "grid items-center h-9 border-b border-border last:border-b-0 transition-colors cursor-pointer",
                    hoveredId === rowId && "bg-muted/50"
                  )}
                  style={{ gridTemplateColumns: gridTemplate }}
                  onClick={() => onRowClick?.(item)}
                  onMouseEnter={() => setHoveredId(rowId)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  {columns.map((col, idx) => (
                    <div 
                      key={col.key} 
                      className={cn(
                        "px-3 flex items-center h-full min-w-0 overflow-hidden",
                        idx === 0 && "pl-4",
                        col.centered && "justify-center",
                        CELL_TEXT
                      )}
                    >
                      {col.render(item)}
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Pagination - directly under table */}
      {data.length > 0 && (
        <div className="flex items-center justify-between mt-3 px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Rows:</span>
            <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
              <SelectTrigger className="h-7 w-16 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map(size => (
                  <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground tabular-nums">
              {startItem}–{endItem} of {data.length}
            </span>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 w-7 p-0"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 w-7 p-0"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || totalPages === 0}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* End of results indicator for small datasets */}
      {data.length > 0 && data.length <= pageSize && (
        <div className="text-center py-2">
          <span className="text-[10px] text-muted-foreground">End of results</span>
        </div>
      )}
    </div>
  );
}
