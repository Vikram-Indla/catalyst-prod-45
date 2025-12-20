/**
 * ReportTable — Enterprise-grade report table
 * 
 * Matches IncidentListTable styling exactly:
 * - 32px header, 36px rows
 * - Same typography tokens
 * - Same hover states
 * - Content-driven height (no forced viewport stretch)
 * - Full-width layout with Summary column absorbing remaining space
 */

import { useState, useCallback, useMemo, useRef, useEffect, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// Enterprise typography - matches IncidentListTable
const HEADER_TEXT = 'text-[10px] font-semibold text-muted-foreground uppercase tracking-wider';
const CELL_TEXT = 'text-[12px] leading-4 text-foreground';

const DEFAULT_PAGE_SIZE = 25;
const LOAD_MORE_INCREMENT = 25;

export interface ReportColumn<T> {
  key: string;
  label: string;
  minWidth?: number;
  width?: number;
  canGrow?: boolean;  // If true, absorbs remaining width (Summary column)
  centered?: boolean;
  render: (item: T) => React.ReactNode;
}

// Default min widths for common columns
const DEFAULT_MIN_WIDTHS: Record<string, number> = {
  key: 100,
  summary: 280,
  severity: 70,
  sev: 70,
  priority: 80,
  status: 120,
  assignee: 140,
  age: 70,
  slaState: 100,
  release: 100,
  ageBucket: 90,
  major: 60,
  progress: 80,
  approvers: 100,
  lastAction: 120,
  outcome: 90,
  decidedBy: 130,
  decisionTime: 100,
  decidedAt: 110,
  converted: 85,
  targetType: 90,
  linkedItem: 100,
  convertedAt: 100,
  timeToConvert: 80,
  triageFlag: 80,
  breachAmount: 110,
};

interface ReportTableProps<T> {
  data: T[];
  columns: ReportColumn<T>[];
  isLoading?: boolean;
  getRowId: (item: T) => string;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
}

function getColumnMinWidth(col: ReportColumn<any>): number {
  if (col.minWidth) return col.minWidth;
  if (col.width) return col.width;
  return DEFAULT_MIN_WIDTHS[col.key] || 80;
}

function LoadingSkeleton<T>({ columns, gridTemplate }: { columns: ReportColumn<T>[]; gridTemplate: string }) {
  return (
    <div className="rounded-md border border-border overflow-hidden bg-card w-full">
      {/* Header */}
      <div 
        className="grid items-center h-8 bg-muted border-b border-border" 
        style={{ gridTemplateColumns: gridTemplate }}
      >
        {columns.map((col, idx) => (
          <div key={col.key} className={cn(
            "px-3 flex items-center h-full min-w-0",
            idx === 0 && "pl-4",
            col.centered && "justify-center"
          )}>
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
      {/* Rows */}
      {[...Array(8)].map((_, i) => (
        <div 
          key={i} 
          className="grid items-center h-9 border-b border-border last:border-b-0"
          style={{ gridTemplateColumns: gridTemplate }}
        >
          {columns.map((col, idx) => (
            <div key={col.key} className={cn(
              "px-3 flex items-center h-full min-w-0",
              idx === 0 && "pl-4",
              col.centered && "justify-center"
            )}>
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(DEFAULT_PAGE_SIZE);
  const [containerWidth, setContainerWidth] = useState(0);

  // Track container width for responsive column sizing
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    
    updateWidth();
    
    const resizeObserver = new ResizeObserver(() => {
      updateWidth();
    });
    
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Calculate grid template with proper column sizing
  // Summary (canGrow) gets remaining space, others get their min/fixed widths
  const gridTemplate = useMemo(() => {
    if (containerWidth === 0) {
      // Fallback for SSR or before measurement
      return columns.map(col => {
        if (col.canGrow) return 'minmax(280px, 1fr)';
        const width = col.width || getColumnMinWidth(col);
        return `${width}px`;
      }).join(' ');
    }

    // Calculate total fixed width
    let totalFixed = 0;
    let hasGrowColumn = false;
    
    columns.forEach(col => {
      if (col.canGrow) {
        hasGrowColumn = true;
      } else {
        totalFixed += col.width || getColumnMinWidth(col);
      }
    });

    // Calculate remaining width for grow column(s)
    const remainingWidth = Math.max(280, containerWidth - totalFixed - 32); // 32px for padding
    
    return columns.map(col => {
      if (col.canGrow) {
        // Grow column takes remaining space but has a minimum
        const minWidth = getColumnMinWidth(col);
        return hasGrowColumn ? `minmax(${minWidth}px, ${remainingWidth}px)` : `${minWidth}px`;
      }
      const width = col.width || getColumnMinWidth(col);
      return `${width}px`;
    }).join(' ');
  }, [columns, containerWidth]);

  // Reset visible count when data changes
  useEffect(() => {
    setVisibleCount(DEFAULT_PAGE_SIZE);
  }, [data.length]);

  const visibleData = useMemo(() => data.slice(0, visibleCount), [data, visibleCount]);
  const hasMore = visibleCount < data.length;

  const handleLoadMore = useCallback(() => {
    setVisibleCount(prev => Math.min(prev + LOAD_MORE_INCREMENT, data.length));
  }, [data.length]);

  if (isLoading) {
    return (
      <div ref={containerRef} className="w-full">
        <LoadingSkeleton columns={columns} gridTemplate={gridTemplate} />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full">
      {/* Table container - full width, content-driven height */}
      <div className="rounded-md border border-border overflow-hidden bg-card w-full">
        {/* Horizontal scroll only when content exceeds container */}
        <div className="overflow-x-auto w-full">
          {/* Header - 32px */}
          <div 
            className="grid items-center h-8 bg-muted border-b border-border sticky top-0 z-10"
            style={{ gridTemplateColumns: gridTemplate, minWidth: 'max-content' }}
          >
            {columns.map((col, idx) => (
              <div 
                key={col.key} 
                className={cn(
                  "px-3 flex items-center h-full min-w-0",
                  idx === 0 && "pl-4",
                  col.centered && "justify-center"
                )}
              >
                <span className={cn(HEADER_TEXT, "truncate whitespace-nowrap")}>{col.label}</span>
              </div>
            ))}
          </div>

          {/* Body */}
          {visibleData.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">{emptyMessage}</p>
            </div>
          ) : (
            visibleData.map((item) => {
              const rowId = getRowId(item);
              return (
                <div
                  key={rowId}
                  className={cn(
                    "grid items-center h-9 border-b border-border last:border-b-0 transition-colors cursor-pointer",
                    hoveredId === rowId && "bg-muted/50"
                  )}
                  style={{ gridTemplateColumns: gridTemplate, minWidth: 'max-content' }}
                  onClick={() => onRowClick?.(item)}
                  onMouseEnter={() => setHoveredId(rowId)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  {columns.map((col, idx) => (
                    <div 
                      key={col.key} 
                      className={cn(
                        "px-3 flex items-center h-full min-w-0",
                        idx === 0 && "pl-4",
                        col.centered && "justify-center",
                        CELL_TEXT
                      )}
                    >
                      {col.canGrow ? (
                        <span className="truncate block max-w-full">{col.render(item)}</span>
                      ) : (
                        col.render(item)
                      )}
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Load More button - directly under table */}
      {hasMore && (
        <div className="flex justify-center mt-3">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 text-xs gap-1.5"
            onClick={handleLoadMore}
          >
            <ChevronDown className="h-3.5 w-3.5" />
            Load More ({data.length - visibleCount} remaining)
          </Button>
        </div>
      )}

      {/* End of results indicator */}
      {data.length > 0 && !hasMore && (
        <div className="text-center py-3">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
            End of results · {data.length} {data.length === 1 ? 'item' : 'items'}
          </span>
        </div>
      )}
    </div>
  );
}
