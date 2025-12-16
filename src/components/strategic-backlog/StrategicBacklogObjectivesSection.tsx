/**
 * Strategic Backlog - Objectives Section
 * Pixel-perfect table with column selector
 */
import { useState, useMemo } from 'react';
import { Search, ChevronRight, ArrowUpDown, ArrowUp } from 'lucide-react';
import type { StrategicTheme } from '@/types/strategicBacklog';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ColumnSelector, useColumnVisibility, ColumnDefinition } from './ColumnSelector';

// Column definitions for Objectives table
const OBJECTIVE_COLUMNS: ColumnDefinition[] = [
  { key: 'name', label: 'Objective', defaultVisible: true },
  { key: 'theme', label: 'Theme', defaultVisible: true, width: 'w-52' },
  { key: 'status', label: 'State', defaultVisible: true, width: 'w-24' },
  { key: 'krs', label: 'KRs', defaultVisible: true, width: 'w-16' },
  { key: 'updated', label: 'Updated', defaultVisible: true, width: 'w-32' },
];

const STORAGE_KEY = 'strategic_backlog_columns_objectives';

interface Objective {
  id: string;
  name: string;
  description?: string | null;
  status?: string | null;
  overall_progress?: number | null;
  theme_id?: string | null;
  created_at: string;
  updated_at: string;
}

interface ObjectivesSectionProps {
  objectives: Objective[];
  themes: StrategicTheme[];
  isLoading: boolean;
  isArchived: boolean;
  onSelectItem: (item: any) => void;
  selectedItemId?: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  krCounts: Record<string, number>;
}

export function StrategicBacklogObjectivesSection({ 
  objectives,
  themes, 
  isLoading,
  isArchived,
  onSelectItem,
  selectedItemId,
  searchQuery,
  onSearchChange,
  krCounts,
}: ObjectivesSectionProps) {
  const [sortColumn, setSortColumn] = useState<'name' | 'theme' | 'status' | 'krs' | 'updated'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [visibleColumns, setVisibleColumns] = useColumnVisibility(OBJECTIVE_COLUMNS, STORAGE_KEY);

  const themeLookup = useMemo(() => {
    const map: Record<string, string> = {};
    themes.forEach(t => { map[t.id] = t.name; });
    return map;
  }, [themes]);

  const filteredObjectives = useMemo(() => {
    let result = objectives;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(obj =>
        obj.name.toLowerCase().includes(query) ||
        obj.description?.toLowerCase().includes(query) ||
        (obj.theme_id && themeLookup[obj.theme_id]?.toLowerCase().includes(query))
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
        case 'krs':
          aVal = krCounts[a.id] || 0;
          bVal = krCounts[b.id] || 0;
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
  }, [objectives, searchQuery, sortColumn, sortDirection, themeLookup, krCounts]);

  const handleSort = (column: typeof sortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getStatusBadge = (status?: string | null) => {
    const isActive = status === 'active';
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
            placeholder="Search objectives..."
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
          columns={OBJECTIVE_COLUMNS}
          visibleColumns={visibleColumns}
          onVisibleColumnsChange={setVisibleColumns}
          storageKey={STORAGE_KEY}
        />
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-border">
            <tr className="bg-muted/30">
              {isColumnVisible('name') && (
                <th 
                  className="text-left px-4 py-3 text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort('name')}
                >
                  <button className="flex items-center">
                    Objective <SortIcon column="name" />
                  </button>
                </th>
              )}
              {isColumnVisible('theme') && (
                <th 
                  className="text-left px-4 py-3 text-xs font-medium text-muted-foreground w-52 cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort('theme')}
                >
                  <button className="flex items-center">
                    Theme <SortIcon column="theme" />
                  </button>
                </th>
              )}
              {isColumnVisible('status') && (
                <th 
                  className="text-left px-4 py-3 text-xs font-medium text-muted-foreground w-24 cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort('status')}
                >
                  <button className="flex items-center">
                    State <SortIcon column="status" />
                  </button>
                </th>
              )}
              {isColumnVisible('krs') && (
                <th 
                  className="text-left px-4 py-3 text-xs font-medium text-muted-foreground w-16 cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort('krs')}
                >
                  <button className="flex items-center">
                    KRs <SortIcon column="krs" />
                  </button>
                </th>
              )}
              {isColumnVisible('updated') && (
                <th 
                  className="text-left px-4 py-3 text-xs font-medium text-muted-foreground w-32 cursor-pointer hover:text-foreground transition-colors"
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
                  Loading objectives...
                </td>
              </tr>
            ) : filteredObjectives.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + 1} className="px-4 py-12 text-center text-muted-foreground">
                  No objectives found
                </td>
              </tr>
            ) : (
              filteredObjectives.map((obj) => {
                const isSelected = selectedItemId === obj.id;
                return (
                  <tr
                    key={obj.id}
                    onClick={() => onSelectItem(obj)}
                    className={cn(
                      "cursor-pointer hover:bg-muted/50 transition-colors",
                      isSelected && "bg-muted/50"
                    )}
                  >
                    {isColumnVisible('name') && (
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-foreground">{obj.name}</span>
                      </td>
                    )}
                    {isColumnVisible('theme') && (
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {obj.theme_id ? themeLookup[obj.theme_id] || '—' : '—'}
                      </td>
                    )}
                    {isColumnVisible('status') && (
                      <td className="px-4 py-3">
                        {getStatusBadge(obj.status)}
                      </td>
                    )}
                    {isColumnVisible('krs') && (
                      <td className="px-4 py-3 text-sm text-center text-muted-foreground">
                        {krCounts[obj.id] || 0}
                      </td>
                    )}
                    {isColumnVisible('updated') && (
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {obj.updated_at ? format(new Date(obj.updated_at), 'MMM d, yyyy') : '—'}
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
