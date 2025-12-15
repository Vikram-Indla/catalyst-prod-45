import { useState } from 'react';
import { Target, Palette, Boxes, FileCode, ChevronRight, Plus, ExternalLink } from 'lucide-react';
import { PremiumCard, PremiumCardHeader, PremiumCardContent } from '@/components/ui/premium-card';
import { useStrategyPyramidCounts } from '@/hooks/useExecutionMetrics';
import { useOKRv2StrategyMetrics } from '@/hooks/useOKRv2StrategyMetrics';
import { PyramidDrilldownDrawer } from './PyramidDrilldownDrawer';
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
}

const layerConfigs: LayerConfig[] = [
  { 
    key: 'objectives', 
    label: 'Objectives', 
    icon: Target,
    color: 'hsl(var(--secondary-green))',
    bgColor: 'hsl(var(--secondary-green) / 0.1)',
  },
  { 
    key: 'themes', 
    label: 'Themes', 
    icon: Palette,
    color: 'hsl(var(--secondary-bronze))',
    bgColor: 'hsl(var(--secondary-bronze) / 0.1)',
  },
  { 
    key: 'epics', 
    label: 'Epics', 
    icon: Boxes,
    color: 'hsl(var(--brand-gold))',
    bgColor: 'hsl(var(--brand-gold) / 0.1)',
  },
  { 
    key: 'features', 
    label: 'Features', 
    icon: FileCode,
    color: 'hsl(var(--secondary-champagne))',
    bgColor: 'hsl(var(--secondary-champagne) / 0.1)',
  },
];

export function StrategyStack({ onLayerClick, snapshotId }: StrategyStackProps) {
  const navigate = useNavigate();
  const [selectedLayer, setSelectedLayer] = useState<LayerKey>('objectives');
  const [drilldownLayer, setDrilldownLayer] = useState<string | null>(null);
  
  const { data: counts, isLoading } = useStrategyPyramidCounts(snapshotId);
  const { data: okrMetrics, isLoading: okrLoading } = useOKRv2StrategyMetrics(snapshotId);

  const objectivesCount = okrMetrics?.count || 0;

  const getLayerData = (key: LayerKey) => {
    switch (key) {
      case 'objectives':
        return { 
          count: objectivesCount, 
          aligned: objectivesCount, 
          misaligned: 0,
          progress: okrMetrics?.avgProgress || 0,
        };
      case 'themes':
        return { 
          count: counts?.themes || 0, 
          aligned: counts?.themes || 0, 
          misaligned: 0,
          progress: 0,
        };
      case 'epics':
        return { 
          count: counts?.epics || 0, 
          aligned: counts?.alignedEpics || 0, 
          misaligned: counts?.misalignedEpics || 0,
          progress: counts?.alignedEpics && counts?.epics ? Math.round((counts.alignedEpics / counts.epics) * 100) : 0,
        };
      case 'features':
        return { 
          count: counts?.features || 0, 
          aligned: counts?.alignedFeatures || 0, 
          misaligned: counts?.misalignedFeatures || 0,
          progress: counts?.alignedFeatures && counts?.features ? Math.round((counts.alignedFeatures / counts.features) * 100) : 0,
        };
      default:
        return { count: 0, aligned: 0, misaligned: 0, progress: 0 };
    }
  };

  const handleLayerSelect = (key: LayerKey) => {
    setSelectedLayer(key);
  };

  const handleDrilldown = (label: string) => {
    setDrilldownLayer(label);
    onLayerClick(label);
  };

  const selectedConfig = layerConfigs.find(l => l.key === selectedLayer)!;
  const selectedData = getLayerData(selectedLayer);

  const getCreateLabel = (key: LayerKey) => {
    switch (key) {
      case 'objectives': return 'Create Objective';
      case 'themes': return 'Create Theme';
      case 'epics': return 'Create Epic';
      case 'features': return 'Create Feature';
    }
  };

  const handleOpenOKRHub = () => navigate('/enterprise/okr-hub');

  return (
    <>
      <PremiumCard>
        <PremiumCardHeader 
          title="Strategy Hierarchy" 
          subtitle="Alignment & coverage across strategic layers"
        />
        <PremiumCardContent noPadding>
          {/* Full-width table layout */}
          <div className="overflow-x-auto">
            {/* Table header */}
            <div 
              className="grid items-center px-4 py-2"
              style={{
                gridTemplateColumns: '200px 80px 1fr 80px 140px 32px',
                backgroundColor: 'var(--surface-2)',
                borderBottom: '1px solid var(--divider)',
              }}
            >
              <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-2)' }}>
                Layer
              </div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-center" style={{ color: 'var(--text-2)' }}>
                Count
              </div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-center" style={{ color: 'var(--text-2)' }}>
                Coverage
              </div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--text-2)' }}>
                %
              </div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-center" style={{ color: 'var(--text-2)' }}>
                Alignment
              </div>
              <div></div>
            </div>

            {/* Table rows */}
            {layerConfigs.map((layer, index) => {
              const data = getLayerData(layer.key);
              const Icon = layer.icon;
              const isSelected = selectedLayer === layer.key;
              const isLast = index === layerConfigs.length - 1;
              
              return (
                <button
                  key={layer.key}
                  onClick={() => handleLayerSelect(layer.key)}
                  className="w-full grid items-center px-4 py-2.5 transition-colors text-left group"
                  style={{ 
                    gridTemplateColumns: '200px 80px 1fr 80px 140px 32px',
                    backgroundColor: isSelected ? 'var(--surface-2)' : 'transparent',
                    borderBottom: isLast ? 'none' : '1px solid var(--divider)',
                  }}
                  onMouseEnter={(e) => !isSelected && (e.currentTarget.style.backgroundColor = 'var(--surface-2)')}
                  onMouseLeave={(e) => !isSelected && (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  {/* Layer icon + label */}
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0"
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
                  <div className="text-center">
                    <span 
                      className="inline-flex items-center justify-center px-2 py-0.5 rounded text-[14px] font-bold min-w-[32px]"
                      style={{ 
                        backgroundColor: layer.bgColor,
                        color: layer.color,
                      }}
                    >
                      {isLoading || okrLoading ? '–' : data.count}
                    </span>
                  </div>

                  {/* Coverage bar */}
                  <div className="flex items-center gap-3 px-3">
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--surface-3)' }}>
                      <div 
                        className="h-full rounded-full transition-all"
                        style={{ 
                          width: `${data.progress}%`,
                          backgroundColor: layer.color,
                        }}
                      />
                    </div>
                  </div>

                  {/* Percentage */}
                  <div className="text-right">
                    <span 
                      className="text-[14px] font-bold"
                      style={{ color: 'var(--text-1)' }}
                    >
                      {data.progress}%
                    </span>
                  </div>

                  {/* Aligned / Misaligned pills */}
                  <div className="flex items-center justify-center gap-2">
                    <span 
                      className="px-2 py-0.5 rounded text-[12px] font-semibold"
                      style={{ 
                        backgroundColor: 'hsl(var(--secondary-green) / 0.15)',
                        color: 'hsl(var(--secondary-green))',
                      }}
                    >
                      {data.aligned} aligned
                    </span>
                    <span 
                      className="px-2 py-0.5 rounded text-[12px] font-semibold"
                      style={{ 
                        backgroundColor: data.misaligned > 0 ? 'hsl(var(--destructive) / 0.15)' : 'var(--surface-3)',
                        color: data.misaligned > 0 ? 'hsl(var(--destructive))' : 'var(--text-3)',
                      }}
                    >
                      {data.misaligned} gap
                    </span>
                  </div>

                  {/* Drilldown chevron */}
                  <div className="flex justify-center">
                    <ChevronRight 
                      className="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity"
                      style={{ color: 'var(--text-1)' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDrilldown(layer.label);
                      }}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected layer detail strip */}
          <div 
            className="flex items-center justify-between px-4 py-3"
            style={{ 
              backgroundColor: 'var(--surface-2)',
              borderTop: '1px solid var(--divider)',
            }}
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-6 h-6 rounded flex items-center justify-center"
                style={{ backgroundColor: selectedConfig.bgColor }}
              >
                <selectedConfig.icon className="w-3 h-3" style={{ color: selectedConfig.color }} />
              </div>
              <span className="text-[14px] font-semibold" style={{ color: 'var(--text-1)' }}>
                {selectedConfig.label}
              </span>
              <span className="text-[13px]" style={{ color: 'var(--text-2)' }}>
                — {selectedData.count === 0 
                  ? 'No items yet. Create one to start tracking.' 
                  : `${selectedData.aligned} aligned, ${selectedData.misaligned} need attention`
                }
              </span>
            </div>
            <div className="flex items-center gap-2">
              {selectedData.count === 0 ? (
                <Button 
                  size="sm" 
                  className="gap-1.5 h-8 text-[13px]"
                  style={{ 
                    backgroundColor: 'hsl(var(--brand-gold))',
                    color: 'white',
                  }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  {getCreateLabel(selectedLayer)}
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-1.5 h-8 text-[13px]"
                  onClick={() => handleDrilldown(selectedConfig.label)}
                >
                  View All
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              )}
              {selectedLayer === 'objectives' && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-1.5 h-8 text-[13px]"
                  onClick={handleOpenOKRHub}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  OKR Hub
                </Button>
              )}
            </div>
          </div>
        </PremiumCardContent>
      </PremiumCard>

      <PyramidDrilldownDrawer
        open={!!drilldownLayer}
        onClose={() => setDrilldownLayer(null)}
        layer={drilldownLayer}
        snapshotId={snapshotId}
      />
    </>
  );
}
