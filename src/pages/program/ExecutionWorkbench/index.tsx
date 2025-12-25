/**
 * WorkBench - Table view only
 * 
 * Program Execution Workbench - Main Page
 */

import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { ProgramPageLayout } from '@/components/program/ProgramPageLayout';
import { Loader2, Table2 } from 'lucide-react';
import { WorkItem, WorkbenchFilters, DEFAULT_WORKBENCH_FILTERS } from './types';
import { WorkbenchFiltersDialog } from './WorkbenchFiltersDialog';
import { WorkbenchDetailsDrawer } from './WorkbenchDetailsDrawer';
import { TableView } from './views/TableView';
import { PageChrome } from '@/components/layout/PageChrome';
import { useWorkbenchData } from './useWorkbenchData';
import { startOfQuarter, endOfQuarter, addQuarters } from 'date-fns';
import { EpicDrawer } from '@/components/items/epics/EpicDrawer';
import { FeatureDetailsPanel } from '@/components/items/features/FeatureDetailsPanel';
import { supabase } from '@/integrations/supabase/client';
import type { Feature } from '@/types/feature.types';

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
  
  const [filters, setFilters] = useState<WorkbenchFilters>(DEFAULT_WORKBENCH_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<WorkItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  // Full drawer states for Epic and Feature
  const [selectedEpicId, setSelectedEpicId] = useState<string | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);

  // Fetch real data - no project filter
  const { items: allItems, owners, isLoading, error, counts, overallProgress } = useWorkbenchData(programId, '');

  // Filter items
  const filteredItems = useMemo(() => {
    let items = [...allItems];

    if (filters.owners.length > 0) {
      const matchesOwner = (item: WorkItem): boolean => {
        if (item.owner && filters.owners.includes(item.owner.id)) return true;
        if (item.children) return item.children.some(matchesOwner);
        return false;
      };
      items = items.filter(matchesOwner);
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
  }, [allItems, filters]);

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

  const getEmptyMessage = () => {
    if (allItems.length === 0) {
      return 'No execution items found in this program. Create epics with features and stories to see them here.';
    }
    return 'No items match your current filters. Try adjusting your filter criteria.';
  };

  return (
    <ProgramPageLayout>
      <div className="flex flex-col h-full">
        {/* Header - compact PageChrome style */}
        <div className="shrink-0 bg-card">
          <div className="flex items-center px-4 h-11 border-b border-border">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-foreground/50">
                PROGRAM
              </span>
              <span className="text-[12px] text-foreground/40">/</span>
              <h1 className="text-[16px] font-semibold text-foreground">
                Work Tree
              </h1>
            </div>
          </div>
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
            <TableView items={filteredItems} onItemClick={handleItemClick} counts={counts} overallProgress={overallProgress} />
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
