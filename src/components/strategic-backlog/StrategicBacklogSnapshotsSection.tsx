/**
 * Strategic Backlog - Snapshots Section
 * Displays snapshots with linked themes and quarters from configuration
 */
import { useState, useMemo } from 'react';
import { Search, ChevronRight, ArrowUpDown, ArrowUp, Calendar, Layers, Plus } from 'lucide-react';
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
  { key: 'name', label: 'Snapshot', defaultVisible: true },
  { key: 'themes', label: 'Themes', defaultVisible: true, width: 'w-52' },
  { key: 'quarters', label: 'Quarters', defaultVisible: true, width: 'w-48' },
  { key: 'status', label: 'Status', defaultVisible: true, width: 'w-24' },
  { key: 'period', label: 'Period', defaultVisible: true, width: 'w-40' },
  { key: 'updated', label: 'Updated', defaultVisible: true, width: 'w-32' },
];

const STORAGE_KEY = 'strategic_backlog_columns_snapshots';

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
  const [sortColumn, setSortColumn] = useState<'name' | 'themes' | 'quarters' | 'status' | 'period' | 'updated'>('name');
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

  const handleSort = (column: typeof sortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getStatusBadge = (status: string) => {
    // Status styling matching themes table - filled badges with solid backgrounds
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
  };

  const SortIcon = ({ column }: { column: typeof sortColumn }) => {
    if (sortColumn === column) {
      return <ArrowUp className={cn('h-3 w-3 ml-1', sortDirection === 'desc' && 'rotate-180')} />;
    }
    return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
  };

  const isColumnVisible = (key: string) => visibleColumns.includes(key);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading snapshots...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search + Column Selector */}
      <div className="flex items-center justify-between gap-4">
        <div className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg flex-1 max-w-md',
          'bg-white dark:bg-[#0D1117]',
          'border border-[#E1E4E8] dark:border-[#30363D]',
          'focus-within:border-[#2563eb] focus-within:ring-1 focus-within:ring-[rgba(37,99,235,0.3)]'
        )}>
          <Search className="h-4 w-4 text-[#8B949E] dark:text-[#6E7681]" />
          <input
            type="text"
            placeholder="Search snapshots..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className={cn(
              'flex-1 bg-transparent text-sm outline-none',
              'text-[#24292F] dark:text-[#E6EDF3]',
              'placeholder:text-[#8B949E] dark:placeholder:text-[#6E7681]'
            )}
          />
        </div>
        <ColumnSelector
          columns={SNAPSHOT_COLUMNS}
          visibleColumns={visibleColumns}
          onVisibleColumnsChange={setVisibleColumns}
          storageKey={STORAGE_KEY}
        />
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-lg overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b border-border">
              {isColumnVisible('name') && (
                <th
                  className="text-left px-4 py-3 cursor-pointer transition-colors text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  onClick={() => handleSort('name')}
                >
                  <button className="flex items-center hover:opacity-80">
                    Snapshot <SortIcon column="name" />
                  </button>
                </th>
              )}
              {isColumnVisible('themes') && (
                <th
                  className="text-left px-4 py-3 w-52 cursor-pointer transition-colors text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  onClick={() => handleSort('themes')}
                >
                  <button className="flex items-center hover:opacity-80">
                    Themes <SortIcon column="themes" />
                  </button>
                </th>
              )}
              {isColumnVisible('quarters') && (
                <th
                  className="text-left px-4 py-3 w-48 cursor-pointer transition-colors text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  onClick={() => handleSort('quarters')}
                >
                  <button className="flex items-center hover:opacity-80">
                    Quarters <SortIcon column="quarters" />
                  </button>
                </th>
              )}
              {isColumnVisible('status') && (
                <th
                  className="text-left px-4 py-3 w-24 cursor-pointer transition-colors text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  onClick={() => handleSort('status')}
                >
                  <button className="flex items-center hover:opacity-80">
                    Status <SortIcon column="status" />
                  </button>
                </th>
              )}
              {isColumnVisible('period') && (
                <th
                  className="text-left px-4 py-3 w-40 cursor-pointer transition-colors text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  onClick={() => handleSort('period')}
                >
                  <button className="flex items-center hover:opacity-80">
                    Period <SortIcon column="period" />
                  </button>
                </th>
              )}
              {isColumnVisible('updated') && (
                <th
                  className="text-left px-4 py-3 w-32 cursor-pointer transition-colors text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  onClick={() => handleSort('updated')}
                >
                  <button className="flex items-center hover:opacity-80">
                    Updated <SortIcon column="updated" />
                  </button>
                </th>
              )}
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {filteredSnapshots.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + 1} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#F6F8FA] dark:bg-[#21262D] flex items-center justify-center">
                      <Calendar className="h-6 w-6 text-[#8B949E]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">No snapshots found</p>
                      <p className="text-sm mt-1 text-muted-foreground">Create a snapshot to define a planning period</p>
                    </div>
                    {onCreateSnapshot && (
                      <Button 
                        size="sm" 
                        onClick={onCreateSnapshot}
                        className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                      >
                        <Plus className="h-4 w-4" />
                        Create Snapshot
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredSnapshots.map((snapshot) => {
                const isSelected = selectedItemId === snapshot.id;
                const config = configMap[snapshot.id];
                const themeNames = config?.themes?.map(tid => themeMap[tid]).filter(Boolean) || [];
                const quarters = config?.quarters || [];
                
                return (
                  <tr
                    key={snapshot.id}
                    onClick={() => onSelectItem(snapshot)}
                    className={cn(
                      "cursor-pointer transition-colors group hover:bg-muted/50",
                      isSelected && "bg-muted/50"
                    )}
                  >
                    {isColumnVisible('name') && (
                      <td className="px-4 py-3.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span
                            className="text-sm font-medium text-foreground block truncate"
                            title={snapshot.name}
                          >
                            {snapshot.name}
                          </span>
                        </div>
                      </td>
                    )}
                    {isColumnVisible('themes') && (
                      <td className="px-4 py-3.5">
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
                      </td>
                    )}
                    {isColumnVisible('quarters') && (
                      <td className="px-4 py-3.5">
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
                      </td>
                    )}
                    {isColumnVisible('status') && (
                      <td className="px-4 py-3.5">
                        {getStatusBadge(snapshot.status)}
                      </td>
                    )}
                    {isColumnVisible('period') && (
                      <td className="px-4 py-3.5 text-sm text-muted-foreground">
                        {snapshot.start_date && snapshot.end_date ? (
                          `${format(new Date(snapshot.start_date), 'MMM d')} - ${format(new Date(snapshot.end_date), 'MMM d, yyyy')}`
                        ) : (
                          '—'
                        )}
                      </td>
                    )}
                    {isColumnVisible('updated') && (
                      <td className="px-4 py-3.5 text-sm text-muted-foreground">
                        {snapshot.updated_at ? format(new Date(snapshot.updated_at), 'MMM d, yyyy') : '—'}
                      </td>
                    )}
                    <td className="px-4 py-3.5">
                      <ChevronRight
                        className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground"
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
