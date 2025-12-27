/**
 * Strategic Backlog - Objectives Section
 * Pixel-perfect table matching Themes section styling
 */
import { useState, useMemo } from 'react';
import { Search, ChevronUp, ChevronDown, Target, TrendingUp, Plus, ChevronRight } from 'lucide-react';
import type { StrategicTheme } from '@/types/strategicBacklog';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ColumnSelector, useColumnVisibility, ColumnDefinition } from './ColumnSelector';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Column definitions for Objectives table
const OBJECTIVE_COLUMNS: ColumnDefinition[] = [
  { key: 'type', label: 'Type', defaultVisible: true, required: true, width: 'w-12' },
  { key: 'name', label: 'OKRs', defaultVisible: true, required: true },
  { key: 'theme', label: 'Theme', defaultVisible: true, width: 'w-44' },
  { key: 'quarters', label: 'Quarters', defaultVisible: true, width: 'w-48' },
  { key: 'status', label: 'Status', defaultVisible: true, width: 'w-28' },
  { key: 'progress', label: 'Progress vs Plan', defaultVisible: true, width: 'w-44' },
  { key: 'risks', label: 'Risks', defaultVisible: true, width: 'w-16' },
  { key: 'linked', label: 'Linked', defaultVisible: true, width: 'w-16' },
];

const STORAGE_KEY = 'strategic_backlog_columns_objectives';

type SortColumn = 'name' | 'theme' | 'quarters' | 'status' | 'progress' | 'risks' | 'linked';

interface SnapshotConfiguration {
  id: string;
  snapshot_id: string;
  quarters: string[];
}

interface Objective {
  id: string;
  name: string;
  description?: string | null;
  status?: string | null;
  health?: string | null;
  overall_progress?: number | null;
  theme_id?: string | null;
  snapshot_id?: string | null;
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
  onCreateObjective?: () => void;
}

// Sortable header with stacked chevrons - matching Themes section
function SortableHeader({ 
  label, 
  column, 
  currentSort, 
  direction, 
  onSort,
  className = ""
}: { 
  label: string; 
  column: SortColumn; 
  currentSort: SortColumn; 
  direction: 'asc' | 'desc'; 
  onSort: (col: SortColumn) => void;
  className?: string;
}) {
  const isActive = currentSort === column;
  return (
    <button
      onClick={() => onSort(column)}
      className={cn(
        "group flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors",
        className
      )}
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
function StatusBadge({ status }: { status?: string | null }) {
  const statusMap: Record<string, { label: string; bgColor: string }> = {
    pending: { label: 'PENDING', bgColor: '#9ca3af' },
    draft: { label: 'DRAFT', bgColor: '#9ca3af' },
    in_progress: { label: 'IN PROGRESS', bgColor: '#2563eb' },
    on_track: { label: 'ON TRACK', bgColor: '#0d9488' },
    at_risk: { label: 'AT RISK', bgColor: '#f59e0b' },
    off_track: { label: 'OFF TRACK', bgColor: '#ef4444' },
    completed: { label: 'COMPLETED', bgColor: '#0d9488' },
    paused: { label: 'PAUSED', bgColor: '#9ca3af' },
    canceled: { label: 'CANCELED', bgColor: '#9ca3af' },
  };
  
  const config = statusMap[status || ''] || { label: 'DRAFT', bgColor: '#9ca3af' };
  
  return (
    <span 
      className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider text-white"
      style={{ backgroundColor: config.bgColor }}
    >
      {config.label}
    </span>
  );
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
  onCreateObjective,
}: ObjectivesSectionProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [visibleColumns, setVisibleColumns] = useColumnVisibility(OBJECTIVE_COLUMNS, STORAGE_KEY);

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

  // Fetch snapshot configurations for quarters
  const snapshotIds = useMemo(() => {
    const ids = objectives.map(o => o.snapshot_id).filter(Boolean) as string[];
    return [...new Set(ids)];
  }, [objectives]);

  const { data: snapshotConfigs = [] } = useQuery({
    queryKey: ['objective-snapshot-configs', snapshotIds],
    queryFn: async () => {
      if (snapshotIds.length === 0) return [];
      const { data } = await supabase
        .from('snapshot_configurations')
        .select('snapshot_id, quarters')
        .in('snapshot_id', snapshotIds);
      return (data || []) as SnapshotConfiguration[];
    },
    enabled: snapshotIds.length > 0,
  });

  const snapshotQuartersMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    snapshotConfigs.forEach(c => { map[c.snapshot_id] = c.quarters || []; });
    return map;
  }, [snapshotConfigs]);

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
        (obj.theme_id && themeLookup[obj.theme_id]?.toLowerCase().includes(query)) ||
        (obj.snapshot_id && snapshotQuartersMap[obj.snapshot_id]?.some(q => q.toLowerCase().includes(query)))
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
        case 'quarters':
          aVal = a.snapshot_id ? (snapshotQuartersMap[a.snapshot_id]?.length || 0) : 0;
          bVal = b.snapshot_id ? (snapshotQuartersMap[b.snapshot_id]?.length || 0) : 0;
          break;
        case 'status':
          aVal = a.status || '';
          bVal = b.status || '';
          break;
        case 'progress':
          aVal = a.overall_progress || 0;
          bVal = b.overall_progress || 0;
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
  }, [objectives, searchQuery, sortColumn, sortDirection, themeLookup, riskCounts, linkedCounts, snapshotQuartersMap]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getProgressBar = (progress?: number | null, status?: string | null) => {
    const value = progress || 0;
    
    let barColor = '#6b7280';
    switch (status) {
      case 'on_track':
      case 'completed':
        barColor = '#0d9488';
        break;
      case 'in_progress':
        barColor = '#2563eb';
        break;
      case 'at_risk':
        barColor = '#f59e0b';
        break;
      case 'off_track':
        barColor = '#ef4444';
        break;
    }

    return (
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: barColor }} />
        <div className="flex-1 h-1.5 bg-[#e8e8e8] dark:bg-[#2d333b] rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all"
            style={{ width: `${value}%`, backgroundColor: barColor }}
          />
        </div>
        <span className="text-xs text-muted-foreground w-8 text-right tabular-nums">{value}%</span>
      </div>
    );
  };

  const isColumnVisible = (key: string) => visibleColumns.includes(key);

  // Grid columns matching Themes section pattern
  const gridCols = `${isColumnVisible('type') ? '48px ' : ''}1fr ${isColumnVisible('theme') ? '180px ' : ''}${isColumnVisible('quarters') ? '180px ' : ''}${isColumnVisible('status') ? '120px ' : ''}${isColumnVisible('progress') ? '180px ' : ''}${isColumnVisible('risks') ? '70px ' : ''}${isColumnVisible('linked') ? '70px ' : ''}40px`.trim();

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Search + Column Selector */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search objectives..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary transition-colors"
          />
        </div>
        <ColumnSelector
          columns={OBJECTIVE_COLUMNS}
          visibleColumns={visibleColumns}
          onVisibleColumnsChange={setVisibleColumns}
          storageKey={STORAGE_KEY}
        />
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <div className="bg-[hsl(var(--surface-0))] border border-[hsl(var(--border-default))] rounded-xl p-8 text-center text-muted-foreground">
            Loading objectives...
          </div>
        ) : filteredObjectives.length === 0 ? (
          <div className="bg-[hsl(var(--surface-0))] border border-[hsl(var(--border-default))] rounded-xl p-8 text-center">
            <div className="w-12 h-12 rounded-full mb-4 bg-[hsl(var(--surface-2))] flex items-center justify-center mx-auto">
              <Target className="h-6 w-6 text-[hsl(var(--text-muted))]" />
            </div>
            <p className="text-sm font-medium text-[hsl(var(--text-secondary))]">No objectives found</p>
            <p className="text-xs text-[hsl(var(--text-muted))] mt-1">Create objectives to define your measurable goals</p>
            {onCreateObjective && (
              <Button 
                size="sm" 
                onClick={onCreateObjective}
                className="mt-4 bg-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary-hover))] text-white gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Create Objective
              </Button>
            )}
          </div>
        ) : (
          filteredObjectives.map((obj) => {
            const isSelected = selectedItemId === obj.id;
            return (
              <button
                key={obj.id}
                onClick={() => onSelectItem(obj)}
                className={cn(
                  "w-full text-left bg-[hsl(var(--surface-0))] border border-[hsl(var(--border-default))] rounded-xl p-4 transition-all",
                  "hover:bg-[hsl(var(--surface-2))] hover:border-[hsl(var(--brand-primary))]",
                  isSelected && "border-[hsl(var(--brand-primary))] bg-[hsl(var(--surface-2))]"
                )}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-brand-primary" />
                    <span className="text-sm font-medium text-[hsl(var(--text-primary))] line-clamp-2">{obj.name}</span>
                  </div>
                  <StatusBadge status={obj.status} />
                </div>
                <div className="text-xs text-muted-foreground mb-2">
                  {obj.theme_id ? themeLookup[obj.theme_id] : '—'}
                </div>
                <div className="mt-2">{getProgressBar(obj.overall_progress, obj.status)}</div>
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
          {isColumnVisible('type') && (
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Type</span>
          )}
          {isColumnVisible('name') && (
            <SortableHeader 
              label="OKRs" 
              column="name" 
              currentSort={sortColumn} 
              direction={sortDirection} 
              onSort={handleSort} 
            />
          )}
          {isColumnVisible('theme') && (
            <SortableHeader 
              label="Theme" 
              column="theme" 
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
          {isColumnVisible('progress') && (
            <SortableHeader 
              label="Progress vs Plan" 
              column="progress" 
              currentSort={sortColumn} 
              direction={sortDirection} 
              onSort={handleSort} 
            />
          )}
          {isColumnVisible('risks') && (
            <SortableHeader 
              label="Risks" 
              column="risks" 
              currentSort={sortColumn} 
              direction={sortDirection} 
              onSort={handleSort} 
            />
          )}
          {isColumnVisible('linked') && (
            <SortableHeader 
              label="Linked" 
              column="linked" 
              currentSort={sortColumn} 
              direction={sortDirection} 
              onSort={handleSort} 
            />
          )}
          <span></span>
        </div>

        {/* Body */}
        <div className="divide-y divide-[hsl(var(--border-subtle))]">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 px-4 text-muted-foreground">
              Loading objectives...
            </div>
          ) : filteredObjectives.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-12 h-12 rounded-full mb-4 bg-[hsl(var(--surface-2))] flex items-center justify-center">
                <Target className="h-6 w-6 text-[hsl(var(--text-muted))]" />
              </div>
              <p className="text-sm font-medium text-[hsl(var(--text-secondary))]">No objectives found</p>
              <p className="text-xs text-[hsl(var(--text-muted))] mt-1">Create objectives to define your measurable goals</p>
              {onCreateObjective && (
                <Button 
                  size="sm" 
                  onClick={onCreateObjective}
                  className="mt-4 bg-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary-hover))] text-white gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  Create Objective
                </Button>
              )}
            </div>
          ) : (
            filteredObjectives.map((obj, index) => {
              const isSelected = selectedItemId === obj.id;
              return (
                <button
                  key={obj.id}
                  onClick={() => onSelectItem(obj)}
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
                  {isColumnVisible('type') && (
                    <div className="flex items-center">
                      <div className="w-7 h-7 rounded bg-brand-primary/10 flex items-center justify-center">
                        <Target className="h-4 w-4 text-brand-primary" />
                      </div>
                    </div>
                  )}
                  {isColumnVisible('name') && (
                    <div className="flex items-center min-w-0">
                      <span className="text-sm font-medium text-[hsl(var(--text-primary))] group-hover:text-[hsl(var(--brand-primary))] line-clamp-2 transition-colors">
                        {obj.name}
                      </span>
                    </div>
                  )}
                  {isColumnVisible('theme') && (
                    <div className="flex items-center">
                      <span className="text-sm text-muted-foreground truncate">
                        {obj.theme_id ? themeLookup[obj.theme_id] || '—' : '—'}
                      </span>
                    </div>
                  )}
                  {isColumnVisible('quarters') && (
                    <div className="flex items-center">
                      {obj.snapshot_id && snapshotQuartersMap[obj.snapshot_id]?.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {snapshotQuartersMap[obj.snapshot_id].slice(0, 3).map((q, idx) => (
                            <span
                              key={idx}
                              className="text-sm text-muted-foreground px-2 py-0.5 bg-muted/50 rounded"
                            >
                              {q}
                            </span>
                          ))}
                          {snapshotQuartersMap[obj.snapshot_id].length > 3 && (
                            <span className="text-sm text-muted-foreground px-2 py-0.5 bg-muted/50 rounded">
                              +{snapshotQuartersMap[obj.snapshot_id].length - 3}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </div>
                  )}
                  {isColumnVisible('status') && (
                    <div className="flex items-center">
                      <StatusBadge status={obj.status} />
                    </div>
                  )}
                  {isColumnVisible('progress') && (
                    <div className="flex items-center">
                      {getProgressBar(obj.overall_progress, obj.status)}
                    </div>
                  )}
                  {isColumnVisible('risks') && (
                    <div className="flex items-center justify-center">
                      <span className={cn(
                        "inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded text-xs font-medium",
                        (riskCounts[obj.id] || 0) > 0 
                          ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
                          : "text-muted-foreground"
                      )}>
                        {riskCounts[obj.id] || 0}
                      </span>
                    </div>
                  )}
                  {isColumnVisible('linked') && (
                    <div className="flex items-center justify-center">
                      <span className="text-sm text-muted-foreground">
                        {linkedCounts[obj.id] || 0}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-center">
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Footer: Row Count */}
      {filteredObjectives.length > 0 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-muted-foreground">
            Showing {filteredObjectives.length} of {objectives.length} objectives
          </p>
        </div>
      )}
    </div>
  );
}