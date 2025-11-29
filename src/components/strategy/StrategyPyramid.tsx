import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useState } from 'react';

interface StrategyPyramidProps {
  onLayerClick: (label: string) => void;
  snapshotId?: string;
}

export function StrategyPyramid({ onLayerClick, snapshotId }: StrategyPyramidProps) {
  const navigate = useNavigate();
  const [hoveredLayer, setHoveredLayer] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Fetch counts from database
  const { data: counts } = useQuery({
    queryKey: ['pyramid-counts', snapshotId],
    queryFn: async () => {
      const { data: goals } = await supabase
        .from('goals')
        .select('level')
        .eq('snapshot_id', snapshotId || '');

      const countByLevel = goals?.reduce((acc, g) => {
        acc[g.level] = (acc[g.level] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Fetch work items counts filtered by snapshot
      const { count: themesCount } = await supabase
        .from('strategic_themes')
        .select('id', { count: 'exact', head: true })
        .eq('snapshot_id', snapshotId || '');
      
      const { count: epicsCount } = await supabase
        .from('epics')
        .select('id', { count: 'exact', head: true })
        .in('theme_id', 
          (await supabase
            .from('strategic_themes')
            .select('id')
            .eq('snapshot_id', snapshotId || '')
          ).data?.map(t => t.id) || []
        );
      
      const { count: featuresCount } = await supabase
        .from('features')
        .select('id', { count: 'exact', head: true })
        .in('epic_id',
          (await supabase
            .from('epics')
            .select('id')
            .in('theme_id',
              (await supabase
                .from('strategic_themes')
                .select('id')
                .eq('snapshot_id', snapshotId || '')
              ).data?.map(t => t.id) || []
            )
          ).data?.map(e => e.id) || []
        );

      // For objectives, use strategic_goal level from goals table
      const portfolioObjectives = countByLevel['strategic_goal'] || 0;
      const programObjectives = countByLevel['strategic_goal'] || 0;

      return {
        mission: countByLevel['mission'] || 0,
        vision: countByLevel['vision'] || 0,
        value: countByLevel['value'] || 0,
        north_star: countByLevel['north_star'] || 0,
        long_term_goal: countByLevel['long_term_goal'] || 0,
        long_term_strategy: countByLevel['long_term_strategy'] || 0,
        yearly_goal: countByLevel['yearly_goal'] || 0,
        themes: themesCount || 0,
        portfolio_objective: portfolioObjectives,
        epics: epicsCount || 0,
        program_objective: programObjectives,
        features: featuresCount || 0,
      };
    },
    enabled: !!snapshotId,
  });
  
  // Pyramid geometry - 6 layers: 3 full-width + 3 split
  const centerX = 500;
  const topY = 30;
  const bottomY = 550;
  const baseHalfWidth = 450;
  
  // Calculate left and right edge X coordinates at each Y level
  const getXAtY = (y: number) => {
    const progress = (y - topY) / (bottomY - topY);
    const halfWidthAtY = baseHalfWidth * progress;
    return {
      left: centerX - halfWidthAtY,
      right: centerX + halfWidthAtY
    };
  };

  // Define Y coordinates for 6 layers with symmetrical spacing
  const y1 = 30;   // Missions tip
  const y2 = 100;  // Missions base / Visions top (height: 70px)
  const y3 = 170;  // Visions base / Values top (height: 70px)
  const y4 = 240;  // Values base / Yearly Goals+Themes top (height: 70px)
  const y5 = 350;  // Yearly Goals+Themes base / Portfolio Objectives+Epics top (height: 110px)
  const y6 = 450;  // Portfolio Objectives+Epics base / Program Objectives+Features top (height: 100px)
  const y7 = 550;  // Bottom (height: 100px)

  // Get coordinates for each level
  const level1 = getXAtY(y1);
  const level2 = getXAtY(y2);
  const level3 = getXAtY(y3);
  const level4 = getXAtY(y4);
  const level5 = getXAtY(y5);
  const level6 = getXAtY(y6);
  const level7 = getXAtY(y7);

  // Color shades - Enterprise Gold gradient with depth
  const colors = {
    missions: 'hsl(28, 39%, 60%)',           // Brand gold
    visions: 'hsl(28, 39%, 58%)',            // Slightly darker gold
    values: 'hsl(28, 39%, 56%)',             // Medium gold
    northStars: 'hsl(28, 39%, 54%)',         // Darker gold
    longTermGoals: 'hsl(28, 37%, 52%)',      // Even darker
    longTermStrategies: 'hsl(28, 35%, 50%)', // Rich gold
    yearlyGoals: 'hsl(28, 39%, 56%)',        // Medium gold
    themes: 'hsl(28, 39%, 56%)',             // Medium gold
    portfolioObjectives: 'hsl(28, 37%, 52%)', // Darker gold
    epics: 'hsl(28, 37%, 52%)',              // Darker gold
    programObjectives: 'hsl(28, 35%, 48%)',  // Deep gold
    features: 'hsl(28, 35%, 48%)',           // Deep gold
  };

  const handleNumberClick = (route: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(route);
  };

  const handleMouseEnter = (layerName: string, e: React.MouseEvent<SVGElement>) => {
    const svgElement = e.currentTarget.ownerSVGElement;
    if (svgElement) {
      const pt = svgElement.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const svgP = pt.matrixTransform(svgElement.getScreenCTM()?.inverse());
      
      // Get layer boundaries - find the Y range for this layer
      let layerTop = 0, layerBottom = 0;
      
      // Determine layer boundaries based on layer name
      if (layerName === 'Missions') { layerTop = y1; layerBottom = y2; }
      else if (layerName === 'Visions') { layerTop = y2; layerBottom = y3; }
      else if (layerName === 'Values') { layerTop = y3; layerBottom = y4; }
      else if (layerName === 'Yearly Goals' || layerName === 'Themes') { layerTop = y4; layerBottom = y5; }
      else if (layerName === 'Portfolio Objectives' || layerName === 'Epics') { layerTop = y5; layerBottom = y6; }
      else if (layerName === 'Program Objectives' || layerName === 'Features') { layerTop = y6; layerBottom = y7; }
      
      // Calculate vertical center of the layer
      const layerCenterY = (layerTop + layerBottom) / 2;
      
      // Get pyramid boundaries at layer center
      const { left: leftEdge, right: rightEdge } = getXAtY(layerCenterY);
      
      const tooltipWidth = 220; // Width of the tooltip rect
      const tooltipHalfWidth = tooltipWidth / 2;
      const minX = 10; // Minimum X position to keep tooltip visible
      const maxX = 1000 - tooltipWidth - 10; // Maximum X position
      
      // Special positioning for Missions (top tip)
      if (layerName === 'Missions') {
        // Position tooltip completely outside the right edge
        const tooltipX = Math.min(maxX, rightEdge + 20);
        setTooltipPos({ x: tooltipX, y: layerCenterY });
      } else {
        // All other layers: position completely outside the pyramid edges
        const isLeftSide = ['Yearly Goals', 'Portfolio Objectives', 'Program Objectives'].includes(layerName);
        
        let tooltipX;
        if (layerName === 'Visions' || layerName === 'Values' || layerName === 'Themes') {
          // Right side layers: position completely outside the right edge
          tooltipX = Math.min(maxX, rightEdge + 20);
        } else if (isLeftSide) {
          // Left side layers: position completely outside the left edge
          tooltipX = Math.max(minX, leftEdge - tooltipWidth - 20);
        } else {
          // Other layers: straddle the respective edge
          tooltipX = Math.min(maxX, rightEdge - tooltipHalfWidth);
        }
        
        setTooltipPos({ x: tooltipX, y: layerCenterY });
      }
    }
    setHoveredLayer(layerName);
  };

  const handleMouseLeave = () => {
    setHoveredLayer(null);
  };

  // Helper to wrap text into multiple tspan lines
  const wrapText = (text: string, maxWidth: number, fontSize: number = 14) => {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    // Approximate character width (adjust based on font)
    const charWidth = fontSize * 0.5;
    const maxChars = Math.floor(maxWidth / charWidth);
    
    words.forEach(word => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (testLine.length <= maxChars) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    });
    if (currentLine) lines.push(currentLine);
    
    // Limit to 2 lines with ellipsis
    if (lines.length > 2) {
      lines[1] = lines[1].substring(0, lines[1].length - 3) + '...';
      return lines.slice(0, 2);
    }
    return lines;
  };

  const layerTooltips: Record<string, string> = {
    'Missions': 'Why do we exist?',
    'Visions': 'What value do we provide?',
    'Values': 'How do we behave?',
    'Yearly Goals': 'Shorter-term strategic objectives',
    'Themes': 'Strategic themes for execution',
    'Portfolio Objectives': 'Portfolio-level objectives',
    'Epics': 'Large initiatives',
    'Program Objectives': 'Program-level objectives',
    'Features': 'Deliverable features',
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <CardTitle className="text-xl">Strategy Pyramid</CardTitle>
            <CardDescription className="text-sm">
              Hierarchical visualization of strategy management. Click numbers to navigate to each level.
            </CardDescription>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-5 w-5 text-muted-foreground cursor-help mt-1" />
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-sm">
                <p className="text-xs">
                  Themes, epics, and features are included in the counts when the work item is 
                  parented to a higher level objective or goal and planned for a program increment associated 
                  with the selected strategic snapshot. Misaligned work items are those associated with 
                  objectives or goals in the pyramid, but not planned in an aligned PI.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="p-4 md:p-6">
        <div className="relative w-full" style={{ paddingBottom: '60%' }}>
          <svg 
            viewBox="0 0 1000 600" 
            className="absolute inset-0 w-full h-full" 
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Layer 1: Missions (full width) */}
            <g>
              <path
                d={`M ${centerX} ${y1} L ${level2.left} ${y2} L ${level2.right} ${y2} Z`}
                fill={colors.missions}
                stroke="white"
                strokeWidth="2"
                className="cursor-pointer transition-opacity"
                onClick={() => onLayerClick("Missions")}
                onMouseEnter={(e) => handleMouseEnter('Missions', e)}
                onMouseLeave={handleMouseLeave}
              />
              <text 
                x={centerX} 
                y={y1 + 35} 
                fill="white" 
                fontSize="20" 
                fontWeight="700"
                textAnchor="middle"
                className="cursor-pointer hover:underline"
                onClick={(e) => handleNumberClick(`/enterprise/strategy-room?level=mission&snapshot=${snapshotId}`, e)}
                onMouseEnter={(e) => handleMouseEnter('Missions', e)}
                onMouseLeave={handleMouseLeave}
              >
                {counts?.mission || 0}
              </text>
              <text
                x={centerX}
                y={(y1 + y2) / 2 + 20}
                fill="white"
                fontSize="14"
                fontWeight="600"
                textAnchor="middle"
                className="pointer-events-none select-none"
              >
                Missions
              </text>
            </g>

            {/* Layer 2: Visions (full width) */}
            <g>
              <path
                d={`M ${level2.left} ${y2} L ${level2.right} ${y2} L ${level3.right} ${y3} L ${level3.left} ${y3} Z`}
                fill={colors.visions}
                stroke="white"
                strokeWidth="2"
                className="cursor-pointer transition-opacity"
                onClick={() => onLayerClick("Visions")}
                onMouseEnter={(e) => handleMouseEnter('Visions', e)}
                onMouseLeave={handleMouseLeave}
              />
              <text 
                x={centerX} 
                y={y2 + 30} 
                fill="white" 
                fontSize="20" 
                fontWeight="700"
                textAnchor="middle"
                className="cursor-pointer hover:underline"
                onClick={(e) => handleNumberClick(`/enterprise/strategy-room?level=vision&snapshot=${snapshotId}`, e)}
                onMouseEnter={(e) => handleMouseEnter('Visions', e)}
                onMouseLeave={handleMouseLeave}
              >
                {counts?.vision || 0}
              </text>
              <text
                x={centerX}
                y={(y2 + y3) / 2 + 10}
                fill="white"
                fontSize="14"
                fontWeight="600"
                textAnchor="middle"
                className="pointer-events-none select-none"
              >
                Visions
              </text>
            </g>

            {/* Layer 3: Values (full width) */}
            <g>
              <path
                d={`M ${level3.left} ${y3} L ${level3.right} ${y3} L ${level4.right} ${y4} L ${level4.left} ${y4} Z`}
                fill={colors.values}
                stroke="white"
                strokeWidth="2"
                className="cursor-pointer transition-opacity"
                onClick={() => onLayerClick("Values")}
                onMouseEnter={(e) => handleMouseEnter('Values', e)}
                onMouseLeave={handleMouseLeave}
              />
              <text 
                x={centerX} 
                y={y3 + 30} 
                fill="white" 
                fontSize="20" 
                fontWeight="700"
                textAnchor="middle"
                className="cursor-pointer hover:underline"
                onClick={(e) => handleNumberClick(`/enterprise/strategy-room?level=value&snapshot=${snapshotId}`, e)}
                onMouseEnter={(e) => handleMouseEnter('Values', e)}
                onMouseLeave={handleMouseLeave}
              >
                {counts?.value || 0}
              </text>
              <text
                x={centerX}
                y={(y3 + y4) / 2 + 10}
                fill="white"
                fontSize="14"
                fontWeight="600"
                textAnchor="middle"
                className="pointer-events-none select-none"
              >
                Values
              </text>
            </g>

            {/* Layer 4: Yearly Goals (left) and Themes (right) - SPLIT */}
            {/* Layer 4: Yearly Goals (left) and Themes (right) - SPLIT */}
            <g>
              <path
                d={`M ${level4.left} ${y4} L ${centerX} ${y4} L ${centerX} ${y5} L ${level5.left} ${y5} Z`}
                fill={colors.yearlyGoals}
                stroke="white"
                strokeWidth="2"
                className="cursor-pointer transition-opacity"
                onClick={() => onLayerClick("Yearly Goals")}
                onMouseEnter={(e) => handleMouseEnter('Yearly Goals', e)}
                onMouseLeave={handleMouseLeave}
              />
              <text 
                x={(level4.left + centerX) / 2} 
                y={y4 + 40} 
                fill="white" 
                fontSize="20" 
                fontWeight="700"
                textAnchor="middle"
                className="cursor-pointer hover:underline"
                onClick={(e) => handleNumberClick(`/enterprise/strategy-room?level=yearly_goal&snapshot=${snapshotId}`, e)}
                onMouseEnter={(e) => handleMouseEnter('Yearly Goals', e)}
                onMouseLeave={handleMouseLeave}
              >
                {counts?.yearly_goal || 0}
              </text>
              <text
                x={(level4.left + centerX) / 2}
                y={y4 + 65}
                fill="white"
                fontSize="13"
                fontWeight="600"
                textAnchor="middle"
                className="pointer-events-none select-none"
              >
                Yearly Goals
              </text>
            </g>

            <g>
              <path
                d={`M ${centerX} ${y4} L ${level4.right} ${y4} L ${level5.right} ${y5} L ${centerX} ${y5} Z`}
                fill={colors.themes}
                stroke="white"
                strokeWidth="2"
                className="cursor-pointer transition-opacity"
                onClick={() => onLayerClick("Themes")}
                onMouseEnter={(e) => handleMouseEnter('Themes', e)}
                onMouseLeave={handleMouseLeave}
              />
              <text 
                x={(centerX + level4.right) / 2} 
                y={y4 + 40} 
                fill="white" 
                fontSize="20" 
                fontWeight="700"
                textAnchor="middle"
                className="cursor-pointer hover:underline"
                onClick={(e) => handleNumberClick(`/themes`, e)}
                onMouseEnter={(e) => handleMouseEnter('Themes', e)}
                onMouseLeave={handleMouseLeave}
              >
                {counts?.themes || 0}
              </text>
              <text
                x={(centerX + level4.right) / 2}
                y={y4 + 65}
                fill="white"
                fontSize="13"
                fontWeight="600"
                textAnchor="middle"
                className="pointer-events-none select-none"
              >
                Themes
              </text>
            </g>

            {/* Vertical divider for split layer */}
            <line x1={centerX} y1={y4} x2={centerX} y2={y5} stroke="white" strokeWidth="2" />

            {/* Layer 5: Portfolio Objectives (left) and Epics (right) - SPLIT */}
            {/* Layer 5: Portfolio Objectives (left) and Epics (right) - SPLIT */}
            <g>
              <path
                d={`M ${level5.left} ${y5} L ${centerX} ${y5} L ${centerX} ${y6} L ${level6.left} ${y6} Z`}
                fill={colors.portfolioObjectives}
                stroke="white"
                strokeWidth="2"
                className="cursor-pointer transition-opacity"
                onClick={() => onLayerClick("Portfolio Objectives")}
                onMouseEnter={(e) => handleMouseEnter('Portfolio Objectives', e)}
                onMouseLeave={handleMouseLeave}
              />
              <text 
                x={(level5.left + centerX) / 2} 
                y={y5 + 35} 
                fill="white" 
                fontSize="20" 
                fontWeight="700"
                textAnchor="middle"
                className="cursor-pointer hover:underline"
                onClick={(e) => handleNumberClick(`/enterprise/okr-hub?level=portfolio`, e)}
                onMouseEnter={(e) => handleMouseEnter('Portfolio Objectives', e)}
                onMouseLeave={handleMouseLeave}
              >
                {counts?.portfolio_objective || 0}
              </text>
              <text
                x={(level5.left + centerX) / 2}
                y={y5 + 60}
                fill="white"
                fontSize="13"
                fontWeight="600"
                textAnchor="middle"
                className="pointer-events-none select-none"
              >
                Portfolio Objectives
              </text>
            </g>

            <g>
              <path
                d={`M ${centerX} ${y5} L ${level5.right} ${y5} L ${level6.right} ${y6} L ${centerX} ${y6} Z`}
                fill={colors.epics}
                stroke="white"
                strokeWidth="2"
                className="cursor-pointer transition-opacity"
                onClick={() => onLayerClick("Epics")}
                onMouseEnter={(e) => handleMouseEnter('Epics', e)}
                onMouseLeave={handleMouseLeave}
              />
              <text 
                x={(centerX + level5.right) / 2} 
                y={y5 + 35} 
                fill="white" 
                fontSize="20" 
                fontWeight="700"
                textAnchor="middle"
                className="cursor-pointer hover:underline"
                onClick={(e) => handleNumberClick(`/backlog/epics`, e)}
                onMouseEnter={(e) => handleMouseEnter('Epics', e)}
                onMouseLeave={handleMouseLeave}
              >
                {counts?.epics || 0}
              </text>
              <text
                x={(centerX + level5.right) / 2}
                y={y5 + 60}
                fill="white"
                fontSize="13"
                fontWeight="600"
                textAnchor="middle"
                className="pointer-events-none select-none"
              >
                Epics
              </text>
            </g>

            {/* Vertical divider for split layer */}
            <line x1={centerX} y1={y5} x2={centerX} y2={y6} stroke="white" strokeWidth="2" />

            {/* Layer 6: Program Objectives (left) and Features (right) - SPLIT */}
            {/* Layer 6: Program Objectives (left) and Features (right) - SPLIT */}
            <g>
              <path
                d={`M ${level6.left} ${y6} L ${centerX} ${y6} L ${centerX} ${y7} L ${level7.left} ${y7} Z`}
                fill={colors.programObjectives}
                stroke="white"
                strokeWidth="2"
                className="cursor-pointer transition-opacity"
                onClick={() => onLayerClick("Program Objectives")}
                onMouseEnter={(e) => handleMouseEnter('Program Objectives', e)}
                onMouseLeave={handleMouseLeave}
              />
              <text 
                x={(level6.left + centerX) / 2} 
                y={y6 + 35} 
                fill="white" 
                fontSize="20" 
                fontWeight="700"
                textAnchor="middle"
                className="cursor-pointer hover:underline"
                onClick={(e) => handleNumberClick(`/program/okr-hub?level=program`, e)}
                onMouseEnter={(e) => handleMouseEnter('Program Objectives', e)}
                onMouseLeave={handleMouseLeave}
              >
                {counts?.program_objective || 0}
              </text>
              <text
                x={(level6.left + centerX) / 2}
                y={y6 + 60}
                fill="white"
                fontSize="13"
                fontWeight="600"
                textAnchor="middle"
                className="pointer-events-none select-none"
              >
                Program Objectives
              </text>
            </g>

            <g>
              <path
                d={`M ${centerX} ${y6} L ${level6.right} ${y6} L ${level7.right} ${y7} L ${centerX} ${y7} Z`}
                fill={colors.features}
                stroke="white"
                strokeWidth="2"
                className="cursor-pointer transition-opacity"
                onClick={() => onLayerClick("Features")}
                onMouseEnter={(e) => handleMouseEnter('Features', e)}
                onMouseLeave={handleMouseLeave}
              />
              <text 
                x={(centerX + level6.right) / 2} 
                y={y6 + 35} 
                fill="white" 
                fontSize="20" 
                fontWeight="700"
                textAnchor="middle"
                className="cursor-pointer hover:underline"
                onClick={(e) => handleNumberClick(`/features`, e)}
                onMouseEnter={(e) => handleMouseEnter('Features', e)}
                onMouseLeave={handleMouseLeave}
              >
                {counts?.features || 0}
              </text>
              <text
                x={(centerX + level6.right) / 2}
                y={y6 + 60}
                fill="white"
                fontSize="13"
                fontWeight="600"
                textAnchor="middle"
                className="pointer-events-none select-none"
              >
                Features
              </text>
            </g>

            {/* Vertical divider for split layer */}
            <line x1={centerX} y1={y6} x2={centerX} y2={y7} stroke="white" strokeWidth="2" />

            {/* Hover Tooltip */}
            {hoveredLayer && (
              <g className="pointer-events-none">
                <rect
                  x={tooltipPos.x}
                  y={tooltipPos.y - 35}
                  width="220"
                  height="60"
                  fill="hsl(var(--popover))"
                  stroke="hsl(var(--border))"
                  strokeWidth="1"
                  rx="6"
                  className="drop-shadow-md"
                />
                <text
                  x={tooltipPos.x + 10}
                  y={tooltipPos.y - 15}
                  fill="hsl(var(--popover-foreground))"
                  fontSize="13"
                  fontWeight="600"
                >
                  {hoveredLayer}
                </text>
                <text
                  x={tooltipPos.x + 10}
                  y={tooltipPos.y + 5}
                  fill="hsl(var(--muted-foreground))"
                  fontSize="11"
                >
                  {layerTooltips[hoveredLayer]}
                </text>
              </g>
            )}
          </svg>
        </div>
      </CardContent>
    </Card>
  );
}
