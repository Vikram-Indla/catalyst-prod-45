/**
 * StrategyStack — CIO Cockpit "Data Table Card" style
 * Enterprise list table feel with sticky header, compact rows, tighter spacing
 * 
 * TYPOGRAPHY LOCK (JOB-190):
 * - Section title: text-sm font-semibold (14px)
 * - Table headers: text-xs font-semibold uppercase (12px min)
 * - Cell text: text-sm (14px) or text-xs (12px) minimum
 * - NO text-[9px], text-[10px], text-[11px] - use text-xs as floor
 * - NO text-muted - use var(--text-secondary) for readable supporting text
 * 
 * LKG CACHING: Uses sessionStorage-backed caching to prevent UI flickering
 * - On snapshot change: loads cached data immediately
 * - During refresh: shows existing data with subtle "Refreshing..." indicator
 * - Never blanks the table after first successful load
 */

import { useState } from 'react';
import { Target, Layers, Zap, Grid3X3, ChevronRight, X, AlertTriangle, User, Loader2 } from 'lucide-react';
import { useStrategyCoverageData, EMPTY_COVERAGE } from '@/hooks/useStrategyCoverageData';
import { useOKRv2StrategyMetrics } from '@/hooks/useOKRv2StrategyMetrics';
import { cn } from '@/lib/utils';
import { TYPOGRAPHY } from './strategyRoomTypography';
import { Skeleton } from '@/components/ui/skeleton';
import { safeNumber, safePercentage } from '@/utils/strategyRoomCache';

interface StrategyStackProps {
  onLayerClick: (label: string) => void;
  snapshotId?: string;
}

type LayerKey = 'objectives' | 'themes' | 'epics' | 'features';

interface LayerConfig {
  key: LayerKey;
  label: string;
  icon: typeof Target;
  iconColor: string;
  iconBgColor: string;
  description: string;
}

const layerConfigs: LayerConfig[] = [
  { 
    key: 'objectives', 
    label: 'Objectives', 
    icon: Target,
    iconColor: 'var(--brand-gold)',
    iconBgColor: 'var(--brand-gold-bg)',
    description: 'Strategic objectives driving business outcomes',
  },
  { 
    key: 'themes', 
    label: 'Themes', 
    icon: Layers,
    iconColor: 'var(--secondary-green)',
    iconBgColor: 'var(--secondary-green-bg)',
    description: 'Cross-cutting strategic themes',
  },
  { 
    key: 'epics', 
    label: 'Epics', 
    icon: Zap,
    iconColor: 'var(--secondary-bronze)',
    iconBgColor: 'var(--secondary-bronze-bg)',
    description: 'Large bodies of work delivering value',
  },
  { 
    key: 'features', 
    label: 'Features', 
    icon: Grid3X3,
    iconColor: 'var(--text-muted)',
    iconBgColor: 'var(--surface-subtle)',
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
      return { bg: 'var(--surface-subtle)', text: 'var(--text-muted)', border: 'var(--border-default)' };
  }
}

function getCoverageStatus(coverage: number): { color: string; label: string } {
  // Use safePercentage to prevent NaN issues
  const safeCoverage = safePercentage(coverage);
  if (safeCoverage >= 80) return { color: 'var(--status-success)', label: 'Healthy' };
  if (safeCoverage >= 50) return { color: 'var(--status-warning)', label: 'At Risk' };
  return { color: 'var(--status-danger)', label: 'Critical' };
}

export function StrategyStack({ onLayerClick, snapshotId }: StrategyStackProps) {
  const [selectedLayer, setSelectedLayer] = useState<LayerKey | null>(null);
  
  // Use LKG-enabled hook for coverage data
  const { data: counts, isLoading, isFetching, hasData } = useStrategyCoverageData(snapshotId);
  const { data: okrMetrics, isLoading: okrLoading, isFetching: okrFetching } = useOKRv2StrategyMetrics(snapshotId);
  
  // Use safe fallbacks - never show undefined/NaN
  const displayCounts = counts ?? EMPTY_COVERAGE;

  // Use safe number conversion - prevents NaN in charts
  const objectivesCount = safeNumber(okrMetrics?.count);

  // LKG-aware getLayerData - uses displayCounts to prevent empty states
  const getLayerData = (key: LayerKey) => {
    switch (key) {
      case 'objectives':
        return { 
          count: objectivesCount, 
          aligned: objectivesCount > 0 ? Math.round(objectivesCount * 0.67) : 0, 
          gap: objectivesCount > 0 ? 1 : 0,
          coverage: safePercentage(67),
        };
      case 'themes':
        return { 
          count: safeNumber(displayCounts.themes), 
          aligned: safeNumber(displayCounts.themes), 
          gap: 0,
          coverage: safePercentage(100),
        };
      case 'epics': {
        const epics = safeNumber(displayCounts.epics);
        const aligned = safeNumber(displayCounts.alignedEpics);
        const coverage = epics > 0 ? safePercentage(Math.round((aligned / epics) * 100)) : 0;
        return { 
          count: epics, 
          aligned: aligned, 
          gap: safeNumber(displayCounts.misalignedEpics),
          coverage,
        };
      }
      case 'features': {
        const features = safeNumber(displayCounts.features);
        const aligned = safeNumber(displayCounts.alignedFeatures);
        const coverage = features > 0 ? safePercentage(Math.round((aligned / features) * 100)) : 0;
        return { 
          count: features, 
          aligned: aligned, 
          gap: safeNumber(displayCounts.misalignedFeatures),
          coverage,
        };
      }
      default:
        return { count: 0, aligned: 0, gap: 0, coverage: 0 };
    }
  };

  const getLayerDetails = (key: LayerKey): LayerDetailsData => {
    switch (key) {
      case 'objectives':
        return {
          title: 'Objectives',
          description: 'Strategic objectives with progress and health status',
          items: [
            { name: 'Establish Cloud Infrastructure', progress: 75, status: 'On Track', owner: 'Sarah Chen' },
            { name: 'Modernize Customer Experience', progress: 45, status: 'At Risk', owner: 'Mike Ross' },
            { name: 'Data Platform Initiative', progress: 15, status: 'Behind', owner: 'Alex Kim' },
          ],
          gapItems: [
            { name: 'Data Platform Initiative', reason: 'No linked key results' },
          ],
        };
      case 'themes':
        return {
          title: 'Themes',
          description: 'Strategic themes organizing objectives',
          items: [
            { name: 'Digital Maturity 2026', progress: 42, status: 'On Track', owner: 'Emma Davis' },
          ],
          gapItems: [],
        };
      case 'epics':
        return {
          title: 'Epics',
          description: 'Epics aligned to strategic objectives',
          items: [
            { name: 'Cloud Migration Epic', progress: 68, status: 'On Track', linked: 'Establish Cloud Infrastructure' },
            { name: 'Customer Portal Redesign', progress: 35, status: 'At Risk', linked: 'Modernize Customer Experience' },
          ],
          gapItems: [
            { name: 'Legacy System Maintenance', reason: 'Not linked to any objective' },
          ],
        };
      case 'features':
        return {
          title: 'Features',
          description: 'Feature delivery across epics',
          items: [
            { name: 'User Authentication v2', progress: 90, status: 'On Track', linked: 'Cloud Migration Epic' },
            { name: 'Dashboard Redesign', progress: 55, status: 'On Track', linked: 'Customer Portal Redesign' },
          ],
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
      <section 
        className="rounded-lg overflow-hidden"
        style={{
          backgroundColor: 'var(--surface-bg)',
          border: '1px solid var(--border-default)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div className="px-4 py-2.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-64 mt-1" />
        </div>
        <div className="py-1.5 px-3" style={{ backgroundColor: 'var(--surface-subtle)' }}>
          <div className="grid animate-pulse" style={{ gridTemplateColumns: '1fr 50px 120px 70px 50px 20px' }}>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-2.5 w-10 rounded" style={{ backgroundColor: 'var(--muted)' }} />
            ))}
          </div>
        </div>
        <div className="p-2 space-y-1">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-9 rounded animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section 
      className="rounded-lg overflow-hidden"
      style={{
        backgroundColor: 'var(--surface-bg)',
        border: '1px solid var(--border-default)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      {/* Header with Refreshing indicator */}
      <div 
        className="px-4 py-2.5 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2">
          <div>
            <h2 
              className={cn(TYPOGRAPHY.sectionTitle)}
              style={{ color: 'var(--text-primary)' }}
            >
              Strategy Coverage & Alignment
            </h2>
            <p 
              className={cn(TYPOGRAPHY.microcopy)}
              style={{ color: 'var(--text-secondary)' }}
            >
              Coverage across strategic layers • Click to expand
            </p>
          </div>
        </div>
        {/* Refreshing indicator - shows during background fetch, not initial load */}
        {(isFetching || okrFetching) && hasData && (
          <div className="flex items-center gap-1.5">
            <Loader2 size={12} className="animate-spin text-muted-foreground" />
            <span className={cn(TYPOGRAPHY.microcopy)} style={{ color: 'var(--text-secondary)' }}>Refreshing…</span>
          </div>
        )}
      </div>

      {/* Two-part layout */}
      <div className="flex">
        {/* Left: Coverage Table */}
        <div 
          className={cn(
            "transition-all duration-200",
            selectedLayer ? "w-[55%]" : "w-full"
          )}
          style={{ borderRight: selectedLayer ? '1px solid var(--border-subtle)' : 'none' }}
        >
          {/* Sticky Table Header */}
          <div 
            className="sticky top-0 z-10 grid items-center py-1.5 px-3"
            style={{
              gridTemplateColumns: '1fr 50px 120px 70px 50px 20px',
              backgroundColor: 'var(--surface-subtle)',
              borderBottom: '1px solid var(--border-default)',
            }}
          >
            <div className={cn(TYPOGRAPHY.tableHeader)} style={{ color: 'var(--text-secondary)' }}>
              Layer
            </div>
            <div className={cn(TYPOGRAPHY.tableHeader, 'text-center')} style={{ color: 'var(--text-secondary)' }}>
              Count
            </div>
            <div className={cn(TYPOGRAPHY.tableHeader)} style={{ color: 'var(--text-secondary)' }}>
              Aligned
            </div>
            <div className={cn(TYPOGRAPHY.tableHeader, 'text-center')} style={{ color: 'var(--text-secondary)' }}>
              Coverage
            </div>
            <div className={cn(TYPOGRAPHY.tableHeader, 'text-center')} style={{ color: 'var(--text-secondary)' }}>
              Gap
            </div>
            <div />
          </div>

          {/* Table Rows - Compact */}
          <div>
            {layerConfigs.map((layer, index) => {
              const data = getLayerData(layer.key);
              const Icon = layer.icon;
              const isLast = index === layerConfigs.length - 1;
              const isSelected = selectedLayer === layer.key;
              const hasGap = data.gap > 0;
              const coverageStatus = getCoverageStatus(data.coverage);
              
              return (
                <div
                  key={layer.key}
                  onClick={() => handleRowClick(layer.key)}
                  className="grid items-center py-1.5 px-3 cursor-pointer transition-all duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleRowClick(layer.key);
                    }
                  }}
                  style={{
                    gridTemplateColumns: '1fr 50px 120px 70px 50px 20px',
                    borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
                    backgroundColor: isSelected ? 'var(--surface-hover)' : 'transparent',
                    boxShadow: isSelected ? 'inset 0 0 0 1px var(--brand-primary)' : 'none',
                    minHeight: '36px',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {/* Layer Name with Icon */}
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: layer.iconBgColor }}
                    >
                      <Icon size={12} style={{ color: layer.iconColor }} />
                    </div>
                    <span 
                      className={cn(TYPOGRAPHY.tableCellEmphasis, 'truncate')}
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {layer.label}
                    </span>
                  </div>
                  
                  {/* Count */}
                  <div className="text-center">
                    <span 
                      className={cn(TYPOGRAPHY.tableCell, 'tabular-nums font-medium')}
                      style={{ color: data.count === 0 ? 'var(--text-secondary)' : 'var(--text-primary)' }}
                    >
                      {isLoading || okrLoading ? '–' : data.count}
                    </span>
                  </div>
                  
                  {/* Aligned: Progress Bar + % */}
                  <div className="flex items-center gap-1.5">
                    {data.count > 0 ? (
                      <>
                        <div 
                          className="flex-1 h-[3px] rounded-full overflow-hidden"
                          style={{ backgroundColor: 'var(--progress-bg)' }}
                        >
                          <div 
                            className="h-full rounded-full transition-all"
                            style={{ 
                              width: `${data.coverage}%`,
                              backgroundColor: coverageStatus.color,
                            }}
                          />
                        </div>
                        <span 
                          className={cn(TYPOGRAPHY.countBadge, 'px-1 py-0.5 rounded')}
                          style={{ 
                            backgroundColor: 'var(--surface-subtle)',
                            color: coverageStatus.color,
                            border: `1px solid ${coverageStatus.color}`,
                          }}
                        >
                          {data.coverage}%
                        </span>
                      </>
                    ) : (
                      <span className={cn(TYPOGRAPHY.tableCellSecondary)} style={{ color: 'var(--text-secondary)' }}>—</span>
                    )}
                  </div>
                  
                  {/* Coverage Label */}
                  <div className="text-center">
                    {data.count > 0 ? (
                      <span 
                        className={cn(TYPOGRAPHY.statusBadge)}
                        style={{ color: coverageStatus.color }}
                      >
                        {coverageStatus.label}
                      </span>
                    ) : (
                      <span className={cn(TYPOGRAPHY.tableCellSecondary)} style={{ color: 'var(--text-secondary)' }}>—</span>
                    )}
                  </div>
                  
                  {/* Gap Badge */}
                  <div className="text-center">
                    {hasGap ? (
                      <span 
                        className={cn(TYPOGRAPHY.countBadge, 'inline-flex items-center gap-0.5 px-1 py-0.5 rounded')}
                        style={{ 
                          backgroundColor: 'var(--status-warning-bg)',
                          color: 'var(--status-warning)',
                          border: '1px solid var(--status-warning)',
                        }}
                      >
                        <AlertTriangle size={10} />
                        {data.gap}
                      </span>
                    ) : (
                      <span className={cn(TYPOGRAPHY.tableCellSecondary, 'tabular-nums')} style={{ color: 'var(--text-secondary)' }}>0</span>
                    )}
                  </div>
                  
                  {/* Chevron */}
                  <div className="flex justify-center">
                    <ChevronRight 
                      size={14} 
                      className={cn("transition-transform", isSelected && "rotate-90")}
                      style={{ color: 'var(--text-secondary)' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
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
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
            >
              <div className="flex items-center gap-2">
                <div 
                  className="w-5 h-5 rounded flex items-center justify-center"
                  style={{ backgroundColor: selectedConfig.iconBgColor }}
                >
                  <selectedConfig.icon size={12} style={{ color: selectedConfig.iconColor }} />
                </div>
                <div>
                  <h3 
                    className={cn(TYPOGRAPHY.cardLabel)}
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {selectedLayerDetails.title}
                  </h3>
                  <p className={cn(TYPOGRAPHY.microcopy)} style={{ color: 'var(--text-secondary)' }}>
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
                style={{ color: 'var(--text-secondary)' }}
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
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {gap.name}
                          </span>
                          <span 
                            className={cn(TYPOGRAPHY.microcopy)}
                            style={{ color: 'var(--text-secondary)' }}
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
                        border: '1px solid var(--border-subtle)',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--border-default)'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span 
                              className={cn(TYPOGRAPHY.tableCellEmphasis, 'truncate')}
                              style={{ color: 'var(--text-primary)' }}
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
                            <p className={cn(TYPOGRAPHY.microcopy, 'truncate')} style={{ color: 'var(--text-secondary)' }}>
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
                                style={{ color: 'var(--text-secondary)' }}
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
                              <User size={10} style={{ color: 'var(--text-secondary)' }} />
                              <span 
                                className={cn(TYPOGRAPHY.microcopy, 'font-medium truncate max-w-[50px]')}
                                style={{ color: 'var(--text-secondary)' }}
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
