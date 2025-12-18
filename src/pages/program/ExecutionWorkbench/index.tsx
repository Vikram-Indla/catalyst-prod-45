/**
 * WorkBench views: Table/Gantt/Roadmap/Board/Swimlane
 * 
 * Program Execution Workbench - Main Page
 */

import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { ProgramPageLayout } from '@/components/program/ProgramPageLayout';
import { Search, Filter, ChevronDown, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkItem, WorkbenchView, WorkbenchFilters, DEFAULT_WORKBENCH_FILTERS, VIEW_OPTIONS } from './types';
import { WorkbenchFiltersDialog } from './WorkbenchFiltersDialog';
import { WorkbenchDetailsDrawer } from './WorkbenchDetailsDrawer';
import { TableView } from './views/TableView';
import { GanttView } from './views/GanttView';
import { RoadmapView } from './views/RoadmapView';
import { BoardView } from './views/BoardView';
import { SwimlaneView } from './views/SwimlaneView';
import { GlobalPageHeader } from '@/components/layout/GlobalPageHeader';
import { useWorkbenchData } from './useWorkbenchData';
import { startOfQuarter, endOfQuarter, addQuarters } from 'date-fns';

// Dropdown component
function Dropdown({ label, value, options, onChange, className }: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find(o => o.value === value)?.label || label;

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-md bg-background hover:bg-muted/50 transition-colors"
      >
        <span>{selectedLabel}</span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 bg-background border border-border rounded-md shadow-lg z-[500] min-w-[150px]">
            {options.map(opt => (
              <div
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted cursor-pointer",
                  opt.value === value && "bg-muted"
                )}
              >
                {opt.value === value && <Check className="h-4 w-4 text-brand-primary" />}
                <span className={opt.value !== value ? "pl-6" : ""}>{opt.label}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Get quarter date range helpers
function getCurrentQuarterDates(): { start: Date; end: Date } {
  const now = new Date();
  return { start: startOfQuarter(now), end: endOfQuarter(now) };
}

function getNextQuarterDates(): { start: Date; end: Date } {
  const now = new Date();
  const nextQ = addQuarters(now, 1);
  return { start: startOfQuarter(nextQ), end: endOfQuarter(nextQ) };
}

// Check if item is active in period (overlap logic)
function isActiveInPeriod(item: WorkItem, periodStart: Date, periodEnd: Date): boolean {
  // If item has no dates, include it (conservative approach)
  if (!item.startDate && !item.endDate) return true;
  
  const itemStart = item.startDate ? new Date(item.startDate) : null;
  const itemEnd = item.endDate ? new Date(item.endDate) : null;
  
  // Overlap logic: item.startDate <= periodEnd AND item.endDate >= periodStart
  // Handle missing dates gracefully
  if (itemStart && itemEnd) {
    return itemStart <= periodEnd && itemEnd >= periodStart;
  }
  if (itemStart && !itemEnd) {
    // Open-ended item - check if start is before period end
    return itemStart <= periodEnd;
  }
  if (!itemStart && itemEnd) {
    // Item with only end date - check if end is after period start
    return itemEnd >= periodStart;
  }
  
  return true;
}

export default function ExecutionWorkbenchPage() {
  const { programId } = useParams<{ programId: string }>();
  
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<WorkbenchView>('table');
  const [filters, setFilters] = useState<WorkbenchFilters>(DEFAULT_WORKBENCH_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<WorkItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Fetch real data
  const { items: allItems, projects, owners, isLoading, error } = useWorkbenchData(programId, selectedProject);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.owners.length > 0) count++;
    if (filters.health.length > 0) count++;
    if (filters.status.length > 0) count++;
    if (filters.activeInPeriod !== 'any') count++;
    if (filters.hasDependencies !== null) count++;
    return count;
  }, [filters]);

  // Filter items with proper overlap logic for "Active in Period"
  const filteredItems = useMemo(() => {
    if (!selectedProject) return [];
    
    let items = [...allItems];

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      const matchesSearch = (item: WorkItem): boolean => {
        if (item.key.toLowerCase().includes(q) || item.title.toLowerCase().includes(q)) {
          return true;
        }
        // Also search children
        if (item.children) {
          return item.children.some(matchesSearch);
        }
        return false;
      };
      items = items.filter(matchesSearch);
    }

    // Owner filter
    if (filters.owners.length > 0) {
      const matchesOwner = (item: WorkItem): boolean => {
        if (item.owner && filters.owners.includes(item.owner)) return true;
        if (item.children) return item.children.some(matchesOwner);
        return false;
      };
      items = items.filter(matchesOwner);
    }

    // Health filter
    if (filters.health.length > 0) {
      const matchesHealth = (item: WorkItem): boolean => {
        if (filters.health.includes(item.health)) return true;
        if (item.children) return item.children.some(matchesHealth);
        return false;
      };
      items = items.filter(matchesHealth);
    }

    // Status filter
    if (filters.status.length > 0) {
      const matchesStatus = (item: WorkItem): boolean => {
        if (filters.status.includes(item.status)) return true;
        if (item.children) return item.children.some(matchesStatus);
        return false;
      };
      items = items.filter(matchesStatus);
    }

    // Active in Period filter with overlap logic
    if (filters.activeInPeriod !== 'any') {
      let periodStart: Date | null = null;
      let periodEnd: Date | null = null;

      if (filters.activeInPeriod === 'this-quarter') {
        const { start, end } = getCurrentQuarterDates();
        periodStart = start;
        periodEnd = end;
      } else if (filters.activeInPeriod === 'next-quarter') {
        const { start, end } = getNextQuarterDates();
        periodStart = start;
        periodEnd = end;
      } else if (filters.activeInPeriod === 'custom') {
        // Only apply custom range if both dates are set
        if (filters.customRangeStart && filters.customRangeEnd) {
          periodStart = filters.customRangeStart;
          periodEnd = filters.customRangeEnd;
        }
        // If custom range dates are missing, don't filter (default to 'any')
      }

      if (periodStart && periodEnd) {
        items = items.filter(item => isActiveInPeriod(item, periodStart!, periodEnd!));
      }
    }

    // Has Dependencies filter (TODO: wire to real dependency data when available)
    // Currently all items have dependencyCount: 0 as placeholder
    if (filters.hasDependencies !== null) {
      items = items.filter(item => 
        filters.hasDependencies ? item.dependencyCount > 0 : item.dependencyCount === 0
      );
    }

    return items;
  }, [selectedProject, allItems, search, filters]);

  const handleItemClick = (item: WorkItem) => {
    setSelectedItem(item);
    setDrawerOpen(true);
  };

  const projectOptions = [
    { value: '', label: 'Select a project...' }, 
    ...projects.map(p => ({ value: p.id, label: p.name }))
  ];

  return (
    <ProgramPageLayout>
      <div className="flex flex-col h-full">
        <GlobalPageHeader sectionLabel="PROGRAM" pageTitle="Execution Workbench" />

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-border bg-background">
          <div className="flex items-center gap-3">
            <Dropdown label="Project" value={selectedProject} options={projectOptions} onChange={setSelectedProject} />
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-2 text-sm border border-border rounded-md bg-background w-[200px] focus:outline-none focus:ring-1 focus:ring-brand-primary"
              />
            </div>

            <button
              onClick={() => setFiltersOpen(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-md hover:bg-muted/50 transition-colors"
            >
              <Filter className="h-4 w-4" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="text-xs text-muted-foreground">({activeFilterCount} applied)</span>
              )}
            </button>
          </div>

          <Dropdown label="View" value={view} options={VIEW_OPTIONS} onChange={(v) => setView(v as WorkbenchView)} />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full text-destructive">
              Error loading data: {error.message}
            </div>
          ) : !selectedProject ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Select a project to load execution data
            </div>
          ) : (
            <>
              {view === 'table' && <TableView items={filteredItems} onItemClick={handleItemClick} />}
              {view === 'gantt' && <GanttView items={filteredItems} onItemClick={handleItemClick} />}
              {view === 'roadmap' && <RoadmapView items={filteredItems} onItemClick={handleItemClick} />}
              {view === 'board' && <BoardView items={filteredItems} onItemClick={handleItemClick} />}
              {view === 'swimlane' && <SwimlaneView items={filteredItems} onItemClick={handleItemClick} />}
            </>
          )}
        </div>
      </div>

      <WorkbenchFiltersDialog
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        filters={filters}
        onFiltersChange={setFilters}
        owners={owners}
      />

      <WorkbenchDetailsDrawer
        item={selectedItem}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </ProgramPageLayout>
  );
}
