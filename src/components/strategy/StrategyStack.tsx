import { useState } from 'react';
import { Target, Layers, Zap, Grid3X3, ChevronRight, Plus, ExternalLink, X, AlertTriangle } from 'lucide-react';
import { useStrategyPyramidCounts } from '@/hooks/useExecutionMetrics';
import { useOKRv2StrategyMetrics } from '@/hooks/useOKRv2StrategyMetrics';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
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

  const handleOpenOKRHub = () => navigate('/enterprise/okr-hub');

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
        className="px-6 py-4 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div>
          <h2 
            className="text-lg font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            Strategy Coverage & Alignment
          </h2>
          <p 
            className="text-sm mt-0.5"
            style={{ color: 'var(--text-secondary)' }}
          >
            Coverage across strategic layers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            className="gap-1.5 h-8 text-sm px-4 text-white"
            style={{ backgroundColor: '#C69C6D' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#B8905F'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#C69C6D'}
          >
            <Plus className="w-4 h-4" />
            Create Objective
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-1.5 h-8 text-sm px-4"
            onClick={handleOpenOKRHub}
            style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
          >
            <ExternalLink className="w-4 h-4" />
            OKR Hub
          </Button>
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
                className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider w-48"
                style={{ color: 'var(--text-secondary)' }}
              >
                Layer
              </th>
              <th 
                className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider w-24"
                style={{ color: 'var(--text-secondary)' }}
              >
                Count
              </th>
              <th 
                className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}
              >
                Coverage
              </th>
              <th 
                className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-wider w-28"
                style={{ color: 'var(--text-secondary)' }}
              >
                % Aligned
              </th>
              <th 
                className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-wider w-20"
                style={{ color: 'var(--text-secondary)' }}
              >
                Gap
              </th>
              <th className="w-10"></th>
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
                      "cursor-pointer transition-colors group",
                      "hover:bg-[#F6F8FA] dark:hover:bg-[#161B22]"
                    )}
                    style={{ 
                      borderBottom: isLast && !isSelected ? 'none' : '1px solid var(--divider-subtle)',
                      backgroundColor: isSelected ? 'var(--surface-2)' : 'transparent',
                    }}
                  >
                    {/* Layer Name with Icon */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: layer.iconBgColor }}
                        >
                          <Icon size={16} style={{ color: layer.iconColor }} />
                        </div>
                        <span 
                          className="text-sm font-medium"
                          style={{ color: 'var(--text-1)' }}
                        >
                          {layer.label}
                        </span>
                      </div>
                    </td>
                    
                    {/* Count */}
                    <td className="px-6 py-4">
                      <span 
                        className="text-sm"
                        style={{ color: data.count === 0 ? 'var(--text-3)' : 'var(--text-1)' }}
                      >
                        {isLoading || okrLoading ? '–' : data.count}
                      </span>
                    </td>
                    
                    {/* Coverage Progress Bar */}
                    <td className="px-6 py-4">
                      {data.count > 0 ? (
                        <div className="flex items-center gap-3">
                          <div 
                            className="flex-1 h-2 rounded-full overflow-hidden"
                            style={{ backgroundColor: 'var(--surface-3)' }}
                          >
                            <div 
                              className="h-full rounded-full transition-all"
                              style={{ 
                                width: `${data.coverage}%`,
                                backgroundColor: getCoverageBarColor(data.coverage),
                              }}
                            />
                          </div>
                          <span className="text-xs w-10" style={{ color: 'var(--text-2)' }}>
                            {data.coverage}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm" style={{ color: 'var(--text-2)' }}>—</span>
                      )}
                    </td>
                    
                    {/* % Aligned */}
                    <td className="px-6 py-4 text-right">
                      <span 
                        className="text-sm"
                        style={{ color: 'var(--text-2)' }}
                      >
                        {data.count > 0 ? `${data.coverage}%` : '—'}
                      </span>
                    </td>
                    
                    {/* Gap */}
                    <td className="px-6 py-4 text-right">
                      <span 
                        className="text-sm"
                        style={{ color: 'var(--text-2)' }}
                      >
                        {data.gap}
                      </span>
                    </td>
                    
                    {/* Chevron */}
                    <td className="px-4 py-4">
                      <ChevronRight 
                        size={16} 
                        className={cn(
                          "transition-transform",
                          isSelected && "rotate-90"
                        )}
                        style={{ color: 'var(--text-2)' }}
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
                            backgroundColor: 'var(--surface-2)',
                            borderColor: 'var(--divider-subtle)',
                          }}
                        >
                          <div className="px-6 py-4">
                            <div className="flex items-center justify-between mb-4">
                              <h3 
                                className="text-sm font-semibold"
                                style={{ color: 'var(--text-1)' }}
                              >
                                {getLayerDetails(layer.key).title}
                              </h3>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedLayer(null);
                                }}
                                className="p-1 rounded transition-colors"
                                style={{ color: 'var(--text-2)' }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-3)'}
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
                                    backgroundColor: 'var(--surface-1)',
                                    borderLeft: `3px solid ${getStatusBorderColor(item.status, item.isUnaligned)}`,
                                  }}
                                >
                                  {item.isUnaligned && (
                                    <div 
                                      className="flex items-center gap-1 text-xs font-medium mb-1"
                                      style={{ color: '#C69C6D' }}
                                    >
                                      <AlertTriangle size={12} />
                                      <span>Unaligned Epic</span>
                                    </div>
                                  )}
                                  <div 
                                    className="text-sm font-medium"
                                    style={{ color: 'var(--text-1)' }}
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
                                    <p className="text-xs mt-1" style={{ color: 'var(--text-2)' }}>
                                      {layer.key === 'epics' ? `Linked to: ${item.linked}` : item.linked}
                                    </p>
                                  )}
                                  {item.isUnaligned && item.linked && (
                                    <p className="text-xs mt-1" style={{ color: 'var(--text-2)' }}>
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
