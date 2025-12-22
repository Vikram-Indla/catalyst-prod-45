/**
 * BacklogTableView - Full-featured data table for business requests
 */

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronUp, ChevronDown, MoreHorizontal } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusCell, ScoreCell, RankCell, IdCell, OwnerCell } from './cells';
import { useTableSelection } from './useTableSelection';
import { useTableSort } from './useTableSort';
import { DEFAULT_COLUMNS, TableColumn, SortConfig } from './types';

interface BusinessRequestRow {
  id: string;
  request_key?: string;
  title?: string;
  process_step?: string;
  priority_tier?: string;
  business_score?: number | null;
  rank?: number | null;
  requestor?: string | null;
  planned_quarter?: string[] | null;
}

interface BacklogTableViewProps {
  data: BusinessRequestRow[];
  isLoading?: boolean;
  onRowClick: (requestId: string) => void;
}

export function BacklogTableView({ data, isLoading, onRowClick }: BacklogTableViewProps) {
  const { 
    selectedIds, 
    isAllSelected, 
    isIndeterminate, 
    toggleSelection, 
    toggleAll,
    clearSelection 
  } = useTableSelection(data.map(d => ({ id: d.id })));
  
  const { sortConfig, handleSort } = useTableSort({ column: 'rank', direction: 'asc' });

  // Sort data
  const sortedData = useMemo(() => {
    const sorted = [...data];
    sorted.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortConfig.column) {
        case 'rank': aVal = a.rank || 999; bVal = b.rank || 999; break;
        case 'score': aVal = a.business_score || 0; bVal = b.business_score || 0; break;
        case 'title': aVal = a.title || ''; bVal = b.title || ''; break;
        case 'status': aVal = a.process_step || ''; bVal = b.process_step || ''; break;
        default: aVal = a.rank || 999; bVal = b.rank || 999;
      }
      if (sortConfig.direction === 'asc') return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });
    return sorted;
  }, [data, sortConfig]);

  const columns = DEFAULT_COLUMNS.filter(c => c.key !== 'actions');

  const renderSortIcon = (column: TableColumn) => {
    if (!column.sortable) return null;
    const isActive = sortConfig.column === column.key;
    return (
      <span className={cn("ml-1", isActive ? "text-foreground" : "text-muted-foreground/50")}>
        {isActive && sortConfig.direction === 'asc' ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )}
      </span>
    );
  };

  return (
    <div className="flex flex-col h-full bg-background rounded-lg border border-border overflow-hidden">
      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 bg-[hsl(var(--brand-primary))]/5 border-b border-border">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <button onClick={clearSelection} className="text-sm text-muted-foreground hover:text-foreground">
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full min-w-[900px] border-collapse text-[13px]">
          <thead className="sticky top-0 z-10 bg-muted/50">
            <tr>
              {columns.map(column => (
                <th
                  key={column.key}
                  className={cn(
                    "text-left font-semibold text-muted-foreground border-b border-border",
                    "whitespace-nowrap px-3 py-2.5",
                    column.sortable && "cursor-pointer hover:text-foreground"
                  )}
                  style={{ width: column.width, minWidth: column.minWidth }}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  {column.key === 'checkbox' ? (
                    <Checkbox
                      checked={isAllSelected || (isIndeterminate ? 'indeterminate' : false)}
                      onCheckedChange={() => toggleAll()}
                    />
                  ) : (
                    <div className="flex items-center">
                      {column.label}
                      {renderSortIcon(column)}
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border/50">
                  {columns.map(col => (
                    <td key={col.key} className="px-3 py-3">
                      <Skeleton className="h-5 w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : sortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-16 text-muted-foreground">
                  No requests found
                </td>
              </tr>
            ) : (
              sortedData.map(row => (
                <tr 
                  key={row.id} 
                  className={cn(
                    "border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors",
                    selectedIds.has(row.id) && "bg-[hsl(var(--brand-primary))]/5"
                  )}
                  onClick={() => onRowClick(row.id)}
                >
                  <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(row.id)}
                      onCheckedChange={() => toggleSelection(row.id)}
                    />
                  </td>
                  <td className="px-3 py-3"><RankCell rank={row.rank ?? null} /></td>
                  <td className="px-3 py-3">
                    <IdCell requestKey={row.request_key || row.id.slice(0, 8)} onClick={(e) => { e.stopPropagation(); onRowClick(row.id); }} />
                  </td>
                  <td className="px-3 py-3 font-medium text-foreground max-w-[300px] truncate">{row.title || '—'}</td>
                  <td className="px-3 py-3"><StatusCell status={row.process_step || 'new_request'} /></td>
                  <td className="px-3 py-3 text-muted-foreground">{row.priority_tier || '—'}</td>
                  <td className="px-3 py-3"><ScoreCell score={row.business_score ?? null} /></td>
                  <td className="px-3 py-3"><OwnerCell name={row.requestor || null} /></td>
                  <td className="px-3 py-3 text-muted-foreground">{row.planned_quarter?.[0] || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/30">
        <span className="text-sm text-muted-foreground">{sortedData.length} items</span>
      </div>
    </div>
  );
}
