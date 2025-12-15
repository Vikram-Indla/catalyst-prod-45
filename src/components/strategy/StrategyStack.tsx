import { useState } from 'react';
import { Target, Palette, Boxes, FileCode, ChevronRight, Plus } from 'lucide-react';
import { PremiumCard, PremiumCardHeader, PremiumCardContent } from '@/components/ui/premium-card';
import { useStrategyPyramidCounts } from '@/hooks/useExecutionMetrics';
import { useOKRv2StrategyMetrics } from '@/hooks/useOKRv2StrategyMetrics';
import { PyramidDrilldownDrawer } from './PyramidDrilldownDrawer';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

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

  return (
    <>
      <PremiumCard>
        <PremiumCardHeader 
          title="Strategy Hierarchy" 
          subtitle="Coverage & alignment across strategic layers"
        />
        <PremiumCardContent noPadding>
          <div className="flex min-h-[280px]">
            {/* Left side: Stack list (70%) */}
            <div className="flex-[7] border-r" style={{ borderColor: 'var(--divider)' }}>
              <div className="divide-y" style={{ borderColor: 'var(--divider)' }}>
                {layerConfigs.map((layer) => {
                  const data = getLayerData(layer.key);
                  const Icon = layer.icon;
                  const isSelected = selectedLayer === layer.key;
                  
                  return (
                    <button
                      key={layer.key}
                      onClick={() => handleLayerSelect(layer.key)}
                      className="w-full flex items-center gap-4 px-4 py-3 transition-colors text-left group"
                      style={{ 
                        backgroundColor: isSelected ? 'var(--surface-2)' : 'transparent',
                      }}
                    >
                      {/* Icon + Label */}
                      <div className="flex items-center gap-3 min-w-[140px]">
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: layer.bgColor }}
                        >
                          <Icon className="w-4 h-4" style={{ color: layer.color }} />
                        </div>
                        <span 
                          className="text-sm font-medium"
                          style={{ color: 'var(--text-1)' }}
                        >
                          {layer.label}
                        </span>
                      </div>

                      {/* Count pill */}
                      <div 
                        className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                        style={{ 
                          backgroundColor: layer.bgColor,
                          color: layer.color,
                        }}
                      >
                        {isLoading || okrLoading ? '...' : data.count}
                      </div>

                      {/* Progress bar + percent */}
                      <div className="flex-1 flex items-center gap-3">
                        <div className="flex-1 max-w-[160px]">
                          <Progress 
                            value={data.progress} 
                            className="h-2"
                            style={{ 
                              backgroundColor: 'var(--surface-3)',
                            }}
                          />
                        </div>
                        <span 
                          className="text-xs font-medium w-10 text-right"
                          style={{ color: 'var(--text-2)' }}
                        >
                          {data.progress}%
                        </span>
                      </div>

                      {/* Aligned vs Misaligned */}
                      <div className="flex items-center gap-2 text-xs min-w-[140px]">
                        <span style={{ color: 'hsl(var(--secondary-green))' }}>
                          Aligned {data.aligned}
                        </span>
                        <span style={{ color: 'var(--text-4)' }}>|</span>
                        <span style={{ color: data.misaligned > 0 ? 'hsl(var(--destructive))' : 'var(--text-3)' }}>
                          Misaligned {data.misaligned}
                        </span>
                      </div>

                      {/* Drilldown chevron */}
                      <ChevronRight 
                        className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: 'var(--text-3)' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDrilldown(layer.label);
                        }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right side: Selected layer details (30%) */}
            <div className="flex-[3] flex flex-col">
              <div 
                className="px-4 py-3 border-b flex items-center justify-between"
                style={{ borderColor: 'var(--divider)' }}
              >
                <div className="flex items-center gap-2">
                  <selectedConfig.icon 
                    className="w-4 h-4" 
                    style={{ color: selectedConfig.color }} 
                  />
                  <span 
                    className="text-sm font-semibold"
                    style={{ color: 'var(--text-1)' }}
                  >
                    {selectedConfig.label}
                  </span>
                </div>
                <span 
                  className="text-xs"
                  style={{ color: 'var(--text-3)' }}
                >
                  {selectedData.count} items
                </span>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center p-4">
                {selectedData.count === 0 ? (
                  <div className="text-center space-y-3">
                    <div 
                      className="w-12 h-12 rounded-full mx-auto flex items-center justify-center"
                      style={{ backgroundColor: selectedConfig.bgColor }}
                    >
                      <selectedConfig.icon 
                        className="w-5 h-5" 
                        style={{ color: selectedConfig.color }} 
                      />
                    </div>
                    <p 
                      className="text-sm"
                      style={{ color: 'var(--text-3)' }}
                    >
                      No {selectedConfig.label.toLowerCase()} linked
                    </p>
                    <Button 
                      size="sm" 
                      className="gap-1.5"
                      style={{ 
                        backgroundColor: 'hsl(var(--brand-gold))',
                        color: 'white',
                      }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {getCreateLabel(selectedLayer)}
                    </Button>
                  </div>
                ) : (
                  <div className="w-full space-y-4">
                    {/* Summary stats */}
                    <div className="grid grid-cols-2 gap-3">
                      <div 
                        className="p-3 rounded-lg text-center"
                        style={{ backgroundColor: 'var(--surface-2)' }}
                      >
                        <div 
                          className="text-2xl font-bold"
                          style={{ color: selectedConfig.color }}
                        >
                          {selectedData.aligned}
                        </div>
                        <div 
                          className="text-xs"
                          style={{ color: 'var(--text-3)' }}
                        >
                          Aligned
                        </div>
                      </div>
                      <div 
                        className="p-3 rounded-lg text-center"
                        style={{ backgroundColor: 'var(--surface-2)' }}
                      >
                        <div 
                          className="text-2xl font-bold"
                          style={{ color: selectedData.misaligned > 0 ? 'hsl(var(--destructive))' : 'var(--text-2)' }}
                        >
                          {selectedData.misaligned}
                        </div>
                        <div 
                          className="text-xs"
                          style={{ color: 'var(--text-3)' }}
                        >
                          Misaligned
                        </div>
                      </div>
                    </div>

                    {/* Drilldown button */}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full gap-1.5"
                      onClick={() => handleDrilldown(selectedConfig.label)}
                    >
                      View All {selectedConfig.label}
                      <ChevronRight className="w-3.5 h-3.5" />
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
