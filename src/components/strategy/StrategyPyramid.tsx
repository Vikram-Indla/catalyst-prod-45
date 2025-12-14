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
      <Card style={{ borderLeft: '3px solid var(--accent-color)' }}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base flex items-center gap-2">
                Strategy Pyramid
              </CardTitle>
              <CardDescription className="text-xs">
                Click layers to drill down. Misaligned items shown in badges.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex gap-6">
            {/* SVG Pyramid */}
            <div className="flex-1" style={{ maxWidth: '600px' }}>
              <div className="relative w-full" style={{ paddingBottom: '55%' }}>
                <svg 
                  viewBox="0 0 800 420" 
                  className="absolute inset-0 w-full h-full" 
                  preserveAspectRatio="xMidYMid meet"
                >
                  {layers.map((layer, index) => {
                    const top = getXAtY(layer.y1);
                    const bottom = getXAtY(layer.y2);
                    const centerY = (layer.y1 + layer.y2) / 2;
                    
                    return (
                      <g key={layer.key}>
                        {/* Layer shape */}
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
                        {/* Count */}
                        <text 
                          x={centerX} 
                          y={centerY - 5} 
                          fill="white" 
                          fontSize="22" 
                          fontWeight="700"
                          textAnchor="middle"
                          className="pointer-events-none"
                        >
                          {isLoading ? '...' : layer.count}
                        </text>
                        {/* Label */}
                        <text
                          x={centerX}
                          y={centerY + 18}
                          fill="white"
                          fontSize="13"
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

            {/* Legend with misaligned badges */}
            <div className="w-48 space-y-2 py-2">
              {layers.map((layer) => {
                const Icon = layer.icon;
                return (
                  <button
                    key={layer.key}
                    onClick={() => handleLayerClick(layer.label)}
                    className="w-full flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" style={{ color: layer.color }} />
                      <span className="text-sm">{layer.label}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs h-5">
                        {isLoading ? '...' : layer.count}
                      </Badge>
                      {layer.misaligned > 0 && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge 
                                variant="outline" 
                                className="text-[10px] h-5 border-amber-300 text-amber-700 bg-amber-50 cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDrilldownLayer(`${layer.label} (Misaligned)`);
                                }}
                              >
                                {layer.misaligned}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">{layer.misaligned} misaligned items</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Drilldown Drawer */}
      <PyramidDrilldownDrawer
        open={!!drilldownLayer}
        onClose={() => setDrilldownLayer(null)}
        layer={drilldownLayer}
        snapshotId={snapshotId}
      />
    </>
  );
}
