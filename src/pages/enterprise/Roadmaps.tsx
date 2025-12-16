// Enterprise Roadmaps Page - CIO-Level Strategic Visibility Dashboard
// Route: /enterprise/roadmaps
// Complete redesign with split-view Gantt chart

import { useState, useCallback, useRef } from 'react';
import { Plus, ChevronRight, Map } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageChrome } from '@/components/layout/PageChrome';
import { ThemeDetailsDrawer } from '@/components/backlog/ThemeDetailsDrawer';
import { ObjectiveAnalyticsDrawer } from '@/modules/okr-v2/components/ObjectiveAnalyticsDrawer';
import { EpicDetailsPanel } from '@/components/items/epics/EpicDetailsPanel';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

import { 
  RoadmapToolbar, 
  RoadmapThemePanel, 
  RoadmapGanttChart,
  RoadmapExecutiveSummary,
  useRoadmapData,
  exportRoadmapToPDF,
  TimeScale,
  RoadmapItem,
  Milestone
} from '@/components/enterprise-roadmap';

export default function EnterpriseRoadmapsPage() {
  // Refs for PDF export
  const ganttRef = useRef<HTMLDivElement>(null);
  const themePanelRef = useRef<HTMLDivElement>(null);

  // State
  const [timeScale, setTimeScale] = useState<TimeScale>('quarterly');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMilestones, setShowMilestones] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedItem, setSelectedItem] = useState<RoadmapItem | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Fetch roadmap data
  const { items, milestones, isLoading } = useRoadmapData();

  // Fetch selected item details for drawers
  const { data: selectedTheme } = useQuery({
    queryKey: ['roadmap-theme-detail', selectedItem?.id],
    queryFn: async () => {
      if (!selectedItem || selectedItem.type !== 'theme') return null;
      const { data, error } = await supabase
        .from('strategic_themes')
        .select('*')
        .eq('id', selectedItem.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedItem && selectedItem.type === 'theme',
  });

  const { data: selectedEpic } = useQuery({
    queryKey: ['roadmap-epic-detail', selectedItem?.id],
    queryFn: async () => {
      if (!selectedItem || selectedItem.type !== 'epic') return null;
      const { data, error } = await supabase
        .from('epics')
        .select('*')
        .eq('id', selectedItem.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedItem && selectedItem.type === 'epic',
  });

  // Handlers
  const handleToggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelectItem = useCallback((item: RoadmapItem) => {
    setSelectedItem(item);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setSelectedItem(null);
  }, []);

  const handleTodayClick = useCallback(() => {
    setSelectedYear(new Date().getFullYear());
  }, []);

  const handleMilestoneClick = useCallback((milestone: Milestone) => {
    console.log('Milestone clicked:', milestone);
  }, []);

  const handleExportClick = useCallback(async () => {
    if (!ganttRef.current) {
      toast.error('Unable to export - roadmap not ready');
      return;
    }
    
    setIsExporting(true);
    toast.info('Generating PDF...');
    
    try {
      await exportRoadmapToPDF(
        ganttRef.current,
        themePanelRef.current,
        {
          title: 'Enterprise Roadmap',
          subtitle: `Strategic Themes • ${selectedYear}`,
        }
      );
      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export PDF');
    } finally {
      setIsExporting(false);
    }
  }, [selectedYear]);

  const handleFullscreenClick = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  }, []);

  // Header actions
  const headerActions = (
    <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-brand-gold hover:bg-brand-gold-hover text-white transition-colors">
      <Plus size={16} />
      Create
    </button>
  );

  // Empty state
  if (!isLoading && items.length === 0) {
    return (
      <PageChrome rightActions={headerActions}>
        <div className="flex-1 flex items-center justify-center bg-muted/30">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center bg-brand-gold/10">
              <Map size={40} className="text-brand-gold" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              No roadmap items yet
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              Start building your strategic roadmap by adding themes, objectives, and epics with timeline information.
            </p>
            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-brand-gold hover:bg-brand-gold-hover text-white transition-colors">
              <Plus size={16} />
              Add First Item
            </button>
          </div>
        </div>
      </PageChrome>
    );
  }

  return (
    <PageChrome rightActions={headerActions}>
      <div className="flex-1 flex flex-col min-h-0 bg-muted/30">
        {/* Executive Summary Strip (per markdown spec) */}
        <RoadmapExecutiveSummary items={items} />

        {/* Toolbar */}
        <RoadmapToolbar
          timeScale={timeScale}
          onTimeScaleChange={setTimeScale}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          showMilestones={showMilestones}
          onToggleMilestones={() => setShowMilestones(!showMilestones)}
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
          onTodayClick={handleTodayClick}
          onExportClick={handleExportClick}
          onFullscreenClick={handleFullscreenClick}
        />

        {/* Main Content: Split View */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Left Panel: Theme List */}
          <div ref={themePanelRef}>
            <RoadmapThemePanel
              items={items}
              expandedIds={expandedIds}
              selectedId={selectedItem?.id || null}
              onToggleExpand={handleToggleExpand}
              onSelectItem={handleSelectItem}
              searchQuery={searchQuery}
            />
          </div>

          {/* Right Panel: Gantt Chart */}
          <div ref={ganttRef} className="flex-1 overflow-auto">
            <RoadmapGanttChart
              items={items}
              expandedIds={expandedIds}
              selectedId={selectedItem?.id || null}
              milestones={milestones}
              showMilestones={showMilestones}
              timeScale={timeScale}
              selectedYear={selectedYear}
              onItemClick={handleSelectItem}
              onMilestoneClick={handleMilestoneClick}
            />
          </div>
        </div>
      </div>

      {/* Theme Details Drawer */}
      {selectedTheme && selectedItem?.type === 'theme' && (
        <ThemeDetailsDrawer
          theme={selectedTheme}
          isOpen={true}
          onClose={handleCloseDrawer}
        />
      )}

      {/* Objective Analytics Drawer */}
      <ObjectiveAnalyticsDrawer
        objectiveId={selectedItem?.type === 'objective' ? selectedItem.id : null}
        open={selectedItem?.type === 'objective'}
        onClose={handleCloseDrawer}
      />

      {/* Epic Details Drawer */}
      {selectedEpic && selectedItem?.type === 'epic' && (
        <EpicDetailsPanel
          epic={selectedEpic}
          open={true}
          onClose={handleCloseDrawer}
        />
      )}
    </PageChrome>
  );
}
