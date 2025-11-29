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

interface StrategyPyramidProps {
  onLayerClick: (label: string) => void;
  snapshotId?: string;
}

export function StrategyPyramid({ onLayerClick, snapshotId }: StrategyPyramidProps) {
  const navigate = useNavigate();

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

      // Fetch work items counts
      const { data: themes } = await supabase.from('strategic_themes').select('id', { count: 'exact', head: true });
      const { data: epics } = await supabase.from('epics').select('id', { count: 'exact', head: true });
      const { data: features } = await supabase.from('features').select('id', { count: 'exact', head: true });

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
        themes: themes?.length || 0,
        portfolio_objective: portfolioObjectives,
        epics: epics?.length || 0,
        program_objective: programObjectives,
        features: features?.length || 0,
      };
    },
    enabled: !!snapshotId,
  });
  
  // Pyramid geometry - 9 layers: 6 full-width + 3 split
  const centerX = 500;
  const topY = 50;
  const bottomY = 900;
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

  // Define Y coordinates for 9 layers
  const y1 = 50;   // Missions tip
  const y2 = 130;  // Missions base / Visions top
  const y3 = 210;  // Visions base / Values top
  const y4 = 290;  // Values base / North Stars top
  const y5 = 370;  // North Stars base / Long Term Goals top
  const y6 = 450;  // Long Term Goals base / Long Term Strategies top
  const y7 = 530;  // Long Term Strategies base / Yearly Goals+Themes top
  const y8 = 680;  // Yearly Goals+Themes base / Portfolio Objectives+Epics top
  const y9 = 830;  // Portfolio Objectives+Epics base / Program Objectives+Features top
  const y10 = 900; // Bottom

  // Get coordinates for each level
  const level1 = getXAtY(y1);
  const level2 = getXAtY(y2);
  const level3 = getXAtY(y3);
  const level4 = getXAtY(y4);
  const level5 = getXAtY(y5);
  const level6 = getXAtY(y6);
  const level7 = getXAtY(y7);
  const level8 = getXAtY(y8);
  const level9 = getXAtY(y9);
  const level10 = getXAtY(y10);

  // Color shades (blue gradient from light to dark)
  const colors = {
    missions: 'hsl(210, 100%, 72%)',
    visions: 'hsl(210, 100%, 68%)',
    values: 'hsl(210, 100%, 64%)',
    northStars: 'hsl(210, 100%, 60%)',
    longTermGoals: 'hsl(210, 100%, 56%)',
    longTermStrategies: 'hsl(210, 100%, 52%)',
    yearlyGoals: 'hsl(210, 100%, 48%)',
    themes: 'hsl(210, 100%, 48%)',
    portfolioObjectives: 'hsl(210, 100%, 44%)',
    epics: 'hsl(210, 100%, 44%)',
    programObjectives: 'hsl(210, 100%, 40%)',
    features: 'hsl(210, 100%, 40%)',
  };

  const handleNumberClick = (route: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(route);
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
        <div className="relative w-full" style={{ paddingBottom: '95%' }}>
          <svg 
            viewBox="0 0 1000 950" 
            className="absolute inset-0 w-full h-full" 
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Layer 1: Missions (full width) */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <path
                    d={`M ${centerX} ${y1} L ${level2.left} ${y2} L ${level2.right} ${y2} Z`}
                    fill={colors.missions}
                    stroke="white"
                    strokeWidth="2"
                    className="cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => onLayerClick("Missions")}
                  />
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-popover text-popover-foreground">
                  <p className="text-xs">Why do we exist?</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <foreignObject x={level2.left + 10} y={y1 + 30} width={level2.right - level2.left - 20} height="50">
              <div className="flex items-center justify-center h-full text-center">
                <div className="text-white font-semibold text-sm leading-tight">Missions</div>
              </div>
            </foreignObject>
            {/* Clickable count on right side */}
            <text 
              x={level2.right + 40} 
              y={(y1 + y2) / 2 + 5} 
              fill="currentColor" 
              fontSize="16" 
              fontWeight="600"
              className="cursor-pointer hover:underline"
              onClick={(e) => handleNumberClick(`/enterprise/strategy-room?level=mission&snapshot=${snapshotId}`, e)}
            >
              {counts?.mission || 0}
            </text>

            {/* Layer 2: Visions (full width) */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <path
                    d={`M ${level2.left} ${y2} L ${level2.right} ${y2} L ${level3.right} ${y3} L ${level3.left} ${y3} Z`}
                    fill={colors.visions}
                    stroke="white"
                    strokeWidth="2"
                    className="cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => onLayerClick("Visions")}
                  />
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-popover text-popover-foreground">
                  <p className="text-xs">What value do we provide?</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <foreignObject x={level2.left + 15} y={y2 + 25} width={level2.right - level2.left - 30} height="55">
              <div className="flex items-center justify-center h-full text-center">
                <div className="text-white font-semibold text-sm leading-tight">Visions</div>
              </div>
            </foreignObject>
            {/* Clickable count on right side */}
            <text 
              x={level3.right + 40} 
              y={(y2 + y3) / 2 + 5} 
              fill="currentColor" 
              fontSize="16" 
              fontWeight="600"
              className="cursor-pointer hover:underline"
              onClick={(e) => handleNumberClick(`/enterprise/strategy-room?level=vision&snapshot=${snapshotId}`, e)}
            >
              {counts?.vision || 0}
            </text>

            {/* Layer 3: Values (full width) */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <path
                    d={`M ${level3.left} ${y3} L ${level3.right} ${y3} L ${level4.right} ${y4} L ${level4.left} ${y4} Z`}
                    fill={colors.values}
                    stroke="white"
                    strokeWidth="2"
                    className="cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => onLayerClick("Values")}
                  />
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-popover text-popover-foreground">
                  <p className="text-xs">How do we behave?</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <foreignObject x={level3.left + 15} y={y3 + 25} width={level3.right - level3.left - 30} height="55">
              <div className="flex items-center justify-center h-full text-center">
                <div className="text-white font-semibold text-sm leading-tight">Values</div>
              </div>
            </foreignObject>
            {/* Clickable count on right side */}
            <text 
              x={level4.right + 40} 
              y={(y3 + y4) / 2 + 5} 
              fill="currentColor" 
              fontSize="16" 
              fontWeight="600"
              className="cursor-pointer hover:underline"
              onClick={(e) => handleNumberClick(`/enterprise/strategy-room?level=value&snapshot=${snapshotId}`, e)}
            >
              {counts?.value || 0}
            </text>

            {/* Layer 4: North Stars (full width) */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <path
                    d={`M ${level4.left} ${y4} L ${level4.right} ${y4} L ${level5.right} ${y5} L ${level5.left} ${y5} Z`}
                    fill={colors.northStars}
                    stroke="white"
                    strokeWidth="2"
                    className="cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => onLayerClick("North Stars")}
                  />
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-popover text-popover-foreground">
                  <p className="text-xs">What is our measurable goal?</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <foreignObject x={level4.left + 15} y={y4 + 25} width={level4.right - level4.left - 30} height="55">
              <div className="flex items-center justify-center h-full text-center">
                <div className="text-white font-semibold text-sm leading-tight">North Stars</div>
              </div>
            </foreignObject>
            {/* Clickable count on right side */}
            <text 
              x={level5.right + 40} 
              y={(y4 + y5) / 2 + 5} 
              fill="currentColor" 
              fontSize="16" 
              fontWeight="600"
              className="cursor-pointer hover:underline"
              onClick={(e) => handleNumberClick(`/enterprise/strategy-room?level=north_star&snapshot=${snapshotId}`, e)}
            >
              {counts?.north_star || 0}
            </text>

            {/* Layer 5: Long Term Goals (full width) */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <path
                    d={`M ${level5.left} ${y5} L ${level5.right} ${y5} L ${level6.right} ${y6} L ${level6.left} ${y6} Z`}
                    fill={colors.longTermGoals}
                    stroke="white"
                    strokeWidth="2"
                    className="cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => onLayerClick("Long Term Goals")}
                  />
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-popover text-popover-foreground">
                  <p className="text-xs">How will we succeed long-term?</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <foreignObject x={level5.left + 15} y={y5 + 25} width={level5.right - level5.left - 30} height="55">
              <div className="flex items-center justify-center h-full text-center">
                <div className="text-white font-semibold text-sm leading-tight">Long Term Goals</div>
              </div>
            </foreignObject>
            {/* Clickable count on right side */}
            <text 
              x={level6.right + 40} 
              y={(y5 + y6) / 2 + 5} 
              fill="currentColor" 
              fontSize="16" 
              fontWeight="600"
              className="cursor-pointer hover:underline"
              onClick={(e) => handleNumberClick(`/enterprise/strategy-room?level=long_term_goal&snapshot=${snapshotId}`, e)}
            >
              {counts?.long_term_goal || 0}
            </text>

            {/* Layer 6: Long Term Strategies (full width) */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <path
                    d={`M ${level6.left} ${y6} L ${level6.right} ${y6} L ${level7.right} ${y7} L ${level7.left} ${y7} Z`}
                    fill={colors.longTermStrategies}
                    stroke="white"
                    strokeWidth="2"
                    className="cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => onLayerClick("Long Term Strategies")}
                  />
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-popover text-popover-foreground">
                  <p className="text-xs">What is our approach?</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <foreignObject x={level6.left + 15} y={y6 + 25} width={level6.right - level6.left - 30} height="55">
              <div className="flex items-center justify-center h-full text-center">
                <div className="text-white font-semibold text-sm leading-tight">Long Term Strategies</div>
              </div>
            </foreignObject>
            {/* Clickable count on right side */}
            <text 
              x={level7.right + 40} 
              y={(y6 + y7) / 2 + 5} 
              fill="currentColor" 
              fontSize="16" 
              fontWeight="600"
              className="cursor-pointer hover:underline"
              onClick={(e) => handleNumberClick(`/enterprise/strategy-room?level=long_term_strategy&snapshot=${snapshotId}`, e)}
            >
              {counts?.long_term_strategy || 0}
            </text>

            {/* Layer 7: Yearly Goals (left) and Themes (right) - SPLIT */}
            <path
              d={`M ${level7.left} ${y7} L ${centerX} ${y7} L ${centerX} ${y8} L ${level8.left} ${y8} Z`}
              fill={colors.yearlyGoals}
              stroke="white"
              strokeWidth="2"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("Yearly Goals")}
            />
            <foreignObject x={level7.left + 15} y={y7 + 50} width={centerX - level7.left - 30} height="90">
              <div className="flex flex-col items-center justify-start h-full text-center">
                <div 
                  className="text-white font-bold text-xl leading-none cursor-pointer hover:underline"
                  onClick={(e) => handleNumberClick(`/enterprise/strategy-room?level=yearly_goal&snapshot=${snapshotId}`, e)}
                >
                  {counts?.yearly_goal || 0}
                </div>
                <div className="text-white font-semibold text-sm leading-tight mt-3">Yearly Goals</div>
              </div>
            </foreignObject>

            <path
              d={`M ${centerX} ${y7} L ${level7.right} ${y7} L ${level8.right} ${y8} L ${centerX} ${y8} Z`}
              fill={colors.themes}
              stroke="white"
              strokeWidth="2"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("Themes")}
            />
            <foreignObject x={centerX + 15} y={y7 + 50} width={level7.right - centerX - 30} height="90">
              <div className="flex flex-col items-center justify-start h-full text-center">
                <div 
                  className="text-white font-bold text-xl leading-none cursor-pointer hover:underline"
                  onClick={(e) => handleNumberClick(`/themes`, e)}
                >
                  {counts?.themes || 0}
                </div>
                <div className="text-white font-semibold text-sm leading-tight mt-3">Themes</div>
              </div>
            </foreignObject>

            {/* Vertical divider for split layer */}
            <line x1={centerX} y1={y7} x2={centerX} y2={y8} stroke="white" strokeWidth="2" />

            {/* Layer 8: Portfolio Objectives (left) and Epics (right) - SPLIT */}
            <path
              d={`M ${level8.left} ${y8} L ${centerX} ${y8} L ${centerX} ${y9} L ${level9.left} ${y9} Z`}
              fill={colors.portfolioObjectives}
              stroke="white"
              strokeWidth="2"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("Portfolio Objectives")}
            />
            <foreignObject x={level8.left + 15} y={y8 + 50} width={centerX - level8.left - 30} height="90">
              <div className="flex flex-col items-center justify-start h-full text-center">
                <div 
                  className="text-white font-bold text-xl leading-none cursor-pointer hover:underline"
                  onClick={(e) => handleNumberClick(`/enterprise/okr-hub?level=portfolio`, e)}
                >
                  {counts?.portfolio_objective || 0}
                </div>
                <div className="text-white font-semibold text-sm leading-tight mt-3">Portfolio Objectives</div>
              </div>
            </foreignObject>

            <path
              d={`M ${centerX} ${y8} L ${level8.right} ${y8} L ${level9.right} ${y9} L ${centerX} ${y9} Z`}
              fill={colors.epics}
              stroke="white"
              strokeWidth="2"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("Epics")}
            />
            <foreignObject x={centerX + 15} y={y8 + 50} width={level8.right - centerX - 30} height="90">
              <div className="flex flex-col items-center justify-start h-full text-center">
                <div 
                  className="text-white font-bold text-xl leading-none cursor-pointer hover:underline"
                  onClick={(e) => handleNumberClick(`/backlog/epics`, e)}
                >
                  {counts?.epics || 0}
                </div>
                <div className="text-white font-semibold text-sm leading-tight mt-3">Epics</div>
              </div>
            </foreignObject>

            {/* Vertical divider for split layer */}
            <line x1={centerX} y1={y8} x2={centerX} y2={y9} stroke="white" strokeWidth="2" />

            {/* Layer 9: Program Objectives (left) and Features (right) - SPLIT */}
            <path
              d={`M ${level9.left} ${y9} L ${centerX} ${y9} L ${centerX} ${y10} L ${level10.left} ${y10} Z`}
              fill={colors.programObjectives}
              stroke="white"
              strokeWidth="2"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("Program Objectives")}
            />
            <foreignObject x={level9.left + 15} y={y9 + 22} width={centerX - level9.left - 30} height="46">
              <div className="flex flex-col items-center justify-start h-full text-center">
                <div 
                  className="text-white font-bold text-xl leading-none cursor-pointer hover:underline"
                  onClick={(e) => handleNumberClick(`/program/okr-hub?level=program`, e)}
                >
                  {counts?.program_objective || 0}
                </div>
                <div className="text-white font-semibold text-sm leading-tight mt-2">Program Objectives</div>
              </div>
            </foreignObject>

            <path
              d={`M ${centerX} ${y9} L ${level9.right} ${y9} L ${level10.right} ${y10} L ${centerX} ${y10} Z`}
              fill={colors.features}
              stroke="white"
              strokeWidth="2"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("Features")}
            />
            <foreignObject x={centerX + 15} y={y9 + 22} width={level9.right - centerX - 30} height="46">
              <div className="flex flex-col items-center justify-start h-full text-center">
                <div 
                  className="text-white font-bold text-xl leading-none cursor-pointer hover:underline"
                  onClick={(e) => handleNumberClick(`/features`, e)}
                >
                  {counts?.features || 0}
                </div>
                <div className="text-white font-semibold text-sm leading-tight mt-2">Features</div>
              </div>
            </foreignObject>

            {/* Vertical divider for split layer */}
            <line x1={centerX} y1={y9} x2={centerX} y2={y10} stroke="white" strokeWidth="2" />
          </svg>
        </div>
      </CardContent>
    </Card>
  );
}
