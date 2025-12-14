// ═══════════════════════════════════════════════════════════════════════════════
// OKR Hub V2 — Strategy Cockpit (Main Component)
// Enterprise-grade OKR dashboard with hierarchical tree view and analytics drawer
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, BarChart3, Download, Plus, X, Target, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

import { ThemeFilterBar } from './ThemeFilterBar';
import { StrategyTree } from './StrategyTree';
import { AnalyticsDrawer } from './AnalyticsDrawer';
import { CreateObjectiveDialogV2 } from '../CreateObjectiveDialogV2';
import { ObjectiveDrawerV2 } from '../ObjectiveDrawerV2';

import { useOKRStrategicData, useOKRThemes } from '../../hooks/useOKRStrategicData';
import type { Theme, TreeItem } from '../../lib/okrTypes';
import { exportOkrViewToCsv } from '../../lib/okrMetrics';

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

  // Data fetching
  const { data: strategicData, isLoading, error } = useOKRStrategicData(snapshotId);
  const { data: themeChips } = useOKRThemes(snapshotId);

  // Open create dialog when ?create=true is in URL
  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setShowCreateDialog(true);
      searchParams.delete('create');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Auto-expand first theme when data loads
  useEffect(() => {
    if (strategicData?.themes?.length && expandedIds.length === 0) {
      setExpandedIds([strategicData.themes[0].id]);
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
    
    // If it's an objective, also set selectedObjectiveId for drawer
    if (item.type === 'objective') {
      // Optionally open the objective drawer
      // setSelectedObjectiveId(item.id);
    }
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
    // TODO: Open analytics modal
    toast.info('Analytics modal coming soon');
  };

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
      {/* Top Bar */}
      <div className="flex justify-between items-center px-6 py-4 bg-card border-b border-border">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-semibold text-brand-gold">OKR Hub v2</span>
          <span className="text-muted-foreground/50">/</span>
          <span>Enterprise</span>
          <span className="text-muted-foreground/50">/</span>
          <span className="text-foreground font-medium">Strategy Cockpit</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleAnalyticsClick} className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </Button>

          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>

          <Button size="sm" onClick={() => setShowCreateDialog(true)} className="gap-2 bg-brand-gold hover:bg-brand-gold-hover text-white">
            <Plus className="h-4 w-4" />
            New Objective
          </Button>
        </div>
      </div>

      {/* Theme Filter Bar */}
      {isLoading ? (
        <div className="px-6 py-3 bg-card border-b border-border">
          <div className="flex gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-36" />
          </div>
        </div>
      ) : (
        <ThemeFilterBar
          themes={themeChips || []}
          selectedThemeIds={selectedThemeIds}
          onThemeToggle={handleThemeToggle}
        />
      )}

      {/* Search Bar */}
      <div className="px-6 py-3 bg-card border-b border-border">
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-muted/50 rounded-lg border border-border">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search themes, objectives, KRs…"
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
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {isLoading ? (
          <>
            {/* Loading skeleton for tree */}
            <div className="flex-1 p-4 space-y-2 min-w-[580px]">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
            {/* Loading skeleton for drawer */}
            <div className="flex-[0_0_420px] p-4">
              <Skeleton className="h-full w-full" />
            </div>
          </>
        ) : (
          <>
            {/* Strategy Tree */}
            <StrategyTree
              themes={strategicData?.themes || []}
              selectedThemeIds={selectedThemeIds}
              expandedIds={expandedIds}
              selectedItem={selectedItem}
              searchQuery={searchQuery}
              onToggle={handleToggle}
              onSelect={handleSelect}
            />

            {/* Analytics Drawer */}
            <AnalyticsDrawer
              selectedItem={selectedItem}
              themes={strategicData?.themes || []}
            />
          </>
        )}
      </div>

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
