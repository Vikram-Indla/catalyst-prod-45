/**
 * WorkBench views: Table/Gantt/Roadmap/Board/Swimlane
 * 
 * Program Execution Workbench - Main Page
 */

import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { ProgramPageLayout } from '@/components/program/ProgramPageLayout';
import { Search, Filter, ChevronDown, Check, Loader2, Table2, GanttChart, Map, LayoutGrid, Rows } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkItem, WorkbenchView, WorkbenchFilters, DEFAULT_WORKBENCH_FILTERS } from './types';
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
import { EpicDrawer } from '@/components/items/epics/EpicDrawer';
import { FeatureDetailsPanel } from '@/components/items/features/FeatureDetailsPanel';
import { supabase } from '@/integrations/supabase/client';
import type { Feature } from '@/types/feature.types';

// View configuration with icons
const VIEW_CONFIG: { id: WorkbenchView; label: string; icon: React.ElementType }[] = [
  { id: 'table', label: 'Table', icon: Table2 },
  { id: 'gantt', label: 'Gantt', icon: GanttChart },
  { id: 'roadmap', label: 'Roadmap', icon: Map },
  { id: 'board', label: 'Board', icon: LayoutGrid },
  { id: 'swimlane', label: 'Swimlane', icon: Rows },
];

// Segmented View Selector - Claude Variant A style
function ViewSelector({ value, onChange }: { value: WorkbenchView; onChange: (v: WorkbenchView) => void }) {
  return (
    <div className="flex items-center gap-0.5 p-1 rounded-lg bg-muted/60 border border-border">
      {VIEW_CONFIG.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all",
            value === id
              ? "bg-gradient-to-r from-brand-gold to-secondary-bronze text-background shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}

// Project Dropdown component
function ProjectDropdown({ label, value, options, onChange, className }: {
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
        className="flex items-center gap-2 px-3 py-1.5 text-sm border border-border rounded-md bg-background hover:bg-muted/50 transition-colors min-w-[140px]"
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform flex-shrink-0", open && "rotate-180")} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 bg-background border border-border rounded-md shadow-lg z-[500] min-w-[180px] max-h-[300px] overflow-auto">
            {options.map(opt => (
              <div
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted cursor-pointer",
                  opt.value === value && "bg-muted"
                )}
              >
                {opt.value === value && <Check className="h-3.5 w-3.5 text-brand-primary" />}
                <span className={opt.value !== value ? "pl-5" : ""}>{opt.label}</span>
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
  if (!item.startDate && !item.endDate) return true;
  
  const itemStart = item.startDate ? new Date(item.startDate) : null;
  const itemEnd = item.endDate ? new Date(item.endDate) : null;
  
  if (itemStart && itemEnd) {
    return itemStart <= periodEnd && itemEnd >= periodStart;
  }
  if (itemStart && !itemEnd) {
    return itemStart <= periodEnd;
  }
  if (!itemStart && itemEnd) {
    return itemEnd >= periodStart;
  }
  
  return true;
}

// Empty State Component
function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-16 px-4">
      <div className="w-16 h-16 rounded-2xl bg-muted/50 border border-border flex items-center justify-center mb-4">
        <Table2 className="h-8 w-8 text-muted-foreground/50" />
      </div>
      <h3 className="text-sm font-medium text-foreground mb-1">No items to display</h3>
      <p className="text-xs text-muted-foreground text-center max-w-[300px]">{message}</p>
    </div>
  );
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
  
  // Full drawer states for Epic and Feature
  const [selectedEpicId, setSelectedEpicId] = useState<string | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);

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

  // Filter items
  const filteredItems = useMemo(() => {
    let items = [...allItems];

    if (search) {
      const q = search.toLowerCase();
      const matchesSearch = (item: WorkItem): boolean => {
        if (item.key.toLowerCase().includes(q) || item.title.toLowerCase().includes(q)) {
          return true;
        }
        if (item.children) {
          return item.children.some(matchesSearch);
        }
        return false;
      };
      items = items.filter(matchesSearch);
    }

    if (filters.owners.length > 0) {
      const matchesOwner = (item: WorkItem): boolean => {
        if (item.owner && filters.owners.includes(item.owner)) return true;
        if (item.children) return item.children.some(matchesOwner);
        return false;
      };
      items = items.filter(matchesOwner);
    }

    if (filters.health.length > 0) {
      const matchesHealth = (item: WorkItem): boolean => {
        if (filters.health.includes(item.health)) return true;
        if (item.children) return item.children.some(matchesHealth);
        return false;
      };
      items = items.filter(matchesHealth);
    }

    if (filters.status.length > 0) {
      const matchesStatus = (item: WorkItem): boolean => {
        if (filters.status.includes(item.status)) return true;
        if (item.children) return item.children.some(matchesStatus);
        return false;
      };
      items = items.filter(matchesStatus);
    }

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
        if (filters.customRangeStart && filters.customRangeEnd) {
          periodStart = filters.customRangeStart;
          periodEnd = filters.customRangeEnd;
        }
      }

      if (periodStart && periodEnd) {
        items = items.filter(item => isActiveInPeriod(item, periodStart!, periodEnd!));
      }
    }

    if (filters.hasDependencies !== null) {
      items = items.filter(item => 
        filters.hasDependencies ? item.dependencyCount > 0 : item.dependencyCount === 0
      );
    }

    return items;
  }, [allItems, search, filters]);

  const handleItemClick = (item: WorkItem) => {
    // For epics and features, open full drawer directly
    if (item.type === 'epic') {
      setSelectedEpicId(item.id);
      return;
    }
    if (item.type === 'feature') {
      handleOpenFullDrawer(item);
      return;
    }
    // For other types, open QuickView
    setSelectedItem(item);
    setDrawerOpen(true);
  };

  // Open full drawer for epic or feature
  const handleOpenFullDrawer = async (item: WorkItem) => {
    setDrawerOpen(false); // Close QuickView first
    
    if (item.type === 'epic') {
      setSelectedEpicId(item.id);
    } else if (item.type === 'feature') {
      // Fetch feature data for the panel
      const { data: feature } = await supabase
        .from('features')
        .select('*')
        .eq('id', item.id)
        .single();
      if (feature) {
        setSelectedFeature(feature as Feature);
      }
    }
  };

  const projectOptions = [
    { value: '', label: 'All projects' }, 
    ...projects.map(p => ({ value: p.id, label: p.name }))
  ];

  const getEmptyMessage = () => {
    if (allItems.length === 0) {
      return 'No execution items found in this program. Create epics with features and stories to see them here.';
    }
    return 'No items match your current filters. Try adjusting your search or filter criteria.';
  };

  return (
    <ProgramPageLayout>
      <div className="flex flex-col h-full">
        <GlobalPageHeader sectionLabel="PROGRAM" pageTitle="Program Execution Workbench" />

        {/* Toolbar - Enhanced Claude Variant A style */}
        <div className="flex items-center justify-between gap-4 px-4 py-2.5 border-b border-border bg-card/50">
          {/* Left: Project + Search + Filters */}
          <div className="flex items-center gap-2.5">
            <ProjectDropdown 
              label="Project" 
              value={selectedProject} 
              options={projectOptions} 
              onChange={setSelectedProject} 
            />
            
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-sm border border-border rounded-md bg-background w-[180px] focus:outline-none focus:ring-1 focus:ring-brand-primary placeholder:text-muted-foreground"
              />
            </div>

            <button
              onClick={() => setFiltersOpen(true)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 text-sm border rounded-md transition-colors",
                activeFilterCount > 0
                  ? "border-brand-gold/50 bg-brand-gold/10 text-brand-gold"
                  : "border-border hover:bg-muted/50"
              )}
            >
              <Filter className="h-3.5 w-3.5" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="text-[10px] bg-brand-gold/20 px-1.5 py-0.5 rounded-full">{activeFilterCount}</span>
              )}
            </button>
          </div>

          {/* Right: View Selector */}
          <ViewSelector value={view} onChange={setView} />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden bg-background">
          {isLoading ? (
            <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading workbench data...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full text-destructive">
              <span className="text-sm">Error loading data: {error.message}</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <EmptyState message={getEmptyMessage()} />
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
        onOpenFullDrawer={handleOpenFullDrawer}
      />

      {/* Epic Drawer */}
      <EpicDrawer
        isOpen={!!selectedEpicId}
        onClose={() => setSelectedEpicId(null)}
        epicId={selectedEpicId}
      />

      {/* Feature Details Panel */}
      <FeatureDetailsPanel
        feature={selectedFeature || undefined}
        open={!!selectedFeature}
        onClose={() => setSelectedFeature(null)}
      />
    </ProgramPageLayout>
  );
}
