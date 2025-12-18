import { useState } from 'react';
import { Target, Layers, Zap, Grid3X3, ChevronRight, X, AlertTriangle } from 'lucide-react';
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
  barColor: string;
}

// Per specification: Objectives=Gold, Themes=Green, Epics=Bronze, Features=Gray
const layerConfigs: LayerConfig[] = [
  { 
    key: 'objectives', 
    label: 'Objectives', 
    icon: Target,
    iconColor: '#C69C6D',
    iconBgColor: 'rgba(198, 156, 109, 0.1)',
    barColor: '#C69C6D',
  },
  { 
    key: 'themes', 
    label: 'Themes', 
    icon: Layers,
    iconColor: '#5C7C5C',
    iconBgColor: 'rgba(92, 124, 92, 0.1)',
    barColor: '#5C7C5C',
  },
  { 
    key: 'epics', 
    label: 'Epics', 
    icon: Zap,
    iconColor: '#8B7355',
    iconBgColor: 'rgba(139, 115, 85, 0.1)',
    barColor: '#8B7355',
  },
  { 
    key: 'features', 
    label: 'Features', 
    icon: Grid3X3,
    iconColor: '#8B949E',
    iconBgColor: 'rgba(200, 204, 208, 0.2)',
    barColor: '#8B949E',
  },
];

interface LayerDetailsData {
  title: string;
  items: { name: string; progress?: number; status?: string; linked?: string; isUnaligned?: boolean }[];
}

function getStatusBorderColor(status?: string, isUnaligned?: boolean): string {
  if (isUnaligned) return '#E1E4E8';
  switch (status) {
    case 'On Track': return '#5C7C5C';
    case 'At Risk': return '#C69C6D';
    case 'Behind': return '#B85C5C';
    default: return '#8B7355';
  }
}

function getStatusTextColor(status?: string): string {
  switch (status) {
    case 'On Track': return '#5C7C5C';
    case 'At Risk': return '#C69C6D';
    case 'Behind': return '#B85C5C';
    default: return 'var(--text-secondary)';
  }
}

function getCoverageBarColor(coverage: number): string {
  if (coverage >= 80) return '#5C7C5C';
  if (coverage >= 50) return '#C69C6D';
  return '#B85C5C';
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
          title: 'Objectives Details',
          items: [
            { name: 'Establish Cloud Infrastructure', progress: 75, status: 'On Track' },
            { name: 'Modernize Customer Experience', progress: 45, status: 'At Risk' },
            { name: 'Data Platform Initiative', progress: 15, status: 'Behind' },
          ],
        };
      case 'themes':
        return {
          title: 'Themes Details',
          items: [
            { name: 'Digital Maturity 2026', linked: '3 objectives • 5 epics • 42% overall progress' },
          ],
        };
      case 'epics':
        return {
          title: 'Epics Details',
          items: [
            { name: 'Cloud Migration Epic', linked: 'Establish Cloud Infrastructure' },
            { name: 'Customer Portal Redesign', linked: 'Modernize Customer Experience' },
            { name: 'Legacy System Maintenance', isUnaligned: true, linked: 'Not linked to any objective' },
          ],
        };
      case 'features':
        return {
          title: 'Features Details',
          items: [
            { name: '12 features defined across 5 epics. 92% are aligned to parent epics. All features on track.' },
          ],
        };
      default:
        return { title: '', items: [] };
    }
  };

  const handleRowClick = (key: LayerKey) => {
    setSelectedLayer(selectedLayer === key ? null : key);
    onLayerClick(layerConfigs.find(l => l.key === key)?.label || '');
  };

  

  return (
    <section 
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: 'var(--surface-bg)',
        border: '1px solid var(--border-default)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* Header with section title pattern */}
      <div 
        className="px-5 py-3 flex items-center justify-between"
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
            className="text-[12px] mt-0.5"
            style={{ color: 'var(--text-muted)' }}
          >
            Coverage across strategic layers
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden">
        {/* Table Header */}
        <table className="w-full">
          <thead>
            <tr 
              style={{ 
                backgroundColor: 'var(--surface-subtle)',
                borderBottom: '1px solid var(--border-default)',
              }}
            >
              <th 
                className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider w-48"
                style={{ color: 'var(--text-muted)' }}
              >
                Layer
              </th>
              <th 
                className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider w-20"
                style={{ color: 'var(--text-muted)' }}
              >
                Count
              </th>
              <th 
                className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-muted)' }}
              >
                Coverage
              </th>
              <th 
                className="px-5 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider w-24"
                style={{ color: 'var(--text-muted)' }}
              >
                % Aligned
              </th>
              <th 
                className="px-5 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider w-16"
                style={{ color: 'var(--text-muted)' }}
              >
                Gap
              </th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {layerConfigs.map((layer, index) => {
              const data = getLayerData(layer.key);
              const Icon = layer.icon;
              const isLast = index === layerConfigs.length - 1;
              const isSelected = selectedLayer === layer.key;
              
              return (
                <>
                  <tr
                    key={layer.key}
                    onClick={() => handleRowClick(layer.key)}
                    className={cn(
                      "cursor-pointer transition-colors group"
                    )}
                    style={{ 
                      borderBottom: isLast && !isSelected ? 'none' : '1px solid var(--border-subtle)',
                      backgroundColor: isSelected ? 'var(--surface-hover)' : 'transparent',
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
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div 
                          className="w-7 h-7 rounded-md flex items-center justify-center"
                          style={{ backgroundColor: layer.iconBgColor }}
                        >
                          <Icon size={14} style={{ color: layer.iconColor }} />
                        </div>
                        <span 
                          className="text-[13px] font-medium"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {layer.label}
                        </span>
                      </div>
                    </td>
                    
                    {/* Count */}
                    <td className="px-5 py-3">
                      <span 
                        className="text-[13px] tabular-nums"
                        style={{ color: data.count === 0 ? 'var(--text-muted)' : 'var(--text-primary)' }}
                      >
                        {isLoading || okrLoading ? '–' : data.count}
                      </span>
                    </td>
                    
                    {/* Coverage Progress Bar */}
                    <td className="px-5 py-3">
                      {data.count > 0 ? (
                        <div className="flex items-center gap-2.5">
                          <div 
                            className="flex-1 h-1.5 rounded-full overflow-hidden"
                            style={{ backgroundColor: 'var(--progress-bg)' }}
                          >
                            <div 
                              className="h-full rounded-full transition-all"
                              style={{ 
                                width: `${data.coverage}%`,
                                backgroundColor: getCoverageBarColor(data.coverage),
                              }}
                            />
                          </div>
                          <span className="text-[11px] tabular-nums w-8" style={{ color: 'var(--text-muted)' }}>
                            {data.coverage}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    
                    {/* % Aligned */}
                    <td className="px-5 py-3 text-right">
                      <span 
                        className="text-[13px] tabular-nums"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {data.count > 0 ? `${data.coverage}%` : '—'}
                      </span>
                    </td>
                    
                    {/* Gap */}
                    <td className="px-5 py-3 text-right">
                      <span 
                        className="text-[13px] tabular-nums"
                        style={{ color: data.gap > 0 ? 'var(--status-warning)' : 'var(--text-muted)' }}
                      >
                        {data.gap}
                      </span>
                    </td>
                    
                    {/* Chevron */}
                    <td className="px-3 py-3">
                      <ChevronRight 
                        size={14} 
                        className={cn(
                          "transition-transform",
                          isSelected && "rotate-90"
                        )}
                        style={{ color: 'var(--text-muted)' }}
                      />
                    </td>
                  </tr>
                  
                  {/* Expanded Details Panel */}
                  {isSelected && (
                    <tr key={`${layer.key}-details`}>
                      <td colSpan={6} className="p-0">
                        <div 
                          className="border-t"
                          style={{ 
                            backgroundColor: 'var(--surface-subtle)',
                            borderColor: 'var(--border-subtle)',
                          }}
                        >
                          <div className="px-6 py-4">
                            <div className="flex items-center justify-between mb-4">
                              <h3 
                                className="text-sm font-semibold"
                                style={{ color: 'var(--text-primary)' }}
                              >
                                {getLayerDetails(layer.key).title}
                              </h3>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedLayer(null);
                                }}
                                className="p-1 rounded transition-colors"
                                style={{ color: 'var(--text-secondary)' }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                              >
                                <X size={16} />
                              </button>
                            </div>
                            <div className="space-y-3">
                              {getLayerDetails(layer.key).items.map((item, i) => (
                                <div 
                                  key={i} 
                                  className="p-3 rounded-lg"
                                  style={{
                                    backgroundColor: 'var(--surface-bg)',
                                    borderLeft: `3px solid ${getStatusBorderColor(item.status, item.isUnaligned)}`,
                                  }}
                                >
                                  {item.isUnaligned && (
                                    <div 
                                      className="flex items-center gap-1 text-xs font-medium mb-1"
                                      style={{ color: 'var(--brand-primary)' }}
                                    >
                                      <AlertTriangle size={12} />
                                      <span>Unaligned Epic</span>
                                    </div>
                                  )}
                                  <div 
                                    className="text-sm font-medium"
                                    style={{ color: 'var(--text-primary)' }}
                                  >
                                    {item.name}
                                  </div>
                                  {item.progress !== undefined && item.status && (
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-xs" style={{ color: 'var(--text-2)' }}>
                                        {item.progress}% complete
                                      </span>
                                      <span className="text-xs" style={{ color: 'var(--text-2)' }}>•</span>
                                      <span 
                                        className="text-xs font-medium"
                                        style={{ color: getStatusTextColor(item.status) }}
                                      >
                                        {item.status}
                                      </span>
                                    </div>
                                  )}
                                  {item.linked && !item.isUnaligned && (
                                    <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                                      {layer.key === 'epics' ? `Linked to: ${item.linked}` : item.linked}
                                    </p>
                                  )}
                                  {item.isUnaligned && item.linked && (
                                    <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                                      {item.linked}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
