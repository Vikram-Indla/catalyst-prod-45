// Enterprise Roadmaps Page - CIO-Level Strategic Visibility Dashboard
// Route: /enterprise/roadmaps
// Per MD spec: bar-based timeline with exact layout specifications

import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { ThemeDetailsDrawer } from '@/components/backlog/ThemeDetailsDrawer';
import { ObjectiveAnalyticsDrawer } from '@/modules/okr-v2/components/ObjectiveAnalyticsDrawer';
import { EpicDetailsPanel } from '@/components/items/epics/EpicDetailsPanel';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { PageChrome } from '@/components/layout/PageChrome';
import {
  Search, 
  Filter, 
  Calendar, 
  Download, 
  Flag, 
  ChevronRight,
  Layers,
  X,
  CheckCircle,
  AlertTriangle,
  XCircle
} from 'lucide-react';

import { 
  useRoadmapData,
  RoadmapItem,
} from '@/components/enterprise-roadmap';

// Constants per MD spec
const ROW_HEIGHT = 80;
const LEFT_COLUMN_WIDTH = 340;

// Status configuration per MD spec - using CSS variables
const statusConfig = {
  ontrack: {
    label: 'On Track',
    bgClass: 'bg-[var(--status-success-bg)]',
    textClass: 'text-[var(--status-success)]',
    borderClass: 'border-l-[var(--status-success)]',
    dotClass: 'bg-[var(--status-success)]',
    icon: CheckCircle,
  },
  atrisk: {
    label: 'At Risk',
    bgClass: 'bg-[var(--status-info-bg)]',
    textClass: 'text-[var(--status-info)]',
    borderClass: 'border-l-[var(--status-info)]',
    dotClass: 'bg-[var(--status-info)]',
    icon: AlertTriangle,
  },
  delayed: {
    label: 'Delayed',
    bgClass: 'bg-destructive/10',
    textClass: 'text-destructive',
    borderClass: 'border-l-destructive',
    dotClass: 'bg-destructive',
    icon: XCircle,
  },
};

// Map database status to display status
function getDisplayStatus(item: RoadmapItem): 'ontrack' | 'atrisk' | 'delayed' {
  const health = item.health;
  const status = item.status;
  
  if (health === 'on-track' || status === 'active' || status === 'done') return 'ontrack';
  if (health === 'at-risk' || status === 'proposed' || status === 'in-progress') return 'atrisk';
  if (health === 'delayed' || status === 'off-track') return 'delayed';
  return 'ontrack';
}

// Calculate timeline position percentages
function calculateTimelinePosition(startDate: string, endDate: string, yearStart: Date, yearEnd: Date) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const totalMs = yearEnd.getTime() - yearStart.getTime();
  
  const startPercent = Math.max(0, Math.min(100, ((start.getTime() - yearStart.getTime()) / totalMs) * 100));
  const endPercent = Math.max(0, Math.min(100, ((end.getTime() - yearStart.getTime()) / totalMs) * 100));
  const widthPercent = Math.max(2, endPercent - startPercent);
  
  return { startPercent, widthPercent };
}

export default function EnterpriseRoadmapsPage() {
  const [viewMode, setViewMode] = useState<'monthly' | 'quarterly' | 'yearly'>('quarterly');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear] = useState(new Date().getFullYear());
  const [selectedItem, setSelectedItem] = useState<RoadmapItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Fetch roadmap data
  const { items, isLoading } = useRoadmapData();

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

  const openDrawer = useCallback((item: RoadmapItem) => {
    setSelectedItem(item);
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setTimeout(() => setSelectedItem(null), 300);
  }, []);

  // Timeline calculations
  const yearStart = new Date(selectedYear, 0, 1);
  const yearEnd = new Date(selectedYear, 11, 31);
  const today = new Date();
  const todayPercent = ((today.getTime() - yearStart.getTime()) / (yearEnd.getTime() - yearStart.getTime())) * 100;

  // Quarters for header
  const quarters = [
    { label: 'Q1', year: String(selectedYear) },
    { label: 'Q2', year: String(selectedYear) },
    { label: 'Q3', year: String(selectedYear) },
    { label: 'Q4', year: String(selectedYear) },
  ];

  // Calculate status counts
  const statusCounts = {
    ontrack: items.filter(t => getDisplayStatus(t) === 'ontrack').length,
    atrisk: items.filter(t => getDisplayStatus(t) === 'atrisk').length,
    delayed: items.filter(t => getDisplayStatus(t) === 'delayed').length,
  };

  // Filter items by search
  const filteredItems = searchQuery
    ? items.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.strategy?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : items;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary" />
      </div>
    );
  }

  // Toolbar component for PageChrome
  const toolbar = (
    <div className="flex items-center justify-between gap-4 w-full">
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-md w-[260px] focus-within:border-brand-primary focus-within:ring-1 focus-within:ring-brand-primary/30">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search themes, objectives..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
        </div>

        {/* View Toggle */}
        <div className="flex bg-card border border-border rounded-md overflow-hidden">
          {(['monthly', 'quarterly', 'yearly'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={cn(
                "px-3 py-2 text-[13px] font-medium transition-colors capitalize",
                viewMode === mode
                  ? 'bg-brand-primary text-white'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="flex items-center gap-2 px-3 py-2 text-[13px] font-medium bg-card border border-border rounded-md text-muted-foreground hover:border-brand-primary/50 transition-colors">
          <Filter className="w-4 h-4" />
          Filters
        </button>
        <button className="flex items-center gap-2 px-3 py-2 text-[13px] font-medium bg-card border border-border rounded-md text-muted-foreground hover:border-brand-primary/50 transition-colors">
          <Flag className="w-4 h-4" />
          Milestones
        </button>
        <button className="flex items-center gap-2 px-3 py-2 text-[13px] font-medium bg-card border border-border rounded-md text-muted-foreground hover:border-brand-primary/50 transition-colors">
          <Calendar className="w-4 h-4" />
          {selectedYear}
        </button>
        <button className="flex items-center gap-2 px-3 py-2 text-[13px] font-medium bg-card border border-border rounded-md text-muted-foreground hover:border-brand-primary/50 transition-colors">
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>
    </div>
  );

  return (
    <PageChrome toolbar={toolbar}>
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Executive Summary Strip */}
        <div className="px-6 pt-4 pb-4">
          <div className="flex items-center gap-6 px-5 py-4 bg-card border border-border rounded-[10px]">
            {/* Total Themes */}
            <div className="flex flex-col gap-0.5">
              <span className="text-[20px] font-bold text-foreground">
                {items.length}
              </span>
              <span className="text-[11px] font-medium uppercase tracking-[0.3px] text-muted-foreground">
                Total Themes
              </span>
            </div>

            <div className="w-px h-10 bg-border" />

            {/* Status Counts */}
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full", statusConfig.ontrack.dotClass)} />
                <span className="text-sm font-medium text-muted-foreground">
                  {statusCounts.ontrack} On Track
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full", statusConfig.atrisk.dotClass)} />
                <span className="text-sm font-medium text-muted-foreground">
                  {statusCounts.atrisk} At Risk
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full", statusConfig.delayed.dotClass)} />
                <span className="text-sm font-medium text-muted-foreground">
                  {statusCounts.delayed} Delayed
                </span>
              </div>
            </div>

            {/* Today Indicator */}
            <div className="ml-auto flex items-center gap-2 text-[13px] text-muted-foreground">
              <div className="w-2.5 h-2.5 bg-brand-primary rotate-45" />
              <span>Today: {format(today, 'MMM d, yyyy')}</span>
            </div>
          </div>
        </div>

        {/* Roadmap Container */}
        <div className="flex-1 mx-6 mb-6 bg-card border border-border rounded-[10px] overflow-hidden flex flex-col">
        {/* Header Row */}
        <div className="flex border-b border-border bg-muted/50">
          {/* Left Column Header */}
          <div 
            className="flex-shrink-0 px-4 py-3 border-r border-border flex items-center gap-5"
            style={{ width: LEFT_COLUMN_WIDTH }}
          >
            <span className="text-[11px] font-semibold uppercase tracking-[0.3px] text-muted-foreground flex-1">
              Theme
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.3px] text-muted-foreground w-20 text-center">
              Status
            </span>
          </div>

          {/* Quarter Headers */}
          <div className="flex-1 flex">
            {quarters.map((q, i) => (
              <div
                key={i}
                className="flex-1 min-w-[180px] px-4 py-3 text-center border-r border-border/50 last:border-r-0"
              >
                <div className="text-base font-semibold text-foreground">
                  {q.label}
                </div>
                <div className="text-sm text-muted-foreground">{q.year}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Theme List (Left Column) */}
          <div 
            className="flex-shrink-0 border-r border-border overflow-y-auto"
            style={{ width: LEFT_COLUMN_WIDTH }}
          >
            {filteredItems.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No themes found
              </div>
            ) : (
              filteredItems.map((item) => {
                const displayStatus = getDisplayStatus(item);
                const config = statusConfig[displayStatus];
                return (
                  <div
                    key={item.id}
                    onClick={() => openDrawer(item)}
                    className="flex items-center gap-3 px-4 py-4 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors"
                    style={{ minHeight: ROW_HEIGHT }}
                  >
                    {/* Expand Icon */}
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />

                    {/* Theme Icon */}
                    <div className="w-8 h-8 rounded-lg bg-brand-primary/15 flex items-center justify-center flex-shrink-0">
                      <Layers className="w-[18px] h-[18px] text-secondary-bronze" />
                    </div>

                    {/* Theme Details */}
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] text-muted-foreground mb-0.5">
                        # {item.id.slice(0, 8)}
                      </div>
                      <div className="text-sm font-semibold text-foreground truncate mb-0.5">
                        {item.name}
                      </div>
                      <div className="text-[12px] text-muted-foreground">
                        {format(new Date(item.startDate), 'MMM d, yyyy')} → {format(new Date(item.endDate), 'MMM d, yyyy')}
                      </div>
                    </div>

                    {/* Status Pill */}
                    <div className="w-20 flex justify-center flex-shrink-0">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-full",
                        config.bgClass,
                        config.textClass
                      )}>
                        {config.label}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Timeline Grid (Right Side) */}
          <div className="flex-1 overflow-x-auto overflow-y-auto">
            <div className="min-w-[720px] relative">
              {/* Quarter Column Backgrounds */}
              <div className="absolute inset-0 flex pointer-events-none">
                {quarters.map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 min-w-[180px] border-r border-border/30 last:border-r-0"
                  />
                ))}
              </div>

              {/* Today Line */}
              {todayPercent >= 0 && todayPercent <= 100 && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-brand-primary z-10"
                  style={{ left: `${todayPercent}%` }}
                >
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-brand-primary bg-card px-1.5 py-0.5 rounded whitespace-nowrap">
                    Today
                  </span>
                </div>
              )}

              {/* Timeline Rows */}
              {filteredItems.map((item) => {
                const displayStatus = getDisplayStatus(item);
                const config = statusConfig[displayStatus];
                const { startPercent, widthPercent } = calculateTimelinePosition(
                  item.startDate,
                  item.endDate,
                  yearStart,
                  yearEnd
                );

                return (
                  <div
                    key={item.id}
                    className="relative border-b border-border flex items-center px-3"
                    style={{ height: ROW_HEIGHT }}
                  >
                    {/* Theme Bar */}
                    <div
                      className="absolute h-9"
                      style={{
                        left: `${startPercent}%`,
                        width: `${widthPercent}%`,
                        top: '50%',
                        transform: 'translateY(-50%)',
                      }}
                    >
                      <div
                        className={cn(
                          "h-full bg-brand-primary/15 rounded-md border border-border relative overflow-visible border-l-[3px]",
                          config.borderClass
                        )}
                      >
                        {/* Progress Fill */}
                        <div
                          className="absolute left-0 top-0 bottom-0 bg-brand-primary opacity-50 rounded-l"
                          style={{ width: `${item.progress}%` }}
                        />

                        {/* Milestones inside bar */}
                        {item.milestones?.map((milestone, mIdx) => {
                          const milestoneDate = new Date(milestone.date);
                          const itemStart = new Date(item.startDate).getTime();
                          const itemEnd = new Date(item.endDate).getTime();
                          const positionPercent = ((milestoneDate.getTime() - itemStart) / (itemEnd - itemStart)) * 100;
                          
                          if (positionPercent < 0 || positionPercent > 100) return null;

                          return (
                            <div
                              key={milestone.id || mIdx}
                              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 bg-secondary-bronze rotate-45 border-2 border-card cursor-pointer hover:scale-125 transition-transform z-10 group"
                              style={{ left: `${positionPercent}%` }}
                            >
                              {/* Tooltip */}
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 -rotate-45 bg-foreground text-background text-[11px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                {milestone.name}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Drawer Overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-[100]"
          onClick={closeDrawer}
        />
      )}

      {/* Theme Preview Drawer (only for themes without full drawer) */}
      {selectedItem?.type === 'theme' && !selectedTheme && drawerOpen && (
        <ThemePreviewDrawer 
          item={selectedItem} 
          open={drawerOpen} 
          onClose={closeDrawer}
        />
      )}

      {/* Full Theme Details Drawer */}
      {selectedTheme && selectedItem?.type === 'theme' && (
        <ThemeDetailsDrawer
          theme={selectedTheme}
          isOpen={drawerOpen}
          onClose={closeDrawer}
        />
      )}

      {/* Objective Analytics Drawer */}
      <ObjectiveAnalyticsDrawer
        objectiveId={selectedItem?.type === 'objective' ? selectedItem.id : null}
        open={selectedItem?.type === 'objective' && drawerOpen}
        onClose={closeDrawer}
      />

      {/* Epic Details Drawer */}
      {selectedEpic && selectedItem?.type === 'epic' && (
        <EpicDetailsPanel
          epic={selectedEpic}
          open={drawerOpen}
          onClose={closeDrawer}
        />
      )}
      </div>
    </PageChrome>
  );
}

// Theme Preview Drawer Component (per MD spec with gold vertical line)
function ThemePreviewDrawer({ 
  item, 
  open, 
  onClose,
}: { 
  item: RoadmapItem;
  open: boolean; 
  onClose: () => void;
}) {
  const displayStatus = getDisplayStatus(item);
  const config = statusConfig[displayStatus];
  const StatusIcon = config.icon;

  return (
    <div
      className={cn(
        "fixed top-0 right-0 bottom-0 w-[420px] bg-card border-l border-border shadow-lg z-[101] transform transition-transform duration-300 flex flex-col",
        open ? 'translate-x-0' : 'translate-x-full'
      )}
    >
      {/* Drawer Header */}
      <div className="px-6 pt-6 pb-5 border-b border-border flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.5px] bg-secondary-green text-white rounded">
              Theme
            </span>
            <span className={cn(
              "px-2.5 py-1 text-[11px] font-semibold rounded-full",
              config.bgClass,
              config.textClass
            )}>
              {config.label}
            </span>
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-1">
            {item.name}
          </h2>
          <div className="text-[13px] text-muted-foreground">
            Updated about 3 hours ago
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Drawer Body with Gold Line */}
      <div className="flex-1 flex min-h-0">
        {/* Gold Vertical Line — FULL HEIGHT */}
        <div className="w-1 bg-brand-primary flex-shrink-0" />

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Description */}
          <div className="mb-5">
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.5px] text-muted-foreground mb-3">
              Description
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {item.strategy || 'No description available.'}
            </p>
          </div>

          {/* Gold Divider */}
          <div className="h-px bg-secondary-champagne mb-5" />

          {/* Timeline */}
          <div className="mb-5">
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.5px] text-muted-foreground mb-3">
              Timeline
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div>
                  <div className="text-[11px] text-muted-foreground mb-0.5">START</div>
                  <div className="text-sm font-medium text-foreground">
                    {format(new Date(item.startDate), 'MMM d, yyyy')}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div>
                  <div className="text-[11px] text-muted-foreground mb-0.5">END</div>
                  <div className="text-sm font-medium text-foreground">
                    {format(new Date(item.endDate), 'MMM d, yyyy')}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Gold Divider */}
          <div className="h-px bg-secondary-champagne mb-5" />

          {/* Health Status */}
          <div className="mb-5">
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.5px] text-muted-foreground mb-3">
              Health Status
            </h4>
            <div className={cn(
              "inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-semibold",
              config.bgClass,
              config.textClass
            )}>
              <StatusIcon className="w-4 h-4" />
              {config.label} — {item.progress}% complete
            </div>
          </div>

          {/* Gold Divider */}
          <div className="h-px bg-secondary-champagne mb-5" />

          {/* Stats */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.5px] text-muted-foreground mb-3">
              Coverage
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-xl font-bold text-foreground">{item.objectives ?? 0}</div>
                <div className="text-[11px] text-muted-foreground">Objectives</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-xl font-bold text-foreground">{item.epics ?? 0}</div>
                <div className="text-[11px] text-muted-foreground">Epics</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-xl font-bold text-foreground">{item.risks ?? 0}</div>
                <div className="text-[11px] text-muted-foreground">Risks</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Drawer Footer with Gold Line Extension */}
      <div className="flex border-t border-border flex-shrink-0">
        {/* Gold line continues */}
        <div className="w-1 bg-brand-primary flex-shrink-0" />

        <div className="flex-1 flex gap-3 p-4">
          <button className="flex-1 px-4 py-3 text-sm font-medium bg-muted border border-border rounded-md text-muted-foreground hover:border-brand-primary/50 hover:text-foreground transition-colors">
            View Objectives
          </button>
          <button className="flex-1 px-4 py-3 text-sm font-semibold bg-brand-primary text-white rounded-md hover:bg-brand-primary-hover transition-colors">
            Open Strategy Room
          </button>
        </div>
      </div>
    </div>
  );
}
