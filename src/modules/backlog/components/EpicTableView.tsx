/**
 * EpicTableView - Industry Epic Table (Mirrors BacklogTableView exactly)
 * Enhanced data table with drag-and-drop, bulk actions, and keyboard navigation
 *
 * 2026-07-03 (CAT-JIRATABLE-MIGRATION): migrated from a hand-rolled <table> to
 * the canonical JiraTable component (src/components/shared/JiraTable). Row
 * drag-to-reorder now uses @atlaskit/pragmatic-drag-and-drop directly on each
 * row via JiraTable's `renderRowDragHandle` slot (replacing @hello-pangea/dnd,
 * which cannot wrap JiraTable's internally-owned <tbody>). All columns,
 * sorting, selection, and cell rendering behavior is preserved.
 */

import { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import {
  draggable,
  dropTargetForElements,
  monitorForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { disableNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/disable-native-drag-preview';
import { cn } from '@/lib/utils';
import { GripVertical, Pencil, Columns, Check } from '@/lib/atlaskit-icons';
import { Button } from '@/components/ui/button';
import { Lozenge } from '@/components/ads';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { catalystToast } from '@/lib/catalystToast';
import { useActiveEpicStatuses } from '@/hooks/useEpicStatuses';
import { getEpicStatusConfigFromList, getEpicStatusStyles } from '@/components/items/epics/drawer';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column, SortOrder } from '@/components/shared/JiraTable/types';

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

interface TableColumnDef {
  key: string;
  label: string;
  width?: string;
  visible?: boolean;
}

const DEFAULT_COLUMNS: TableColumnDef[] = [
  { key: 'id', label: 'ID', width: '110px', visible: true },
  { key: 'name', label: 'Summary', width: '320px', visible: true },
  { key: 'status', label: 'Status', width: '140px', visible: true },
  { key: 'theme', label: 'Theme', width: '160px', visible: true },
  { key: 'assignee', label: 'Assignee', width: '150px', visible: true },
  { key: 'quarter', label: 'Quarter', width: '120px', visible: true },
  { key: 'mvp', label: 'MVP', width: '70px', visible: true },
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

/**
 * EpicDragHandle — row-level drag-and-drop reorder handle.
 * Registers both draggable() (drag source, handle = this element) and
 * dropTargetForElements() on the closest <tr> using Pragmatic's imperative
 * API. Simple hover-reveal grip — no preview pill / menu (matches the
 * original hello-pangea/dnd behavior: drag row, drop, persist rank).
 */
function EpicDragHandle({
  row,
  onReorder,
}: {
  row: EpicRow;
  onReorder: (sourceId: string, targetId: string) => void;
}) {
  const gripRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDropTarget, setIsDropTarget] = useState(false);

  useEffect(() => {
    const grip = gripRef.current;
    if (!grip) return;
    const tr = grip.closest('tr');
    if (!tr) return;

    const cleanupDraggable = draggable({
      element: tr,
      dragHandle: grip,
      getInitialData: () => ({ epicRowId: row.id }),
      onGenerateDragPreview: ({ nativeSetDragImage }) => {
        disableNativeDragPreview({ nativeSetDragImage });
      },
      onDragStart: () => setIsDragging(true),
      onDrop: () => setIsDragging(false),
    });

    const cleanupDropTarget = dropTargetForElements({
      element: tr,
      getData: () => ({ epicRowId: row.id }),
      canDrop: ({ source }) => source.data.epicRowId !== row.id,
      onDragEnter: () => setIsDropTarget(true),
      onDragLeave: () => setIsDropTarget(false),
      onDrop: ({ source }) => {
        setIsDropTarget(false);
        const sourceId = source.data.epicRowId as string | undefined;
        if (sourceId && sourceId !== row.id) {
          onReorder(sourceId, row.id);
        }
      },
    });

    return () => {
      cleanupDraggable();
      cleanupDropTarget();
    };
  }, [row.id, onReorder]);

  return (
    <div
      ref={gripRef}
      className={cn(
        'jira-row-drag-handle flex items-center justify-center cursor-grab active:cursor-grabbing',
        isDropTarget && 'outline outline-2'
      )}
      style={{
        width: 18,
        height: 18,
        outlineColor: isDropTarget ? 'var(--ds-border-selected)' : undefined,
        opacity: isDragging ? 0.4 : undefined,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <GripVertical className="h-4 w-4 opacity-50 hover:opacity-100" />
    </div>
  );
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
  const [sortKey, setSortKey] = useState<string>('rank');
  const [sortOrder, setSortOrder] = useState<SortOrder>('ASC');

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

  // Storage key for column persistence
  const columnsStorageKey = `epic:program:${programId || 'default'}:columns`;

  // Column visibility state with persistence
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(columnsStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return new Set(parsed);
      }
    } catch {
      // Fallback to defaults
    }
    return new Set(DEFAULT_COLUMNS.filter(c => c.visible !== false).map(c => c.key));
  });

  // Persist column visibility changes
  useEffect(() => {
    try {
      localStorage.setItem(columnsStorageKey, JSON.stringify(Array.from(visibleColumns)));
    } catch {
      // Ignore storage errors
    }
  }, [visibleColumns, columnsStorageKey]);

  // Column toggle handlers
  const toggleColumn = (columnKey: string) => {
    setVisibleColumns(prev => {
      const next = new Set(prev);
      if (next.has(columnKey)) {
        // Don't allow hiding the ID column
        if (columnKey !== 'id') {
          next.delete(columnKey);
        }
      } else {
        next.add(columnKey);
      }
      return next;
    });
  };

  const showAllColumns = () => {
    setVisibleColumns(new Set(DEFAULT_COLUMNS.map(c => c.key)));
  };

  const hideAllColumns = () => {
    setVisibleColumns(new Set(['id', 'name']));
  };

  // Selection helpers
  const selectionSet = useMemo(() => new Set(selectedItems), [selectedItems]);

  const handleSelectionChange = useCallback((next: Set<string>) => {
    if (!onItemSelect) return;
    // Diff against current selection and fire onItemSelect per changed row —
    // preserves the parent's per-item selection contract.
    for (const id of next) {
      if (!selectionSet.has(id)) onItemSelect(id, true);
    }
    for (const id of selectionSet) {
      if (!next.has(id)) onItemSelect(id, false);
    }
  }, [onItemSelect, selectionSet]);

  // Sort data
  const sortedData = useMemo(() => {
    const sorted = [...data];
    sorted.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortKey) {
        case 'rank': aVal = a.rank ?? a.globalRank ?? 999; bVal = b.rank ?? b.globalRank ?? 999; break;
        case 'name': aVal = a.name || ''; bVal = b.name || ''; break;
        case 'status': aVal = a.status || a.processStep || ''; bVal = b.status || b.processStep || ''; break;
        case 'theme': aVal = a.themeName || ''; bVal = b.themeName || ''; break;
        case 'assignee': aVal = a.assigneeName || ''; bVal = b.assigneeName || ''; break;
        case 'quarter': aVal = a.quarters?.[0] || ''; bVal = b.quarters?.[0] || ''; break;
        case 'mvp': aVal = a.mvp ? 1 : 0; bVal = b.mvp ? 1 : 0; break;
        default: aVal = a.rank ?? 999; bVal = b.rank ?? 999;
      }
      if (sortOrder === 'ASC') return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });
    return sorted;
  }, [data, sortKey, sortOrder]);

  const handleSortChange = useCallback((key: string, order: SortOrder) => {
    setSortKey(key);
    setSortOrder(order);
  }, []);

  // Persist a full reordering (drag source dropped onto target row).
  const persistReorder = useCallback(async (sourceId: string, targetId: string) => {
    const sourceIndex = sortedData.findIndex(d => d.id === sourceId);
    const targetIndex = sortedData.findIndex(d => d.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return;

    const reordered = Array.from(sortedData);
    const [removed] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, removed);

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
      catalystToast.success('Rank order saved');
    } catch (error) {
      console.error('Failed to save rank order:', error);
      catalystToast.error('Failed to save rank order');
    }
  }, [sortedData, queryClient]);

  // Build epic key with program acronym
  const buildEpicKey = useCallback((row: EpicRow): string => {
    if (row.epic_key) return row.epic_key;

    const acronym = program?.key || generateProgramAcronym(program?.name || '');
    const num = row.rank ?? row.globalRank ?? 1;
    return `${acronym}-${String(num).padStart(3, '0')}`;
  }, [program]);

  // Get status display info
  const getStatusInfo = useCallback((status?: string) => {
    if (!status) return { label: '—', color: null };
    return getEpicStatusConfigFromList(status, epicStatuses);
  }, [epicStatuses]);

  const columns: Column<EpicRow>[] = useMemo(() => {
    const all: Column<EpicRow>[] = [
      {
        id: 'id',
        label: 'ID',
        width: 9,
        sortable: true,
        alwaysVisible: true,
        cell: ({ row }) => (
          <span
            className="font-mono text-xs font-semibold cursor-pointer hover:underline"
            style={{ color: 'var(--ds-text-brand)' }}
            onClick={(e) => { e.stopPropagation(); onRowClick(row.id); }}
          >
            {buildEpicKey(row)}
          </span>
        ),
      },
      {
        id: 'name',
        label: 'Summary',
        flex: true,
        sortable: true,
        cell: ({ row }) => (
          <span className="text-sm font-medium truncate block max-w-full" style={{ color: 'var(--ds-text)' }}>
            {row.name || '—'}
          </span>
        ),
      },
      {
        id: 'status',
        label: 'Status',
        width: 12,
        sortable: true,
        cell: ({ row }) => {
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
        },
      },
      {
        id: 'theme',
        label: 'Theme',
        width: 13,
        sortable: true,
        cell: ({ row }) => (
          <span className="text-sm truncate block" style={{ color: 'var(--ds-text-subtle)' }}>
            {row.themeName || '—'}
          </span>
        ),
      },
      {
        id: 'assignee',
        label: 'Assignee',
        width: 12,
        sortable: true,
        cell: ({ row }) => (
          <span className="text-sm truncate block" style={{ color: 'var(--ds-text-subtle)' }}>
            {row.assigneeName || '—'}
          </span>
        ),
      },
      {
        id: 'quarter',
        label: 'Quarter',
        width: 10,
        sortable: true,
        cell: ({ row }) => {
          if (!row.quarters || row.quarters.length === 0) {
            return <span className="text-sm" style={{ color: 'var(--ds-text-subtle)' }}>—</span>;
          }
          return (
            <div className="flex items-center gap-1">
              {row.quarters.slice(0, 2).map((q, i) => (
                <Lozenge key={i} appearance="default">{q}</Lozenge>
              ))}
            </div>
          );
        },
      },
      {
        id: 'mvp',
        label: 'MVP',
        width: 6,
        sortable: true,
        align: 'center',
        cell: ({ row }) => (
          <span className="text-sm text-center block">{row.mvp ? 'Yes' : 'No'}</span>
        ),
      },
      {
        id: '__actions',
        label: '',
        width: 6,
        alwaysVisible: true,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onRowClick(row.id)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>
        ),
      },
    ];
    return all.filter(c => c.alwaysVisible || visibleColumns.has(c.id));
  }, [visibleColumns, onRowClick, buildEpicKey, getStatusInfo]);

  const emptyView = (
    <div className="text-center py-20" style={{ color: 'var(--ds-text-subtle)' }}>
      No epics found
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Table Container with Industry styling */}
      <div
        className="flex flex-col flex-1 rounded-[14px] border overflow-hidden"
        style={{
          background: 'var(--ds-surface)',
          borderColor: 'var(--ds-border)',
          boxShadow: 'var(--ds-shadow-raised)',
        }}
      >
        {/* Header Bar */}
        <div
          className="flex items-center justify-between px-4 py-2.5 border-b"
          style={{ borderColor: 'var(--ds-border)', background: 'var(--ds-surface-sunken)' }}
        >
          <div className="flex items-center gap-3">
            <span className="text-sm" style={{ color: 'var(--ds-text-subtle)' }}>
              <strong className="font-semibold" style={{ color: 'var(--ds-text)' }}>{sortedData.length}</strong> {sortedData.length === 1 ? 'epic' : 'epics'}
            </span>
          </div>

          {/* Columns Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 gap-1.5 text-xs font-medium"
                style={{
                  backgroundColor: 'var(--ds-surface)',
                  borderColor: 'var(--ds-border)',
                  color: 'var(--ds-text)',
                }}
              >
                <Columns className="h-3.5 w-3.5" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-xs font-semibold">Toggle Columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {DEFAULT_COLUMNS.filter(col => col.key !== 'id').map(column => (
                <DropdownMenuItem
                  key={column.key}
                  onClick={() => toggleColumn(column.key)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <div
                    className="w-4 h-4 rounded border flex items-center justify-center"
                    style={{
                      background: visibleColumns.has(column.key) ? 'var(--ds-background-brand-bold)' : undefined,
                      borderColor: visibleColumns.has(column.key) ? 'var(--ds-background-brand-bold)' : 'var(--ds-border)',
                    }}
                  >
                    {visibleColumns.has(column.key) && <Check className="w-3 h-3" style={{ color: 'var(--ds-text-inverse)' }} />}
                  </div>
                  <span className="text-sm">{column.label || column.key}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={showAllColumns} className="text-xs" style={{ color: 'var(--ds-text-subtle)' }}>
                Show All
              </DropdownMenuItem>
              <DropdownMenuItem onClick={hideAllColumns} className="text-xs" style={{ color: 'var(--ds-text-subtle)' }}>
                Hide All
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <JiraTable<EpicRow>
            columns={columns}
            data={sortedData}
            getRowId={(row) => row.id}
            onRowClick={(row) => onRowClick(row.id)}
            selectable
            selection={selectionSet}
            onSelectionChange={handleSelectionChange}
            sortKey={sortKey}
            sortOrder={sortOrder}
            onSortChange={handleSortChange}
            renderRowDragHandle={(row) => (
              <EpicDragHandle row={row} onReorder={persistReorder} />
            )}
            showRowCount={false}
            density="compact"
            ariaLabel="Epics"
            isLoading={isLoading}
            emptyView={emptyView}
          />
        </div>
      </div>
    </div>
  );
}
