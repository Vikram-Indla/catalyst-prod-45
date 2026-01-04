/**
 * Prompt 2: Virtualized Cards View
 * Only renders visible cards for 200+ resources
 */

import { useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';
import { getAllocationTheme, getAssignmentTheme, CATALYST_V5 } from '@/lib/catalyst-colors';
import { Button } from '@/components/ui/button';

interface ResourceMetric {
  id: string;
  name: string;
  role?: string;
  department?: string;
  allocation?: number;
  assignmentName?: string;
  avatarUrl?: string;
}

interface VirtualizedCardsViewProps {
  resources: ResourceMetric[];
  columnsPerRow?: number;
  onResourceClick?: (resourceId: string) => void;
  onEditResource?: (resource: ResourceMetric) => void;
  onDeleteResource?: (resource: ResourceMetric) => void;
  onOpenAllocationModal?: (resourceId: string) => void;
  className?: string;
}

export function VirtualizedCardsView({
  resources,
  columnsPerRow = 5,
  onResourceClick,
  onEditResource,
  onOpenAllocationModal,
  className
}: VirtualizedCardsViewProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const cardHeight = 140;
  const gap = 16;

  // Group resources into rows
  const rows = useMemo(() => {
    const result: ResourceMetric[][] = [];
    for (let i = 0; i < resources.length; i += columnsPerRow) {
      result.push(resources.slice(i, i + columnsPerRow));
    }
    return result;
  }, [resources, columnsPerRow]);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => cardHeight + gap,
    overscan: 3,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  return (
    <div className={cn("h-full", className)}>
      {/* Performance indicator */}
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-xs text-muted-foreground">
          Showing {resources.length} resources (virtualized)
        </span>
        <span className="text-xs text-teal-600 dark:text-teal-400">
          ⚡ {Math.min(virtualItems.length * columnsPerRow, resources.length)} rendered
        </span>
      </div>

      <div
        ref={parentRef}
        className="h-[calc(100%-32px)] overflow-auto rounded-lg"
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualItems.map((virtualRow) => (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div
                className="grid gap-4 px-1"
                style={{
                  gridTemplateColumns: `repeat(${columnsPerRow}, 1fr)`,
                }}
              >
                {rows[virtualRow.index].map((resource) => (
                  <VirtualizedCard
                    key={resource.id}
                    resource={resource}
                    onClick={() => onResourceClick?.(resource.id)}
                    onEdit={() => onEditResource?.(resource)}
                    onBook={() => onOpenAllocationModal?.(resource.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Inline card component for virtualization (lightweight)
function VirtualizedCard({
  resource,
  onClick,
  onEdit,
  onBook
}: {
  resource: ResourceMetric;
  onClick?: () => void;
  onEdit?: () => void;
  onBook?: () => void;
}) {
  const totalAllocation = resource.allocation ?? 0;
  const isOverAllocated = totalAllocation > 100;
  const theme = getAssignmentTheme(resource.assignmentName);
  const alloc = getAllocationTheme(totalAllocation);
  const initials = resource.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div 
      className={cn(
        "relative border rounded-lg p-3 cursor-pointer transition-all group",
        isOverAllocated 
          ? "bg-red-50/40 dark:bg-red-950/20 border-red-300 dark:border-red-800" 
          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md"
      )}
      style={{ 
        borderLeftWidth: '4px', 
        borderLeftColor: isOverAllocated ? CATALYST_V5.error.hex : alloc.bar,
      }}
      onClick={onEdit}
    >
      {isOverAllocated && (
        <div 
          className="absolute -top-1 -right-1 w-3 h-3 rounded-full animate-pulse flex items-center justify-center"
          style={{ backgroundColor: CATALYST_V5.error.hex }}
        >
          <span className="text-[7px] text-white font-bold">!</span>
        </div>
      )}

      <div className="flex items-center gap-2.5 mb-2">
        <div 
          className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
          style={{ backgroundColor: isOverAllocated ? CATALYST_V5.error.hex : theme.accent }}
          onClick={(e) => { e.stopPropagation(); onClick?.(); }}
        >
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{resource.name}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{resource.role || 'Team Member'}</p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {isOverAllocated && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
          <span 
            className={cn(
              "text-xs font-bold px-2 py-0.5 rounded",
              isOverAllocated && "bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400"
            )}
            style={!isOverAllocated ? { backgroundColor: alloc.bg, color: alloc.text } : undefined}
          >
            {totalAllocation}%
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">{resource.department}</span>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-[10px] h-5 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => { e.stopPropagation(); onBook?.(); }}
        >
          Book
        </Button>
      </div>
    </div>
  );
}
