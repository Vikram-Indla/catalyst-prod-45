import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, Palette, Boxes, FileCode } from 'lucide-react';
import { PremiumCard, PremiumCardHeader, PremiumCardContent } from '@/components/ui/premium-card';
import { useStrategyPyramidCounts } from '@/hooks/useExecutionMetrics';
import { useOKRv2StrategyMetrics } from '@/hooks/useOKRv2StrategyMetrics';
import { PyramidDrilldownDrawer } from './PyramidDrilldownDrawer';

interface StrategyPyramidProps {
  onLayerClick: (label: string) => void;
  snapshotId?: string;
}

export function StrategyPyramid({ onLayerClick, snapshotId }: StrategyPyramidProps) {
  const navigate = useNavigate();
  const [drilldownLayer, setDrilldownLayer] = useState<string | null>(null);
  const { data: counts, isLoading } = useStrategyPyramidCounts(snapshotId);
  const { data: okrMetrics, isLoading: okrLoading } = useOKRv2StrategyMetrics(snapshotId);

  // Pyramid geometry
  const centerX = 400;
  const topY = 20;
  const bottomY = 380;
  const baseHalfWidth = 380;
  
  const getXAtY = (y: number) => {
    const progress = (y - topY) / (bottomY - topY);
    const halfWidthAtY = baseHalfWidth * progress;
    return {
      left: centerX - halfWidthAtY,
      right: centerX + halfWidthAtY
    };
  };

  const y1 = 20;
  const y2 = 110;
  const y3 = 200;
  const y4 = 290;
  const y5 = 380;

  const colors = {
    objectives: 'hsl(var(--secondary-green))',
    themes: 'hsl(var(--secondary-bronze))',
    epics: 'hsl(var(--brand-gold))',
    features: 'hsl(var(--secondary-champagne))',
  };

  const handleLayerClick = (layer: string) => {
    setDrilldownLayer(layer);
    onLayerClick(layer);
  };

  const objectivesCount = okrMetrics?.count || 0;

  const layers = [
    { 
      key: 'objectives', 
      label: 'Objectives', 
      count: objectivesCount,
      icon: Target,
      y1: y1, y2: y2, color: colors.objectives,
    },
    { 
      key: 'themes', 
      label: 'Themes', 
      count: counts?.themes || 0,
      icon: Palette,
      y1: y2, y2: y3, color: colors.themes,
    },
    { 
      key: 'epics', 
      label: 'Epics', 
      count: counts?.alignedEpics || 0,
      icon: Boxes,
      y1: y3, y2: y4, color: colors.epics,
    },
    { 
      key: 'features', 
      label: 'Features', 
      count: counts?.alignedFeatures || 0,
      icon: FileCode,
      y1: y4, y2: y5, color: colors.features,
    },
  ];

  const headerAction = (
    <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>Click to drill down</span>
  );

  return (
    <>
      <PremiumCard>
        <PremiumCardHeader title="Strategy Pyramid" action={headerAction} />
        <PremiumCardContent noPadding>
          <div className="flex gap-4 items-start p-4">
            {/* SVG Pyramid */}
            <div className="flex-1" style={{ maxWidth: '340px' }}>
              <div className="relative w-full" style={{ paddingBottom: '45%' }}>
                <svg 
                  viewBox="0 0 800 400" 
                  className="absolute inset-0 w-full h-full" 
                  preserveAspectRatio="xMidYMid meet"
                >
                  {layers.map((layer, index) => {
                    const top = getXAtY(layer.y1);
                    const bottom = getXAtY(layer.y2);
                    const centerY = (layer.y1 + layer.y2) / 2;
                    
                    return (
                      <g key={layer.key}>
                        <path
                          d={index === 0
                            ? `M ${centerX} ${layer.y1} L ${bottom.left} ${layer.y2} L ${bottom.right} ${layer.y2} Z`
                            : `M ${top.left} ${layer.y1} L ${top.right} ${layer.y1} L ${bottom.right} ${layer.y2} L ${bottom.left} ${layer.y2} Z`
                          }
                          fill={layer.color}
                          stroke="white"
                          strokeWidth="2"
                          className="cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => handleLayerClick(layer.label)}
                        />
                        <text 
                          x={centerX} 
                          y={centerY - 2} 
                          fill="white" 
                          fontSize="18" 
                          fontWeight="700"
                          textAnchor="middle"
                          className="pointer-events-none"
                        >
                          {isLoading ? '...' : layer.count}
                        </text>
                        <text
                          x={centerX}
                          y={centerY + 14}
                          fill="white"
                          fontSize="11"
                          fontWeight="500"
                          textAnchor="middle"
                          className="pointer-events-none"
                        >
                          {layer.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            {/* Compact legend */}
            <div className="w-36 space-y-1 pt-1">
              {layers.map((layer) => (
                <button
                  key={layer.key}
                  onClick={() => handleLayerClick(layer.label)}
                  className="w-full flex items-center justify-between py-1.5 px-2 rounded transition-colors text-left cursor-pointer hover:bg-[var(--surface-2)]"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: layer.color }} />
                    <span className="text-xs" style={{ color: 'var(--text-2)' }}>{layer.label}</span>
                  </div>
                  <span className="text-xs font-semibold" style={{ color: 'var(--accent-color)' }}>
                    {isLoading ? '...' : layer.count}
                  </span>
                </button>
              ))}
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
