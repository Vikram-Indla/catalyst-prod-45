/**
 * CATALYST TABLE COMPONENT — Single Source of Truth
 * 
 * Contract:
 * - Header and rows driven by SAME columnDefinitions
 * - Exactly ONE column canGrow=true (absorbs remaining width)
 * - Width: 100% of container, no dead space
 * - Height: content-driven (page scroll), no nested scroll unless dataset is huge
 * - Typography: tokens only, no grey-on-white
 * 
 * Usage:
 *   <CatalystTable
 *     data={items}
 *     columns={columnDefs}
 *     getRowId={(item) => item.id}
 *     onRowClick={(item) => handleClick(item)}
 *   />
 */

import { useState, useCallback, useMemo, useRef, useLayoutEffect, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface CatalystColumnDef<T> {
  /** Unique key for the column */
  key: string;
  /** Header label text */
  label: string;
  /** Minimum width in pixels (required) */
  minWidth: number;
  /** If true, this column absorbs remaining width. Only ONE column should have this. */
  canGrow?: boolean;
  /** Text alignment */
  align?: 'left' | 'center' | 'right';
  /** Render function for cell content */
  render: (item: T) => ReactNode;
}

export interface CatalystTableProps<T> {
  /** Data array */
  data: T[];
  /** Column definitions - must define header AND cell rendering */
  columns: CatalystColumnDef<T>[];
  /** Extract unique ID from each row */
  getRowId: (item: T) => string;
  /** Optional click handler for rows */
  onRowClick?: (item: T) => void;
  /** Loading state */
  isLoading?: boolean;
  /** Message when no data */
  emptyMessage?: string;
  /** Initial page size (default 25) */
  pageSize?: number;
  /** Load more increment (default 25) */
  loadMoreIncrement?: number;
}

// ═══════════════════════════════════════════════════════════════════
// TYPOGRAPHY TOKENS
// ═══════════════════════════════════════════════════════════════════

const HEADER_STYLES = 'text-[10px] font-semibold uppercase tracking-wider';
const CELL_STYLES = 'text-[12px] leading-4';

// ═══════════════════════════════════════════════════════════════════
// LOADING SKELETON
// ═══════════════════════════════════════════════════════════════════

function TableSkeleton<T>({ 
  columns, 
  gridTemplate 
}: { 
  columns: CatalystColumnDef<T>[]; 
  gridTemplate: string;
}) {
  return (
    <div className="w-full rounded-md border border-border overflow-hidden bg-card">
      {/* Header skeleton */}
      <div 
        className="grid items-center h-8 bg-muted border-b border-border"
        style={{ gridTemplateColumns: gridTemplate }}
      >
        {columns.map((col, idx) => (
          <div 
            key={col.key} 
            className={cn(
              "px-3 flex items-center h-full",
              idx === 0 && "pl-4",
              col.align === 'center' && "justify-center",
              col.align === 'right' && "justify-end"
            )}
          >
            <Skeleton className="h-2.5 w-12" />
          </div>
        ))}
      </div>
      {/* Row skeletons */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div 
          key={i}
          className="grid items-center h-9 border-b border-border last:border-b-0"
          style={{ gridTemplateColumns: gridTemplate }}
        >
          {columns.map((col, idx) => (
            <div 
              key={col.key} 
              className={cn(
                "px-3 flex items-center h-full",
                idx === 0 && "pl-4",
                col.align === 'center' && "justify-center",
                col.align === 'right' && "justify-end"
              )}
            >
              <Skeleton className="h-3 w-[70%]" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function CatalystTable<T>({
  data,
  columns,
  getRowId,
  onRowClick,
  isLoading = false,
  emptyMessage = 'No data found',
  pageSize = 25,
  loadMoreIncrement = 25,
}: CatalystTableProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [containerWidth, setContainerWidth] = useState(0);

  // Track container width for responsive sizing
  useLayoutEffect(() => {
    if (!containerRef.current) return;

    const measure = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  // Reset visible count when data changes
  useLayoutEffect(() => {
    setVisibleCount(pageSize);
  }, [data.length, pageSize]);

  // Calculate grid template
  // Fixed columns use their minWidth, canGrow column uses remaining space
  const gridTemplate = useMemo(() => {
    if (containerWidth === 0) {
      // Fallback before measurement
      return columns.map(col => 
        col.canGrow ? `minmax(${col.minWidth}px, 1fr)` : `${col.minWidth}px`
      ).join(' ');
    }

    // Calculate total fixed width
    let totalFixed = 0;
    columns.forEach(col => {
      if (!col.canGrow) {
        totalFixed += col.minWidth;
      }
    });

    // Remaining width for grow column (minimum is minWidth)
    const growColumn = columns.find(col => col.canGrow);
    const growMinWidth = growColumn?.minWidth || 200;
    const remainingWidth = Math.max(growMinWidth, containerWidth - totalFixed - 32); // 32px padding buffer

    return columns.map(col => {
      if (col.canGrow) {
        return `minmax(${col.minWidth}px, ${remainingWidth}px)`;
      }
      return `${col.minWidth}px`;
    }).join(' ');
  }, [columns, containerWidth]);

  // Visible data slice
  const visibleData = useMemo(() => data.slice(0, visibleCount), [data, visibleCount]);
  const hasMore = visibleCount < data.length;

  const handleLoadMore = useCallback(() => {
    setVisibleCount(prev => Math.min(prev + loadMoreIncrement, data.length));
  }, [data.length, loadMoreIncrement]);

  // Loading state
  if (isLoading) {
    return (
      <div ref={containerRef} className="w-full">
        <TableSkeleton columns={columns} gridTemplate={gridTemplate} />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full">
      {/* Table container - full width, content-driven height */}
      <div className="w-full rounded-md border border-border dark:border-[#2E2E2E] overflow-hidden bg-card dark:bg-[#0A0A0A]">
        {/* Horizontal scroll only when columns exceed container */}
        <div className="w-full overflow-x-auto">
          {/* Header - 32px height */}
          <div
            className="grid items-center h-9 bg-muted dark:bg-[#111111] border-b-2 border-border dark:border-[#2E2E2E] sticky top-0 z-10"
            style={{ gridTemplateColumns: gridTemplate, minWidth: 'max-content' }}
          >
            {columns.map((col, idx) => (
              <div 
                key={col.key}
                className={cn(
                  "px-3 flex items-center h-full min-w-0",
                  idx === 0 && "pl-4",
                  col.align === 'center' && "justify-center",
                  col.align === 'right' && "justify-end"
                )}
              >
                <span className={cn(HEADER_STYLES, "text-muted-foreground truncate")}>
                  {col.label}
                </span>
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
              const isHovered = hoveredRowId === rowId;

              return (
                <div
                  key={rowId}
                  className={cn(
                    "grid items-center h-9 border-b border-border dark:border-[#2E2E2E] last:border-b-0 transition-colors",
                    onRowClick && "cursor-pointer",
                    isHovered && "bg-muted/50"
                  )}
                  style={{ gridTemplateColumns: gridTemplate, minWidth: 'max-content' }}
                  onClick={() => onRowClick?.(item)}
                  onMouseEnter={() => setHoveredRowId(rowId)}
                  onMouseLeave={() => setHoveredRowId(null)}
                >
                  {columns.map((col, idx) => (
                    <div 
                      key={col.key}
                      className={cn(
                        "px-3 flex items-center h-full min-w-0",
                        idx === 0 && "pl-4",
                        col.align === 'center' && "justify-center",
                        col.align === 'right' && "justify-end",
                        CELL_STYLES,
                        "text-foreground"
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

      {/* Load More button */}
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
