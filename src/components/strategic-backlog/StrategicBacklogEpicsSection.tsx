/**
 * Strategic Backlog - Epics Section
 * Pixel-perfect table with column selector
 */
import { useState, useMemo } from 'react';
import { Search, ChevronRight, ArrowUpDown, ArrowUp } from 'lucide-react';
import { WorkItemIcon } from '@/components/ja/icons/WorkItemIcon';
import type { StrategicTheme } from '@/types/strategicBacklog';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ColumnSelector, useColumnVisibility, ColumnDefinition } from './ColumnSelector';

// Column definitions for Epics table
const EPIC_COLUMNS: ColumnDefinition[] = [
  { key: 'name', label: 'Epic', defaultVisible: true },
  { key: 'theme', label: 'Theme', defaultVisible: true, width: 'w-52' },
  { key: 'status', label: 'State', defaultVisible: true, width: 'w-24' },
  { key: 'features', label: 'Features', defaultVisible: true, width: 'w-24' },
  { key: 'updated', label: 'Updated', defaultVisible: true, width: 'w-32' },
];

const STORAGE_KEY = 'strategic_backlog_columns_epics';

interface Epic {
  id: string;
  name: string;
  epic_key?: string | null;
  status?: string | null;
  theme_id?: string | null;
  priority?: string | null;
  created_at: string;
  updated_at: string;
}

interface EpicsSectionProps {
  epics: Epic[];
  themes: StrategicTheme[];
  isLoading: boolean;
  isArchived: boolean;
  onSelectItem: (item: any) => void;
  selectedItemId?: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  featureCounts: Record<string, number>;
}

export function StrategicBacklogEpicsSection({ 
  epics,
  themes, 
  isLoading,
  isArchived,
  onSelectItem,
  selectedItemId,
  searchQuery,
  onSearchChange,
  featureCounts,
}: EpicsSectionProps) {
  const [sortColumn, setSortColumn] = useState<'name' | 'theme' | 'status' | 'features' | 'updated'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [visibleColumns, setVisibleColumns] = useColumnVisibility(EPIC_COLUMNS, STORAGE_KEY);

  const themeLookup = useMemo(() => {
    const map: Record<string, string> = {};
    themes.forEach(t => { map[t.id] = t.name; });
    return map;
  }, [themes]);

  const filteredEpics = useMemo(() => {
    let result = epics;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(epic =>
        epic.name.toLowerCase().includes(query) ||
        epic.epic_key?.toLowerCase().includes(query) ||
        (epic.theme_id && themeLookup[epic.theme_id]?.toLowerCase().includes(query))
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
          aVal = a.theme_id ? themeLookup[a.theme_id] || '' : '';
          bVal = b.theme_id ? themeLookup[b.theme_id] || '' : '';
          break;
        case 'status':
          aVal = a.status || '';
          bVal = b.status || '';
          break;
        case 'features':
          aVal = featureCounts[a.id] || 0;
          bVal = featureCounts[b.id] || 0;
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
  }, [epics, searchQuery, sortColumn, sortDirection, themeLookup, featureCounts]);

  const handleSort = (column: typeof sortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getStatusBadge = (status?: string | null) => {
    const isActive = status === 'active' || status === 'in_progress';
    return (
      <span className={cn(
        "inline-flex px-2 py-0.5 rounded",
        "text-[10px] font-semibold uppercase tracking-wider",
        isActive 
          ? "bg-[rgba(92,124,92,0.1)] dark:bg-[rgba(92,124,92,0.15)] text-[#5C7C5C] dark:text-[#7DA37D] border border-[rgba(92,124,92,0.3)]"
          : "bg-[#F6F8FA] dark:bg-[#21262D] text-[#57606A] dark:text-[#8B949E] border border-[#E1E4E8] dark:border-[#30363D]"
      )}>
        {isActive ? 'ACTIVE' : 'DRAFT'}
      </span>
    );
  };

  const SortIcon = ({ column }: { column: typeof sortColumn }) => {
    if (sortColumn === column) {
      return <ArrowUp className={cn("h-3 w-3 ml-1", sortDirection === 'desc' && "rotate-180")} />;
    }
    return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
  };

  const isColumnVisible = (key: string) => visibleColumns.includes(key);

  return (
    <div className="space-y-4">
      {/* Search + Column Selector */}
      <div className="flex items-center justify-between gap-4">
        <div className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg flex-1 max-w-md",
          "bg-white dark:bg-[#0D1117]",
          "border border-[#E1E4E8] dark:border-[#30363D]",
          "focus-within:border-[#C69C6D] focus-within:ring-1 focus-within:ring-[rgba(198,156,109,0.3)]"
        )}>
          <Search className="h-4 w-4 text-[#8B949E] dark:text-[#6E7681]" />
          <input
            type="text"
            placeholder="Search epics..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className={cn(
              "flex-1 bg-transparent text-sm outline-none",
              "text-[#24292F] dark:text-[#E6EDF3]",
              "placeholder:text-[#8B949E] dark:placeholder:text-[#6E7681]"
            )}
          />
        </div>
        <ColumnSelector
          columns={EPIC_COLUMNS}
          visibleColumns={visibleColumns}
          onVisibleColumnsChange={setVisibleColumns}
          storageKey={STORAGE_KEY}
        />
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              {isColumnVisible('name') && (
                <th 
                  className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort('name')}
                >
                  <button className="flex items-center">
                    Epic <SortIcon column="name" />
                  </button>
                </th>
              )}
              {isColumnVisible('theme') && (
                <th 
                  className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-52 cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort('theme')}
                >
                  <button className="flex items-center">
                    Theme <SortIcon column="theme" />
                  </button>
                </th>
              )}
              {isColumnVisible('status') && (
                <th 
                  className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-24 cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort('status')}
                >
                  <button className="flex items-center">
                    State <SortIcon column="status" />
                  </button>
                </th>
              )}
              {isColumnVisible('features') && (
                <th 
                  className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-24 cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort('features')}
                >
                  <button className="flex items-center">
                    Features <SortIcon column="features" />
                  </button>
                </th>
              )}
              {isColumnVisible('updated') && (
                <th 
                  className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-32 cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort('updated')}
                >
                  <button className="flex items-center">
                    Updated <SortIcon column="updated" />
                  </button>
                </th>
              )}
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {isLoading ? (
              <tr>
                <td colSpan={visibleColumns.length + 1} className="px-4 py-12 text-center text-muted-foreground">
                  Loading epics...
                </td>
              </tr>
            ) : filteredEpics.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + 1} className="px-4 py-12 text-center text-muted-foreground">
                  No epics found
                </td>
              </tr>
            ) : (
              filteredEpics.map((epic) => {
                const isSelected = selectedItemId === epic.id;
                return (
                  <tr
                    key={epic.id}
                    onClick={() => onSelectItem(epic)}
                    className={cn(
                      "cursor-pointer hover:bg-[rgba(92,124,92,0.08)] transition-colors",
                      isSelected && "bg-[rgba(92,124,92,0.08)] border-l-2 border-l-brand-primary"
                    )}
                  >
                    {isColumnVisible('name') && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <WorkItemIcon type="epic" size={14} />
                          <span className="text-sm font-medium text-foreground">{epic.name}</span>
                        </div>
                      </td>
                    )}
                    {isColumnVisible('theme') && (
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {epic.theme_id ? themeLookup[epic.theme_id] || '—' : '—'}
                      </td>
                    )}
                    {isColumnVisible('status') && (
                      <td className="px-4 py-3">
                        {getStatusBadge(epic.status)}
                      </td>
                    )}
                    {isColumnVisible('features') && (
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {featureCounts[epic.id] || 0}
                      </td>
                    )}
                    {isColumnVisible('updated') && (
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {epic.updated_at ? format(new Date(epic.updated_at), 'MMM d, yyyy') : '—'}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
