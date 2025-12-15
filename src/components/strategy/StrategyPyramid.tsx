import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Info, Maximize2, Target, Palette, Boxes, FileCode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

  // Pyramid geometry - enlarged for better visibility
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

  // Layer Y coordinates (4 layers) - taller layers
  const y1 = 20;   // Objectives top
  const y2 = 110;  // Objectives base / Themes top
  const y3 = 200;  // Themes base / Epics top
  const y4 = 290;  // Epics base / Features top
  const y5 = 380;  // Features base

  const level1 = getXAtY(y1);
  const level2 = getXAtY(y2);
  const level3 = getXAtY(y3);
  const level4 = getXAtY(y4);
  const level5 = getXAtY(y5);

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

  const handleOpenFullView = () => {
    navigate(`/enterprise/backlog?snapshotId=${snapshotId}`);
  };

  // OKR v2 Objectives count (replaces Strategic Goals)
  const objectivesCount = okrMetrics?.count || 0;

  const layers = [
    { 
      key: 'objectives', 
      label: 'Objectives', 
      count: objectivesCount,
      misaligned: 0,
      icon: Target,
      y1: y1, y2: y2, color: colors.objectives,
    },
    { 
      key: 'themes', 
      label: 'Themes', 
      count: counts?.themes || 0,
      misaligned: 0,
      icon: Palette,
      y1: y2, y2: y3, color: colors.themes,
    },
    { 
      key: 'epics', 
      label: 'Epics', 
      count: counts?.alignedEpics || 0,
      misaligned: counts?.misalignedEpics || 0,
      icon: Boxes,
      y1: y3, y2: y4, color: colors.epics,
    },
    { 
      key: 'features', 
      label: 'Features', 
      count: counts?.alignedFeatures || 0,
      misaligned: counts?.misalignedFeatures || 0,
      icon: FileCode,
      y1: y4, y2: y5, color: colors.features,
    },
  ];

  return (
    <>
      <Card 
        className="rounded-lg shadow-sm"
        style={{ 
          borderLeft: '2px solid var(--accent-color)',
          backgroundColor: 'var(--surface-1)',
        }}
      >
        <CardHeader className="py-2.5 px-3" style={{ backgroundColor: 'var(--surface-2)', borderRadius: '8px 8px 0 0' }}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-1)' }}>
              Strategy Pyramid
            </CardTitle>
            <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>
              Click to drill down
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-0 px-3 pb-3">
          <div className="flex gap-4">
            {/* SVG Pyramid - more compact */}
            <div className="flex-1" style={{ maxWidth: '400px' }}>
              <div className="relative w-full" style={{ paddingBottom: '50%' }}>
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
            <div className="w-36 space-y-1 py-1">
              {layers.map((layer) => {
                const Icon = layer.icon;
                return (
                  <button
                    key={layer.key}
                    onClick={() => handleLayerClick(layer.label)}
                    className="w-full flex items-center justify-between py-1.5 px-2 rounded transition-colors text-left"
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-2)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: layer.color }} />
                      <span className="text-xs" style={{ color: 'var(--text-2)' }}>{layer.label}</span>
                    </div>
                    <span className="text-xs font-semibold" style={{ color: 'var(--accent-color)' }}>
                      {isLoading ? '...' : layer.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <PyramidDrilldownDrawer
        open={!!drilldownLayer}
        onClose={() => setDrilldownLayer(null)}
        layer={drilldownLayer}
        snapshotId={snapshotId}
      />
    </>
  );
}
