/**
 * EpicTableView - Industry Epic Table (Mirrors BacklogTableView exactly)
 * Enhanced data table with drag-and-drop, bulk actions, and keyboard navigation
 */

import { useMemo, useCallback, useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronUp, ChevronDown, GripVertical, Pencil, MoreVertical } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useActiveEpicStatuses } from '@/hooks/useEpicStatuses';
import { getEpicStatusConfigFromList, getEpicStatusStyles } from '@/components/items/epics/drawer';

interface EpicRow {
  id: string;
  epic_key?: string;
  name?: string;
  status?: string;
  processStep?: string;
  themeName?: string | null;
  theme_id?: string | null;
  assigneeName?: string | null;
  assignee_id?: string | null;
  quarters?: string[] | null;
  mvp?: boolean;
  rank?: number | null;
  globalRank?: number | null;
  created_at?: string | null;
}

interface EpicTableViewProps {
  data: EpicRow[];
  isLoading?: boolean;
  onRowClick: (epicId: string) => void;
  programId?: string | null;
  selectedItems?: string[];
  onItemSelect?: (id: string, selected: boolean) => void;
}

interface TableColumn {
  key: string;
  label: string;
  width?: string;
  minWidth?: string;
  sortable?: boolean;
  visible?: boolean;
}

const DEFAULT_COLUMNS: TableColumn[] = [
  { key: 'checkbox', label: '', width: '48px', visible: true },
  { key: 'id', label: 'ID', width: '110px', sortable: true, visible: true },
  { key: 'name', label: 'Summary', width: '320px', sortable: true, visible: true },
  { key: 'status', label: 'Status', width: '140px', sortable: true, visible: true },
  { key: 'theme', label: 'Theme', width: '160px', sortable: true, visible: true },
  { key: 'assignee', label: 'Assignee', width: '150px', sortable: true, visible: true },
  { key: 'quarter', label: 'Quarter', width: '120px', sortable: true, visible: true },
  { key: 'mvp', label: 'MVP', width: '70px', sortable: true, visible: true },
];

/**
 * Generate 3-letter acronym from program name
 * e.g., "Digital Transformation Program" -> "DTP"
 */
function generateProgramAcronym(programName: string): string {
  if (!programName) return 'EPC';
  
  const words = programName
    .replace(/[^a-zA-Z\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 0);
  
  if (words.length === 0) return 'EPC';
  
  if (words.length === 1) {
    return words[0].slice(0, 3).toUpperCase();
  }
  
  // Take first letter of first 3 significant words
  const significantWords = words.filter(w => 
    !['the', 'a', 'an', 'and', 'or', 'of', 'for', 'to', 'in', 'on'].includes(w.toLowerCase())
  );
  
  if (significantWords.length >= 3) {
    return significantWords.slice(0, 3).map(w => w[0].toUpperCase()).join('');
  }
  
  return words.slice(0, 3).map(w => w[0].toUpperCase()).join('');
}

export function EpicTableView({ 
  data, 
  isLoading, 
  onRowClick, 
  programId,
  selectedItems = [],
  onItemSelect,
}: EpicTableViewProps) {
  const queryClient = useQueryClient();
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ column: string; direction: 'asc' | 'desc' }>({ 
    column: 'rank', 
    direction: 'asc' 
  });
  
  // Fetch epic statuses for proper label/color rendering
  const { data: epicStatuses = [] } = useActiveEpicStatuses();
  
  // Fetch program info for acronym generation
  const { data: program } = useQuery({
    queryKey: ['program-for-table', programId],
    queryFn: async () => {
      if (!programId) return null;
      const { data, error } = await supabase
        .from('programs')
        .select('id, key, name')
        .eq('id', programId)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!programId,
  });

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
    return new Set(DEFAULT_COLUMNS.filter(c => c.visible !== false).map(c => c.key));
  });

  // Selection helpers
  const selectedSet = new Set(selectedItems);
  const isAllSelected = data.length > 0 && data.every(d => selectedSet.has(d.id));
  const isIndeterminate = data.some(d => selectedSet.has(d.id)) && !isAllSelected;

  const toggleSelection = (id: string) => {
    if (onItemSelect) {
      onItemSelect(id, !selectedSet.has(id));
    }
  };

  const toggleAll = () => {
    if (isAllSelected) {
      // Deselect all
      data.forEach(d => onItemSelect?.(d.id, false));
    } else {
      // Select all
      data.forEach(d => onItemSelect?.(d.id, true));
    }
  };

  const handleSort = (column: string) => {
    setSortConfig(prev => ({
      column,
      direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Sort data
  const sortedData = useMemo(() => {
    const sorted = [...data];
    sorted.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortConfig.column) {
        case 'rank': aVal = a.rank ?? a.globalRank ?? 999; bVal = b.rank ?? b.globalRank ?? 999; break;
        case 'name': aVal = a.name || ''; bVal = b.name || ''; break;
        case 'status': aVal = a.status || a.processStep || ''; bVal = b.status || b.processStep || ''; break;
        case 'theme': aVal = a.themeName || ''; bVal = b.themeName || ''; break;
        case 'assignee': aVal = a.assigneeName || ''; bVal = b.assigneeName || ''; break;
        case 'quarter': aVal = a.quarters?.[0] || ''; bVal = b.quarters?.[0] || ''; break;
        case 'mvp': aVal = a.mvp ? 1 : 0; bVal = b.mvp ? 1 : 0; break;
        default: aVal = a.rank ?? 999; bVal = b.rank ?? 999;
      }
      if (sortConfig.direction === 'asc') return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });
    return sorted;
  }, [data, sortConfig]);

  // Handle drag end for reordering
  const handleDragEnd = useCallback(async (result: DropResult) => {
    const { destination, source } = result;
    if (!destination || destination.index === source.index) return;

    const reordered = Array.from(sortedData);
    const [removed] = reordered.splice(source.index, 1);
    reordered.splice(destination.index, 0, removed);

    const updates = reordered.map((item, index) => ({
      id: item.id,
      rank: index + 1,
    }));

    try {
      const updatePromises = updates.map((item) =>
        supabase
          .from('epics')
          .update({ global_rank: item.rank })
          .eq('id', item.id)
      );

      await Promise.all(updatePromises);
      queryClient.invalidateQueries({ queryKey: ['backlog-items'] });
      toast.success('Rank order saved');
    } catch (error) {
      console.error('Failed to save rank order:', error);
      toast.error('Failed to save rank order');
    }
  }, [sortedData, queryClient]);

  // Build epic key with program acronym
  const buildEpicKey = (row: EpicRow): string => {
    if (row.epic_key) return row.epic_key;
    
    const acronym = program?.key || generateProgramAcronym(program?.name || '');
    const num = row.rank ?? row.globalRank ?? 1;
    return `${acronym}-${String(num).padStart(3, '0')}`;
  };

  // Get status display info
  const getStatusInfo = (status?: string) => {
    if (!status) return { label: '—', color: null };
    return getEpicStatusConfigFromList(status, epicStatuses);
  };

  // Filter columns based on visibility
  const displayColumns = useMemo(() => {
    return DEFAULT_COLUMNS.filter(c => visibleColumns.has(c.key));
  }, [visibleColumns]);

  const renderSortIcon = (column: TableColumn) => {
    if (!column.sortable) return null;
    const isActive = sortConfig.column === column.key;
    return (
      <span className={cn("ml-1", isActive ? "text-[var(--brand-gold)]" : "text-muted-foreground/40")}>
        {isActive && sortConfig.direction === 'asc' ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )}
      </span>
    );
  };

  const renderCellContent = (column: TableColumn, row: EpicRow) => {
    switch (column.key) {
      case 'checkbox':
        return (
          <Checkbox
            checked={selectedSet.has(row.id)}
            onCheckedChange={() => toggleSelection(row.id)}
            className="data-[state=checked]:bg-[var(--brand-gold)] data-[state=checked]:border-[var(--brand-gold)]"
          />
        );
      case 'id':
        return (
          <span 
            className="font-mono text-xs font-semibold cursor-pointer hover:underline"
            style={{ color: 'hsl(var(--secondary-bronze))' }}
            onClick={(e) => { e.stopPropagation(); onRowClick(row.id); }}
          >
            {buildEpicKey(row)}
          </span>
        );
      case 'name':
        return (
          <span className="text-sm font-medium truncate block max-w-full" style={{ color: 'var(--text-1)' }}>
            {row.name || '—'}
          </span>
        );
      case 'status':
        const statusInfo = getStatusInfo(row.status ?? row.processStep);
        const styles = getEpicStatusStyles(statusInfo.color);
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide"
            style={{
              background: styles.bg,
              color: styles.text,
              border: `1px solid ${styles.border}`,
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: styles.dot }}
            />
            {statusInfo.label}
          </span>
        );
      case 'theme':
        return <span className="text-sm text-muted-foreground truncate block">{row.themeName || '—'}</span>;
      case 'assignee':
        return <span className="text-sm text-muted-foreground truncate block">{row.assigneeName || '—'}</span>;
      case 'quarter':
        if (!row.quarters || row.quarters.length === 0) return <span className="text-sm text-muted-foreground">—</span>;
        return (
          <div className="flex items-center gap-1">
            {row.quarters.slice(0, 2).map((q, i) => (
              <Badge 
                key={i} 
                variant="outline" 
                className="text-[10px] px-1.5 py-0 h-5 border-brand-primary/50 text-brand-primary"
              >
                {q}
              </Badge>
            ))}
          </div>
        );
      case 'mvp':
        return (
          <span className="text-sm text-center block">{row.mvp ? 'Yes' : 'No'}</span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Table Container with Industry styling */}
      <div 
        className={cn(
          "flex flex-col flex-1 rounded-[14px] border overflow-hidden",
          "bg-[var(--industry-bg-card)] border-[var(--industry-border-default)]",
          "dark:bg-[#171717] dark:border-[#404040]"
        )}
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
      >
        {/* Header Bar */}
        <div className={cn(
          "flex items-center justify-between px-4 py-2.5 border-b",
          "border-[var(--industry-border-default)] bg-[var(--industry-bg-subtle)]",
          "dark:border-[#404040] dark:bg-[#0f0f0f]"
        )}>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--industry-text-secondary)] dark:text-gray-300">
              <strong className="font-semibold text-[var(--industry-text-primary)] dark:text-gray-100">{sortedData.length}</strong> {sortedData.length === 1 ? 'epic' : 'epics'}
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <DragDropContext onDragEnd={handleDragEnd}>
            <table className="w-full min-w-[900px] border-collapse text-[13px]">
              <thead className={cn(
                "sticky top-0 z-10",
                "bg-[var(--industry-bg-card)] dark:bg-[#0f0f0f]"
              )}>
                <tr>
                  <th className={cn(
                    "w-8 px-2 py-3.5 text-left border-b",
                    "border-[var(--industry-border-default)] dark:border-[#404040]"
                  )} />
                  {displayColumns.map(column => {
                    const isActive = sortConfig.column === column.key;
                    return (
                      <th
                        key={column.key}
                        className={cn(
                          "text-left border-b whitespace-nowrap px-4 py-3.5",
                          "text-[11px] uppercase font-semibold tracking-[0.5px]",
                          "border-[var(--industry-border-default)] dark:border-[#404040]",
                          isActive 
                            ? "text-[var(--brand-gold)] dark:text-[#d4a855]" 
                            : "text-[var(--industry-text-muted)] dark:text-gray-400",
                          column.sortable && "cursor-pointer hover:text-[var(--industry-text-secondary)] dark:hover:text-gray-300"
                        )}
                        style={{ width: column.width, minWidth: column.minWidth }}
                        onClick={() => column.sortable && handleSort(column.key)}
                      >
                        {column.key === 'checkbox' ? (
                          <Checkbox
                            checked={isAllSelected || (isIndeterminate ? 'indeterminate' : false)}
                            onCheckedChange={() => toggleAll()}
                            className={cn(
                              "data-[state=checked]:bg-[var(--brand-gold)] data-[state=checked]:border-[var(--brand-gold)]",
                              "border-gray-300 dark:border-gray-500 dark:bg-[#262626]"
                            )}
                          />
                        ) : (
                          <div className="flex items-center">
                            <span className={cn(isActive && "border-b-2 border-[var(--brand-gold)] dark:border-[#d4a855] pb-0.5")}>
                              {column.label}
                            </span>
                            {renderSortIcon(column)}
                          </div>
                        )}
                      </th>
                    );
                  })}
                  {/* Actions column header */}
                  <th className={cn(
                    "w-[80px] text-right px-4 py-3.5 border-b",
                    "border-[var(--industry-border-default)] dark:border-[#404040]"
                  )} />
                </tr>
              </thead>
              <Droppable droppableId="epic-table">
                {(provided) => (
                  <tbody 
                    ref={provided.innerRef} 
                    {...provided.droppableProps}
                    className="divide-y divide-gray-100 dark:divide-[#404040]"
                  >
                    {isLoading ? (
                      Array.from({ length: 6 }).map((_, i) => (
                        <tr key={i} className="border-b border-[var(--industry-border-subtle)] dark:border-[#404040]">
                          <td className="px-2 py-3.5" />
                          {displayColumns.map(col => (
                            <td key={col.key} className="px-4 py-3.5">
                              <Skeleton className="h-5 w-full" />
                            </td>
                          ))}
                          <td className="px-4 py-3.5" />
                        </tr>
                      ))
                    ) : sortedData.length === 0 ? (
                      <tr>
                        <td colSpan={displayColumns.length + 2} className="text-center py-20 text-[var(--industry-text-muted)] dark:text-gray-400">
                          No epics found
                        </td>
                      </tr>
                    ) : (
                      sortedData.map((row, index) => (
                        <Draggable key={row.id} draggableId={row.id} index={index}>
                          {(provided, snapshot) => (
                            <tr
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={cn(
                                "transition-colors cursor-pointer",
                                "hover:bg-[var(--industry-bg-hover)] dark:hover:bg-[#262626]/50",
                                selectedSet.has(row.id) && "bg-[var(--brand-gold)]/[0.08] dark:bg-[#c69c6d]/[0.15]",
                                snapshot.isDragging && "bg-muted dark:bg-[#333333] shadow-lg"
                              )}
                              onClick={() => onRowClick(row.id)}
                              onMouseEnter={() => setHoveredRowId(row.id)}
                              onMouseLeave={() => setHoveredRowId(null)}
                            >
                              {/* Drag handle */}
                              <td
                                {...provided.dragHandleProps}
                                className="px-2 py-3.5 cursor-grab active:cursor-grabbing"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <GripVertical 
                                  className={cn(
                                    "h-4 w-4 transition-opacity",
                                    hoveredRowId === row.id ? "opacity-50 hover:opacity-100" : "opacity-0"
                                  )} 
                                />
                              </td>
                              
                              {displayColumns.map(column => (
                                <td
                                  key={column.key}
                                  className="px-4 py-3.5"
                                  onClick={column.key === 'checkbox' ? (e) => e.stopPropagation() : undefined}
                                >
                                  {renderCellContent(column, row)}
                                </td>
                              ))}
                              
                              {/* Row actions */}
                              <td 
                                className="px-4 py-3.5 text-right" 
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className={cn(
                                  "flex items-center justify-end gap-1 transition-opacity",
                                  hoveredRowId === row.id ? "opacity-100" : "opacity-0"
                                )}>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => onRowClick(row.id)}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Draggable>
                      ))
                    )}
                    {provided.placeholder}
                  </tbody>
                )}
              </Droppable>
            </table>
          </DragDropContext>
        </div>
      </div>
    </div>
  );
}
