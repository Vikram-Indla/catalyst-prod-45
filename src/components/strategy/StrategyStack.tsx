import { useState } from 'react';
import { Target, Layers, Zap, Grid3X3, ChevronRight, X, AlertTriangle, User } from 'lucide-react';
import { useStrategyPyramidCounts } from '@/hooks/useExecutionMetrics';
import { useOKRv2StrategyMetrics } from '@/hooks/useOKRv2StrategyMetrics';
import { cn } from '@/lib/utils';

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

// Theme token-based colors via CSS vars
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
      return { 
        bg: 'var(--status-success-bg)', 
        text: 'var(--status-success)', 
        border: 'var(--status-success)' 
      };
    case 'At Risk':
      return { 
        bg: 'var(--status-warning-bg)', 
        text: 'var(--status-warning)', 
        border: 'var(--status-warning)' 
      };
    case 'Behind':
      return { 
        bg: 'var(--status-danger-bg)', 
        text: 'var(--status-danger)', 
        border: 'var(--status-danger)' 
      };
    default:
      return { 
        bg: 'var(--surface-subtle)', 
        text: 'var(--text-muted)', 
        border: 'var(--border-default)' 
      };
  }
}

function getCoverageStatus(coverage: number): { color: string; label: string } {
  if (coverage >= 80) return { color: 'var(--status-success)', label: 'Healthy' };
  if (coverage >= 50) return { color: 'var(--status-warning)', label: 'At Risk' };
  return { color: 'var(--status-danger)', label: 'Critical' };
}

export function StrategyStack({ onLayerClick, snapshotId }: StrategyStackProps) {
  const [selectedLayer, setSelectedLayer] = useState<LayerKey | null>(null);
  
  const { data: counts, isLoading } = useStrategyPyramidCounts(snapshotId);
  const { data: okrMetrics, isLoading: okrLoading } = useOKRv2StrategyMetrics(snapshotId);

  const objectivesCount = okrMetrics?.count || 0;

  const getLayerData = (key: LayerKey) => {
    switch (key) {
      case 'objectives':
        return { 
          count: objectivesCount, 
          aligned: objectivesCount > 0 ? Math.round(objectivesCount * 0.67) : 0, 
          gap: objectivesCount > 0 ? 1 : 0,
          coverage: 67,
        };
      case 'themes':
        return { 
          count: counts?.themes || 0, 
          aligned: counts?.themes || 0, 
          gap: 0,
          coverage: 100,
        };
      case 'epics':
        return { 
          count: counts?.epics || 0, 
          aligned: counts?.alignedEpics || 0, 
          gap: counts?.misalignedEpics || 0,
          coverage: counts?.alignedEpics && counts?.epics ? Math.round((counts.alignedEpics / counts.epics) * 100) : 0,
        };
      case 'features':
        return { 
          count: counts?.features || 0, 
          aligned: counts?.alignedFeatures || 0, 
          gap: counts?.misalignedFeatures || 0,
          coverage: counts?.alignedFeatures && counts?.features ? Math.round((counts.alignedFeatures / counts.features) * 100) : 0,
        };
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

  return (
    <section 
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: 'var(--surface-bg)',
        border: '1px solid var(--border-default)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* Header */}
      <div 
        className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div>
          <h2 
            className="text-[15px] font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            Strategy Coverage & Alignment
          </h2>
          <p 
            className="text-[11px] mt-0.5"
            style={{ color: 'var(--text-muted)' }}
          >
            Coverage across strategic layers • Click to expand details
          </p>
        </div>
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
            className="sticky top-0 z-10 grid items-center py-2 px-4"
            style={{
              gridTemplateColumns: '1fr 60px 140px 80px 60px 24px',
              backgroundColor: 'var(--surface-subtle)',
              borderBottom: '1px solid var(--border-default)',
            }}
          >
            <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Layer
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-center" style={{ color: 'var(--text-muted)' }}>
              Count
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Aligned
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-center" style={{ color: 'var(--text-muted)' }}>
              Coverage
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-center" style={{ color: 'var(--text-muted)' }}>
              Gap
            </div>
            <div />
          </div>

          {/* Table Rows */}
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
                  className="grid items-center py-2 px-4 cursor-pointer transition-all duration-150"
                  style={{
                    gridTemplateColumns: '1fr 60px 140px 80px 60px 24px',
                    borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
                    backgroundColor: isSelected ? 'var(--surface-hover)' : 'transparent',
                    boxShadow: isSelected ? 'inset 0 0 0 1px var(--brand-primary)' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {/* Layer Name with Icon */}
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: layer.iconBgColor }}
                    >
                      <Icon size={12} style={{ color: layer.iconColor }} />
                    </div>
                    <span 
                      className="text-[13px] font-medium truncate"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {layer.label}
                    </span>
                  </div>
                  
                  {/* Count */}
                  <div className="text-center">
                    <span 
                      className="text-[13px] tabular-nums font-medium"
                      style={{ color: data.count === 0 ? 'var(--text-muted)' : 'var(--text-primary)' }}
                    >
                      {isLoading || okrLoading ? '–' : data.count}
                    </span>
                  </div>
                  
                  {/* Aligned: Pill + Progress Bar */}
                  <div className="flex items-center gap-2">
                    {data.count > 0 ? (
                      <>
                        {/* Mini progress bar */}
                        <div 
                          className="flex-1 h-1 rounded-full overflow-hidden"
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
                        {/* % Pill */}
                        <span 
                          className="text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded"
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
                      <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>—</span>
                    )}
                  </div>
                  
                  {/* Coverage Label */}
                  <div className="text-center">
                    {data.count > 0 ? (
                      <span 
                        className="text-[10px] font-medium"
                        style={{ color: coverageStatus.color }}
                      >
                        {coverageStatus.label}
                      </span>
                    ) : (
                      <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>—</span>
                    )}
                  </div>
                  
                  {/* Gap Badge */}
                  <div className="text-center">
                    {hasGap ? (
                      <span 
                        className="inline-flex items-center gap-1 text-[11px] font-semibold tabular-nums px-1.5 py-0.5 rounded"
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
                      <span className="text-[12px] tabular-nums" style={{ color: 'var(--text-muted)' }}>0</span>
                    )}
                  </div>
                  
                  {/* Chevron */}
                  <div className="flex justify-center">
                    <ChevronRight 
                      size={14} 
                      className={cn(
                        "transition-transform",
                        isSelected && "rotate-90"
                      )}
                      style={{ color: 'var(--text-muted)' }}
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
              className="px-4 py-3 flex items-center justify-between flex-shrink-0"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
            >
              <div className="flex items-center gap-2">
                <div 
                  className="w-6 h-6 rounded flex items-center justify-center"
                  style={{ backgroundColor: selectedConfig.iconBgColor }}
                >
                  <selectedConfig.icon size={12} style={{ color: selectedConfig.iconColor }} />
                </div>
                <div>
                  <h3 
                    className="text-[13px] font-semibold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {selectedLayerDetails.title}
                  </h3>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {selectedLayerData?.count} items • {selectedLayerData?.gap} gaps
                  </p>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedLayer(null);
                }}
                className="p-1.5 rounded transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <X size={14} />
              </button>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-auto p-3 space-y-3" style={{ maxHeight: '280px' }}>
              {/* Gap Alert (if gaps exist) */}
              {selectedLayerDetails.gapItems.length > 0 && (
                <div 
                  className="p-2.5 rounded-lg"
                  style={{
                    backgroundColor: 'var(--status-warning-bg)',
                    border: '1px solid var(--status-warning)',
                  }}
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <AlertTriangle size={12} style={{ color: 'var(--status-warning)' }} />
                    <span 
                      className="text-[11px] font-semibold uppercase tracking-wide"
                      style={{ color: 'var(--status-warning)' }}
                    >
                      Alignment Gaps ({selectedLayerDetails.gapItems.length})
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {selectedLayerDetails.gapItems.map((gap, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div 
                          className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0"
                          style={{ backgroundColor: 'var(--status-warning)' }}
                        />
                        <div>
                          <span 
                            className="text-[12px] font-medium block"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {gap.name}
                          </span>
                          <span 
                            className="text-[10px]"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            {gap.reason}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Issue-style Item Rows */}
              <div className="space-y-1.5">
                {selectedLayerDetails.items.map((item, i) => {
                  const statusColors = getStatusColor(item.status);
                  return (
                    <div 
                      key={i} 
                      className="p-2.5 rounded-lg transition-colors"
                      style={{
                        backgroundColor: 'var(--surface-bg)',
                        border: '1px solid var(--border-subtle)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-default)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-subtle)';
                      }}
                    >
                      {/* Row: Name + Status Chip | Progress + Owner */}
                      <div className="flex items-start justify-between gap-3">
                        {/* Left: Name + Status */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span 
                              className="text-[12px] font-medium truncate"
                              style={{ color: 'var(--text-primary)' }}
                            >
                              {item.name}
                            </span>
                            {item.status && (
                              <span 
                                className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded flex-shrink-0"
                                style={{ 
                                  backgroundColor: statusColors.bg,
                                  color: statusColors.text,
                                }}
                              >
                                {item.status}
                              </span>
                            )}
                          </div>
                          {item.linked && (
                            <p 
                              className="text-[10px] truncate"
                              style={{ color: 'var(--text-muted)' }}
                            >
                              → {item.linked}
                            </p>
                          )}
                        </div>
                        
                        {/* Right: Progress + Owner */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {item.progress !== undefined && (
                            <div className="flex items-center gap-1.5">
                              <div 
                                className="w-12 h-1 rounded-full overflow-hidden"
                                style={{ backgroundColor: 'var(--progress-bg)' }}
                              >
                                <div 
                                  className="h-full rounded-full"
                                  style={{ 
                                    width: `${item.progress}%`,
                                    backgroundColor: statusColors.border,
                                  }}
                                />
                              </div>
                              <span 
                                className="text-[10px] tabular-nums font-medium w-7 text-right"
                                style={{ color: 'var(--text-muted)' }}
                              >
                                {item.progress}%
                              </span>
                            </div>
                          )}
                          {item.owner && (
                            <div 
                              className="flex items-center gap-1 px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: 'var(--surface-subtle)' }}
                            >
                              <User size={10} style={{ color: 'var(--text-muted)' }} />
                              <span 
                                className="text-[9px] font-medium truncate max-w-[60px]"
                                style={{ color: 'var(--text-muted)' }}
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
