// ═══════════════════════════════════════════════════════════════════════════════
// OKR Hub V2 — Strategy Cockpit (Main Component)
// Enterprise-grade OKR dashboard with hierarchical tree view, smart filters,
// baseline progress with trend, and slide-in analytics drawer
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, BarChart3, Download, Plus, X, Filter, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { toast } from 'sonner';

import { StrategyTree } from './StrategyTree';
import { AnalyticsDrawerContent } from './AnalyticsDrawerContent';
import { CreateObjectiveDialogV2 } from '../CreateObjectiveDialogV2';
import { ObjectiveDrawerV2 } from '../ObjectiveDrawerV2';
import { OKRSmartFiltersDialog, OKRSmartFilters, countActiveFilters } from '../OKRSmartFiltersDialog';
import { OKRColumnChooser, DEFAULT_OKR_COLUMNS, type OKRColumn } from '../OKRColumnChooser';
import { OkrSummaryCards, type OkrSummaryMetrics } from '../shared/OkrSummaryCards';

import { useOKRStrategicData, useOKRThemes } from '../../hooks/useOKRStrategicData';
import type { TreeItem, Objective } from '../../lib/okrTypes';
import { exportOkrViewToCsv, getStatusLabel } from '../../lib/okrMetrics';

interface StrategyCockpitProps {
  snapshotId?: string;
}

export function StrategyCockpit({ snapshotId }: StrategyCockpitProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [selectedThemeIds, setSelectedThemeIds] = useState<string[]>([]);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<TreeItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<OKRSmartFilters>({});
  const [columns, setColumns] = useState<OKRColumn[]>(DEFAULT_OKR_COLUMNS);

  // Data fetching
  const { data: strategicData, isLoading, error } = useOKRStrategicData(snapshotId);
  const { data: themeChips } = useOKRThemes(snapshotId);

  const activeFilterCount = countActiveFilters(filters);

  // Compute summary metrics from objectives
  const summaryMetrics = useMemo<OkrSummaryMetrics>(() => {
    if (!strategicData?.themes) {
      return { totalObjectives: 0, onTrack: 0, atRisk: 0, blocked: 0 };
    }

    const allObjectives: Objective[] = strategicData.themes.flatMap(t => t.objectives || []);
    
    return {
      totalObjectives: allObjectives.length,
      onTrack: allObjectives.filter(o => o.status === 'on-track' || o.status === 'completed').length,
      atRisk: allObjectives.filter(o => o.status === 'at-risk' || o.status === 'off-track').length,
      blocked: allObjectives.filter(o => o.status === 'blocked').length,
    };
  }, [strategicData?.themes]);

  // Open create dialog when ?create=true is in URL
  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setShowCreateDialog(true);
      searchParams.delete('create');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Auto-expand first objective when data loads
  useEffect(() => {
    if (strategicData?.themes?.length && expandedIds.length === 0) {
      const firstObjective = strategicData.themes[0]?.objectives?.[0];
      if (firstObjective) {
        setExpandedIds([firstObjective.id]);
      }
    }
  }, [strategicData?.themes]);

  // Handlers
  const handleThemeToggle = (themeId: string | null) => {
    if (themeId === null) {
      setSelectedThemeIds([]);
    } else {
      setSelectedThemeIds((prev) =>
        prev.includes(themeId)
          ? prev.filter((id) => id !== themeId)
          : [...prev, themeId]
      );
    }
  };

  const handleToggle = (id: string) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelect = (item: TreeItem) => {
    setSelectedItem(item);
  };

  const handleCloseDrawer = () => {
    setSelectedItem(null);
  };

  const handleExport = () => {
    if (!strategicData?.themes) {
      toast.error('No data to export');
      return;
    }

    try {
      const filteredThemes = selectedThemeIds.length > 0
        ? strategicData.themes.filter((t) => selectedThemeIds.includes(t.id))
        : strategicData.themes;

      exportOkrViewToCsv(filteredThemes, 'okr-strategy-export');
      toast.success('Export downloaded successfully');
    } catch (err) {
      console.error('Export failed:', err);
      toast.error('Failed to export data');
    }
  };

  const handleAnalyticsClick = () => {
    toast.info('Analytics modal coming soon');
  };

  const handleClearFilters = () => {
    setFilters({});
    setSelectedThemeIds([]);
    setSearchQuery('');
  };

  // Get drawer title based on selected item type
  const getDrawerTitle = () => {
    if (!selectedItem) return '';
    if (selectedItem.type === 'objective') return 'Objective Analytics';
    if (selectedItem.type === 'keyResult') return 'Key Result Analytics';
    if (selectedItem.type === 'workItem') return 'Delivery Item Analytics';
    return 'Analytics';
  };

  // Check if any filters are active
  const hasActiveFilters = activeFilterCount > 0 || selectedThemeIds.length > 0 || searchQuery.trim().length > 0;

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center text-destructive">
          <p className="text-lg font-medium">Failed to load OKR data</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Page Header */}
      <div className="px-6 pt-6 pb-2 bg-background">
        <h1 className="text-2xl font-bold text-foreground">Objectives</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track and manage strategic objectives across all themes
        </p>
      </div>

      {/* Summary Cards */}
      <div className="px-6 py-4 bg-background">
        {isLoading ? (
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <OkrSummaryCards metrics={summaryMetrics} />
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="px-6 py-3 bg-background border-b border-border">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="flex items-center gap-2.5 flex-1 max-w-md px-4 py-2.5 bg-muted/50 rounded-lg border border-border">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search objectives, KRs, work items…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 h-auto p-0 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="flex items-center justify-center w-5 h-5 bg-muted-foreground/20 rounded-full hover:bg-muted-foreground/30"
              >
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Filters */}
          <Button
            variant="outline"
            size="sm"
            className="h-10 gap-1.5"
            onClick={() => setFiltersOpen(true)}
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 bg-brand-gold/20 text-brand-gold">
                {activeFilterCount}
              </Badge>
            )}
          </Button>

          {/* Column Chooser */}
          <OKRColumnChooser 
            columns={columns} 
            onColumnsChange={setColumns} 
          />

          {/* Actions */}
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>

            <Button size="sm" onClick={() => setShowCreateDialog(true)} className="gap-2 bg-brand-gold hover:bg-brand-gold-hover text-white">
              <Plus className="h-4 w-4" />
              New Objective
            </Button>
          </div>

          {/* Clear all filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-10 text-muted-foreground hover:text-foreground"
              onClick={handleClearFilters}
            >
              <X className="h-4 w-4 mr-1" />
              Clear all
            </Button>
          )}
        </div>
      </div>

      {/* Main Content - Full width tree */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <StrategyTree
            themes={strategicData?.themes || []}
            selectedThemeIds={selectedThemeIds}
            expandedIds={expandedIds}
            selectedItem={selectedItem}
            searchQuery={searchQuery}
            filters={filters}
            columns={columns}
            onToggle={handleToggle}
            onSelect={handleSelect}
          />
        )}
      </div>

      {/* Smart Filters Dialog */}
      <OKRSmartFiltersDialog
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        filters={filters}
        onFiltersChange={setFilters}
      />

      {/* Slide-in Analytics Drawer */}
      <Sheet open={!!selectedItem} onOpenChange={(open) => !open && handleCloseDrawer()}>
        <SheetContent 
          side="right" 
          className="w-screen sm:w-[500px] sm:max-w-[500px] p-0 flex flex-col"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>{getDrawerTitle()}</SheetTitle>
          </SheetHeader>
          {selectedItem && (
            <AnalyticsDrawerContent
              selectedItem={selectedItem}
              themes={strategicData?.themes || []}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Dialogs */}
      <CreateObjectiveDialogV2
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />

      <ObjectiveDrawerV2
        objectiveId={selectedObjectiveId}
        open={!!selectedObjectiveId}
        onClose={() => setSelectedObjectiveId(null)}
        onDuplicated={(newId) => setSelectedObjectiveId(newId)}
      />
    </div>
  );
}