import { useState } from 'react';
import { Target, Layers, Box, LayoutGrid, ChevronRight, Plus, ExternalLink, X } from 'lucide-react';
import { useStrategyPyramidCounts } from '@/hooks/useExecutionMetrics';
import { useOKRv2StrategyMetrics } from '@/hooks/useOKRv2StrategyMetrics';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface StrategyStackProps {
  onLayerClick: (label: string) => void;
  snapshotId?: string;
}

type LayerKey = 'objectives' | 'themes' | 'epics' | 'features';

interface LayerConfig {
  key: LayerKey;
  label: string;
  icon: typeof Target;
  color: string;
  bgColor: string;
  barColor: string;
}

const layerConfigs: LayerConfig[] = [
  { 
    key: 'objectives', 
    label: 'Objectives', 
    icon: Target,
    color: 'var(--secondary-green)',
    bgColor: 'rgba(92, 124, 92, 0.15)',
    barColor: 'var(--secondary-green)',
  },
  { 
    key: 'themes', 
    label: 'Themes', 
    icon: Layers,
    color: 'var(--brand-gold)',
    bgColor: 'rgba(198, 156, 109, 0.15)',
    barColor: 'var(--brand-gold)',
  },
  { 
    key: 'epics', 
    label: 'Epics', 
    icon: Box,
    color: 'var(--secondary-bronze)',
    bgColor: 'rgba(139, 115, 85, 0.15)',
    barColor: 'var(--secondary-bronze)',
  },
  { 
    key: 'features', 
    label: 'Features', 
    icon: LayoutGrid,
    color: 'var(--text-2)',
    bgColor: 'rgba(200, 204, 208, 0.25)',
    barColor: 'var(--secondary-green)',
  },
];

interface LayerDetailsData {
  title: string;
  items: { name: string; progress?: number; status?: string; linked?: string; isUnaligned?: boolean }[];
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
      className="rounded-[10px] overflow-hidden"
      style={{
        backgroundColor: 'var(--surface-1)',
        border: '1px solid var(--divider)',
        borderLeft: '3px solid var(--secondary-bronze)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Header */}
      <div 
        className="px-5 py-4 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--divider-subtle)' }}
      >
        <div>
          <h2 
            className="text-[15px] font-semibold"
            style={{ color: 'var(--text-1)' }}
          >
            Strategy Coverage & Alignment
          </h2>
          <p 
            className="text-[12px] mt-0.5"
            style={{ color: 'var(--text-2)' }}
          >
            Coverage across strategic layers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            className="gap-1.5 h-8 text-[13px] px-3"
            style={{ backgroundColor: 'var(--brand-gold)', color: 'white' }}
          >
            <Plus className="w-3.5 h-3.5" />
            Create Objective
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-1.5 h-8 text-[13px] px-3"
            onClick={handleOpenOKRHub}
            style={{ borderColor: 'var(--divider)', color: 'var(--text-1)' }}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            OKR Hub
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden">
        {/* Table Header */}
        <div 
          className="grid items-center px-5 py-3"
          style={{
            gridTemplateColumns: '200px 80px 1fr 100px 60px',
            backgroundColor: 'var(--surface-2)',
            borderBottom: '1px solid var(--divider)',
          }}
        >
          <div 
            className="text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: 'var(--text-2)' }}
          >
            Layer
          </div>
          <div 
            className="text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: 'var(--text-2)' }}
          >
            Count
          </div>
          <div 
            className="text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: 'var(--text-2)' }}
          >
            Coverage
          </div>
          <div 
            className="text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: 'var(--text-2)' }}
          >
            % Aligned
          </div>
          <div 
            className="text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: 'var(--text-2)' }}
          >
            Gap
          </div>
        </div>

        {/* Table Rows */}
        {layerConfigs.map((layer, index) => {
          const data = getLayerData(layer.key);
          const Icon = layer.icon;
          const isLast = index === layerConfigs.length - 1;
          const isSelected = selectedLayer === layer.key;
          
          return (
            <div key={layer.key}>
              <button
                onClick={() => handleRowClick(layer.key)}
                className="w-full grid items-center px-5 py-3.5 transition-colors text-left group hover:bg-[var(--surface-2)]"
                style={{ 
                  gridTemplateColumns: '200px 80px 1fr 100px 60px',
                  borderBottom: isLast && !isSelected ? 'none' : '1px solid var(--divider-subtle)',
                  backgroundColor: isSelected ? 'rgba(198, 156, 109, 0.05)' : 'transparent',
                }}
              >
                {/* Layer icon + label */}
                <div className="flex items-center gap-3">
                  <div 
                    className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: layer.bgColor }}
                  >
                    <Icon className="w-3.5 h-3.5" style={{ color: layer.color }} />
                  </div>
                  <span 
                    className="text-[14px] font-medium"
                    style={{ color: 'var(--text-1)' }}
                  >
                    {layer.label}
                  </span>
                </div>

                {/* Count */}
                <div>
                  <span 
                    className={`text-[14px] font-semibold tabular-nums ${data.count === 0 ? 'text-muted' : ''}`}
                    style={{ color: data.count === 0 ? 'var(--text-3)' : 'var(--text-1)' }}
                  >
                    {isLoading || okrLoading ? '–' : data.count}
                  </span>
                </div>

                {/* Coverage bar */}
                <div className="pr-6">
                  <div 
                    className="w-full h-[6px] rounded-full overflow-hidden" 
                    style={{ backgroundColor: 'var(--surface-3)' }}
                  >
                    <div 
                      className="h-full rounded-full transition-all"
                      style={{ 
                        width: data.count > 0 ? `${data.coverage}%` : '0%',
                        backgroundColor: layer.barColor,
                      }}
                    />
                  </div>
                </div>

                {/* Percentage */}
                <div>
                  <span 
                    className="text-[13px] tabular-nums"
                    style={{ color: data.count === 0 ? 'var(--text-3)' : 'var(--text-1)' }}
                  >
                    {data.count === 0 ? '—' : `${data.coverage}%`}
                  </span>
                </div>

                {/* Gap with chevron */}
                <div className="flex items-center gap-2">
                  <span 
                    className={`text-[13px] tabular-nums ${data.gap === 0 ? '' : ''}`}
                    style={{ color: data.gap === 0 ? 'var(--text-3)' : 'var(--text-1)' }}
                  >
                    {data.gap}
                  </span>
                  <ChevronRight 
                    className="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity"
                    style={{ color: 'var(--text-2)' }}
                  />
                </div>
              </button>

              {/* Layer Details Panel */}
              {isSelected && (
                <div 
                  className="mx-5 mb-4 p-5 rounded-lg"
                  style={{
                    backgroundColor: 'rgba(198, 156, 109, 0.05)',
                    border: '1px solid rgba(198, 156, 109, 0.2)',
                  }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 
                      className="text-[14px] font-semibold"
                      style={{ color: 'var(--text-1)' }}
                    >
                      {getLayerDetails(layer.key).title}
                    </h3>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedLayer(null);
                      }}
                      className="w-7 h-7 rounded-md flex items-center justify-center transition-colors"
                      style={{ color: 'var(--text-2)' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-3)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {getLayerDetails(layer.key).items.map((item, i) => (
                      <div 
                        key={i} 
                        className="py-2 px-3 rounded-md"
                        style={{
                          borderLeft: item.isUnaligned 
                            ? '3px solid var(--destructive)' 
                            : item.status === 'On Track' 
                              ? '3px solid var(--secondary-green)'
                              : item.status === 'At Risk'
                                ? '3px solid var(--brand-gold)'
                                : item.status === 'Behind'
                                  ? '3px solid var(--destructive)'
                                  : '3px solid var(--brand-gold)',
                          backgroundColor: item.isUnaligned ? 'rgba(220, 38, 38, 0.05)' : 'transparent',
                        }}
                      >
                        {item.isUnaligned && (
                          <span 
                            className="text-[12px] font-medium flex items-center gap-1 mb-1"
                            style={{ color: 'var(--destructive)' }}
                          >
                            ⚠ Unaligned Epic
                          </span>
                        )}
                        <p 
                          className="text-[14px] font-medium"
                          style={{ color: 'var(--text-1)' }}
                        >
                          {item.name}
                        </p>
                        {item.progress !== undefined && item.status && (
                          <p 
                            className="text-[12px] mt-0.5"
                            style={{ color: 'var(--text-2)' }}
                          >
                            {item.progress}% complete • {item.status}
                          </p>
                        )}
                        {item.linked && !item.isUnaligned && (
                          <p 
                            className="text-[12px] mt-0.5"
                            style={{ color: 'var(--text-2)' }}
                          >
                            {layer.key === 'epics' ? `Linked to: ${item.linked}` : item.linked}
                          </p>
                        )}
                        {item.isUnaligned && item.linked && (
                          <p 
                            className="text-[12px] mt-0.5"
                            style={{ color: 'var(--text-2)' }}
                          >
                            {item.linked}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
