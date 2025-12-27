/**
 * Strategic Backlog - Snapshots Section
 * Displays snapshots with linked themes and quarters - matching Themes section styling
 */
import { useState, useMemo } from 'react';
import { Search, ChevronUp, ChevronDown, Calendar, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ColumnSelector, useColumnVisibility, ColumnDefinition } from './ColumnSelector';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { StrategicTheme } from '@/types/strategicBacklog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Snapshot {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  start_date?: string | null;
  end_date?: string | null;
  theme_id?: string | null;
  created_at: string;
  updated_at: string;
}

interface SnapshotConfiguration {
  id: string;
  snapshot_id: string;
  themes: string[];
  quarters: string[];
  products: string[];
  org_structures: string[];
  members: string[];
  notify_on_activation: boolean;
  notify_on_changes: boolean;
}

const SNAPSHOT_COLUMNS: ColumnDefinition[] = [
  { key: 'name', label: 'Snapshot', defaultVisible: true, required: true },
  { key: 'themes', label: 'Themes', defaultVisible: true, width: 'w-52' },
  { key: 'quarters', label: 'Quarters', defaultVisible: true, width: 'w-48' },
  { key: 'status', label: 'Status', defaultVisible: true, width: 'w-28' },
  { key: 'period', label: 'Period', defaultVisible: true, width: 'w-40' },
  { key: 'updated', label: 'Updated', defaultVisible: true, width: 'w-36' },
];

const STORAGE_KEY = 'strategic_backlog_columns_snapshots';

type SortColumn = 'name' | 'themes' | 'quarters' | 'status' | 'period' | 'updated';

interface SnapshotsSectionProps {
  snapshots: Snapshot[];
  themes: StrategicTheme[];
  isLoading: boolean;
  onSelectItem: (item: Snapshot) => void;
  selectedItemId?: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onCreateSnapshot?: () => void;
}

// Sortable header with stacked chevrons - matching Themes section
function SortableHeader({ 
  label, 
  column, 
  currentSort, 
  direction, 
  onSort,
}: { 
  label: string; 
  column: SortColumn; 
  currentSort: SortColumn; 
  direction: 'asc' | 'desc'; 
  onSort: (col: SortColumn) => void;
}) {
  const isActive = currentSort === column;
  return (
    <button
      onClick={() => onSort(column)}
      className="group flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
    >
      <span className="text-[11px] font-bold uppercase tracking-wider">{label}</span>
      <span className={cn(
        "flex flex-col -space-y-1",
        isActive ? "text-primary" : "text-muted-foreground"
      )}>
        <ChevronUp className={cn("h-3 w-3", isActive && direction === 'asc' ? "opacity-100" : "opacity-40")} />
        <ChevronDown className={cn("h-3 w-3", isActive && direction === 'desc' ? "opacity-100" : "opacity-40")} />
      </span>
    </button>
  );
}

// Status Badge matching Themes section style
function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; bgColor: string }> = {
    ACTIVE: { label: 'ACTIVE', bgColor: '#2563eb' },
    DRAFT: { label: 'DRAFT', bgColor: '#9ca3af' },
    ARCHIVED: { label: 'ARCHIVED', bgColor: '#9ca3af' },
  };

  const config = statusConfig[status] || statusConfig.DRAFT;
  return (
    <span 
      className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider text-white"
      style={{ backgroundColor: config.bgColor }}
    >
      {config.label}
    </span>
  );
}

export function StrategicBacklogSnapshotsSection({
  snapshots,
  themes,
  isLoading,
  onSelectItem,
  selectedItemId,
  searchQuery,
  onSearchChange,
  onCreateSnapshot,
}: SnapshotsSectionProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [visibleColumns, setVisibleColumns] = useColumnVisibility(SNAPSHOT_COLUMNS, STORAGE_KEY);

  // Fetch all configurations for these snapshots
  const snapshotIds = useMemo(() => snapshots.map(s => s.id), [snapshots]);

  const { data: configurations = [] } = useQuery({
    queryKey: ['snapshot-configurations-bulk', snapshotIds],
    queryFn: async () => {
      if (snapshotIds.length === 0) return [];
      const { data, error } = await supabase
        .from('snapshot_configurations')
        .select('*')
        .in('snapshot_id', snapshotIds);
      if (error) throw error;
      return (data || []) as SnapshotConfiguration[];
    },
    enabled: snapshotIds.length > 0,
  });

  const configMap = useMemo(() => {
    const map: Record<string, SnapshotConfiguration> = {};
    configurations.forEach(c => { map[c.snapshot_id] = c; });
    return map;
  }, [configurations]);

  const themeMap = useMemo(() => {
    return themes.reduce((acc, theme) => {
      acc[theme.id] = theme.name;
      return acc;
    }, {} as Record<string, string>);
  }, [themes]);

  const filteredSnapshots = useMemo(() => {
    let result = snapshots;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(snapshot => {
        const config = configMap[snapshot.id];
        const themeNames = config?.themes?.map(tid => themeMap[tid] || '').join(' ') || '';
        const quarterStr = config?.quarters?.join(' ') || '';
        return (
          snapshot.name.toLowerCase().includes(query) ||
          snapshot.description?.toLowerCase().includes(query) ||
          themeNames.toLowerCase().includes(query) ||
          quarterStr.toLowerCase().includes(query)
        );
      });
    }

    result = [...result].sort((a, b) => {
      let aVal: any, bVal: any;

      switch (sortColumn) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'themes':
          aVal = configMap[a.id]?.themes?.length || 0;
          bVal = configMap[b.id]?.themes?.length || 0;
          break;
        case 'quarters':
          aVal = configMap[a.id]?.quarters?.length || 0;
          bVal = configMap[b.id]?.quarters?.length || 0;
          break;
        case 'status':
          aVal = a.status || '';
          bVal = b.status || '';
          break;
        case 'period':
          aVal = a.start_date || '';
          bVal = b.start_date || '';
          break;
        case 'updated':
          aVal = a.updated_at || '';
          bVal = b.updated_at || '';
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [snapshots, searchQuery, sortColumn, sortDirection, themeMap, configMap]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const isColumnVisible = (key: string) => visibleColumns.includes(key);

  // Grid columns matching Themes section pattern
  const gridCols = `1fr ${isColumnVisible('themes') ? '200px ' : ''}${isColumnVisible('quarters') ? '180px ' : ''}${isColumnVisible('status') ? '120px ' : ''}${isColumnVisible('period') ? '160px ' : ''}${isColumnVisible('updated') ? '140px' : ''}`.trim();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-muted-foreground">Loading snapshots...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Search + Column Selector */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search snapshots..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary transition-colors"
          />
        </div>
        <ColumnSelector
          columns={SNAPSHOT_COLUMNS}
          visibleColumns={visibleColumns}
          onVisibleColumnsChange={setVisibleColumns}
          storageKey={STORAGE_KEY}
        />
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {filteredSnapshots.length === 0 ? (
          <div className="bg-[hsl(var(--surface-0))] border border-[hsl(var(--border-default))] rounded-xl p-8 text-center">
            <div className="w-12 h-12 rounded-full mb-4 bg-[hsl(var(--surface-2))] flex items-center justify-center mx-auto">
              <Calendar className="h-6 w-6 text-[hsl(var(--text-muted))]" />
            </div>
            <p className="text-sm font-medium text-[hsl(var(--text-secondary))]">No snapshots found</p>
            <p className="text-xs text-[hsl(var(--text-muted))] mt-1">Create a snapshot to define a planning period</p>
            {onCreateSnapshot && (
              <Button 
                size="sm" 
                onClick={onCreateSnapshot}
                className="mt-4 bg-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary-hover))] text-white gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Create Snapshot
              </Button>
            )}
          </div>
        ) : (
          filteredSnapshots.map((snapshot) => {
            const isSelected = selectedItemId === snapshot.id;
            const config = configMap[snapshot.id];
            const themeNames = config?.themes?.map(tid => themeMap[tid]).filter(Boolean) || [];
            const quarters = config?.quarters || [];
            
            return (
              <button
                key={snapshot.id}
                onClick={() => onSelectItem(snapshot)}
                className={cn(
                  "w-full text-left bg-[hsl(var(--surface-0))] border border-[hsl(var(--border-default))] rounded-xl p-4 transition-all",
                  "hover:bg-[hsl(var(--surface-2))] hover:border-[hsl(var(--brand-primary))]",
                  isSelected && "border-[hsl(var(--brand-primary))] bg-[hsl(var(--surface-2))]"
                )}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="text-sm font-medium text-[hsl(var(--text-primary))] truncate">{snapshot.name}</span>
                  </div>
                  <StatusBadge status={snapshot.status} />
                </div>
                {themeNames.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {themeNames.slice(0, 2).map((name, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="text-[10px] px-1.5 py-0.5 bg-[#2563eb]/5 text-[#2563eb] border-[#2563eb]/20"
                      >
                        {name}
                      </Badge>
                    ))}
                    {themeNames.length > 2 && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                        +{themeNames.length - 2}
                      </Badge>
                    )}
                  </div>
                )}
                {quarters.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {quarters.slice(0, 3).map((q, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="text-[10px] px-1.5 py-0.5 bg-[#0d9488]/5 text-[#0d9488] border-[#0d9488]/20"
                      >
                        {q}
                      </Badge>
                    ))}
                    {quarters.length > 3 && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                        +{quarters.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  {snapshot.updated_at ? format(new Date(snapshot.updated_at), 'MMM d, yyyy') : ''}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Desktop Table View - Matching Themes section exactly */}
      <div className="hidden md:block bg-[hsl(var(--surface-0))] border border-[hsl(var(--border-default))] rounded-xl shadow-[var(--shadow-elev-1)] overflow-hidden">
        {/* Header */}
        <div 
          className="grid gap-4 px-5 py-3.5 bg-[hsl(var(--surface-1))] border-b border-[hsl(var(--border-default))]"
          style={{ gridTemplateColumns: gridCols }}
        >
          {isColumnVisible('name') && (
            <SortableHeader 
              label="Snapshot" 
              column="name" 
              currentSort={sortColumn} 
              direction={sortDirection} 
              onSort={handleSort} 
            />
          )}
          {isColumnVisible('themes') && (
            <SortableHeader 
              label="Themes" 
              column="themes" 
              currentSort={sortColumn} 
              direction={sortDirection} 
              onSort={handleSort} 
            />
          )}
          {isColumnVisible('quarters') && (
            <SortableHeader 
              label="Quarters" 
              column="quarters" 
              currentSort={sortColumn} 
              direction={sortDirection} 
              onSort={handleSort} 
            />
          )}
          {isColumnVisible('status') && (
            <SortableHeader 
              label="Status" 
              column="status" 
              currentSort={sortColumn} 
              direction={sortDirection} 
              onSort={handleSort} 
            />
          )}
          {isColumnVisible('period') && (
            <SortableHeader 
              label="Period" 
              column="period" 
              currentSort={sortColumn} 
              direction={sortDirection} 
              onSort={handleSort} 
            />
          )}
          {isColumnVisible('updated') && (
            <SortableHeader 
              label="Updated" 
              column="updated" 
              currentSort={sortColumn} 
              direction={sortDirection} 
              onSort={handleSort} 
            />
          )}
        </div>

        {/* Body */}
        <div className="divide-y divide-[hsl(var(--border-subtle))]">
          {filteredSnapshots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-12 h-12 rounded-full mb-4 bg-[hsl(var(--surface-2))] flex items-center justify-center">
                <Calendar className="h-6 w-6 text-[hsl(var(--text-muted))]" />
              </div>
              <p className="text-sm font-medium text-[hsl(var(--text-secondary))]">No snapshots found</p>
              <p className="text-xs text-[hsl(var(--text-muted))] mt-1">Create a snapshot to define a planning period</p>
              {onCreateSnapshot && (
                <Button 
                  size="sm" 
                  onClick={onCreateSnapshot}
                  className="mt-4 bg-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary-hover))] text-white gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  Create Snapshot
                </Button>
              )}
            </div>
          ) : (
            filteredSnapshots.map((snapshot, index) => {
              const isSelected = selectedItemId === snapshot.id;
              const config = configMap[snapshot.id];
              const themeNames = config?.themes?.map(tid => themeMap[tid]).filter(Boolean) || [];
              const quarters = config?.quarters || [];
              
              return (
                <button
                  key={snapshot.id}
                  onClick={() => onSelectItem(snapshot)}
                  className={cn(
                    "group w-full text-left grid gap-4 px-5 py-4 transition-all",
                    "border-l-2 border-l-transparent",
                    "hover:border-l-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--surface-2))]",
                    "focus:outline-none focus:bg-[hsl(var(--surface-2))] focus:border-l-[hsl(var(--brand-primary))]",
                    index % 2 === 0 ? "bg-[hsl(var(--surface-0))]" : "bg-[hsl(var(--surface-1))]",
                    isSelected && "border-l-[hsl(var(--brand-primary))] bg-[hsl(var(--surface-2))]"
                  )}
                  style={{ gridTemplateColumns: gridCols }}
                >
                  {isColumnVisible('name') && (
                    <div className="flex items-center gap-3 min-w-0">
                      <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="text-sm font-medium text-[hsl(var(--text-primary))] group-hover:text-[hsl(var(--brand-primary))] truncate transition-colors">
                        {snapshot.name}
                      </span>
                    </div>
                  )}
                  {isColumnVisible('themes') && (
                    <div className="flex items-center">
                      {themeNames.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {themeNames.slice(0, 2).map((name, idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="text-[10px] px-1.5 py-0.5 bg-[#2563eb]/5 text-[#2563eb] border-[#2563eb]/20"
                            >
                              {name}
                            </Badge>
                          ))}
                          {themeNames.length > 2 && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                              +{themeNames.length - 2}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </div>
                  )}
                  {isColumnVisible('quarters') && (
                    <div className="flex items-center">
                      {quarters.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {quarters.slice(0, 3).map((q, idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="text-[10px] px-1.5 py-0.5 bg-[#0d9488]/5 text-[#0d9488] border-[#0d9488]/20"
                            >
                              {q}
                            </Badge>
                          ))}
                          {quarters.length > 3 && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                              +{quarters.length - 3}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </div>
                  )}
                  {isColumnVisible('status') && (
                    <div className="flex items-center">
                      <StatusBadge status={snapshot.status} />
                    </div>
                  )}
                  {isColumnVisible('period') && (
                    <div className="flex items-center">
                      <span className="text-sm text-muted-foreground">
                        {snapshot.start_date && snapshot.end_date ? (
                          `${format(new Date(snapshot.start_date), 'MMM d')} - ${format(new Date(snapshot.end_date), 'MMM d, yyyy')}`
                        ) : (
                          '—'
                        )}
                      </span>
                    </div>
                  )}
                  {isColumnVisible('updated') && (
                    <div className="flex items-center">
                      <span className="text-sm text-muted-foreground">
                        {snapshot.updated_at ? format(new Date(snapshot.updated_at), 'MMM d, yyyy') : '—'}
                      </span>
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Footer: Row Count */}
      {filteredSnapshots.length > 0 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-muted-foreground">
            Showing {filteredSnapshots.length} of {snapshots.length} snapshots
          </p>
        </div>
      )}
    </div>
  );
}