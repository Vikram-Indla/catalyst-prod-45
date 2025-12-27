/**
 * Strategic Backlog - Snapshots Section
 * Displays snapshots grouped by their parent theme
 */
import { useState, useMemo } from 'react';
import { Search, ChevronRight, ArrowUpDown, ArrowUp, Calendar, Layers, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ColumnSelector, useColumnVisibility, ColumnDefinition } from './ColumnSelector';
import { Button } from '@/components/ui/button';
import type { StrategicTheme } from '@/types/strategicBacklog';

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

const SNAPSHOT_COLUMNS: ColumnDefinition[] = [
  { key: 'name', label: 'Snapshot', defaultVisible: true },
  { key: 'theme', label: 'Theme', defaultVisible: true, width: 'w-48' },
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
  const [sortColumn, setSortColumn] = useState<'name' | 'theme' | 'status' | 'period' | 'updated'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [visibleColumns, setVisibleColumns] = useColumnVisibility(SNAPSHOT_COLUMNS, STORAGE_KEY);

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
      result = result.filter(snapshot =>
        snapshot.name.toLowerCase().includes(query) ||
        snapshot.description?.toLowerCase().includes(query) ||
        (snapshot.theme_id && themeMap[snapshot.theme_id]?.toLowerCase().includes(query))
      );
    }

    result = [...result].sort((a, b) => {
      let aVal: any, bVal: any;

      switch (sortColumn) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'theme':
          aVal = a.theme_id ? themeMap[a.theme_id] || '' : '';
          bVal = b.theme_id ? themeMap[b.theme_id] || '' : '';
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
  }, [snapshots, searchQuery, sortColumn, sortDirection, themeMap]);

  const handleSort = (column: typeof sortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      ACTIVE: {
        label: 'ACTIVE',
        className: 'bg-[rgba(13,148,136,0.1)] dark:bg-[rgba(13,148,136,0.15)] text-[#0d9488] dark:text-[#14b8a6] border border-[rgba(13,148,136,0.3)]',
      },
      DRAFT: {
        label: 'DRAFT',
        className: 'bg-[#F6F8FA] dark:bg-[#21262D] text-[#57606A] dark:text-[#8B949E] border border-[#E1E4E8] dark:border-[#30363D]',
      },
      ARCHIVED: {
        label: 'ARCHIVED',
        className: 'bg-[#F6F8FA] dark:bg-[#21262D] text-[#57606A] dark:text-[#8B949E] border border-[#E1E4E8] dark:border-[#30363D]',
      },
    };

    const config = statusConfig[status] || statusConfig.DRAFT;
    return (
      <span className={cn(
        'inline-flex px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider',
        config.className
      )}>
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
      <div style={{ background: 'var(--surface-bg)', border: '1px solid var(--border-default)', borderRadius: '10px', overflow: 'hidden' }}>
        <table className="w-full table-fixed">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
              {isColumnVisible('name') && (
                <th
                  className="text-left px-4 py-3 cursor-pointer transition-colors"
                  onClick={() => handleSort('name')}
                  style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', color: 'var(--text-muted)' }}
                >
                  <button className="flex items-center hover:opacity-80">
                    Snapshot <SortIcon column="name" />
                  </button>
                </th>
              )}
              {isColumnVisible('theme') && (
                <th
                  className="text-left px-4 py-3 w-48 cursor-pointer transition-colors"
                  onClick={() => handleSort('theme')}
                  style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', color: 'var(--text-muted)' }}
                >
                  <button className="flex items-center hover:opacity-80">
                    Theme <SortIcon column="theme" />
                  </button>
                </th>
              )}
              {isColumnVisible('status') && (
                <th
                  className="text-left px-4 py-3 w-24 cursor-pointer transition-colors"
                  onClick={() => handleSort('status')}
                  style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', color: 'var(--text-muted)' }}
                >
                  <button className="flex items-center hover:opacity-80">
                    Status <SortIcon column="status" />
                  </button>
                </th>
              )}
              {isColumnVisible('period') && (
                <th
                  className="text-left px-4 py-3 w-40 cursor-pointer transition-colors"
                  onClick={() => handleSort('period')}
                  style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', color: 'var(--text-muted)' }}
                >
                  <button className="flex items-center hover:opacity-80">
                    Period <SortIcon column="period" />
                  </button>
                </th>
              )}
              {isColumnVisible('updated') && (
                <th
                  className="text-left px-4 py-3 w-32 cursor-pointer transition-colors"
                  onClick={() => handleSort('updated')}
                  style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', color: 'var(--text-muted)' }}
                >
                  <button className="flex items-center hover:opacity-80">
                    Updated <SortIcon column="updated" />
                  </button>
                </th>
              )}
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {filteredSnapshots.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + 1} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#F6F8FA] dark:bg-[#21262D] flex items-center justify-center">
                      <Calendar className="h-6 w-6 text-[#8B949E]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>No snapshots found</p>
                      <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Create a snapshot to define a planning period</p>
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
                const themeName = snapshot.theme_id ? themeMap[snapshot.theme_id] : null;
                
                return (
                  <tr
                    key={snapshot.id}
                    onClick={() => onSelectItem(snapshot)}
                    className="cursor-pointer transition-colors group"
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      background: isSelected ? 'var(--row-selected)' : 'transparent',
                    }}
                    onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--row-hover)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = isSelected ? 'var(--row-selected)' : 'transparent'; }}
                  >
                    {isColumnVisible('name') && (
                      <td className="px-4 py-3.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
                          <span
                            className="text-sm font-medium block truncate"
                            style={{ color: 'var(--text-primary)' }}
                            title={snapshot.name}
                          >
                            {snapshot.name}
                          </span>
                        </div>
                      </td>
                    )}
                    {isColumnVisible('theme') && (
                      <td className="px-4 py-3.5">
                        {themeName ? (
                          <span className="inline-flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-muted)' }}>
                            <Layers className="h-3.5 w-3.5" />
                            <span className="truncate max-w-[140px]" title={themeName}>{themeName}</span>
                          </span>
                        ) : (
                          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                    )}
                    {isColumnVisible('status') && (
                      <td className="px-4 py-3.5">
                        {getStatusBadge(snapshot.status)}
                      </td>
                    )}
                    {isColumnVisible('period') && (
                      <td className="px-4 py-3.5 text-sm" style={{ color: 'var(--text-muted)' }}>
                        {snapshot.start_date && snapshot.end_date ? (
                          `${format(new Date(snapshot.start_date), 'MMM d')} - ${format(new Date(snapshot.end_date), 'MMM d, yyyy')}`
                        ) : (
                          '—'
                        )}
                      </td>
                    )}
                    {isColumnVisible('updated') && (
                      <td className="px-4 py-3.5 text-sm" style={{ color: 'var(--text-muted)' }}>
                        {snapshot.updated_at ? format(new Date(snapshot.updated_at), 'MMM d, yyyy') : '—'}
                      </td>
                    )}
                    <td className="px-4 py-3.5">
                      <ChevronRight
                        className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: 'var(--text-muted)' }}
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