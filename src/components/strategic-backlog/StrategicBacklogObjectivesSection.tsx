/**
 * Strategic Backlog - Objectives Section
 * Pixel-perfect table with column selector
 */
import { useState, useMemo } from 'react';
import { Search, ChevronRight, ArrowUpDown, ArrowUp, Target } from 'lucide-react';
import type { StrategicTheme } from '@/types/strategicBacklog';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ColumnSelector, useColumnVisibility, ColumnDefinition } from './ColumnSelector';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Column definitions for Objectives table
const OBJECTIVE_COLUMNS: ColumnDefinition[] = [
  { key: 'type', label: 'Type', defaultVisible: true, required: true, width: 'w-12' },
  { key: 'name', label: 'OKRs', defaultVisible: true, required: true },
  { key: 'theme', label: 'Theme', defaultVisible: true, width: 'w-44' },
  { key: 'owner', label: 'Owner', defaultVisible: false, width: 'w-36' },
  { key: 'status', label: 'Status', defaultVisible: true, width: 'w-28' },
  { key: 'progress', label: 'Progress vs Plan', defaultVisible: true, width: 'w-32' },
  { key: 'startDate', label: 'Start Date', defaultVisible: false, width: 'w-28' },
  { key: 'endDate', label: 'End Date', defaultVisible: false, width: 'w-28' },
  { key: 'risks', label: 'Risks', defaultVisible: true, width: 'w-16' },
  { key: 'linked', label: 'Linked', defaultVisible: true, width: 'w-16' },
];

const STORAGE_KEY = 'strategic_backlog_columns_objectives';

interface Objective {
  id: string;
  name: string;
  description?: string | null;
  status?: string | null;
  health?: string | null;
  overall_progress?: number | null;
  theme_id?: string | null;
  owner_id?: string | null;
  start_date?: string | null;
  end_date?: string | null;
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
  const [sortColumn, setSortColumn] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [visibleColumns, setVisibleColumns] = useColumnVisibility(OBJECTIVE_COLUMNS, STORAGE_KEY);

  // Fetch owner profiles
  const ownerIds = useMemo(() => {
    return [...new Set(objectives.map(o => o.owner_id).filter(Boolean))] as string[];
  }, [objectives]);

  const { data: owners = {} } = useQuery({
    queryKey: ['profiles-lookup', ownerIds],
    queryFn: async () => {
      if (ownerIds.length === 0) return {};
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', ownerIds);
      const map: Record<string, string> = {};
      data?.forEach(p => { map[p.id] = p.full_name || 'Unknown'; });
      return map;
    },
    enabled: ownerIds.length > 0,
  });

  // Fetch risk counts for objectives via objective_risks junction table
  const objectiveIds = useMemo(() => objectives.map(o => o.id), [objectives]);

  const { data: riskCounts = {} } = useQuery({
    queryKey: ['objective-risk-counts', objectiveIds],
    queryFn: async () => {
      if (objectiveIds.length === 0) return {};
      const { data } = await supabase
        .from('objective_risks')
        .select('objective_id')
        .in('objective_id', objectiveIds);
      const counts: Record<string, number> = {};
      (data as any[])?.forEach((r: any) => {
        counts[r.objective_id] = (counts[r.objective_id] || 0) + 1;
      });
      return counts;
    },
    enabled: objectiveIds.length > 0,
  });

  // Fetch linked work counts via objective_epic_links junction table
  const { data: linkedCounts = {} } = useQuery({
    queryKey: ['objective-linked-counts', objectiveIds],
    queryFn: async () => {
      if (objectiveIds.length === 0) return {};
      const { data: epicLinks } = await supabase
        .from('objective_epic_links')
        .select('objective_id')
        .in('objective_id', objectiveIds);
      const counts: Record<string, number> = {};
      (epicLinks as any[])?.forEach((e: any) => {
        if (e.objective_id) {
          counts[e.objective_id] = (counts[e.objective_id] || 0) + 1;
        }
      });
      return counts;
    },
    enabled: objectiveIds.length > 0,
  });

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
        case 'owner':
          aVal = a.owner_id ? owners[a.owner_id] || '' : '';
          bVal = b.owner_id ? owners[b.owner_id] || '' : '';
          break;
        case 'status':
          aVal = a.status || '';
          bVal = b.status || '';
          break;
        case 'progress':
          aVal = a.overall_progress || 0;
          bVal = b.overall_progress || 0;
          break;
        case 'startDate':
          aVal = a.start_date || '';
          bVal = b.start_date || '';
          break;
        case 'endDate':
          aVal = a.end_date || '';
          bVal = b.end_date || '';
          break;
        case 'risks':
          aVal = riskCounts[a.id] || 0;
          bVal = riskCounts[b.id] || 0;
          break;
        case 'linked':
          aVal = linkedCounts[a.id] || 0;
          bVal = linkedCounts[b.id] || 0;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [objectives, searchQuery, sortColumn, sortDirection, themeLookup, owners, riskCounts, linkedCounts]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getStatusBadge = (status?: string | null) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      pending: { label: 'PENDING', className: 'bg-muted text-muted-foreground border-border' },
      in_progress: { label: 'IN PROGRESS', className: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
      on_track: { label: 'ON TRACK', className: 'bg-[rgba(92,124,92,0.1)] dark:bg-[rgba(92,124,92,0.15)] text-[#5C7C5C] dark:text-[#7DA37D] border-[rgba(92,124,92,0.3)]' },
      at_risk: { label: 'AT RISK', className: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
      off_track: { label: 'OFF TRACK', className: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800' },
      completed: { label: 'COMPLETED', className: 'bg-[rgba(92,124,92,0.1)] dark:bg-[rgba(92,124,92,0.15)] text-[#5C7C5C] dark:text-[#7DA37D] border-[rgba(92,124,92,0.3)]' },
      paused: { label: 'PAUSED', className: 'bg-muted text-muted-foreground border-border' },
      canceled: { label: 'CANCELED', className: 'bg-muted text-muted-foreground border-border' },
    };
    
    const config = statusMap[status || ''] || { label: status?.toUpperCase() || 'DRAFT', className: 'bg-muted text-muted-foreground border-border' };
    
    return (
      <span className={cn(
        "inline-flex px-2 py-0.5 rounded border",
        "text-[10px] font-semibold uppercase tracking-wider",
        config.className
      )}>
        {config.label}
      </span>
    );
  };

  const getProgressBar = (progress?: number | null) => {
    const value = progress || 0;
    // Determine color based on progress
    let barColor = 'bg-red-500';
    if (value >= 75) barColor = 'bg-[#5C7C5C]';
    else if (value >= 50) barColor = 'bg-brand-gold';
    else if (value >= 25) barColor = 'bg-amber-500';

    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className={cn("h-full rounded-full transition-all", barColor)}
            style={{ width: `${value}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground w-8 text-right">{value}%</span>
      </div>
    );
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn === column) {
      return <ArrowUp className={cn("h-3 w-3 ml-1", sortDirection === 'desc' && "rotate-180")} />;
    }
    return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
  };

  const isColumnVisible = (key: string) => visibleColumns.includes(key);

  const visibleColumnCount = visibleColumns.length;

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
        <table className="w-full table-fixed">
          <thead className="border-b border-border">
            <tr className="bg-muted/30">
              {isColumnVisible('type') && (
                <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground w-12">
                  Type
                </th>
              )}
              {isColumnVisible('name') && (
                <th 
                  className="text-left px-3 py-3 text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort('name')}
                >
                  <button className="flex items-center">
                    OKRs <SortIcon column="name" />
                  </button>
                </th>
              )}
              {isColumnVisible('theme') && (
                <th 
                  className="text-left px-3 py-3 text-xs font-medium text-muted-foreground w-44 cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort('theme')}
                >
                  <button className="flex items-center">
                    Theme <SortIcon column="theme" />
                  </button>
                </th>
              )}
              {isColumnVisible('owner') && (
                <th 
                  className="text-left px-3 py-3 text-xs font-medium text-muted-foreground w-36 cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort('owner')}
                >
                  <button className="flex items-center">
                    Owner <SortIcon column="owner" />
                  </button>
                </th>
              )}
              {isColumnVisible('status') && (
                <th 
                  className="text-left px-3 py-3 text-xs font-medium text-muted-foreground w-28 cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort('status')}
                >
                  <button className="flex items-center">
                    Status <SortIcon column="status" />
                  </button>
                </th>
              )}
              {isColumnVisible('progress') && (
                <th 
                  className="text-left px-3 py-3 text-xs font-medium text-muted-foreground w-32 cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort('progress')}
                >
                  <button className="flex items-center">
                    Progress <SortIcon column="progress" />
                  </button>
                </th>
              )}
              {isColumnVisible('startDate') && (
                <th 
                  className="text-left px-3 py-3 text-xs font-medium text-muted-foreground w-28 cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort('startDate')}
                >
                  <button className="flex items-center">
                    Start <SortIcon column="startDate" />
                  </button>
                </th>
              )}
              {isColumnVisible('endDate') && (
                <th 
                  className="text-left px-3 py-3 text-xs font-medium text-muted-foreground w-28 cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort('endDate')}
                >
                  <button className="flex items-center">
                    End <SortIcon column="endDate" />
                  </button>
                </th>
              )}
              {isColumnVisible('risks') && (
                <th 
                  className="text-center px-3 py-3 text-xs font-medium text-muted-foreground w-16 cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort('risks')}
                >
                  <button className="flex items-center justify-center w-full">
                    Risks <SortIcon column="risks" />
                  </button>
                </th>
              )}
              {isColumnVisible('linked') && (
                <th 
                  className="text-center px-3 py-3 text-xs font-medium text-muted-foreground w-16 cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort('linked')}
                >
                  <button className="flex items-center justify-center w-full">
                    Linked <SortIcon column="linked" />
                  </button>
                </th>
              )}
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {isLoading ? (
              <tr>
                <td colSpan={visibleColumnCount + 1} className="px-4 py-12 text-center text-muted-foreground">
                  Loading objectives...
                </td>
              </tr>
            ) : filteredObjectives.length === 0 ? (
              <tr>
                <td colSpan={visibleColumnCount + 1} className="px-4 py-12 text-center text-muted-foreground">
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
                    {isColumnVisible('type') && (
                      <td className="px-3 py-3">
                        <div className="w-6 h-6 rounded bg-brand-gold/10 flex items-center justify-center">
                          <Target className="h-3.5 w-3.5 text-brand-gold" />
                        </div>
                      </td>
                    )}
                    {isColumnVisible('name') && (
                      <td className="px-3 py-3">
                        <span className="text-sm font-medium text-foreground line-clamp-2">{obj.name}</span>
                      </td>
                    )}
                    {isColumnVisible('theme') && (
                      <td className="px-3 py-3 text-sm text-muted-foreground truncate">
                        {obj.theme_id ? themeLookup[obj.theme_id] || '—' : '—'}
                      </td>
                    )}
                    {isColumnVisible('owner') && (
                      <td className="px-3 py-3 text-sm text-muted-foreground truncate">
                        {obj.owner_id ? owners[obj.owner_id] || '—' : '—'}
                      </td>
                    )}
                    {isColumnVisible('status') && (
                      <td className="px-3 py-3">
                        {getStatusBadge(obj.status)}
                      </td>
                    )}
                    {isColumnVisible('progress') && (
                      <td className="px-3 py-3">
                        {getProgressBar(obj.overall_progress)}
                      </td>
                    )}
                    {isColumnVisible('startDate') && (
                      <td className="px-3 py-3 text-sm text-muted-foreground">
                        {obj.start_date ? format(new Date(obj.start_date), 'MMM d, yyyy') : '—'}
                      </td>
                    )}
                    {isColumnVisible('endDate') && (
                      <td className="px-3 py-3 text-sm text-muted-foreground">
                        {obj.end_date ? format(new Date(obj.end_date), 'MMM d, yyyy') : '—'}
                      </td>
                    )}
                    {isColumnVisible('risks') && (
                      <td className="px-3 py-3 text-sm text-center">
                        <span className={cn(
                          "inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded text-xs font-medium",
                          (riskCounts[obj.id] || 0) > 0 
                            ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
                            : "text-muted-foreground"
                        )}>
                          {riskCounts[obj.id] || 0}
                        </span>
                      </td>
                    )}
                    {isColumnVisible('linked') && (
                      <td className="px-3 py-3 text-sm text-center text-muted-foreground">
                        {linkedCounts[obj.id] || 0}
                      </td>
                    )}
                    <td className="px-3 py-3">
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
