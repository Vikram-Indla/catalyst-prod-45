/**
 * StrategyStack — CIO Cockpit "Data Table Card" style
 * Enterprise list table feel with sticky header, compact rows, tighter spacing
 * 
 * TYPOGRAPHY LOCK (CIO COCKPIT UX — NON-NEGOTIABLE):
 * ─────────────────────────────────────────────────
 * - Section title: text-sm font-semibold (14px)
 * - Table headers: text-xs font-semibold uppercase (12px min)
 * - Cell text: text-sm (14px) or text-xs (12px) minimum
 * - NO text-[9px], text-[10px], text-[11px] except for badges
 * - Use var(--text-secondary) for supporting text, NOT opacity
 * 
 * LOADING BEHAVIOR:
 * - Skeleton allowed ONCE on initial load only
 * - After first success: NEVER show skeleton again
 * - During refresh: show "Refreshing…" in header, keep content visible
 * - NO greying, NO opacity reduction, NO layout shift
 * 
 * LKG CACHING: Uses sessionStorage-backed caching to prevent UI flickering
 * - On snapshot change: loads cached data immediately
 * - During refresh: shows existing data with subtle "Refreshing..." indicator
 * - Never blanks the table after first successful load
 */

import { useState, useEffect } from 'react';
import { ChevronRight, X, AlertTriangle, User, Loader2, Info } from 'lucide-react';
import { useStrategyCoverageData, EMPTY_COVERAGE } from '@/hooks/useStrategyCoverageData';
import { useOKRv2StrategyMetrics } from '@/hooks/useOKRv2StrategyMetrics';
import { cn } from '@/lib/utils';
import { TYPOGRAPHY } from './strategyRoomTypography';
import { Skeleton } from '@/components/ui/skeleton';
import { safeNumber, safePercentage } from '@/utils/strategyRoomCache';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { WorkItemIcon } from '@/components/ja/icons/WorkItemIcon';
import { getWorkItemVisual } from '@/hooks/useWorkItemRegistry';

interface StrategyStackProps {
  onLayerClick: (label: string) => void;
  snapshotId?: string;
}

type LayerKey = 'objectives' | 'themes' | 'epics' | 'features';

// Work item type mapping for each layer (uses centralized WorkItemIcon registry)
const LAYER_WORK_ITEM_TYPES: Record<LayerKey, string> = {
  objectives: 'objective',
  themes: 'theme',
  epics: 'epic',
  features: 'feature',
};

interface LayerConfig {
  key: LayerKey;
  label: string;
  workItemType: string; // Maps to WorkItemIcon type
  iconColor: string;
  iconBgColor: string;
  description: string;
}

// Layer configs using the centralized icon registry
const layerConfigs: LayerConfig[] = [
  { 
    key: 'objectives', 
    label: 'Objectives', 
    workItemType: 'objective',
    iconColor: getWorkItemVisual('objective').color,
    iconBgColor: getWorkItemVisual('objective').bgColor,
    description: 'Strategic objectives driving business outcomes',
  },
  { 
    key: 'themes', 
    label: 'Themes', 
    workItemType: 'theme',
    iconColor: getWorkItemVisual('theme').color,
    iconBgColor: getWorkItemVisual('theme').bgColor,
    description: 'Cross-cutting strategic themes',
  },
  { 
    key: 'epics', 
    label: 'Epics', 
    workItemType: 'epic',
    iconColor: getWorkItemVisual('epic').color,
    iconBgColor: getWorkItemVisual('epic').bgColor,
    description: 'Large bodies of work delivering value',
  },
  { 
    key: 'features', 
    label: 'Features', 
    workItemType: 'feature',
    iconColor: getWorkItemVisual('feature').color,
    iconBgColor: getWorkItemVisual('feature').bgColor,
    description: 'Discrete deliverables within epics',
  },
];

interface LayerDetailsData {
  title: string;
  description: string;
  items: { 
    name: string; 
    progress?: number; 
    status?: string; 
    linked?: string; 
    isUnaligned?: boolean;
    owner?: string;
  }[];
  gapItems: {
    name: string;
    reason: string;
  }[];
}

function getStatusColor(status?: string): { bg: string; text: string; border: string } {
  switch (status) {
    case 'On Track':
      return { bg: 'var(--status-success-bg)', text: 'var(--status-success)', border: 'var(--status-success)' };
    case 'At Risk':
      return { bg: 'var(--status-warning-bg)', text: 'var(--status-warning)', border: 'var(--status-warning)' };
    case 'Behind':
      return { bg: 'var(--status-danger-bg)', text: 'var(--status-danger)', border: 'var(--status-danger)' };
    default:
      return { bg: 'var(--surface-subtle)', text: 'var(--text-secondary)', border: 'var(--border-default)' };
  }
}

function getCoverageStatus(coverage: number): { color: string; label: string; badgeClass: string } {
  // Use safePercentage to prevent NaN issues
  // Catalyst V5 thresholds: ≥70% Healthy, 40-69% At Risk, <40% Critical
  const safeCoverage = safePercentage(coverage);
  if (safeCoverage >= 70) return { 
    color: 'var(--progress-success)', 
    label: 'Healthy',
    badgeClass: 'bg-[var(--success-bg)] text-[var(--success-fg)] border border-[var(--success-bd)]'
  };
  if (safeCoverage >= 40) return { 
    color: 'var(--progress-warning)', 
    label: 'At Risk',
    badgeClass: 'bg-[var(--warning-bg)] text-[var(--warning-fg)] border border-[var(--warning-bd)]'
  };
  return { 
    color: 'var(--progress-danger)', 
    label: 'Critical',
    badgeClass: 'bg-[var(--danger-bg)] text-[var(--danger-fg)] border border-[var(--danger-bd)]'
  };
}

export function StrategyStack({ onLayerClick, snapshotId }: StrategyStackProps) {
  const [selectedLayer, setSelectedLayer] = useState<LayerKey | null>(null);
  const queryClient = useQueryClient();
  
  // Use LKG-enabled hook for coverage data
  const { data: counts, isLoading, isFetching, hasData, isStale, error } = useStrategyCoverageData(snapshotId);
  const { data: okrMetrics, isLoading: okrLoading, isFetching: okrFetching } = useOKRv2StrategyMetrics(snapshotId);
  
  // Real-time subscription for coverage data refresh
  useEffect(() => {
    if (!snapshotId) return;

    // Subscribe to themes, objectives, epics changes
    const channel = supabase
      .channel(`strategy-stack-${snapshotId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'strategic_themes' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['theme-coverage', snapshotId] });
          queryClient.invalidateQueries({ queryKey: ['strategy-pyramid-counts', snapshotId] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'objectives' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['theme-coverage', snapshotId] });
          queryClient.invalidateQueries({ queryKey: ['okr-v2-strategy-metrics', snapshotId] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'epics' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['theme-coverage', snapshotId] });
          queryClient.invalidateQueries({ queryKey: ['strategy-pyramid-counts', snapshotId] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'features' },
        () => queryClient.invalidateQueries({ queryKey: ['strategy-pyramid-counts', snapshotId] })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [snapshotId, queryClient]);
  
  // Fetch theme coverage data - themes with at least one objective or epic
  const { data: themeCoverage } = useQuery({
    queryKey: ['theme-coverage', snapshotId],
    queryFn: async () => {
      if (!snapshotId) return { total: 0, withWork: 0 };
      
      // Get themes for this snapshot
      const { data: themes } = await supabase
        .from('strategic_themes')
        .select('id')
        .eq('snapshot_id', snapshotId);
      
      if (!themes || themes.length === 0) return { total: 0, withWork: 0 };
      
      const themeIds = themes.map(t => t.id);
      
      // Check which themes have objectives
      const { data: objectives } = await supabase
        .from('objectives')
        .select('theme_id')
        .in('theme_id', themeIds);
      
      // Check which themes have epics
      const { data: epics } = await supabase
        .from('epics')
        .select('theme_id')
        .in('theme_id', themeIds);
      
      const themesWithWork = new Set([
        ...(objectives || []).map(o => o.theme_id),
        ...(epics || []).map(e => e.theme_id),
      ]);
      
      return { 
        total: themes.length, 
        withWork: themesWithWork.size 
      };
    },
    enabled: !!snapshotId,
    staleTime: 60 * 1000,
  });

  // Fetch themes list for the panel drilldown
  const { data: themesList = [] } = useQuery({
    queryKey: ['themes-list-for-panel', snapshotId],
    queryFn: async () => {
      if (!snapshotId) return [];
      
      const { data: themes, error } = await supabase
        .from('strategic_themes')
        .select('id, name, description')
        .eq('snapshot_id', snapshotId)
        .order('sort_order', { ascending: true });
      
      if (error || !themes) return [];
      return themes;
    },
    enabled: !!snapshotId,
    staleTime: 60 * 1000,
  });
  
  // Use safe fallbacks - never show undefined/NaN
  const displayCounts = counts ?? EMPTY_COVERAGE;

  // Use safe number conversion - prevents NaN in charts
  const objectivesCount = safeNumber(okrMetrics?.count);
  
  // Show stale indicator when showing cached data after error
  const showStaleIndicator = isStale && !isFetching && !!error;
  const isRefreshing = (isFetching || okrFetching) && hasData;

  // Calculation tooltips for each layer
  const getCalculationTooltip = (key: LayerKey): string => {
    switch (key) {
      case 'objectives':
        return 'Coverage = Objectives with at least one Key Result ÷ Total Objectives';
      case 'themes':
        return 'Coverage = Themes with at least one Objective or Epic ÷ Total Themes. Empty themes (no work items) count as 0% coverage.';
      case 'epics':
        return 'Coverage = Epics linked to a Theme or Objective ÷ Total Epics';
      case 'features':
        return 'Coverage = Features belonging to aligned Epics ÷ Total Features';
      default:
        return '';
    }
  };

  // LKG-aware getLayerData - uses displayCounts to prevent empty states
  // Returns null for coverage/gap when there's no data (shows "No Data" state)
  const getLayerData = (key: LayerKey) => {
    switch (key) {
      case 'objectives': {
        // Objectives: aligned = those with at least one Key Result (fetch from okrMetrics)
        // For now, we only have count - gap/coverage should be based on KRs
        const count = objectivesCount;
        // If no objectives, show "No Data" state
        if (count === 0) {
          return { 
            count: 0, 
            aligned: null, 
            gap: null,
            coverage: null,
            hasNoData: true,
          };
        }
        // For now, assume all objectives are aligned (coverage = 100%) if they exist
        // TODO: Fetch actual KR linkage data
        return { 
          count, 
          aligned: count, 
          gap: 0,
          coverage: 100,
          hasNoData: false,
        };
      }
      case 'themes': {
        const total = safeNumber(themeCoverage?.total ?? displayCounts.themes);
        const withWork = safeNumber(themeCoverage?.withWork ?? 0);
        // If no themes, show "No Data" state
        if (total === 0) {
          return { 
            count: 0, 
            aligned: null, 
            gap: null,
            coverage: null,
            hasNoData: true,
          };
        }
        // Check if there's ANY work in the entire stack
        // If no objectives, no epics, no features exist, don't show gaps - show "No Data" for the entire strategy
        const totalObjectives = objectivesCount;
        const totalEpics = safeNumber(displayCounts.epics);
        const totalFeatures = safeNumber(displayCounts.features);
        const hasAnyWorkInStack = totalObjectives > 0 || totalEpics > 0 || totalFeatures > 0;
        
        // If themes exist but no work items anywhere, show themes count but no gap (strategy not started yet)
        if (!hasAnyWorkInStack) {
          return { 
            count: total, 
            aligned: null, 
            gap: null,
            coverage: null,
            hasNoData: true,
            message: 'Add objectives or epics to track coverage',
          };
        }
        
        // Coverage is based on themes that have at least one objective or epic
        const coverage = safePercentage(Math.round((withWork / total) * 100));
        const gap = Math.max(0, total - withWork);
        return { 
          count: total, 
          aligned: withWork, 
          gap,
          coverage,
          hasNoData: false,
        };
      }
      case 'epics': {
        const epics = safeNumber(displayCounts.epics);
        if (epics === 0) {
          return { 
            count: 0, 
            aligned: null, 
            gap: null,
            coverage: null,
            hasNoData: true,
          };
        }
        const aligned = safeNumber(displayCounts.alignedEpics);
        const coverage = safePercentage(Math.round((aligned / epics) * 100));
        return { 
          count: epics, 
          aligned: aligned, 
          gap: safeNumber(displayCounts.misalignedEpics),
          coverage,
          hasNoData: false,
        };
      }
      case 'features': {
        const features = safeNumber(displayCounts.features);
        if (features === 0) {
          return { 
            count: 0, 
            aligned: null, 
            gap: null,
            coverage: null,
            hasNoData: true,
          };
        }
        const aligned = safeNumber(displayCounts.alignedFeatures);
        const coverage = safePercentage(Math.round((aligned / features) * 100));
        return { 
          count: features, 
          aligned: aligned, 
          gap: safeNumber(displayCounts.misalignedFeatures),
          coverage,
          hasNoData: false,
        };
      }
      default:
        return { count: 0, aligned: 0, gap: 0, coverage: 0, hasNoData: true };
    }
  };

  const getLayerDetails = (key: LayerKey): LayerDetailsData => {
    // Return empty arrays - no mock data, real data comes from database
    switch (key) {
      case 'objectives':
        return {
          title: 'Objectives',
          description: 'Strategic objectives with progress and health status',
          items: [],
          gapItems: [],
        };
      case 'themes':
        return {
          title: 'Themes',
          description: 'Strategic themes organizing objectives',
          items: themesList.map(theme => ({
            name: theme.name,
            status: undefined,
            progress: undefined,
            linked: theme.description || undefined,
          })),
          gapItems: [],
        };
      case 'epics':
        return {
          title: 'Epics',
          description: 'Epics aligned to strategic objectives',
          items: [],
          gapItems: [],
        };
      case 'features':
        return {
          title: 'Features',
          description: 'Feature delivery across epics',
          items: [],
          gapItems: [],
        };
      default:
        return { title: '', description: '', items: [], gapItems: [] };
    }
  };

  const handleRowClick = (key: LayerKey) => {
    setSelectedLayer(selectedLayer === key ? null : key);
    onLayerClick(layerConfigs.find(l => l.key === key)?.label || '');
  };

  const selectedLayerData = selectedLayer ? getLayerData(selectedLayer) : null;
  const selectedLayerDetails = selectedLayer ? getLayerDetails(selectedLayer) : null;
  const selectedConfig = selectedLayer ? layerConfigs.find(l => l.key === selectedLayer) : null;

  // Show skeleton only during initial load when no LKG data exists
  if (isLoading && !hasData) {
    return (
      <section className="rounded-lg overflow-hidden bg-card/50 dark:bg-card/30">
        <div className="px-4 py-2.5 bg-muted/30 dark:bg-muted/10">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-64 mt-1" />
        </div>
        <div className="py-1.5 px-3 bg-muted/20 dark:bg-muted/10">
          <div className="grid animate-pulse" style={{ gridTemplateColumns: '1fr 50px 120px 70px 50px 20px' }}>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-2.5 w-10 rounded bg-muted/60 dark:bg-muted/40" />
            ))}
          </div>
        </div>
        <div className="p-2 space-y-1">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-9 rounded animate-pulse bg-muted/40 dark:bg-muted/20" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg overflow-hidden bg-card/50 dark:bg-card/30">
      {/* Header with Refreshing indicator - surface separation via background */}
      <div className="px-4 py-2.5 flex items-center justify-between bg-muted/30 dark:bg-muted/10">
        <div className="flex items-center gap-2">
          <div>
            <h2 
              className={cn(TYPOGRAPHY.sectionTitle)}
              style={{ color: 'var(--text-primary-hex)' }}
            >
              Strategy Coverage & Alignment
            </h2>
            <p 
              className={cn(TYPOGRAPHY.microcopy)}
              style={{ color: 'var(--text-secondary-hex)' }}
            >
              Coverage across strategic layers • Click to expand
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Stale data indicator - CATALYST STANDARD */}
          {showStaleIndicator && (
            <span className="text-[11px] text-muted-foreground italic">
              Data may be stale
            </span>
          )}
          {/* Refreshing indicator - CATALYST STANDARD */}
          {isRefreshing && (
            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <Loader2 size={12} className="animate-spin" />
              <span>Refreshing…</span>
            </div>
          )}
        </div>
      </div>

      {/* Two-part layout */}
      <div className="flex">
        {/* Left: Coverage Table */}
        <div 
          className={cn(
            "transition-all duration-200",
            selectedLayer ? "w-[55%] border-r border-border/20 dark:border-border/10" : "w-full"
          )}
        >
          {/* Sticky Table Header */}
          <div 
            className="sticky top-0 z-10 grid items-center py-1.5 px-3 bg-muted/20 dark:bg-muted/10"
            style={{
              gridTemplateColumns: '1fr 50px 120px 70px 50px 20px',
            }}
          >
            <div className={cn(TYPOGRAPHY.tableHeader)} style={{ color: 'var(--text-secondary-hex)' }}>
              Layer
            </div>
            <div className={cn(TYPOGRAPHY.tableHeader, 'text-center')} style={{ color: 'var(--text-secondary-hex)' }}>
              Count
            </div>
            <div className={cn(TYPOGRAPHY.tableHeader)} style={{ color: 'var(--text-secondary-hex)' }}>
              Aligned
            </div>
            <div className={cn(TYPOGRAPHY.tableHeader, 'text-center')} style={{ color: 'var(--text-secondary-hex)' }}>
              Coverage
            </div>
            <div className={cn(TYPOGRAPHY.tableHeader, 'text-center')} style={{ color: 'var(--text-secondary-hex)' }}>
              Gap
            </div>
            <div />
          </div>

          {/* Table Rows - Compact */}
          <TooltipProvider delayDuration={300}>
            <div>
              {layerConfigs.map((layer, index) => {
                const data = getLayerData(layer.key);
                // Use centralized WorkItemIcon instead of hardcoded icons
                const isLast = index === layerConfigs.length - 1;
                const isSelected = selectedLayer === layer.key;
                const hasGap = data.gap !== null && data.gap > 0;
                const hasNoData = data.hasNoData || data.coverage === null;
                const coverageStatus = hasNoData ? { color: 'var(--text-muted)', label: '—', badgeClass: 'bg-muted text-muted-foreground' } : getCoverageStatus(data.coverage ?? 0);
                const tooltipText = getCalculationTooltip(layer.key);
                
                return (
                  <Tooltip key={layer.key}>
                    <TooltipTrigger asChild>
                      <div
                        onClick={() => handleRowClick(layer.key)}
                        className={cn(
                          "grid items-center py-1.5 px-3 cursor-pointer",
                          "transition-[background-color] duration-100",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                        )}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleRowClick(layer.key);
                          }
                        }}
                        style={{
                          gridTemplateColumns: '1fr 50px 120px 70px 50px 20px',
                          borderBottom: isLast ? 'none' : '1px solid var(--border-subtle-hex)',
                          backgroundColor: isSelected ? 'var(--surface-hover)' : 'transparent',
                          boxShadow: isSelected ? 'inset 0 0 0 1px var(--brand-primary-hex)' : 'none',
                          minHeight: '36px',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = 'hsl(var(--accent) / 0.4)';
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        {/* Layer Name with Icon - Using centralized WorkItemIcon */}
                        <div className="flex items-center gap-2">
                          <WorkItemIcon 
                            type={layer.workItemType} 
                            size={20} 
                            hideTooltip 
                          />
                          <span 
                            className={cn(TYPOGRAPHY.tableCellEmphasis, 'truncate')}
                            style={{ color: 'var(--text-primary-hex)' }}
                          >
                            {layer.label}
                          </span>
                          <Info size={12} className="text-muted-foreground opacity-50" />
                        </div>
                        
                        {/* Count */}
                        <div className="text-center">
                          <span 
                            className={cn(TYPOGRAPHY.tableCell, 'tabular-nums font-medium')}
                            style={{ color: data.count === 0 ? 'var(--text-secondary-hex)' : 'var(--text-primary-hex)' }}
                          >
                            {isLoading || okrLoading ? '–' : data.count}
                          </span>
                        </div>
                        
                        {/* Aligned: Progress Bar + % - Shows "—" when no data */}
                        <div className="flex items-center gap-1.5">
                          {hasNoData ? (
                            <span className={cn(TYPOGRAPHY.tableCellSecondary)} style={{ color: 'var(--text-secondary-hex)' }}>—</span>
                          ) : data.count > 0 ? (
                            <>
                              <div className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ backgroundColor: 'var(--progress-track)' }}>
                                <div 
                                  className="h-full rounded-full transition-all"
                                  style={{ 
                                    width: `${data.coverage ?? 0}%`,
                                    backgroundColor: coverageStatus.color,
                                  }}
                                />
                              </div>
                              <span 
                                className={cn(
                                  TYPOGRAPHY.countBadge, 
                                  'px-1.5 py-0.5 rounded font-medium',
                                  coverageStatus.badgeClass
                                )}
                              >
                                {data.coverage ?? 0}%
                              </span>
                            </>
                          ) : (
                            <span className={cn(TYPOGRAPHY.tableCellSecondary)} style={{ color: 'var(--text-secondary-hex)' }}>—</span>
                          )}
                        </div>
                        
                        {/* Coverage Label - Consistent badge styling */}
                        <div className="text-center">
                          {hasNoData ? (
                            <span className={cn(TYPOGRAPHY.tableCellSecondary)} style={{ color: 'var(--text-secondary-hex)' }}>—</span>
                          ) : data.count > 0 ? (
                            <span 
                              className={cn(
                                'px-2 py-0.5 rounded text-xs font-medium',
                                coverageStatus.badgeClass
                              )}
                            >
                              {coverageStatus.label}
                            </span>
                          ) : (
                            <span className={cn(TYPOGRAPHY.tableCellSecondary)} style={{ color: 'var(--text-secondary-hex)' }}>—</span>
                          )}
                        </div>
                        
                        {/* Gap Badge - Amber when gaps exist, grey when zero, "—" when no data */}
                        <div className="text-center">
                          {hasNoData ? (
                            <span className={cn(TYPOGRAPHY.tableCellSecondary, 'tabular-nums')} style={{ color: 'var(--text-secondary-hex)' }}>—</span>
                          ) : hasGap ? (
                            <span 
                              className={cn(
                                TYPOGRAPHY.countBadge, 
                                'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded',
                                'bg-[var(--warning-bg)] text-[var(--warning-fg)] border border-[var(--warning-bd)]'
                              )}
                            >
                              <AlertTriangle size={10} />
                              {data.gap}
                            </span>
                          ) : (
                            <span className={cn(TYPOGRAPHY.tableCellSecondary, 'tabular-nums')} style={{ color: 'var(--text-secondary-hex)' }}>0</span>
                          )}
                        </div>
                        
                        {/* Chevron */}
                        <div className="flex justify-center">
                          <ChevronRight 
                            size={14} 
                            className={cn("transition-transform", isSelected && "rotate-90")}
                            style={{ color: 'var(--text-secondary-hex)' }}
                          />
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-xs">
                      <p>{tooltipText}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </TooltipProvider>
        </div>

        {/* Right: Drilldown Preview Panel */}
        {selectedLayer && selectedLayerDetails && selectedConfig && (
          <div 
            className="w-[45%] flex flex-col"
            style={{ backgroundColor: 'var(--surface-subtle)' }}
          >
            {/* Panel Header */}
            <div 
              className="px-3 py-2.5 flex items-center justify-between flex-shrink-0"
              style={{ borderBottom: '1px solid var(--border-subtle-hex)' }}
            >
              <div className="flex items-center gap-2">
                <WorkItemIcon 
                  type={selectedConfig.workItemType} 
                  size={20} 
                  hideTooltip 
                />
                <div>
                  <h3 
                    className={cn(TYPOGRAPHY.cardLabel)}
                    style={{ color: 'var(--text-primary-hex)' }}
                  >
                    {selectedLayerDetails.title}
                  </h3>
                  <p className={cn(TYPOGRAPHY.microcopy)} style={{ color: 'var(--text-secondary-hex)' }}>
                    {selectedLayerData?.count} items • {selectedLayerData?.gap} gaps
                  </p>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedLayer(null);
                }}
                className="p-1 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                style={{ color: 'var(--text-secondary-hex)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <X size={14} />
              </button>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-auto p-2.5 space-y-2" style={{ maxHeight: '240px' }}>
              {/* Gap Alert */}
              {selectedLayerDetails.gapItems.length > 0 && (
                <div 
                  className="p-2 rounded-md"
                  style={{
                    backgroundColor: 'var(--status-warning-bg)',
                    border: '1px solid var(--status-warning)',
                  }}
                >
                  <div className="flex items-center gap-1 mb-1.5">
                    <AlertTriangle size={12} style={{ color: 'var(--status-warning)' }} />
                    <span 
                      className={cn(TYPOGRAPHY.tableHeader)}
                      style={{ color: 'var(--status-warning)' }}
                    >
                      Gaps ({selectedLayerDetails.gapItems.length})
                    </span>
                  </div>
                  <div className="space-y-1">
                    {selectedLayerDetails.gapItems.map((gap, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <div 
                          className="w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0"
                          style={{ backgroundColor: 'var(--status-warning)' }}
                        />
                        <div>
                          <span 
                            className={cn(TYPOGRAPHY.tableCellEmphasis, 'block')}
                            style={{ color: 'var(--text-primary-hex)' }}
                          >
                            {gap.name}
                          </span>
                          <span 
                            className={cn(TYPOGRAPHY.microcopy)}
                            style={{ color: 'var(--text-secondary-hex)' }}
                          >
                            {gap.reason}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Item Rows - Compact list style */}
              <div className="space-y-1">
                {selectedLayerDetails.items.map((item, i) => {
                  const statusColors = getStatusColor(item.status);
                  return (
                    <div 
                      key={i} 
                      className="p-2 rounded-md transition-colors"
                      style={{
                        backgroundColor: 'var(--surface-bg)',
                        border: '1px solid var(--border-subtle-hex)',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--border-default-hex)'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle-hex)'}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span 
                              className={cn(TYPOGRAPHY.tableCellEmphasis, 'truncate')}
                              style={{ color: 'var(--text-primary-hex)' }}
                            >
                              {item.name}
                            </span>
                            {item.status && (
                              <span 
                                className={cn(TYPOGRAPHY.statusBadge, 'uppercase px-1 py-0.5 rounded flex-shrink-0')}
                                style={{ backgroundColor: statusColors.bg, color: statusColors.text }}
                              >
                                {item.status}
                              </span>
                            )}
                          </div>
                          {item.linked && (
                            <p className={cn(TYPOGRAPHY.microcopy, 'truncate')} style={{ color: 'var(--text-secondary-hex)' }}>
                              → {item.linked}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {item.progress !== undefined && (
                            <div className="flex items-center gap-1">
                              <div 
                                className="w-10 h-[3px] rounded-full overflow-hidden"
                                style={{ backgroundColor: 'var(--progress-bg)' }}
                              >
                                <div 
                                  className="h-full rounded-full"
                                  style={{ width: `${item.progress}%`, backgroundColor: statusColors.border }}
                                />
                              </div>
                              <span 
                                className={cn(TYPOGRAPHY.progressPercent, 'w-7 text-right')}
                                style={{ color: 'var(--text-secondary-hex)' }}
                              >
                                {item.progress}%
                              </span>
                            </div>
                          )}
                          {item.owner && (
                            <div 
                              className="flex items-center gap-0.5 px-1 py-0.5 rounded"
                              style={{ backgroundColor: 'var(--surface-subtle)' }}
                            >
                              <User size={10} style={{ color: 'var(--text-secondary-hex)' }} />
                              <span 
                                className={cn(TYPOGRAPHY.microcopy, 'font-medium truncate max-w-[50px]')}
                                style={{ color: 'var(--text-secondary-hex)' }}
                              >
                                {item.owner.split(' ')[0]}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
