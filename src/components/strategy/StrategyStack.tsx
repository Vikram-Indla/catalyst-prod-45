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
          subtitle="Coverage & alignment across strategic layers"
        />
        <PremiumCardContent noPadding>
          {/* Table-like header row */}
          <div 
            className="grid items-center px-4 py-2 text-[11px] font-semibold uppercase tracking-wider"
            style={{
              gridTemplateColumns: '160px 64px 1fr 160px 28px',
              backgroundColor: 'var(--surface-2)',
              borderBottom: '1px solid var(--divider)',
              color: 'var(--text-2)',
            }}
          >
            <div>Item</div>
            <div className="text-center">Count</div>
            <div className="text-center">Coverage</div>
            <div className="text-center">Alignment</div>
            <div></div>
          </div>

          <div className="flex" style={{ minHeight: '200px' }}>
            {/* Left side: Stack list (70%) */}
            <div className="flex-[7] border-r" style={{ borderColor: 'var(--divider)' }}>
              {layerConfigs.map((layer, index) => {
                const data = getLayerData(layer.key);
                const Icon = layer.icon;
                const isSelected = selectedLayer === layer.key;
                const isLast = index === layerConfigs.length - 1;
                
                return (
                  <button
                    key={layer.key}
                    onClick={() => handleLayerSelect(layer.key)}
                    className="w-full grid items-center px-4 py-2 transition-colors text-left group hover:bg-[var(--surface-2)]"
                    style={{ 
                      gridTemplateColumns: '160px 64px 1fr 160px 28px',
                      backgroundColor: isSelected ? 'var(--surface-2)' : 'transparent',
                      borderBottom: isLast ? 'none' : '1px solid var(--divider)',
                    }}
                  >
                    {/* Icon + Label */}
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: layer.bgColor }}
                      >
                        <Icon className="w-3 h-3" style={{ color: layer.color }} />
                      </div>
                      <span 
                        className="text-[14px] font-medium"
                        style={{ color: 'var(--text-1)' }}
                      >
                        {layer.label}
                      </span>
                    </div>

                    {/* Count pill */}
                    <div className="flex justify-center">
                      <div 
                        className="px-2 py-0.5 rounded text-[13px] font-bold min-w-[28px] text-center"
                        style={{ 
                          backgroundColor: layer.bgColor,
                          color: layer.color,
                        }}
                      >
                        {isLoading || okrLoading ? '–' : data.count}
                      </div>
                    </div>

                    {/* Progress bar + percent */}
                    <div className="flex items-center gap-2 px-2">
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--surface-3)' }}>
                        <div 
                          className="h-full rounded-full transition-all"
                          style={{ 
                            width: `${data.progress}%`,
                            backgroundColor: layer.color,
                          }}
                        />
                      </div>
                      <span 
                        className="text-[13px] font-semibold w-10 text-right"
                        style={{ color: 'var(--text-1)' }}
                      >
                        {data.progress}%
                      </span>
                    </div>

                    {/* Aligned vs Misaligned as pills */}
                    <div className="flex items-center justify-center gap-1.5">
                      <span 
                        className="px-1.5 py-0.5 rounded text-[11px] font-semibold"
                        style={{ 
                          backgroundColor: 'hsl(var(--secondary-green) / 0.15)',
                          color: 'hsl(var(--secondary-green))',
                        }}
                      >
                        {data.aligned}
                      </span>
                      <span 
                        className="px-1.5 py-0.5 rounded text-[11px] font-semibold"
                        style={{ 
                          backgroundColor: data.misaligned > 0 ? 'hsl(var(--destructive) / 0.15)' : 'var(--surface-3)',
                          color: data.misaligned > 0 ? 'hsl(var(--destructive))' : 'var(--text-2)',
                        }}
                      >
                        {data.misaligned}
                      </span>
                    </div>

                    {/* Drilldown chevron */}
                    <div className="flex justify-center">
                      <ChevronRight 
                        className="w-4 h-4 opacity-30 group-hover:opacity-100 transition-opacity"
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

            {/* Right side: Selected layer details (30%) */}
            <div className="flex-[3] flex flex-col" style={{ backgroundColor: 'var(--surface-2)' }}>
              <div 
                className="px-3 py-2 border-b flex items-center justify-between"
                style={{ borderColor: 'var(--divider)' }}
              >
                <div className="flex items-center gap-2">
                  <selectedConfig.icon 
                    className="w-3.5 h-3.5" 
                    style={{ color: selectedConfig.color }} 
                  />
                  <span 
                    className="text-[13px] font-semibold"
                    style={{ color: 'var(--text-1)' }}
                  >
                    {selectedConfig.label}
                  </span>
                </div>
                <span 
                  className="text-[12px] font-medium"
                  style={{ color: 'var(--text-1)' }}
                >
                  {selectedData.count}
                </span>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center p-3">
                {selectedData.count === 0 ? (
                  <div className="text-center space-y-2">
                    <div 
                      className="w-8 h-8 rounded-full mx-auto flex items-center justify-center"
                      style={{ backgroundColor: selectedConfig.bgColor }}
                    >
                      <selectedConfig.icon 
                        className="w-3.5 h-3.5" 
                        style={{ color: selectedConfig.color }} 
                      />
                    </div>
                    <div>
                      <p 
                        className="text-[13px] font-medium"
                        style={{ color: 'var(--text-1)' }}
                      >
                        No {selectedConfig.label.toLowerCase()} yet
                      </p>
                      <p 
                        className="text-[12px] mt-0.5"
                        style={{ color: 'var(--text-2)' }}
                      >
                        Create one to start tracking
                      </p>
                    </div>
                    <div className="flex flex-col gap-1.5 pt-1">
                      <Button 
                        size="sm" 
                        className="gap-1 h-7 text-[12px]"
                        style={{ 
                          backgroundColor: 'hsl(var(--brand-gold))',
                          color: 'white',
                        }}
                      >
                        <Plus className="w-3 h-3" />
                        {getCreateLabel(selectedLayer)}
                      </Button>
                      {selectedLayer === 'objectives' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="gap-1 h-7 text-[12px]"
                          onClick={handleOpenOKRHub}
                        >
                          <ExternalLink className="w-3 h-3" />
                          Open OKR Hub
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="w-full space-y-2">
                    {/* Summary stats */}
                    <div className="grid grid-cols-2 gap-2">
                      <div 
                        className="p-2 rounded text-center"
                        style={{ backgroundColor: 'var(--card-bg)' }}
                      >
                        <div 
                          className="text-lg font-bold"
                          style={{ color: selectedConfig.color }}
                        >
                          {selectedData.aligned}
                        </div>
                        <div 
                          className="text-[11px] font-medium"
                          style={{ color: 'var(--text-2)' }}
                        >
                          Aligned
                        </div>
                      </div>
                      <div 
                        className="p-2 rounded text-center"
                        style={{ backgroundColor: 'var(--card-bg)' }}
                      >
                        <div 
                          className="text-lg font-bold"
                          style={{ color: selectedData.misaligned > 0 ? 'hsl(var(--destructive))' : 'var(--text-2)' }}
                        >
                          {selectedData.misaligned}
                        </div>
                        <div 
                          className="text-[11px] font-medium"
                          style={{ color: 'var(--text-2)' }}
                        >
                          Misaligned
                        </div>
                      </div>
                    </div>

                    {/* Drilldown button */}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full gap-1 h-7 text-[12px]"
                      onClick={() => handleDrilldown(selectedConfig.label)}
                    >
                      View All
                      <ChevronRight className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
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
