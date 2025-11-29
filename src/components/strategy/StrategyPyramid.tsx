import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
              Hierarchical visualization of strategy management. Click any layer to create and edit items at that level.
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
      <CardContent>
        <div className="relative w-full h-[900px]">
          <svg viewBox="0 0 1000 950" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
            {/* Layer 1: Missions (full width) */}
            <path
              d={`M ${centerX} ${y1} L ${level2.left} ${y2} L ${level2.right} ${y2} Z`}
              fill={colors.missions}
              stroke="white"
              strokeWidth="2"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("Missions")}
            />
            <text x={centerX} y={y1 + 50} textAnchor="middle" fill="white" fontSize="15" fontWeight="600">
              Missions
            </text>
            <text x={centerX} y={y1 + 67} textAnchor="middle" fill="white" fontSize="10" opacity="0.95">
              Why do we exist?
            </text>
            {/* Clickable count on right side */}
            <text 
              x={level2.right + 40} 
              y={(y1 + y2) / 2 + 5} 
              fill="currentColor" 
              fontSize="18" 
              fontWeight="500"
              className="cursor-pointer hover:underline"
              onClick={(e) => handleNumberClick(`/enterprise/strategy-room?level=mission&snapshot=${snapshotId}`, e)}
            >
              1
            </text>

            {/* Layer 2: Visions (full width) */}
            <path
              d={`M ${level2.left} ${y2} L ${level2.right} ${y2} L ${level3.right} ${y3} L ${level3.left} ${y3} Z`}
              fill={colors.visions}
              stroke="white"
              strokeWidth="2"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("Visions")}
            />
            <text x={centerX} y={y2 + 45} textAnchor="middle" fill="white" fontSize="15" fontWeight="600">
              Visions
            </text>
            <text x={centerX} y={y2 + 62} textAnchor="middle" fill="white" fontSize="10" opacity="0.95">
              What value do we provide?
            </text>
            {/* Clickable count on right side */}
            <text 
              x={level3.right + 40} 
              y={(y2 + y3) / 2 + 5} 
              fill="currentColor" 
              fontSize="18" 
              fontWeight="500"
              className="cursor-pointer hover:underline"
              onClick={(e) => handleNumberClick(`/enterprise/strategy-room?level=vision&snapshot=${snapshotId}`, e)}
            >
              1
            </text>

            {/* Layer 3: Values (full width) */}
            <path
              d={`M ${level3.left} ${y3} L ${level3.right} ${y3} L ${level4.right} ${y4} L ${level4.left} ${y4} Z`}
              fill={colors.values}
              stroke="white"
              strokeWidth="2"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("Values")}
            />
            <text x={centerX} y={y3 + 45} textAnchor="middle" fill="white" fontSize="15" fontWeight="600">
              Values
            </text>
            <text x={centerX} y={y3 + 62} textAnchor="middle" fill="white" fontSize="10" opacity="0.95">
              How do we behave?
            </text>
            {/* Clickable count on right side */}
            <text 
              x={level4.right + 40} 
              y={(y3 + y4) / 2 + 5} 
              fill="currentColor" 
              fontSize="18" 
              fontWeight="500"
              className="cursor-pointer hover:underline"
              onClick={(e) => handleNumberClick(`/enterprise/strategy-room?level=value&snapshot=${snapshotId}`, e)}
            >
              6
            </text>

            {/* Layer 4: North Stars (full width) */}
            <path
              d={`M ${level4.left} ${y4} L ${level4.right} ${y4} L ${level5.right} ${y5} L ${level5.left} ${y5} Z`}
              fill={colors.northStars}
              stroke="white"
              strokeWidth="2"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("North Stars")}
            />
            <text x={centerX} y={y4 + 45} textAnchor="middle" fill="white" fontSize="15" fontWeight="600">
              North Stars
            </text>
            <text x={centerX} y={y4 + 62} textAnchor="middle" fill="white" fontSize="10" opacity="0.95">
              What is our organization's single measurable goal?
            </text>
            {/* Clickable count on right side */}
            <text 
              x={level5.right + 40} 
              y={(y4 + y5) / 2 + 5} 
              fill="currentColor" 
              fontSize="18" 
              fontWeight="500"
              className="cursor-pointer hover:underline"
              onClick={(e) => handleNumberClick(`/enterprise/strategy-room?level=north_star&snapshot=${snapshotId}`, e)}
            >
              1
            </text>

            {/* Layer 5: Long Term Goals (full width) */}
            <path
              d={`M ${level5.left} ${y5} L ${level5.right} ${y5} L ${level6.right} ${y6} L ${level6.left} ${y6} Z`}
              fill={colors.longTermGoals}
              stroke="white"
              strokeWidth="2"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("Long Term Goals")}
            />
            <text x={centerX} y={y5 + 45} textAnchor="middle" fill="white" fontSize="15" fontWeight="600">
              Long Term Goals
            </text>
            <text x={centerX} y={y5 + 62} textAnchor="middle" fill="white" fontSize="10" opacity="0.95">
              How will we succeed long-term?
            </text>
            {/* Clickable count on right side */}
            <text 
              x={level6.right + 40} 
              y={(y5 + y6) / 2 + 5} 
              fill="currentColor" 
              fontSize="18" 
              fontWeight="500"
              className="cursor-pointer hover:underline"
              onClick={(e) => handleNumberClick(`/enterprise/strategy-room?level=long_term_goal&snapshot=${snapshotId}`, e)}
            >
              3
            </text>

            {/* Layer 6: Long Term Strategies (full width) */}
            <path
              d={`M ${level6.left} ${y6} L ${level6.right} ${y6} L ${level7.right} ${y7} L ${level7.left} ${y7} Z`}
              fill={colors.longTermStrategies}
              stroke="white"
              strokeWidth="2"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("Long Term Strategies")}
            />
            <text x={centerX} y={y6 + 45} textAnchor="middle" fill="white" fontSize="15" fontWeight="600">
              Long Term Strategies
            </text>
            <text x={centerX} y={y6 + 62} textAnchor="middle" fill="white" fontSize="10" opacity="0.95">
              What is our approach to long-term success?
            </text>
            {/* Clickable count on right side */}
            <text 
              x={level7.right + 40} 
              y={(y6 + y7) / 2 + 5} 
              fill="currentColor" 
              fontSize="18" 
              fontWeight="500"
              className="cursor-pointer hover:underline"
              onClick={(e) => handleNumberClick(`/enterprise/strategy-room?level=long_term_strategy&snapshot=${snapshotId}`, e)}
            >
              8
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
            <text 
              x={level7.left + 45} 
              y={y7 + 50} 
              fill="white" 
              fontSize="20" 
              fontWeight="700"
              className="cursor-pointer hover:underline"
              onClick={(e) => handleNumberClick(`/enterprise/strategy-room?level=yearly_goal&snapshot=${snapshotId}`, e)}
            >
              34
            </text>
            <text x={(level7.left + centerX) / 2 + 25} y={y7 + 75} textAnchor="middle" fill="white" fontSize="14" fontWeight="600">
              Yearly Goals
            </text>
            <text x={(level7.left + centerX) / 2 + 25} y={y7 + 92} textAnchor="middle" fill="white" fontSize="9" opacity="0.9">
              How will we succeed this year?
            </text>

            <path
              d={`M ${centerX} ${y7} L ${level7.right} ${y7} L ${level8.right} ${y8} L ${centerX} ${y8} Z`}
              fill={colors.themes}
              stroke="white"
              strokeWidth="2"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("Themes")}
            />
            <text 
              x={level7.right - 45} 
              y={y7 + 50} 
              textAnchor="end" 
              fill="white" 
              fontSize="20" 
              fontWeight="700"
              className="cursor-pointer hover:underline"
              onClick={(e) => handleNumberClick(`/themes`, e)}
            >
              32
            </text>
            <text x={(centerX + level7.right) / 2 - 20} y={y7 + 75} textAnchor="middle" fill="white" fontSize="14" fontWeight="600">
              Themes
            </text>

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
            <text 
              x={level8.left + 50} 
              y={y8 + 55} 
              fill="white" 
              fontSize="20" 
              fontWeight="700"
              className="cursor-pointer hover:underline"
              onClick={(e) => handleNumberClick(`/enterprise/okr-hub?level=portfolio`, e)}
            >
              82
            </text>
            <text x={(level8.left + centerX) / 2 + 30} y={y8 + 85} textAnchor="middle" fill="white" fontSize="14" fontWeight="600">
              Portfolio Objective
            </text>

            <path
              d={`M ${centerX} ${y8} L ${level8.right} ${y8} L ${level9.right} ${y9} L ${centerX} ${y9} Z`}
              fill={colors.epics}
              stroke="white"
              strokeWidth="2"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("Epics")}
            />
            <text 
              x={level8.right - 55} 
              y={y8 + 55} 
              textAnchor="end" 
              fill="white" 
              fontSize="20" 
              fontWeight="700"
              className="cursor-pointer hover:underline"
              onClick={(e) => handleNumberClick(`/backlog/epics`, e)}
            >
              147
            </text>
            <text x={(centerX + level8.right) / 2 - 25} y={y8 + 85} textAnchor="middle" fill="white" fontSize="14" fontWeight="600">
              Epics
            </text>

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
            <text 
              x={level9.left + 60} 
              y={y9 + 40} 
              fill="white" 
              fontSize="20" 
              fontWeight="700"
              className="cursor-pointer hover:underline"
              onClick={(e) => handleNumberClick(`/program/okr-hub?level=program`, e)}
            >
              160
            </text>
            <text x={(level9.left + centerX) / 2 + 40} y={(y9 + y10) / 2 + 5} textAnchor="middle" fill="white" fontSize="14" fontWeight="600">
              Program Objective
            </text>

            <path
              d={`M ${centerX} ${y9} L ${level9.right} ${y9} L ${level10.right} ${y10} L ${centerX} ${y10} Z`}
              fill={colors.features}
              stroke="white"
              strokeWidth="2"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("Features")}
            />
            <text 
              x={level9.right - 65} 
              y={y9 + 40} 
              textAnchor="end" 
              fill="white" 
              fontSize="20" 
              fontWeight="700"
              className="cursor-pointer hover:underline"
              onClick={(e) => handleNumberClick(`/features`, e)}
            >
              513
            </text>
            <text x={(centerX + level9.right) / 2 - 35} y={(y9 + y10) / 2 + 5} textAnchor="middle" fill="white" fontSize="14" fontWeight="600">
              Features
            </text>

            {/* Vertical divider for split layer */}
            <line x1={centerX} y1={y9} x2={centerX} y2={y10} stroke="white" strokeWidth="2" />
          </svg>
        </div>
      </CardContent>
    </Card>
  );
}
